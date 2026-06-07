import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCallback } from "react";

/**
 * Detects auth/permission failures coming from PostgREST or edge functions.
 * Covers expired/missing JWT (401) and admin-role rejections (403 / 42501).
 */
export function isAuthOrForbiddenError(err: unknown): "unauthorized" | "forbidden" | null {
  if (!err || typeof err !== "object") return null;
  const anyErr = err as Record<string, unknown>;

  const status = Number(anyErr.status ?? (anyErr as { context?: { status?: number } }).context?.status ?? 0);
  const code = String(anyErr.code ?? "");
  const message = String(anyErr.message ?? "").toLowerCase();

  if (status === 401 || code === "PGRST301" || message.includes("jwt") || message.includes("unauthorized")) {
    return "unauthorized";
  }
  if (status === 403 || code === "42501" || message.includes("forbidden") || message.includes("permission denied")) {
    return "forbidden";
  }
  return null;
}

/**
 * Returns a handler that, when given an error, redirects to /admin/login
 * with a toast for 401/403 responses. Returns true if it handled the error.
 */
export function useAdminAuthGuard() {
  const navigate = useNavigate();
  return useCallback(
    (err: unknown): boolean => {
      const kind = isAuthOrForbiddenError(err);
      if (!kind) return false;
      if (kind === "unauthorized") {
        toast.error("Your session has expired. Please sign in again.");
      } else {
        toast.error("You don't have permission to do that. Sign in as an admin.");
      }
      navigate("/admin/login", { replace: true });
      return true;
    },
    [navigate],
  );
}
