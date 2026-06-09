import { useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuthGuard, isAuthOrForbiddenError } from "@/lib/adminAuthGuard";

type SupabaseClient = typeof supabase;

/**
 * Single wrapper for admin-side API calls. Routes any 401/403 from
 * PostgREST or edge functions through the shared auth guard so every
 * admin page handles unauthorized/forbidden responses identically.
 */
export function useAdminApi() {
  const handleAuthError = useAdminAuthGuard();

  // Run any Supabase query/builder; preserves all response fields (data, error, count, status).
  const run = useCallback(
    async <R extends { error: unknown }>(query: PromiseLike<R>): Promise<R> => {
      const result = await query;
      if (result.error) handleAuthError(result.error);
      return result;
    },
    [handleAuthError],
  );

  const invoke = useCallback(
    async <T = unknown,>(
      fn: string,
      options?: Parameters<SupabaseClient["functions"]["invoke"]>[1],
    ) => {
      const result = await supabase.functions.invoke<T>(fn, options);
      if (result.error) handleAuthError(result.error);
      return result;
    },
    [handleAuthError],
  );

  const auth = useMemo(
    () => ({
      updateUser: async (
        attrs: Parameters<SupabaseClient["auth"]["updateUser"]>[0],
      ) => {
        const result = await supabase.auth.updateUser(attrs);
        if (result.error) handleAuthError(result.error);
        return result;
      },
    }),
    [handleAuthError],
  );

  return { run, invoke, auth, handleAuthError, isAuthOrForbiddenError };
}
