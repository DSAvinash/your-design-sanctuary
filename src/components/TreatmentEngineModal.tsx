import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CROPS } from "@/lib/cropKnowledge";
import { ScanRecord } from "@/lib/diagnosis";
import { Loader2, MapPin, Sprout, Beaker, Leaf, ShieldAlert, CloudRain } from "lucide-react";

type Severity = "low" | "medium" | "high";
type Step = "intake" | "loading" | "result";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  latestScan?: ScanRecord | null;
  language: string;
}

interface TreatmentResponse {
  crop: string;
  disease: string;
  severity: Severity;
  immediateActions: string[];
  treatment: {
    chemical: { name: string; dosage: string; frequency: string; phi_days?: number } | null;
    organic: { name: string; dosage: string; frequency: string } | null;
    cultural: string[];
  };
  prevention: string[];
  alerts: string[];
  notes?: string | null;
  weather?: {
    temperatureC: number | null;
    humidity: number | null;
    rainNext24hMm: number | null;
    rainNext72hMm: number | null;
    description: string;
  } | null;
  dosageCalc: {
    landAcres: number;
    totalSprayVolumeLitres: number;
    chemicalAmount: string | null;
  };
  aiBrief?: string | null;
  explanation?: string | null;
  suggestedDiseases?: Array<{ disease: string; probability: number }>;
}

const severityColor: Record<Severity, string> = {
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-red-100 text-red-800 border-red-200",
};

