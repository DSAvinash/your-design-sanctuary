// Send Today's Plan as SMS or WhatsApp via Twilio connector gateway
// Body: { to: "+91...", channel: "sms" | "whatsapp", message: string }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

interface Body {
  to: string;
  channel?: "sms" | "whatsapp";
  message: string;
}

// In-memory rate limit (per warm function instance) — 1 SMS per number per 60s
const lastSent = new Map<string, number>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY)
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY)
      return new Response(JSON.stringify({ error: "Twilio not connected" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const TWILIO_FROM = Deno.env.get("TWILIO_FROM_NUMBER")?.trim();
    if (!TWILIO_FROM || !/^\+\d{8,15}$/.test(TWILIO_FROM))
      return new Response(
        JSON.stringify({
          success: false,
          error: "SMS is not configured yet. Set TWILIO_FROM_NUMBER to a real Twilio sender phone number like +15017122661.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );

    const body = (await req.json()) as Body;
    const { to, channel = "sms", message } = body ?? {};

    // Validate
    if (!to || !/^\+\d{8,15}$/.test(to))
      return new Response(JSON.stringify({ error: "Invalid 'to' number. Use E.164 format like +919876543210." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    if (!message || message.length < 5 || message.length > 1500)
      return new Response(JSON.stringify({ error: "Message must be 5-1500 chars" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // Rate limit
    const key = `${channel}:${to}`;
    const last = lastSent.get(key) ?? 0;
    if (Date.now() - last < 60_000)
      return new Response(JSON.stringify({ error: "Please wait at least 60 seconds between alerts." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const fromFormatted = channel === "whatsapp" ? `whatsapp:${TWILIO_FROM}` : TWILIO_FROM;
    const toFormatted = channel === "whatsapp" ? `whatsapp:${to}` : to;

    const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: toFormatted, From: fromFormatted, Body: message }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Twilio error", res.status, data);
      const code = data?.code;
      const sameNumberError = code === 21266 || code === 63031;

      return new Response(
        JSON.stringify({
          success: false,
          fallback: true,
          error: sameNumberError
            ? "Cannot send this alert to the Twilio sender number. Please use a different recipient number."
            : `Twilio error: ${data?.message ?? res.statusText}`,
          code,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    lastSent.set(key, Date.now());
    return new Response(JSON.stringify({ success: true, sid: data.sid, channel }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
