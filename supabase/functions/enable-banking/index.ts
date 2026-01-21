import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PRIVATE_KEY } from './priv_key.ts';

const APP_ID = 'a34e3b69-cc7f-4eee-be2d-1fc438d020c9';
const KEY_ID = APP_ID; // Key ID is identiek aan App ID

const REDIRECT_URI = 'http://localhost:5173/finance/enable-banking-dev';
const API_URL = 'https://api.enablebanking.com';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Parse body ONCE and extract all possible fields
        const body = await req.json();
        const { action, code, session_id, country, aspsp_name, aspsp_country, account_uid, date_from, date_to } = body;

        const alg = 'RS256';
        const pk = await jose.importPKCS8(PRIVATE_KEY, alg);

        // Init Supabase Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        // CRITICAL: User Service Role Key to ensure we can write to DB regardless of RLS policies for now
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';

        // Note: Using Service Key bypasses RLS. Ensure we filter correctly in production.
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // NEW: Fetch available banks (ASPSPs)
        if (action === 'get_aspsps') {

            const jwt = await new jose.SignJWT({
                "iss": APP_ID,
                "aud": "api.enablebanking.com",
            })
                .setProtectedHeader({ alg, kid: KEY_ID })
                .setIssuedAt()
                .setExpirationTime('1h')
                .sign(pk);

            // Fetch sandbox ASPSPs (country=XX for sandbox, or specific country)
            const url = `${API_URL}/aspsps?country=${country || 'XX'}`;
            console.log("Fetching ASPSPs from:", url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${jwt}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(`Enable Banking ASPSPs error: ${JSON.stringify(data)}`);
            }

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });

        } else if (action === 'init_auth') {
            // Uses aspsp_name and aspsp_country from initial body parse
            const bankName = aspsp_name || 'Sandbox Accounts ASPSP';
            const bankCountry = aspsp_country || 'XX';

            console.log(`Initiating auth with bank: ${bankName} (${bankCountry})`);

            const jwt = await new jose.SignJWT({
                "iss": APP_ID,
                "aud": "api.enablebanking.com",
                "redirect_url": REDIRECT_URI,
                "state": "test-state-123",
                "sandbox": true
            })
                .setProtectedHeader({ alg, kid: KEY_ID })
                .setIssuedAt()
                .setExpirationTime('1h')
                .sign(pk);

            const response = await fetch(`${API_URL}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`
                },
                body: JSON.stringify({
                    "access": {
                        "valid_until": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
                    },
                    "aspsp": {
                        "name": bankName,
                        "country": bankCountry
                    },
                    "state": "test-state-123",
                    "redirect_url": REDIRECT_URI
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(`Enable Banking API error: ${JSON.stringify(data)}`);
            }

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });

        } else if (action === 'activate_session') {
            // Called AFTER user returns from bank auth - activates session and returns accounts
            // Does NOT fetch transactions yet - that's done via sync_transactions with specific account

            if (!code) {
                throw new Error("No authorization code provided");
            }

            // 1. Generate JWT for the API call
            const jwt = await new jose.SignJWT({
                "iss": APP_ID,
                "aud": "api.enablebanking.com",
                "sandbox": true
            })
                .setProtectedHeader({ alg, kid: KEY_ID })
                .setIssuedAt()
                .setExpirationTime('1h')
                .sign(pk);

            // 2. Complete the session by POSTing to /sessions with the code
            console.log("Completing session with code:", code);
            const sessionResp = await fetch(`${API_URL}/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`
                },
                body: JSON.stringify({ code })
            });

            if (!sessionResp.ok) {
                const errText = await sessionResp.text();
                throw new Error(`Enable Banking POST /sessions Error (${sessionResp.status}): ${errText}`);
            }

            const sessionData = await sessionResp.json();
            console.log("Session completed:", sessionData);

            // The response contains session_id and accounts
            const activeSessionId = sessionData.session_id || sessionData.uid || session_id;
            const accounts = sessionData.accounts || [];

            // 3. Save connection to DB with the REAL active session ID
            const { error: dbError } = await supabase
                .from('bank_connections')
                .upsert({
                    provider: 'enable_banking',
                    external_id: activeSessionId,
                    status: 'active',
                    access_token: code,
                    metadata: { accounts_count: accounts.length, accounts: accounts },
                    expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
                }, { onConflict: 'external_id' });

            if (dbError) {
                console.error("Failed to save connection:", dbError);
                throw new Error(`Database Save Error: ${dbError.message} (${dbError.details})`);
            }

            // 4. Return the accounts list for selection in UI
            // Map accounts to friendly format with name, uid, etc.
            const accountsForUI = accounts.map((acc: any) => ({
                uid: acc.uid || acc,
                name: acc.name || acc.account_id?.iban || 'Account',
                iban: acc.account_id?.iban || null,
                currency: acc.currency || 'EUR',
                bicFi: acc.bic_fi || null,
                cashAccountType: acc.cash_account_type || null
            }));

            return new Response(JSON.stringify({
                session_id: activeSessionId,
                accounts: accountsForUI,
                _meta: {
                    message: "Session activated! Select an account to sync transactions."
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
        else if (action === 'sync_transactions') {
            // 1. Get Active Connection from DB
            const { data: connection, error } = await supabase
                .from('bank_connections')
                .select('*')
                .eq('provider', 'enable_banking')
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !connection) {
                throw new Error("No active bank connection found in database to sync.");
            }

            // 2. Prepare JWT for Access
            const jwt = await new jose.SignJWT({
                "iss": APP_ID,
                "aud": "api.enablebanking.com",
                "sandbox": true
            })
                .setProtectedHeader({ alg, kid: KEY_ID })
                .setIssuedAt()
                .setExpirationTime('1h')
                .sign(pk);

            console.log(`Syncing using session ${connection.external_id}`);

            // 3. Get session details (includes accounts)
            const sessionUrl = `${API_URL}/sessions/${connection.external_id}`;
            const sessionResp = await fetch(sessionUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`
                }
            });

            if (!sessionResp.ok) {
                const errText = await sessionResp.text();
                throw new Error(`Enable Banking GET /sessions Error (${sessionResp.status}): ${errText}`);
            }

            const sessionData = await sessionResp.json();
            console.log("Session response:", JSON.stringify(sessionData).slice(0, 500));

            const accounts = sessionData.accounts || [];
            let allTransactions: any[] = [];
            let debugInfo: any[] = [];

            console.log(`Found ${accounts.length} accounts in session`);

            // Use passed date range or defaults
            const syncDateFrom = date_from || '2024-01-01';
            const syncDateTo = date_to || new Date().toISOString().split('T')[0];

            console.log(`Date range: ${syncDateFrom} to ${syncDateTo}`);

            // 4. Fetch Transactions for SPECIFIC account (or all if no account_uid provided)
            const accountsToSync = account_uid
                ? accounts.filter((a: any) => (a.uid || a) === account_uid)
                : accounts;

            if (account_uid && accountsToSync.length === 0) {
                throw new Error(`Account ${account_uid} not found in session`);
            }

            console.log(`Syncing ${accountsToSync.length} account(s)`);

            for (const acc of accountsToSync) {
                const accUid = acc.uid || acc;
                // Correct endpoint per Enable Banking docs: /accounts/{account_uid}/transactions
                const txUrl = `${API_URL}/accounts/${accUid}/transactions?date_from=${syncDateFrom}&date_to=${syncDateTo}`;

                console.log(`Fetching transactions from: ${txUrl}`);

                const txResp = await fetch(txUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwt}`
                    }
                });

                const rawText = await txResp.text();
                console.log(`TX Response for ${accUid} (${txResp.status}): ${rawText.slice(0, 300)}`);

                if (txResp.ok || txResp.status === 200) {
                    try {
                        const txData = JSON.parse(rawText);
                        const txList = txData.transactions || txData.booked || [];
                        console.log(`Got ${txList.length} transactions for account ${accUid}`);
                        allTransactions.push(...txList);
                        debugInfo.push({ account: accUid, status: txResp.status, count: txList.length });
                    } catch (e) {
                        debugInfo.push({ account: accUid, status: txResp.status, error: "JSON parse failed" });
                    }
                } else {
                    debugInfo.push({ account: accUid, status: txResp.status, error: rawText.slice(0, 100) });
                }
            }

            return new Response(JSON.stringify({
                account: accounts[0],
                transactions: allTransactions,
                _meta: {
                    source: "LIVE_API",
                    synced_at: new Date().toISOString(),
                    accounts_count: accounts.length,
                    transactions_count: allTransactions.length,
                    debug: debugInfo,
                    date_range: { from: syncDateFrom, to: syncDateTo }
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
        else if (action === 'check_status') {
            // Query DB for active connection
            const { data: connections, error } = await supabase
                .from('bank_connections')
                .select('*')
                .eq('provider', 'enable_banking')
                .eq('status', 'active')
                .limit(1);

            if (error) throw error;

            const isConnected = connections && connections.length > 0;

            return new Response(JSON.stringify({
                connected: isConnected,
                connection: isConnected ? connections[0] : null
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        throw new Error(`Unknown action: ${action}`);

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
