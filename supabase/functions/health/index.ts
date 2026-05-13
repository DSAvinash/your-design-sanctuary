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

interface HealthCheckResult {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  checks: {
    auth: {
      status: "healthy" | "unhealthy";
      responseTimeMs: number;
      error?: string;
    };
    database: {
      status: "healthy" | "unhealthy";
      responseTimeMs: number;
      error?: string;
    };
    edgeFunctions: {
      status: "healthy" | "unhealthy";
      responseTimeMs: number;
      functions: Record<string, {
        status: "healthy" | "unhealthy";
        responseTimeMs: number;
        statusCode?: number;
        error?: string;
      }>;
      error?: string;
    };
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({
        status: "unhealthy",
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables",
      }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Auth check
  const authCheck = await checkAuth(supabase);

  // DB check
  const dbCheck = await checkDatabase(supabase);

  // Edge functions check
  const edgeFunctionsCheck = await checkEdgeFunctions(supabaseUrl);

  const overallStatus = determineOverallStatus(authCheck.status, dbCheck.status, edgeFunctionsCheck.status);

  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks: {
      auth: authCheck,
      database: dbCheck,
      edgeFunctions: edgeFunctionsCheck,
    },
  };

  const totalTime = Date.now() - startTime;

  return new Response(JSON.stringify(result), {
    status: overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "X-Response-Time-Ms": totalTime.toString(),
    },
  });
});

async function checkAuth(supabase: ReturnType<typeof createClient>): Promise<HealthCheckResult["checks"]["auth"]> {
  const start = Date.now();
  try {
    const { error } = await supabase.auth.getSession();
    if (error) {
      return {
        status: "unhealthy",
        responseTimeMs: Date.now() - start,
        error: error.message,
      };
    }
    return {
      status: "healthy",
      responseTimeMs: Date.now() - start,
    };
  } catch (e) {
    return {
      status: "unhealthy",
      responseTimeMs: Date.now() - start,
      error: e instanceof Error ? e.message : "Unknown auth error",
    };
  }
}

async function checkDatabase(supabase: ReturnType<typeof createClient>): Promise<HealthCheckResult["checks"]["database"]> {
  const start = Date.now();
  try {
    const { error } = await supabase.from("profiles").select("*", { head: true, count: "exact" });
    if (error) {
      return {
        status: "unhealthy",
        responseTimeMs: Date.now() - start,
        error: error.message,
      };
    }
    return {
      status: "healthy",
      responseTimeMs: Date.now() - start,
    };
  } catch (e) {
    return {
      status: "unhealthy",
      responseTimeMs: Date.now() - start,
      error: e instanceof Error ? e.message : "Unknown database error",
    };
  }
}

async function checkEdgeFunctions(supabaseUrl: string): Promise<HealthCheckResult["checks"]["edgeFunctions"]> {
  const start = Date.now();
  const results: Record<string, {
    status: "healthy" | "unhealthy";
    responseTimeMs: number;
    statusCode?: number;
    error?: string;
  }> = {};

  let anyHealthy = false;
  let anyUnhealthy = false;

  for (const fn of EDGE_FUNCTIONS) {
    const fnStart = Date.now();
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
        method: "OPTIONS",
        headers: { "Content-Type": "application/json" },
      });

      const fnTime = Date.now() - fnStart;

      if (response.status === 204 || response.status === 200) {
        results[fn] = {
          status: "healthy",
          responseTimeMs: fnTime,
          statusCode: response.status,
        };
        anyHealthy = true;
      } else {
        results[fn] = {
          status: "unhealthy",
          responseTimeMs: fnTime,
          statusCode: response.status,
          error: `Unexpected status: ${response.status}`,
        };
        anyUnhealthy = true;
      }
    } catch (e) {
      results[fn] = {
        status: "unhealthy",
        responseTimeMs: Date.now() - fnStart,
        error: e instanceof Error ? e.message : "Unknown error",
      };
      anyUnhealthy = true;
    }
  }

  const totalTime = Date.now() - start;

  if (anyUnhealthy && !anyHealthy) {
    return {
      status: "unhealthy",
      responseTimeMs: totalTime,
      functions: results,
      error: "All edge functions are unreachable",
    };
  } else if (anyUnhealthy && anyHealthy) {
    return {
      status: "unhealthy",
      responseTimeMs: totalTime,
      functions: results,
      error: "Some edge functions are unreachable",
    };
  } else {
    return {
      status: "healthy",
      responseTimeMs: totalTime,
      functions: results,
    };
  }
}

function determineOverallStatus(
  auth: "healthy" | "unhealthy",
  db: "healthy" | "unhealthy",
  edge: "healthy" | "unhealthy",
): "healthy" | "unhealthy" | "degraded" {
  if (auth === "healthy" && db === "healthy" && edge === "healthy") {
    return "healthy";
  }
  if (db === "unhealthy") {
    return "unhealthy";
  }
  if (auth === "unhealthy" || edge === "unhealthy") {
    return "degraded";
  }
  return "healthy";
}
