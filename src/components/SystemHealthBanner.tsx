import { useState } from "react";
import { AlertTriangle, X, RefreshCw } from "lucide-react";
import { useHealthCheck, type HealthCheck } from "@/hooks/useHealthCheck";

function getStatusColor(status: HealthCheck["status"]) {
  switch (status) {
    case "degraded":
      return {
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-800",
        icon: "text-amber-600",
      };
    case "unhealthy":
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-800",
        icon: "text-red-600",
      };
    default:
      return {
        bg: "bg-transparent",
        border: "border-transparent",
        text: "text-transparent",
        icon: "text-transparent",
      };
  }
}

export function SystemHealthBanner() {
  const { health, loading, refetch } = useHealthCheck();
  const [dismissed, setDismissed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  if (loading || !health) return null;
  if (health.status === "healthy") return null;
  if (dismissed) return null;

  const colors = getStatusColor(health.status);
  const isDegraded = health.status === "degraded";

  const handleRetry = async () => {
    setRetrying(true);
    await refetch();
    setRetrying(false);
  };

  return (
    <div
      className={`fixed top-20 left-0 right-0 z-40 ${colors.bg} border-b ${colors.border} px-4 py-2.5 shadow-sm`}
    >
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <AlertTriangle className={`h-4 w-4 shrink-0 ${colors.icon}`} />
          <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 min-w-0">
            <span className={`text-sm font-medium ${colors.text}`}>
              {isDegraded ? "Service Degraded" : "Service Disruption"}
            </span>
            <span className={`text-xs ${colors.text} opacity-80 truncate`}>
              {isDegraded
                ? "Some services are experiencing issues. Functionality may be limited."
                : "Services are currently unavailable. Please try again shortly."}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRetry}
            disabled={retrying}
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border ${colors.border} hover:bg-black/5 transition-colors ${colors.text} disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label="Retry health check"
            title="Retry health check"
          >
            <RefreshCw className={`h-3 w-3 ${retrying ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{retrying ? "Checking..." : "Retry"}</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className={`p-1 rounded hover:bg-black/5 transition-colors ${colors.text}`}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
