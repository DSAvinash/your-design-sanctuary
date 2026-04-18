import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  CROPS,
  DiagnosisAnswers,
  LOCATION_OPTIONS,
  LocationId,
  rankDiseases,
  RankedDisease,
  SPREAD_OPTIONS,
  SpreadId,
  SYMPTOM_OPTIONS,
  SymptomId,
} from "@/lib/cropKnowledge";
import type { ScanRecord } from "@/lib/diagnosis";

interface Props {
  open: boolean;
  onClose: () => void;
  latestScan?: ScanRecord | null;
  language: string;
}

type Step = "scan_choice" | "crop" | "symptoms" | "location" | "spread" | "notes" | "loading" | "result";

interface AiResult {
  summary: string;
  likelyDisease: string;
  confidenceLabel: "Low" | "Medium" | "High";
  urgency: "Low" | "Medium" | "High";
  nextInspection: string[];
  organicTreatment: string[];
  chemicalTreatment: string[];
  prevention: string[];
}

const DiagnosisFlowModal = ({ open, onClose, latestScan, language }: Props) => {
  const hasScan = Boolean(latestScan);
  const [step, setStep] = useState<Step>(hasScan ? "scan_choice" : "crop");
  const [useScan, setUseScan] = useState(false);
  const [cropId, setCropId] = useState<string>("");
  const [symptoms, setSymptoms] = useState<SymptomId[]>([]);
  const [locations, setLocations] = useState<LocationId[]>([]);
  const [spread, setSpread] = useState<SpreadId | null>(null);
  const [notes, setNotes] = useState("");
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [ranked, setRanked] = useState<RankedDisease[]>([]);

  useEffect(() => {
    if (open) {
      setStep(hasScan ? "scan_choice" : "crop");
      setUseScan(false);
      setCropId("");
      setSymptoms([]);
      setLocations([]);
      setSpread(null);
      setNotes("");
      setAiResult(null);
      setRanked([]);
    }
  }, [open, hasScan]);

  const crop = useMemo(() => CROPS.find((c) => c.id === cropId), [cropId]);

  if (!open) return null;

  const toggle = <T,>(arr: T[], value: T): T[] =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  const submit = async () => {
    if (!crop) return;
    const answers: DiagnosisAnswers = {
      cropId: crop.id,
      symptoms,
      locations,
      spread,
      notes,
      scanContext:
        useScan && latestScan
          ? {
              disease: latestScan.result.disease,
              confidence: Math.round(
                latestScan.result.confidence <= 1 ? latestScan.result.confidence * 100 : latestScan.result.confidence,
              ),
              severity: latestScan.result.severity,
            }
          : null,
    };

    const ranking = rankDiseases(answers);
    setRanked(ranking);
    setStep("loading");

    try {
      const { data, error } = await supabase.functions.invoke("diagnosis-flow", {
        body: {
          cropName: crop.name,
          symptoms: symptoms.map((s) => SYMPTOM_OPTIONS.find((o) => o.id === s)?.label ?? s),
          locations: locations.map((l) => LOCATION_OPTIONS.find((o) => o.id === l)?.label ?? l),
          spread: spread ? SPREAD_OPTIONS.find((o) => o.id === spread)?.label ?? spread : null,
          notes,
          scanContext: answers.scanContext,
          topCandidates: ranking.slice(0, 3).map((r) => ({
            name: r.disease.name,
            probability: r.probability,
            type: r.disease.type,
          })),
          language,
        },
      });

      if (error) throw error;
      const result = (data as { result: AiResult })?.result;
      if (!result) throw new Error("Empty response");
      setAiResult(result);
      setStep("result");
    } catch (e) {
      console.error(e);
      toast({
        title: "Diagnosis failed",
        description: e instanceof Error ? e.message : "Could not reach AI. Showing rule-based result instead.",
        variant: "destructive",
      });
      // Fallback to rule-based only
      const top = ranking[0];
      setAiResult({
        summary: top
          ? `Based on the symptoms you described, this looks most like ${top.disease.name} (${top.disease.type}).`
          : "Not enough information to confidently diagnose. Try adding more symptoms or uploading a scan.",
        likelyDisease: top?.disease.name ?? "Unknown",
        confidenceLabel: top?.confidenceLabel ?? "Low",
        urgency: top && top.probability >= 70 ? "High" : "Medium",
        nextInspection: top?.disease.inspect ?? ["Check leaf underside", "Inspect roots", "Check soil moisture"],
        organicTreatment: ["Remove and destroy heavily affected leaves", "Apply neem-based foliar spray weekly", "Improve airflow by spacing plants"],
        chemicalTreatment: ["Consult local agri-extension before chemical use", "Use a labeled fungicide/insecticide matching the disease type", "Follow label intervals strictly"],
        prevention: ["Rotate crops every season", "Avoid overhead irrigation late in the day", "Sanitize tools between fields"],
      });
      setStep("result");
    }
  };

  const headerByStep: Record<Step, string> = {
    scan_choice: "Use your latest scan?",
    crop: "Step 1 — Which crop?",
    symptoms: "Step 2 — What symptoms?",
    location: "Step 3 — Where on the plant?",
    spread: "Step 4 — How is it spreading?",
    notes: "Step 5 — Anything else?",
    loading: "Analyzing your field signals...",
    result: "Diagnosis & action plan",
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm md:items-center md:p-6">
      <div className="flex h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[2rem] border border-outline-variant/30 bg-surface shadow-2xl md:h-[88vh] md:rounded-[2rem]">
        <header className="flex items-center justify-between border-b border-outline-variant/30 bg-primary px-6 py-4 text-on-primary">
          <div>
            <p className="font-headline text-[10px] uppercase tracking-[0.32em] text-on-primary/70">
              Guided Diagnosis Flow
            </p>
            <h2 className="font-headline text-xl font-bold">{headerByStep[step]}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === "scan_choice" && latestScan && (
            <div className="space-y-4">
              <p className="text-sm text-on-surface-variant">
                We found a recent scan. We can pre-fill the diagnosis with it or start fresh.
              </p>
              <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4">
                <div className="flex items-center gap-4">
                  <img src={latestScan.imageDataUrl} alt={latestScan.result.disease} className="h-16 w-16 rounded-xl object-cover" />
                  <div>
                    <p className="font-headline text-lg font-bold text-primary">{latestScan.result.disease}</p>
                    <p className="text-xs text-on-surface-variant">Severity: {latestScan.result.severity}</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  onClick={() => {
                    setUseScan(true);
                    setStep("crop");
                  }}
                  className="rounded-2xl bg-primary px-5 py-4 text-sm font-bold uppercase tracking-[0.2em] text-on-primary"
                >
                  Use latest scan
                </button>
                <button
                  onClick={() => {
                    setUseScan(false);
                    setStep("crop");
                  }}
                  className="rounded-2xl border border-outline-variant/40 bg-surface-container-low px-5 py-4 text-sm font-bold uppercase tracking-[0.2em] text-primary"
                >
                  Start fresh
                </button>
              </div>
            </div>
          )}

          {step === "crop" && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {CROPS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCropId(c.id);
                    setStep("symptoms");
                  }}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-colors ${
                    cropId === c.id
                      ? "border-primary bg-secondary-container text-primary"
                      : "border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container-low"
                  }`}
                >
                  <span className="text-3xl" aria-hidden>{c.emoji}</span>
                  <span className="font-headline text-sm font-bold text-primary">{c.name}</span>
                </button>
              ))}
            </div>
          )}

          {step === "symptoms" && (
            <div className="space-y-4">
              <p className="text-sm text-on-surface-variant">Select all that you see (one or more).</p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {SYMPTOM_OPTIONS.map((s) => {
                  const active = symptoms.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSymptoms((cur) => toggle(cur, s.id))}
                      className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-colors ${
                        active
                          ? "border-primary bg-secondary-container text-primary"
                          : "border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container-low"
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl">{s.icon}</span>
                      <span className="text-xs font-semibold">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === "location" && (
            <div className="space-y-4">
              <p className="text-sm text-on-surface-variant">Where is the problem visible?</p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {LOCATION_OPTIONS.map((l) => {
                  const active = locations.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      onClick={() => setLocations((cur) => toggle(cur, l.id))}
                      className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-colors ${
                        active
                          ? "border-primary bg-secondary-container text-primary"
                          : "border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container-low"
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl">{l.icon}</span>
                      <span className="text-xs font-semibold">{l.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === "spread" && (
            <div className="space-y-4">
              <p className="text-sm text-on-surface-variant">How is it spreading across your field?</p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {SPREAD_OPTIONS.map((s) => {
                  const active = spread === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSpread(s.id)}
                      className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-colors ${
                        active
                          ? "border-primary bg-secondary-container text-primary"
                          : "border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container-low"
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl">{s.icon}</span>
                      <span className="text-xs font-semibold">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === "notes" && (
            <div className="space-y-4">
              <p className="text-sm text-on-surface-variant">
                Optional — anything else (recent rain, new pesticide, weather change, growth stage)?
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="e.g. Heavy rain 2 days ago, problem started yesterday on lower leaves..."
                className="w-full resize-none rounded-2xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </div>
          )}

          {step === "loading" && (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-10">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-secondary-container border-t-primary" />
              <p className="font-headline text-sm uppercase tracking-[0.24em] text-primary">AgroAssist is reasoning...</p>
              <p className="max-w-sm text-center text-xs text-on-surface-variant">
                Combining your answers with the rule-based knowledge base and AI agronomy reasoning.
              </p>
            </div>
          )}

          {step === "result" && aiResult && (
            <div className="space-y-5">
              <div className="rounded-3xl bg-primary p-5 text-on-primary">
                <p className="font-headline text-[10px] uppercase tracking-[0.32em] text-on-primary/70">Most likely</p>
                <h3 className="mt-2 font-headline text-2xl font-bold">{aiResult.likelyDisease}</h3>
                <p className="mt-3 text-sm leading-6 text-on-primary/90">{aiResult.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.24em]">
                  <span className="rounded-full bg-white/15 px-3 py-1">Confidence: {aiResult.confidenceLabel}</span>
                  <span
                    className={`rounded-full px-3 py-1 ${
                      aiResult.urgency === "High"
                        ? "bg-error text-on-error"
                        : aiResult.urgency === "Medium"
                          ? "bg-tertiary-container text-on-tertiary-container"
                          : "bg-secondary-container text-primary"
                    }`}
                  >
                    Urgency: {aiResult.urgency}
                  </span>
                </div>
              </div>

              {ranked.length > 0 && (
                <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4">
                  <p className="font-headline text-[11px] uppercase tracking-[0.28em] text-primary/70">Other candidates</p>
                  <ul className="mt-3 space-y-2">
                    {ranked.slice(0, 3).map((r) => (
                      <li key={r.disease.id} className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-on-surface">{r.disease.name}</span>
                        <span className="text-xs text-on-surface-variant">
                          {r.probability}% · {r.confidenceLabel}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <ResultBlock title="Next field inspection" icon="search" items={aiResult.nextInspection} />
              <ResultBlock title="Organic treatment" icon="spa" items={aiResult.organicTreatment} />
              <ResultBlock title="Chemical treatment" icon="science" items={aiResult.chemicalTreatment} />
              <ResultBlock title="Prevention" icon="shield" items={aiResult.prevention} />
            </div>
          )}
        </div>

        {step !== "loading" && step !== "result" && step !== "scan_choice" && (
          <footer className="flex items-center justify-between gap-3 border-t border-outline-variant/30 bg-surface-container-low px-6 py-4">
            <button
              type="button"
              onClick={() => {
                const order: Step[] = ["crop", "symptoms", "location", "spread", "notes"];
                const idx = order.indexOf(step);
                if (idx > 0) setStep(order[idx - 1]);
                else if (hasScan) setStep("scan_choice");
              }}
              className="rounded-full border border-outline-variant/40 px-5 py-3 text-xs font-bold uppercase tracking-[0.24em] text-primary"
            >
              Back
            </button>
            <button
              type="button"
              disabled={
                (step === "crop" && !cropId) ||
                (step === "symptoms" && symptoms.length === 0) ||
                (step === "location" && locations.length === 0) ||
                (step === "spread" && !spread)
              }
              onClick={() => {
                if (step === "crop") setStep("symptoms");
                else if (step === "symptoms") setStep("location");
                else if (step === "location") setStep("spread");
                else if (step === "spread") setStep("notes");
                else if (step === "notes") void submit();
              }}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-xs font-bold uppercase tracking-[0.24em] text-on-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              {step === "notes" ? "Diagnose" : "Next"}
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </footer>
        )}

        {step === "result" && (
          <footer className="flex items-center justify-between gap-3 border-t border-outline-variant/30 bg-surface-container-low px-6 py-4">
            <button
              type="button"
              onClick={() => setStep(hasScan ? "scan_choice" : "crop")}
              className="rounded-full border border-outline-variant/40 px-5 py-3 text-xs font-bold uppercase tracking-[0.24em] text-primary"
            >
              Start over
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-primary px-6 py-3 text-xs font-bold uppercase tracking-[0.24em] text-on-primary"
            >
              Done
            </button>
          </footer>
        )}
      </div>
    </div>
  );
};

const ResultBlock = ({ title, icon, items }: { title: string; icon: string; items: string[] }) => (
  <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5">
    <div className="flex items-center gap-2">
      <span className="material-symbols-outlined text-primary">{icon}</span>
      <p className="font-headline text-sm font-bold uppercase tracking-[0.22em] text-primary">{title}</p>
    </div>
    <ul className="mt-3 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm leading-6 text-on-surface">
          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default DiagnosisFlowModal;
