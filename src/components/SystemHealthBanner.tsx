import { useState } from "react";
import { AlertTriangle, X, Server, Database, ShieldAlert } from "lucide-react";
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

function formatErrorDetail(health: HealthCheck): string {
  const parts: string[] = [];
  if (health.checks.auth.status === "unhealthy" && health.checks.auth.error) {
    parts.push(`Auth: ${health.checks.auth.error}`);
  }
  if (health.checks.database.status === "unhealthy" && health.checks.database.error) {
    parts.push(`DB: ${health.checks.database.error}`);
  }
  if (health.checks.edgeFunctions.status === "unhealthy" && health.checks.edgeFunctions.error) {
    parts.push(`Edge: ${health.checks.edgeFunctions.error}`);
  }
  return parts.join(" · ") || "Some services are experiencing issues.";
}

export function SystemHealthBanner() {
  const { health, loading } = useHealthCheck();
  const [dismissed, setDismissed] = useState(false);

  if (loading || !health) return null;
  if (health.status === "healthy") return null;
  if (dismissed) return null;

  const colors = getStatusColor(health.status);
  const isDegraded = health.status === "degraded";

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
              {formatErrorDetail(health)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            {health.checks.auth.status === "unhealthy" && (
              <ShieldAlert className={`h-3.5 w-3.5 ${colors.icon}`} title="Auth" />
            )}
            {health.checks.database.status === "unhealthy" && (
              <Database className={`h-3.5 w-3.5 ${colors.icon}`} title="Database" />
            )}
            {health.checks.edgeFunctions.status === "unhealthy" && (
              <Server className={`h-3.5 w-3.5 ${colors.icon}`} title="Edge Functions" />
            )}
          </div>
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
