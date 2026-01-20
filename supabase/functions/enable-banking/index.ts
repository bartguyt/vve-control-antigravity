import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';
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
        const { action, code } = await req.json();
        const alg = 'RS256';
        const pk = await jose.importPKCS8(PRIVATE_KEY, alg);

        if (action === 'init_auth') {
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

            // 2. Call Enable Banking /auth
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
                        "name": "Nordea",
                        "country": "FI"
                    },
                    "state": "test-state-123",
                    "redirect_url": REDIRECT_URI
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // Return detailed error for debugging
                throw new Error(`Enable Banking API error: ${JSON.stringify(data)}`);
            }

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });

        } else if (action === 'get_transactions') {
            if (!code) throw new Error("Missing 'code' parameter");

            // For now, return Mock Data to prove callbacks work, as we don't have the real token exchange logic fully spec'd yet
            // (Real implementation requires figuring out the exact /sessions or /token endpoint for Enable Banking v5)

            return new Response(JSON.stringify({
                account: {
                    name: "Enable Banking Sandbox Account (E2E)",
                    currency: "EUR",
                    bicFi: "SANDBOX_BIC",
                    resourceId: "real-uuid-from-backend-test"
                },
                transactions: [
                    {
                        bookingDate: new Date().toISOString().split('T')[0],
                        transactionAmount: { amount: "123.45", currency: "EUR" },
                        creditor: { name: "Succesvolle Callback via Edge Function" },
                        remittanceInformation: ["Data opgehaald via beveiligde proxy"],
                        status: "BOOK",
                        creditDebitIndicator: "CRDT"
                    }
                ]
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
