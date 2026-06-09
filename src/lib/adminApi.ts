import { useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuthGuard, isAuthOrForbiddenError } from "@/lib/adminAuthGuard";
import type { PostgrestFilterBuilder, PostgrestBuilder } from "@supabase/postgrest-js";

type SupabaseClient = typeof supabase;
type AnyQuery = PromiseLike<{ data: unknown; error: unknown }>;

/**
 * Single wrapper for admin-side API calls. Routes any 401/403 from
 * PostgREST or edge functions through the shared auth guard so every
 * admin page handles unauthorized/forbidden responses identically.
 */
export function useAdminApi() {
  const handleAuthError = useAdminAuthGuard();

  const run = useCallback(
    async <T,>(query: PromiseLike<{ data: T; error: unknown }>): Promise<{ data: T | null; error: unknown }> => {
      const { data, error } = await query;
      if (error && handleAuthError(error)) {
        return { data: null, error };
      }
      return { data, error };
    },
    [handleAuthError],
  );

  const invoke = useCallback(
    async <T = unknown,>(
      fn: string,
      options?: Parameters<SupabaseClient["functions"]["invoke"]>[1],
    ): Promise<{ data: T | null; error: unknown }> => {
      const { data, error } = await supabase.functions.invoke<T>(fn, options);
      if (error && handleAuthError(error)) {
        return { data: null, error };
      }
      return { data: data ?? null, error };
    },
    [handleAuthError],
  );

  const auth = useMemo(
    () => ({
      updateUser: async (
        attrs: Parameters<SupabaseClient["auth"]["updateUser"]>[0],
      ) => {
        const { data, error } = await supabase.auth.updateUser(attrs);
        if (error && handleAuthError(error)) {
          return { data: null, error };
        }
        return { data, error };
      },
    }),
    [handleAuthError],
  );

  return { run, invoke, auth, handleAuthError, isAuthOrForbiddenError };
}
