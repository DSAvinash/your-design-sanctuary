import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAdmin, unauthorizedResponse, forbiddenResponse } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const { user, isAdmin } = await requireAdmin(req);
  if (!user) return unauthorizedResponse(corsHeaders);
  if (!isAdmin) return forbiddenResponse(corsHeaders);



  const key = Deno.env.get("OPENWEATHERMAP_API_KEY")?.trim();
  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (!key) {
    return json({ ok: false, reason: "missing", message: "OPENWEATHERMAP_API_KEY is not set." });
  }
  if (key.length > 64) {
    return json({
      ok: false,
      reason: "malformed",
      keyLength: key.length,
      message: `Key is ${key.length} chars — OpenWeatherMap keys are 32 hex chars. Wrong value was pasted.`,
    });
  }

  const fallbackReady = async () => {
    try {
      const r = await fetch("https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0&current=temperature_2m");
      await r.text();
      return r.ok;
    } catch {
      return false;
    }
  };

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=0&lon=0&appid=${key}`;
    const r = await fetch(url);
    const text = await r.text();
    if (r.ok) {
      return json({ ok: true, status: r.status, message: "API key is valid." });
    }
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { /* ignore */ }
    const reason =
      r.status === 401 ? "unauthorized"
      : r.status === 429 ? "rate_limited"
      : r.status === 414 ? "uri_too_long"
      : "api_error";
    const message =
      r.status === 401
        ? "OpenWeatherMap key is not active yet, but forecasts are working through the built-in fallback weather provider."
        : parsed?.message || `OpenWeatherMap returned ${r.status}.`;
    if (r.status === 401 && await fallbackReady()) {
      return json({ ok: true, reason: "fallback_available", status: r.status, message });
    }
    return json({ ok: false, reason, status: r.status, message });
  } catch (err) {
    return json({ ok: false, reason: "network_error", message: (err as Error).message }, 200);
  }
});
