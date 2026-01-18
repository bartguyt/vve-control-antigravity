import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RESEND_API_KEY = "re_VasJ4nWU_JgFkdpRzA3WhZGY4EoeR8oxA";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        // Try getting the Authorization header (User Trigger)
        const authHeader = req.headers.get('Authorization');

        let supabase;
        if (authHeader) {
            // Use the user's session
            const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
            supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
        } else {
            // Fallback to Service Role (Cron Job) - Requires 'supabase secrets set'
            const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
            if (!serviceRoleKey) {
                throw new Error("Missing Auth Context: No User Token and no Service Role Key found.");
            }
            supabase = createClient(supabaseUrl, serviceRoleKey);
        }

        const { data: emails, error: fetchError } = await supabase
            .from('outbound_emails')
            .select('*')
            .eq('status', 'pending')
            .limit(50);

        if (fetchError) throw fetchError;

        if (!emails || emails.length === 0) {
            return new Response(JSON.stringify({ processed: 0, message: "No pending emails" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`Processing ${emails.length} emails...`);
        const results = [];

        for (const email of emails) {
            // Rate Limit Shield: Wait 500ms between emails (Resend limit is ~2 req/sec)
            await new Promise(resolve => setTimeout(resolve, 500));

            try {
                // Send via Resend
                const res = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${RESEND_API_KEY}`,
                    },
                    body: JSON.stringify({
                        from: "VvE Control <onboarding@resend.dev>",
                        // For Testing Mode: Must send to verified email (bartguyt@gmail.com)
                        to: "bartguyt@gmail.com", // email.recipient_email (Restored later),
                        subject: `[TEST via ${email.recipient_email}] ${email.subject}`,
                        text: email.body,
                    }),
                });

                const data = await res.json();

                if (!res.ok) {
                    console.error("Resend Error:", data);
                    throw new Error(data.message || "Failed to send email");
                }

                // Update status to SENT
                await supabase
                    .from('outbound_emails')
                    .update({ status: 'sent', sent_at: new Date().toISOString() })
                    .eq('id', email.id);

                results.push({ id: email.id, status: 'sent' });

            } catch (sendError: any) {
                console.error(`Failed to send email ${email.id}:`, sendError);
                await supabase
                    .from('outbound_emails')
                    .update({ status: 'failed' })
                    .eq('id', email.id);
                results.push({ id: email.id, status: 'failed', error: sendError.message });
            }
        }

        return new Response(JSON.stringify({ processed: emails.length, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
