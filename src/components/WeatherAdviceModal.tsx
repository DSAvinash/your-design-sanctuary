import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { CROPS } from "@/lib/cropKnowledge";
import {
  Loader2,
  MapPin,
  CloudRain,
  Droplets,
  Bug,
  ListChecks,
  Wind,
  Thermometer,
} from "lucide-react";

type RiskLevel = "low" | "medium" | "high";
type Step = "intake" | "loading" | "result";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: string;
}

interface WeatherAdviceResponse {
  error?: string;
  location: string;
  crop: string | null;
  growthStage: string | null;
  weather: {
    temperatureC: number | null;
    humidity: number | null;
    windKph: number | null;
    rainNext24hMm: number;
    rainNext72hMm: number;
    rainProbabilityNext24h: number;
    description: string;
  };
  irrigation: { action: "delay" | "irrigate" | "monitor"; reason: string; nextWindow: string };
  diseaseRisk: { level: RiskLevel; reason: string; likely: string[]; actions: string[] };
  scouting: string[];
  aiBrief?: string | null;
}

const riskColor: Record<RiskLevel, string> = {
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-red-100 text-red-800 border-red-200",
};

const irrigationColor: Record<WeatherAdviceResponse["irrigation"]["action"], string> = {
  delay: "bg-blue-100 text-blue-800 border-blue-200",
  irrigate: "bg-amber-100 text-amber-800 border-amber-200",
  monitor: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export default function WeatherAdviceModal({ open, onOpenChange, language }: Props) {
  const [step, setStep] = useState<Step>("intake");
  const [crop, setCrop] = useState("");
  const [growthStage, setGrowthStage] = useState("");
  const [locationName, setLocationName] = useState("");
  const [coords, setCoords] = useState<{ lat?: number; lon?: number }>({});
  const [result, setResult] = useState<WeatherAdviceResponse | null>(null);

  const reset = () => {
    setStep("intake");
    setResult(null);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocationName(`${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`);
        toast({ title: "Location captured" });
      },
      () => toast({ title: "Could not get location", variant: "destructive" }),
    );
  };

  const submit = async () => {
    if (!coords.lat || !coords.lon) {
      // try to parse "lat,lon" out of the typed location
      const m = locationName.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
      if (m) {
        setCoords({ lat: parseFloat(m[1]), lon: parseFloat(m[2]) });
      } else {
        toast({
          title: "Location required",
          description: "Tap GPS or enter coordinates as lat,lon",
          variant: "destructive",
        });
        return;
      }
    }
    setStep("loading");
    try {
      const { data, error } = await supabase.functions.invoke("weather-advice", {
        body: {
          crop: crop.trim() || undefined,
          growthStage: growthStage.trim() || undefined,
          location: { ...coords, name: locationName.trim() || undefined },
          language,
        },
      });

      let payload: WeatherAdviceResponse | null = (data as WeatherAdviceResponse | null) ?? null;
      if (error) {
        if (error instanceof FunctionsHttpError && error.context) {
          try {
            const body = await error.context.json();
            if (body && typeof body === "object") payload = body as WeatherAdviceResponse;
          } catch {
            /* ignore */
          }
        }
        if (!payload) throw error instanceof Error ? error : new Error(String(error));
      }
      if (!payload) throw new Error("Empty response from server");

      if (payload.error) {
        toast({ title: "Weather advice failed", description: payload.error, variant: "destructive" });
        setStep("intake");
        return;
      }
      setResult(payload);
      setStep("result");
    } catch (e) {
      console.error(e);
      toast({
        title: "Weather advice failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
      setStep("intake");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline text-2xl">
            <CloudRain className="h-6 w-6 text-primary" />
            Weather-Aware Advice
          </DialogTitle>
        </DialogHeader>

        {step === "intake" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-on-surface-variant">
              Get irrigation timing, disease-risk warnings, and a scouting checklist based on live
              weather for your field.
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Crop (optional)</Label>
                <select
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Any / generic advice</option>
                  {CROPS.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Growth stage (optional)</Label>
                <Input
                  value={growthStage}
                  onChange={(e) => setGrowthStage(e.target.value)}
                  placeholder="e.g. flowering"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Field location *</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="lat,lon (e.g. 12.97, 77.59)"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={useMyLocation}>
                  <MapPin className="mr-1 h-4 w-4" /> GPS
                </Button>
              </div>
              <p className="mt-1 text-xs text-on-surface-variant">
                We use Open-Meteo (free, no key) — coordinates only, no personal data stored.
              </p>
            </div>

            <Button onClick={submit} className="w-full" size="lg">
              Get Field Advice
            </Button>
          </div>
        )}

        {step === "loading" && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-on-surface-variant">
              Fetching weather and generating field advice…
            </p>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-4 pt-2">
            {/* Header weather summary */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-blue-700">{result.location}</p>
                  <p className="font-headline text-lg font-bold text-blue-900">
                    {result.weather.description}
                  </p>
                </div>
                <div className="text-right text-xs text-blue-900">
                  <p className="flex items-center justify-end gap-1">
                    <Thermometer className="h-3 w-3" /> {result.weather.temperatureC ?? "—"}°C
                  </p>
                  <p className="flex items-center justify-end gap-1">
                    <Droplets className="h-3 w-3" /> {result.weather.humidity ?? "—"}% RH
                  </p>
                  <p className="flex items-center justify-end gap-1">
                    <Wind className="h-3 w-3" /> {result.weather.windKph ?? "—"} kph
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-blue-800">
                Rain next 24h: {result.weather.rainNext24hMm}mm ({result.weather.rainProbabilityNext24h}%
                chance) · 72h total: {result.weather.rainNext72hMm}mm
              </p>
            </div>

            {result.aiBrief && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm leading-6">
                {result.aiBrief}
              </div>
            )}

            {/* Irrigation */}
            <Section icon={<Droplets className="h-4 w-4" />} title="Irrigation Advice">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`${irrigationColor[result.irrigation.action]} border capitalize`}>
                  {result.irrigation.action}
                </Badge>
                <span className="text-sm font-medium">{result.irrigation.nextWindow}</span>
              </div>
              <p className="mt-2 text-sm text-on-surface-variant">{result.irrigation.reason}</p>
            </Section>

            {/* Disease risk */}
            <Section icon={<Bug className="h-4 w-4" />} title="Disease Risk">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`${riskColor[result.diseaseRisk.level]} border capitalize`}>
                  {result.diseaseRisk.level} risk
                </Badge>
              </div>
              <p className="mt-2 text-sm text-on-surface-variant">{result.diseaseRisk.reason}</p>
              {result.diseaseRisk.likely.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {result.diseaseRisk.likely.map((d) => (
                    <Badge key={d} variant="secondary" className="text-xs">
                      {d}
                    </Badge>
                  ))}
                </div>
              )}
              {result.diseaseRisk.actions.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {result.diseaseRisk.actions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              )}
            </Section>

            {/* Scouting checklist */}
            <Section icon={<ListChecks className="h-4 w-4" />} title="Scouting Checklist">
              <ul className="space-y-2 text-sm">
                {result.scouting.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1 h-4 w-4 accent-primary" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={reset}>
                New advice
              </Button>
              <Button className="flex-1" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-3">
      <div className="mb-2 flex items-center gap-2 font-semibold text-primary">
        {icon}
        <span>{title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}