export default function TreatmentEngineModal({ open, onOpenChange, latestScan, language }: Props) {
  const [step, setStep] = useState<Step>("intake");
  const [crop, setCrop] = useState("");
  const [disease, setDisease] = useState("");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [symptoms, setSymptoms] = useState("");
  const [growthStage, setGrowthStage] = useState("");
  const [landAcres, setLandAcres] = useState("1");
  const [locationName, setLocationName] = useState("");
  const [coords, setCoords] = useState<{ lat?: number; lon?: number }>({});
  const [result, setResult] = useState<TreatmentResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cropOptions = useMemo(() => CROPS.map((c) => c.name), []);

  // Pre-fill from latest scan
  useEffect(() => {
    if (open && latestScan) {
      const scanDisease = latestScan.result.disease ?? "";
      // Extract crop name from disease string if formatted "Crop - Disease"
      const parts = scanDisease.split(" - ");
      if (parts.length === 2) {
        setCrop(parts[0]);
        setDisease(parts[1]);
      } else {
        setDisease(scanDisease);
      }
      const sev = (latestScan.result.severity ?? "").toLowerCase();
      if (sev.includes("high") || sev.includes("severe")) setSeverity("high");
      else if (sev.includes("low") || sev.includes("mild")) setSeverity("low");
      else setSeverity("medium");
    }
  }, [open, latestScan]);

  const reset = () => {
    setStep("intake");
    setResult(null);
    setErrorMsg(null);
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
    if (!crop.trim()) {
      toast({ title: "Please pick a crop", variant: "destructive" });
      return;
    }
    setStep("loading");
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke("treatment-engine", {
        body: {
          crop: crop.trim().toLowerCase(),
          disease: disease.trim() || undefined,
          severity,
          symptoms: symptoms
            .split(/[,\n]/)
            .map((s) => s.trim())
            .filter(Boolean),
          growthStage: growthStage.trim() || undefined,
          landSizeAcres: Number(landAcres) || 1,
          location: { ...coords, name: locationName.trim() || undefined },
          language,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) {
        setErrorMsg(data.error);
        setResult(data as TreatmentResponse);
        setStep("result");
        return;
      }
      setResult(data as TreatmentResponse);
      setStep("result");
    } catch (e) {
      console.error(e);
      toast({
        title: "Treatment Engine failed",
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
            <Sprout className="h-6 w-6 text-primary" />
            Treatment Engine
          </DialogTitle>
        </DialogHeader>

        {step === "intake" && (
          <div className="space-y-4 pt-2">
            {latestScan && (
              <div className="rounded-xl border border-secondary/20 bg-secondary-container/40 p-3 text-sm">
                <p className="font-semibold text-primary">Pre-filled from latest scan:</p>
                <p className="text-on-surface-variant">{latestScan.result.disease}</p>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Crop *</Label>
                <select
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select crop…</option>
                  {cropOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Disease (optional)</Label>
                <Input
                  value={disease}
                  onChange={(e) => setDisease(e.target.value)}
                  placeholder="e.g. Early Blight"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Severity</Label>
              <div className="mt-1 flex gap-2">
                {(["low", "medium", "high"] as Severity[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                      severity === s ? severityColor[s] : "border-input bg-background hover:bg-muted"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Symptoms (comma-separated, optional)</Label>
              <Textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="brown spots, yellowing leaves"
                rows={2}
                className="mt-1"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Growth stage</Label>
                <Input
                  value={growthStage}
                  onChange={(e) => setGrowthStage(e.target.value)}
                  placeholder="e.g. flowering"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Land size (acres)</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={landAcres}
                  onChange={(e) => setLandAcres(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Location (for weather alerts)</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="District / lat,lon"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={useMyLocation}>
                  <MapPin className="mr-1 h-4 w-4" /> GPS
                </Button>
              </div>
            </div>

            <Button onClick={submit} className="w-full" size="lg">
              Generate Treatment Plan
            </Button>
          </div>
        )}

        {step === "loading" && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-on-surface-variant">
              Consulting treatment library, weather, and AI agronomist…
            </p>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-4 pt-2">
            {errorMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {errorMsg}
                {result.suggestedDiseases && result.suggestedDiseases.length > 0 && (
                  <div className="mt-2">
                    Suggested:{" "}
                    {result.suggestedDiseases.map((s) => (
                      <Badge key={s.disease} variant="secondary" className="mr-1">
                        {s.disease} ({Math.round(s.probability * 100)}%)
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!errorMsg && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-headline text-xl font-bold capitalize text-primary">
                    {result.crop} — {result.disease}
                  </h3>
                  <Badge className={`${severityColor[result.severity]} border capitalize`}>
                    {result.severity} severity
                  </Badge>
                </div>

                {result.aiBrief && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm leading-6">
                    {result.aiBrief}
                  </div>
                )}

                {result.weather && (
                  <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                    <CloudRain className="h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-semibold">{result.weather.description}</p>
                      <p className="text-xs opacity-80">
                        {result.weather.temperatureC ?? "—"}°C, {result.weather.humidity ?? "—"}% RH,{" "}
                        rain next 24h: {result.weather.rainNext24hMm ?? 0} mm
                      </p>
                    </div>
                  </div>
                )}

                <Section icon={<ShieldAlert className="h-4 w-4" />} title="Immediate actions">
                  <ul className="list-disc space-y-1 pl-5">
                    {result.immediateActions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </Section>

                {result.treatment.chemical && (
                  <Section icon={<Beaker className="h-4 w-4" />} title="Chemical treatment">
                    <p className="font-semibold">{result.treatment.chemical.name}</p>
                    <p className="text-sm">Dosage: {result.treatment.chemical.dosage}</p>
                    <p className="text-sm">Frequency: {result.treatment.chemical.frequency}</p>
                    {result.treatment.chemical.phi_days != null && (
                      <p className="text-xs text-on-surface-variant">
                        Pre-harvest interval: {result.treatment.chemical.phi_days} days
                      </p>
                    )}
                    {result.dosageCalc.chemicalAmount && (
                      <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">
                        For {result.dosageCalc.landAcres} acre(s) →{" "}
                        ~{result.dosageCalc.totalSprayVolumeLitres} L spray mix total
                      </p>
                    )}
                  </Section>
                )}

                {result.treatment.organic && (
                  <Section icon={<Leaf className="h-4 w-4" />} title="Organic option">
                    <p className="font-semibold">{result.treatment.organic.name}</p>
                    <p className="text-sm">Dosage: {result.treatment.organic.dosage}</p>
                    <p className="text-sm">Frequency: {result.treatment.organic.frequency}</p>
                  </Section>
                )}

                {result.treatment.cultural?.length > 0 && (
                  <Section icon={<Sprout className="h-4 w-4" />} title="Cultural practices">
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {result.treatment.cultural.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </Section>
                )}

                {result.prevention?.length > 0 && (
                  <Section title="Prevention">
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {result.prevention.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </Section>
                )}

                {result.alerts?.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <p className="mb-1 font-semibold">⚠️ Risk alerts</p>
                    <ul className="list-disc space-y-1 pl-5">
                      {result.alerts.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.explanation && (
                  <details className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3 text-sm">
                    <summary className="cursor-pointer font-semibold">Why this treatment?</summary>
                    <p className="mt-2 text-on-surface-variant">{result.explanation}</p>
                  </details>
                )}

                {result.notes && (
                  <p className="text-xs italic text-on-surface-variant">{result.notes}</p>
                )}
              </>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={reset}>
                New plan
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
      <p className="mb-2 flex items-center gap-2 font-headline text-sm font-bold uppercase tracking-wide text-primary">
        {icon}
        {title}
      </p>
      <div className="text-sm text-on-surface">{children}</div>
    </div>
  );
}
