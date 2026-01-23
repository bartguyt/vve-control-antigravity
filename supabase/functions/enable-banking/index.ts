import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PRIVATE_KEY } from './priv_key.ts';

const APP_ID = 'a34e3b69-cc7f-4eee-be2d-1fc438d020c9';
const KEY_ID = APP_ID; // Enable Banking uses APP_ID as KEY_ID

const REDIRECT_URI = 'http://localhost:5174/system/connections/bank';
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
        const { action, code, session_id, country, aspsp_name, aspsp_country, account_uid, account_name, date_from, date_to, association_id } = body;

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

            // Debug: Log credentials being used
            console.log("DEBUG: APP_ID =", APP_ID);
            console.log("DEBUG: KEY_ID =", KEY_ID);
            console.log("DEBUG: Country =", country || 'NL (default)');

            const jwt = await new jose.SignJWT({
                "iss": APP_ID,
                "aud": "api.enablebanking.com",
            })
                .setProtectedHeader({ alg, kid: KEY_ID })
                .setIssuedAt()
                .setExpirationTime('1h')
                .sign(pk);

            // Fetch sandbox ASPSPs (country=NL includes Mock ASPSP for testing)
            const url = `${API_URL}/aspsps?country=${country || 'NL'}`;
            console.log("Fetching ASPSPs from:", url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${jwt}`
                }
            });

            const data = await response.json();
            console.log("DEBUG: Response status =", response.status);
            console.log("DEBUG: ASPSPs count =", data.aspsps?.length || 0);

            if (!response.ok) {
                // Include debug info in error response
                const errorResponse = {
                    error: `Enable Banking ASPSPs error: ${JSON.stringify(data)}`,
                    debug: {
                        app_id: APP_ID,
                        key_id: KEY_ID,
                        url: url,
                        status: response.status
                    }
                };
                console.error("Enable Banking API Error:", errorResponse);
                return new Response(JSON.stringify(errorResponse), {
                    status: response.status,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
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

            const authRequestBody = {
                "access": {
                    "valid_until": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
                },
                "aspsp": {
                    "name": bankName,
                    "country": bankCountry
                },
                "state": "test-state-123",
                "redirect_url": REDIRECT_URI
            };

            console.log("DEBUG: Auth request body:", JSON.stringify(authRequestBody));

            const response = await fetch(`${API_URL}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`
                },
                body: JSON.stringify(authRequestBody)
            });

            const data = await response.json();
            console.log("DEBUG: Enable Banking auth response status:", response.status);
            console.log("DEBUG: Enable Banking auth response data:", JSON.stringify(data));

            if (!response.ok) {
                const errorResponse = {
                    error: `Enable Banking auth error: ${JSON.stringify(data)}`,
                    debug: {
                        app_id: APP_ID,
                        bank_name: bankName,
                        bank_country: bankCountry,
                        redirect_uri: REDIRECT_URI,
                        status: response.status
                    }
                };
                console.error("Enable Banking Auth Error:", errorResponse);
                return new Response(JSON.stringify(errorResponse), {
                    status: response.status,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            console.log("DEBUG: Returning successful auth response");
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
            // IMPORTANT: Include association_id to support multi-association scenarios
            if (!association_id) {
                throw new Error("association_id is required to create a bank connection");
            }

            const { error: dbError } = await supabase
                .from('bank_connections')
                .upsert({
                    provider: 'enable_banking',
                    external_id: activeSessionId,
                    association_id: association_id, // CRITICAL: Link to specific VvE
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
            console.log("Raw accounts from API:", JSON.stringify(accounts, null, 2));

            const accountsForUI = accounts.map((acc: any) => ({
                uid: acc.uid || acc,
                name: acc.name
                    || acc.display_name
                    || acc.account_name
                    || (acc.account_id?.iban ? `Account ${acc.account_id.iban.slice(-4)}` : null)
                    || acc.product
                    || `Mock Account ${(acc.uid || acc).toString().slice(0, 8)}`,
                iban: acc.account_id?.iban || null,
                currency: acc.currency || 'EUR',
                bicFi: acc.bic_fi || null,
                cashAccountType: acc.cash_account_type || null
            }));

            console.log("Mapped accounts for UI:", JSON.stringify(accountsForUI, null, 2));

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
            // CRITICAL FIX: Filter by association_id AND connection_id for multi-VvE support
            if (!association_id) {
                throw new Error("association_id is required for sync_transactions");
            }

            // 1. Get Active Connection from DB filtered by association
            const { data: connection, error } = await supabase
                .from('bank_connections')
                .select('*')
                .eq('provider', 'enable_banking')
                .eq('association_id', association_id) // CRITICAL: Filter by VvE
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !connection) {
                throw new Error(`No active bank connection found for association ${association_id}`);
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

            // 3. Get accounts from metadata (stored during activate_session)
            // CRITICAL: Don't use GET /sessions - it returns different UIDs each time!
            // We saved the original accounts with stable UIDs in metadata during activate_session
            const accounts = connection.metadata?.accounts || [];

            if (accounts.length === 0) {
                throw new Error(`No accounts found in connection metadata. Connection may be invalid.`);
            }

            console.log(`Using ${accounts.length} account(s) from metadata (stable UIDs)`);
            let allTransactions: any[] = [];
            let debugInfo: any[] = [];

            // 4. Determine Accounts to Sync
            const accountsToSync = account_uid
                ? accounts.filter((a: any) => (a.uid || a) === account_uid)
                : accounts;

            if (account_uid && accountsToSync.length === 0) {
                throw new Error(`Account ${account_uid} not found in session`);
            }

            console.log(`Syncing ${accountsToSync.length} account(s)`);

            // 5. Sync Loop
            for (const acc of accountsToSync) {
                const accUid = acc.uid || acc;

                // Debug: Log account object to see available fields
                console.log(`Account data for ${accUid}:`, JSON.stringify(acc, null, 2));

                // Try multiple fallbacks for account name
                // PRIORITY: Use account_name from request (passed from wizard step 3) if available
                const accName = account_name // From request parameter (wizard has this!)
                    || acc.name
                    || acc.display_name
                    || acc.account_name
                    || (acc.account_id?.iban ? `Account ${acc.account_id.iban.slice(-4)}` : null)
                    || acc.product
                    || `Mock Account ${accUid.slice(0, 8)}`;

                console.log(`Using account name: "${accName}" for ${accUid} (from request: ${account_name || 'not provided'})`);

                // Determine Date Range PER ACCOUNT
                let syncDateFrom = date_from; // Use request param if provided

                if (!syncDateFrom) {
                    // Fetch last_synced_at from DB if not provided (using IBAN as stable key)
                    const accIban = acc.account_id?.iban;

                    if (accIban) {
                        const { data: acctInfo } = await supabase
                            .from('bank_accounts')
                            .select('last_synced_at')
                            .eq('association_id', association_id)
                            .eq('iban', accIban)
                            .maybeSingle();

                        if (acctInfo?.last_synced_at) {
                            // Convert to DATE format (YYYY-MM-DD) not ISO timestamp
                            syncDateFrom = new Date(acctInfo.last_synced_at).toISOString().split('T')[0];
                            console.log(`[${accUid}] Using stored last_synced_at: ${syncDateFrom}`);
                        } else {
                            // Default to 2025-01-01 for Mock ASPSP test data
                            syncDateFrom = '2025-01-01';
                            console.log(`[${accUid}] No last_synced_at, fetching from: ${syncDateFrom}`);
                        }
                    } else {
                        // No IBAN available, use default
                        syncDateFrom = '2025-01-01';
                        console.log(`[${accUid}] No IBAN available, fetching from: ${syncDateFrom}`);
                    }
                }

                // Convert date_to to DATE format (YYYY-MM-DD) not ISO timestamp
                const syncDateTo = date_to || new Date().toISOString().split('T')[0];

                console.log(`[${accUid}] Transaction sync parameters:`, {
                    date_from: syncDateFrom,
                    date_to: syncDateTo,
                    account_uid: accUid,
                    date_range_days: Math.floor((new Date(syncDateTo).getTime() - new Date(syncDateFrom).getTime()) / (1000 * 60 * 60 * 24))
                });

                // Fetch ALL transactions using pagination
                let continuationKey: string | null = null;
                let allAccountTransactions: any[] = [];
                let pageCount = 0;
                const maxPages = 50; // Safety limit

                do {
                    pageCount++;
                    let txUrl = `${API_URL}/accounts/${accUid}/transactions?date_from=${syncDateFrom}&date_to=${syncDateTo}`;
                    if (continuationKey) {
                        txUrl += `&continuation_key=${encodeURIComponent(continuationKey)}`;
                    }

                    console.log(`[${accUid}] 🌐 Fetching page ${pageCount}`);
                    console.log(`[${accUid}] 📍 Full URL: ${txUrl}`);

                    const txResp = await fetch(txUrl, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${jwt}`
                        }
                    });

                    if (!txResp.ok) {
                        const rawText = await txResp.text();
                        console.error(`[${accUid}] Error fetching page ${pageCount}: ${rawText}`);
                        break;
                    }

                    const rawText = await txResp.text();
                    const txData = JSON.parse(rawText);
                    const txList = txData.transactions || txData.booked || [];

                    console.log(`[${accUid}] Page ${pageCount} response:`, {
                        transactions_count: txList.length,
                        has_continuation: !!txData.continuation_key,
                        response_keys: Object.keys(txData)
                    });

                    if (pageCount === 1 && txList.length === 0) {
                        console.warn(`[${accUid}] ⚠️ No transactions found. This could mean:`);
                        console.warn(`   1. The Mock ASPSP has no test transactions (add them via enablebanking.com Mock ASPSP tab)`);
                        console.warn(`   2. The date range is incorrect`);
                        console.warn(`   3. The account UID is wrong`);
                        console.warn(`   Full response structure:`, JSON.stringify(txData, null, 2));
                        console.warn(`   Response keys:`, Object.keys(txData));
                        console.warn(`   Tried fields: transactions=${txData.transactions?.length}, booked=${txData.booked?.length}`);
                    }

                    allAccountTransactions.push(...txList);

                    continuationKey = txData.continuation_key || null;
                } while (continuationKey && pageCount < maxPages);

                console.log(`Total: ${allAccountTransactions.length} transactions for account ${accUid}`);
                allTransactions.push(...allAccountTransactions);
                debugInfo.push({ account: accUid, status: 200, count: allAccountTransactions.length, pages: pageCount });

                // PERSIST TO DATABASE
                if (association_id && allAccountTransactions.length > 0) {
                    // Use IBAN as stable identifier, or generate fallback for Mock accounts
                    let accIban = acc.account_id?.iban;

                    if (!accIban) {
                        // Mock ASPSP may not have IBAN - use a stable fallback
                        // Generate from name + currency (these should be stable)
                        const fallbackId = `MOCK-${accName.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30)}-${acc.currency || 'EUR'}`;
                        accIban = fallbackId;
                        console.log(`⚠️ Account ${accUid} has no IBAN - using fallback: ${fallbackId}`);
                    }

                    // 1. Check if account already exists (by IBAN - stable identifier)
                    console.log(`DUPLICATE CHECK - Looking for: association_id="${association_id}", iban="${accIban}"`);

                    const { data: existingAccount, error: checkError } = await supabase
                        .from('bank_accounts')
                        .select('id, name, iban, external_account_uid, is_active')
                        .eq('association_id', association_id)
                        .eq('iban', accIban)
                        .maybeSingle();

                    if (checkError) {
                        console.error('DUPLICATE CHECK - Error:', checkError);
                    } else if (existingAccount) {
                        console.log(`DUPLICATE CHECK - FOUND EXISTING: id=${existingAccount.id}, name="${existingAccount.name}", iban="${existingAccount.iban}"`);
                        console.log(`  Old UID: ${existingAccount.external_account_uid}`);
                        console.log(`  New UID: ${accUid} (will be updated)`);
                    } else {
                        console.log('DUPLICATE CHECK - NOT FOUND - will create new');
                    }

                    // 2. Upsert bank_account (IBAN is unique key, UID gets updated)
                    console.log(`UPSERT - Values: association_id="${association_id}", iban="${accIban}", external_account_uid="${accUid}" (transient), name="${accName}"`);

                    const { data: bankAccount, error: baError } = await supabase
                        .from('bank_accounts')
                        .upsert({
                            association_id,
                            iban: accIban, // STABLE unique key
                            external_account_uid: accUid, // TRANSIENT - updates each sync
                            name: accName,
                            bic: acc.bic_fi || null,
                            currency: acc.currency || 'EUR',
                            connection_id: connection.id,
                            is_active: true,
                            last_synced_at: new Date().toISOString()
                        }, { onConflict: 'association_id,iban' }) // Changed from external_account_uid to iban
                        .select('id')
                        .single();

                    if (baError) {
                        console.error('Failed to upsert bank_account:', baError);
                    } else if (bankAccount) {
                        console.log(`Bank account upserted successfully: id=${bankAccount.id}`);
                        // 2. Upsert transactions
                        const txInserts = allAccountTransactions.map((tx: any) => ({
                            bank_account_id: bankAccount.id,
                            association_id: association_id, // Direct reference for easier querying
                            external_reference: tx.entry_reference || `${tx.booking_date}-${tx.transaction_amount?.amount}`,
                            booking_date: tx.booking_date,
                            value_date: tx.value_date || null,
                            amount: parseFloat(tx.transaction_amount?.amount || '0'),
                            currency: tx.transaction_amount?.currency || 'EUR',
                            credit_debit: tx.credit_debit_indicator || null,
                            // Store both creditor and debtor separately (more useful than generic counterparty)
                            creditor_name: tx.creditor?.name || null,
                            debtor_name: tx.debtor?.name || null,
                            creditor_iban: tx.creditor_account?.iban || null,
                            debtor_iban: tx.debtor_account?.iban || null,
                            // Keep counterparty for backward compatibility
                            counterparty_name: tx.creditor?.name || tx.debtor?.name || null,
                            counterparty_iban: tx.creditor_account?.iban || tx.debtor_account?.iban || null,
                            description: Array.isArray(tx.remittance_information)
                                ? tx.remittance_information.join(' ')
                                : tx.remittance_information || null,
                            status: tx.status || 'BOOK',
                            raw_data: tx
                        }));

                        const { error: txError } = await supabase
                            .from('bank_transactions')
                            .upsert(txInserts, { onConflict: 'bank_account_id,external_reference' });

                        if (txError) {
                            console.error('Failed to upsert transactions:', txError);
                            debugInfo.push({ account: accUid, db_error: txError.message });
                        } else {
                            console.log(`Persisted ${txInserts.length} transactions to database`);
                            debugInfo.push({ account: accUid, persisted: txInserts.length });
                        }
                    }
                } else if (association_id) {
                    // Even if 0 transactions, update the timestamp so we don't fetch old history again
                    // Use IBAN as stable identifier, or generate fallback for Mock accounts
                    let accIban = acc.account_id?.iban;

                    if (!accIban) {
                        // Mock ASPSP may not have IBAN - use a stable fallback
                        const fallbackId = `MOCK-${accName.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30)}-${acc.currency || 'EUR'}`;
                        accIban = fallbackId;
                        console.log(`⚠️ Account ${accUid} has no IBAN (no transactions) - using fallback: ${fallbackId}`);
                    }

                    console.log(`Upserting bank_account (no transactions): association_id=${association_id}, iban=${accIban}, name=${accName}`);

                    const { data: bankAccount, error: baError } = await supabase
                        .from('bank_accounts')
                        .upsert({
                            association_id,
                            iban: accIban, // STABLE unique key
                            external_account_uid: accUid, // TRANSIENT - updates each sync
                            name: accName,
                            bic: acc.bic_fi || null,
                            currency: acc.currency || 'EUR',
                            connection_id: connection.id,
                            is_active: true,
                            last_synced_at: new Date().toISOString()
                        }, { onConflict: 'association_id,iban' }) // Changed from external_account_uid to iban
                        .select('id')
                        .single();

                    if (baError) {
                        console.error('Failed to upsert bank_account (no transactions):', baError);
                    } else if (bankAccount) {
                        console.log(`Bank account upserted successfully (no transactions): id=${bankAccount.id}`);
                    }
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
                    persisted: association_id ? true : false,
                    debug: debugInfo
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
        else if (action === 'check_status') {
            // CRITICAL FIX: Filter by association_id OR connection_id
            const connection_id = body.connection_id; // For lookups by ID

            let query = supabase
                .from('bank_connections')
                .select('*')
                .eq('provider', 'enable_banking')
                .eq('status', 'active');

            // Filter by either connection_id or association_id
            if (connection_id) {
                query = query.eq('id', connection_id);
            } else if (association_id) {
                query = query.eq('association_id', association_id);
            }

            query = query.limit(1);

            const { data: connections, error } = await query;

            if (error) throw error;

            const isConnected = connections && connections.length > 0;

            return new Response(JSON.stringify({
                connected: isConnected,
                connection: isConnected ? connections[0] : null,
                status: isConnected ? 'active' : 'inactive',
                valid_until: isConnected ? connections[0].expires_at : null,
                metadata: isConnected ? connections[0].metadata : null,
                association_id: isConnected ? connections[0].association_id : null
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
