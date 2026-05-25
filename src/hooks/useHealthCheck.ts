import { useState, useEffect, useCallback, useRef } from "react";

export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

export interface HealthCheck {
  status: HealthStatus;
  timestamp: string;
}

const POLL_INTERVAL_MS = 30000;
const HEALTH_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health`;

export function useHealthCheck() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const response = await fetch(HEALTH_ENDPOINT, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      setHealth({
        status: (data?.status as HealthStatus) ?? "unknown",
        timestamp: data?.timestamp ?? new Date().toISOString(),
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Health check failed");
      setHealth({ status: "unhealthy", timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    intervalRef.current = setInterval(fetchHealth, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchHealth]);

  return { health, loading, error, refetch: fetchHealth };
}
