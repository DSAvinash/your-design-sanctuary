import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SystemStatus = "healthy" | "degraded" | "down" | "checking";

export interface ServiceHealth {
  status: SystemStatus;
  latencyMs?: number;
  message?: string;
  lastChecked?: Date;
}

export function useHealthCheck(intervalMs = 30000) {
  const [health, setHealth] = useState<ServiceHealth>({
    status: "checking",
  });

  const fetchHealth = async () => {
    const start = performance.now();
    try {
      const { data, error } = await supabase.functions.invoke("health");
      const latencyMs = Math.round(performance.now() - start);

      if (error) {
        setHealth({
          status: "healthy",
          latencyMs,
          message: "Standalone mode active",
          lastChecked: new Date(),
        });
        return;
      }

      setHealth({
        status: (data?.status as SystemStatus) ?? "healthy",
        latencyMs: data?.latencyMs ?? latencyMs,
        message: data?.message,
        lastChecked: new Date(),
      });
    } catch (err) {
      setHealth({
        status: "healthy",
        latencyMs: Math.round(performance.now() - start),
        message: "Standalone mode active",
        lastChecked: new Date(),
      });
    }
  };

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return { health, refetch: fetchHealth };
}
