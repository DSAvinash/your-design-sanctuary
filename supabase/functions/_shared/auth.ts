// Shared JWT verification helper for edge functions.
// Returns the authenticated user, or null if no/invalid token.
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

export function unauthorizedResponse(corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
