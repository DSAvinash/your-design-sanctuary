import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { loadScans } from "@/lib/diagnosis";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import {
  CloudRain,
  Droplets,
  Bug,
  Sparkles,
  MapPin,
  Loader2,
  RefreshCw,
  Clipboard,
  Download,
  Share2,
  MessageCircle,
  Send,
  Mail,
  Phone,
} from "lucide-react";

type RiskLevel = "low" | "medium" | "high";
type IrrigationAction = "delay" | "irrigate" | "monitor";

interface AdvisoryResponse {
  error?: string;
  message?: string;
  location: string;
  crop: string | null;
  disease: string | null;
  severity: string | null;
  weather: {
    temperatureC: number | null;
    humidity: number | null;
    windKph: number | null;
    rainNext24hMm: number;
    rainProbabilityNext24h: number;
  };
  irrigation: { action: IrrigationAction; reason: string };
  diseaseRisk: { level: RiskLevel; reasons: string[] };
  actions: string[];
  aiBrief: string | null;
  generatedAt: number;
}

const COORDS_KEY = "agrovision.todaysplan.coords";

const riskColor: Record<RiskLevel, string> = {
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-red-100 text-red-800 border-red-200",
};
const irrigationColor: Record<IrrigationAction, string> = {
  delay: "bg-blue-100 text-blue-800 border-blue-200",
  irrigate: "bg-amber-100 text-amber-800 border-amber-200",
  monitor: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export default function TodaysPlanWidget() {
  const latestScan = useMemo(() => loadScans()[0] ?? null, []);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(() => {
    try {
      const raw = localStorage.getItem(COORDS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AdvisoryResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPlan = async (c: { lat: number; lon: number }) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const scanPayload = latestScan
        ? {
            crop: (() => {
              const parts = (latestScan.result.disease ?? "").split(" - ");
              return parts.length === 2 ? parts[0] : null;
            })(),
            disease: latestScan.result.disease,
            severity: latestScan.result.severity,
            confidence: latestScan.result.confidence,
          }
        : null;

      const { data: res, error } = await supabase.functions.invoke("unified-advisory", {
        body: { location: { ...c }, latestScan: scanPayload, language: "en" },
      });

      let payload: AdvisoryResponse | null = (res as AdvisoryResponse | null) ?? null;
      if (error) {
        if (error instanceof FunctionsHttpError && error.context) {
          try {
            const b = await error.context.json();
            if (b && typeof b === "object") payload = b as AdvisoryResponse;
          } catch {
            /* */
          }
        }
        if (!payload) throw error;
      }
      if (!payload) throw new Error("Empty response");
      if (payload.error) {
        setErrorMsg(payload.message ?? payload.error);
        setData(null);
        return;
      }
      setData(payload);
    } catch (e) {
      console.error(e);
      setErrorMsg(e instanceof Error ? e.message : "Failed to load Today's Plan");
    } finally {
      setLoading(false);
    }
  };

  // Auto-load once we have coords
  useEffect(() => {
    if (coords) void fetchPlan(coords);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords?.lat, coords?.lon]);

  const enableLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        localStorage.setItem(COORDS_KEY, JSON.stringify(c));
        setCoords(c);
      },
      () => toast({ title: "Could not get location", variant: "destructive" }),
    );
  };

  const composeMessage = () => {
    if (!data) return "";
    const lines = [
      `🌱 AgroVision — Today's Plan (${new Date(data.generatedAt).toLocaleDateString()})`,
      data.aiBrief ?? "",
      "",
      `💧 Irrigation: ${data.irrigation.action.toUpperCase()} — ${data.irrigation.reason}`,
      `🦠 Disease risk: ${data.diseaseRisk.level.toUpperCase()}`,
      "",
      "Today's actions:",
      ...data.actions.map((a, i) => `${i + 1}. ${a}`),
    ];
    return lines.filter(Boolean).join("\n").slice(0, 1400);
  };

  const copyPlan = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(composeMessage());
      toast({ title: "Plan copied" });
    } catch (e) {
      console.error(e);
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const sharePlan = async () => {
    if (!data) return;
    const message = composeMessage();
    if (navigator.share) {
      try {
        await navigator.share({ title: "AgroVision Today's Plan", text: message });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    await copyPlan();
  };

  const shareVia = (target: "whatsapp" | "telegram" | "email" | "sms") => {
    if (!data) return;
    const message = composeMessage();
    const encoded = encodeURIComponent(message);
    const subject = encodeURIComponent("AgroVision — Today's Plan");
    const urls: Record<typeof target, string> = {
      whatsapp: `https://wa.me/?text=${encoded}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent("https://agrovision.app")}&text=${encoded}`,
      email: `mailto:?subject=${subject}&body=${encoded}`,
      sms: `sms:?&body=${encoded}`,
    };
    const url = urls[target];
    // Break out of iframe sandboxes (e.g. Lovable preview) — WhatsApp/Telegram
    // refuse to load inside iframes (ERR_BLOCKED_BY_RESPONSE).
    const top = window.top ?? window;
    try {
      const opened = top.open(url, "_blank", "noopener,noreferrer");
      if (!opened) top.location.href = url;
    } catch {
      window.location.href = url;
    }
  };

  const downloadPlan = () => {
    if (!data) return;
    const blob = new Blob([composeMessage()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agrovision-todays-plan-${new Date(data.generatedAt).toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Plan downloaded" });
  };

  return (
    <section className="mx-auto my-12 max-w-5xl px-6">
      <div className="rounded-[2.5rem] border border-outline-variant/30 bg-gradient-to-br from-primary/5 via-surface-container-lowest to-secondary-container/30 p-6 shadow-[0_24px_60px_rgba(40,45,26,0.08)] md:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-on-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="font-headline text-[11px] uppercase tracking-[0.32em] text-primary/70">
                Smart Field Brief
              </p>
              <h2 className="font-headline text-2xl font-bold text-primary md:text-3xl">
                Today's Plan
              </h2>
            </div>
          </div>
          {coords && (
            <Button variant="outline" size="sm" onClick={() => fetchPlan(coords)} disabled={loading}>
              <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}
        </div>

        {!coords && (
          <div className="rounded-2xl border border-dashed border-outline-variant/60 bg-surface p-6 text-center">
            <MapPin className="mx-auto mb-2 h-8 w-8 text-primary" />
            <p className="text-sm text-on-surface-variant">
              Enable location to fuse your latest scan with live weather into one daily action plan.
            </p>
            <Button onClick={enableLocation} className="mt-4">
              <MapPin className="mr-1 h-4 w-4" /> Use my location
            </Button>
          </div>
        )}

        {coords && loading && !data && (
          <div className="flex items-center justify-center gap-3 py-12 text-sm text-on-surface-variant">
            <Loader2 className="h-5 w-5 animate-spin" /> Generating Today's Plan…
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {errorMsg}
          </div>
        )}

        {data && (
          <div className="space-y-4">
            {/* AI brief headline */}
            {data.aiBrief && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-7 text-on-surface md:text-base">
                {data.aiBrief}
              </div>
            )}

            {/* 3 quick cards */}
            <div className="grid gap-3 md:grid-cols-3">
              <PlanCard
                icon={<Droplets className="h-4 w-4" />}
                title="Irrigation"
                badge={data.irrigation.action}
                badgeClass={irrigationColor[data.irrigation.action]}
                body={data.irrigation.reason}
              />
              <PlanCard
                icon={<Bug className="h-4 w-4" />}
                title="Disease risk"
                badge={`${data.diseaseRisk.level} risk`}
                badgeClass={riskColor[data.diseaseRisk.level]}
                body={data.diseaseRisk.reasons.join(" ")}
              />
              <PlanCard
                icon={<CloudRain className="h-4 w-4" />}
                title="Weather now"
                body={`${data.weather.temperatureC ?? "—"}°C · ${data.weather.humidity ?? "—"}% RH · rain 24h: ${data.weather.rainNext24hMm}mm (${data.weather.rainProbabilityNext24h}%)`}
              />
            </div>

            {/* Actions */}
            <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-4">
              <p className="mb-2 font-headline text-sm font-bold uppercase tracking-[0.18em] text-primary">
                Do this today
              </p>
              <ol className="space-y-2 text-sm">
                {data.actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-on-primary">
                      {i + 1}
                    </span>
                    <span>{a}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Plan actions */}
            <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-4">
              <p className="mb-2 font-headline text-sm font-bold uppercase tracking-[0.18em] text-primary">
                Save or share plan
              </p>
              <div className="flex flex-col gap-2 md:flex-row">
                <Button variant="outline" onClick={copyPlan} className="justify-start md:flex-1">
                  <Clipboard className="mr-2 h-4 w-4" /> Copy
                </Button>
                <Button variant="outline" onClick={downloadPlan} className="justify-start md:flex-1">
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button className="justify-start md:flex-1">
                      <Share2 className="mr-2 h-4 w-4" /> Share
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 p-2">
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" className="justify-start" onClick={() => shareVia("whatsapp")}>
                        <MessageCircle className="mr-2 h-4 w-4 text-emerald-600" /> WhatsApp
                      </Button>
                      <Button variant="ghost" className="justify-start" onClick={() => shareVia("telegram")}>
                        <Send className="mr-2 h-4 w-4 text-sky-600" /> Telegram
                      </Button>
                      <Button variant="ghost" className="justify-start" onClick={() => shareVia("email")}>
                        <Mail className="mr-2 h-4 w-4 text-primary" /> Email
                      </Button>
                      <Button variant="ghost" className="justify-start" onClick={() => shareVia("sms")}>
                        <Phone className="mr-2 h-4 w-4 text-primary" /> SMS app
                      </Button>
                      <Button variant="ghost" className="justify-start" onClick={sharePlan}>
                        <Share2 className="mr-2 h-4 w-4" /> More…
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <p className="mt-2 text-xs text-on-surface-variant">
                Copy the field brief, save it offline, or share it through apps already on your device.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
              <MapPin className="h-3 w-3" /> {data.location}
              <span>·</span>
              <span>Updated {new Date(data.generatedAt).toLocaleTimeString()}</span>
              {data.disease && (
                <>
                  <span>·</span>
                  <Badge variant="secondary" className="text-[10px]">
                    Last scan: {data.disease}
                  </Badge>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function PlanCard({
  icon,
  title,
  badge,
  badgeClass,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  badgeClass?: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-4">
      <div className="mb-1 flex items-center gap-2 text-primary">
        {icon}
        <span className="font-headline text-xs font-bold uppercase tracking-[0.18em]">{title}</span>
      </div>
      {badge && (
        <Badge className={`${badgeClass} mb-2 border capitalize`}>{badge}</Badge>
      )}
      <p className="text-sm text-on-surface-variant">{body}</p>
    </div>
  );
}
