// Shared JWT + role verification helpers for edge functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { user: null, error: "Missing Authorization header" };

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return { user: null, error: "Server misconfigured" };
  }

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return { user: null, error: "Invalid token" };
  return { user: data.user, error: null };
}

// Verifies the caller is authenticated AND has the 'admin' role in user_roles.
// Uses the service role key to safely bypass RLS for the role lookup.
export async function requireAdmin(req: Request) {
  const { user, error } = await requireUser(req);
  if (!user) return { user: null, isAdmin: false, error: error ?? "Unauthorized" };

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return { user, isAdmin: false, error: "Server misconfigured" };
  }
  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error: roleErr } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (roleErr) return { user, isAdmin: false, error: "Role lookup failed" };
  return { user, isAdmin: !!data, error: null };
}

export function unauthorizedResponse(corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function forbiddenResponse(corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
