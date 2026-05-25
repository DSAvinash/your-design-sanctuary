import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EDGE_FUNCTIONS = [
  "agro-assist",
  "diagnosis-flow",
  "treatment-engine",
  "weather-advice",
  "unified-advisory",
  "send-alert",
];

type SimpleStatus = "healthy" | "degraded" | "unhealthy";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    // Log internally, return generic status only.
    console.error("health: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response(
      JSON.stringify({ status: "unhealthy", timestamp: new Date().toISOString() }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let authOk = true;
  let dbOk = true;
  let edgeHealthy = 0;
  let edgeTotal = EDGE_FUNCTIONS.length;

  try {
    const { error } = await supabase.auth.getSession();
    if (error) authOk = false;
  } catch (e) {
    console.error("health: auth check failed", e);
    authOk = false;
  }

  try {
    const { error } = await supabase.from("profiles").select("*", { head: true, count: "exact" });
    if (error) {
      console.error("health: db check failed", error.message);
      dbOk = false;
    }
  } catch (e) {
    console.error("health: db check threw", e);
    dbOk = false;
  }

  for (const fn of EDGE_FUNCTIONS) {
    try {
      const r = await fetch(`${supabaseUrl}/functions/v1/${fn}`, { method: "OPTIONS" });
      if (r.status === 200 || r.status === 204) edgeHealthy++;
    } catch (e) {
      console.error(`health: edge ${fn} unreachable`, e);
    }
  }

  let status: SimpleStatus;
  if (!dbOk) status = "unhealthy";
  else if (!authOk || edgeHealthy < edgeTotal) status = "degraded";
  else status = "healthy";

  // Public response — top-level status only, no internal details.
  return new Response(
    JSON.stringify({ status, timestamp: new Date().toISOString() }),
    {
      status: status === "unhealthy" ? 503 : 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
