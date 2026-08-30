import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "@/hooks/use-toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  DiagnosisResult,
  ScanRecord,
  diagnoseLeaf,
  fileToDataUrl,
  getModelApiUrl,
  getGeminiApiKey,
  setGeminiApiKey,
  loadScans,
  normalizeConfidence,
  saveScan,
  setModelApiUrl,
  severityColorClass,
} from "@/lib/diagnosis";

export default function LeafDiagnosis() {
  const { t } = useTranslation();
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [apiUrl, setApiUrl] = useState<string>("");
  const [geminiKey, setGeminiKey] = useState<string>("");

  useState(() => {
    setScans(loadScans());
    setApiUrl(getModelApiUrl() ?? "");
    setGeminiKey(getGeminiApiKey() ?? "");
  });

  const handleFile = async (file: File) => {
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageDataUrl(dataUrl);
      setResult(null);
    } catch (err) {
      toast({
        title: "Invalid Image",
        description: err instanceof Error ? err.message : "Please upload a clear leaf image in JPEG, PNG, or WebP format.",
        variant: "destructive",
      });
    }
  };

  const handleDiagnose = async () => {
    if (!imageDataUrl || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const res = await diagnoseLeaf(imageDataUrl);
      setResult(res);
      const record: ScanRecord = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        imageDataUrl,
        result: res,
      };
      saveScan(record);
      setScans(loadScans());
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      let desc = t("diagnosis.errorNetwork");
      if (message === "CONFIG_MISSING") {
        desc = t("diagnosis.errorConfig");
      } else if (message.includes("quota") || message.includes("429")) {
        desc = "Gemini API rate limit or quota exceeded. Please wait a moment and retry.";
      } else if (message.includes("timeout") || message.includes("timed out")) {
        desc = "Disease detection request timed out. Please retry.";
      } else if (message) {
        desc = message;
      }
      toast({
        title: t("diagnosis.errorTitle"),
        description: desc,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setImageDataUrl(null);
    setResult(null);
  };

  const confidencePct = result ? normalizeConfidence(result.confidence) : null;
  const isHealthy = result?.severity?.toLowerCase() === "healthy";

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen">
      <header className="sticky top-0 z-30 border-b border-outline-variant/30 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary">
              <span className="font-headline font-bold text-sm">AV</span>
            </div>
            <div>
              <span className="font-headline font-semibold tracking-tight">AgroVision</span>
              <span className="ml-2 rounded-md bg-secondary/15 px-2 py-0.5 text-[10px] font-semibold text-secondary uppercase tracking-widest">
                Leaf Diagnosis
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              to="/agro-assist"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10"
            >
              Ask AI Agronomist →
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm">
              <h1 className="font-headline text-2xl font-bold tracking-tight">
                {t("diagnosis.title", "Instant Leaf Disease Detection")}
              </h1>
              <p className="mt-1 text-sm text-on-surface-variant">
                {t("diagnosis.subtitle", "Upload or capture a clear photo of any affected plant leaf for automated pathology and treatment options.")}
              </p>

              <div className="mt-6">
                {!imageDataUrl ? (
                  <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-outline-variant/60 bg-surface-container-low/40 p-10 text-center cursor-pointer transition hover:border-primary/50 hover:bg-primary/5">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleFile(file);
                      }}
                    />
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      📸
                    </div>
                    <p className="mt-3 font-medium text-sm">Click to upload or drag & drop leaf photo</p>
                    <p className="mt-1 text-xs text-on-surface-variant">JPEG, PNG or WebP up to 15MB</p>
                  </label>
                ) : (
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-2xl border border-outline-variant/40 bg-black">
                      <img
                        src={imageDataUrl}
                        alt="Leaf preview"
                        className="max-h-96 w-full object-contain mx-auto"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleDiagnose}
                        disabled={isAnalyzing}
                        className="flex-1 rounded-full bg-primary py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-primary shadow-sm hover:opacity-90 disabled:opacity-50"
                      >
                        {isAnalyzing ? "Analyzing leaf with AI..." : "Detect Disease"}
                      </button>
                      <button
                        onClick={reset}
                        className="rounded-full border border-outline-variant px-5 py-3 text-xs font-semibold hover:bg-surface-container"
                      >
                        Change Photo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Results display */}
            {result && (
              <div className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-4 border-b border-outline-variant/20 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">Diagnosis Report</span>
                    <h2 className="font-headline text-xl font-bold">{result.disease}</h2>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold font-headline text-primary">{confidencePct}%</span>
                    <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Confidence</p>
                  </div>
                </div>

                {result.description && (
                  <p className="text-sm leading-relaxed text-on-surface-variant">{result.description}</p>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low/50 p-4">
                    <span className="font-bold text-xs text-primary uppercase tracking-wider">Organic Care</span>
                    <ul className="mt-2 space-y-1 text-xs text-on-surface-variant list-disc pl-4">
                      {result.treatment.organic.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low/50 p-4">
                    <span className="font-bold text-xs text-primary uppercase tracking-wider">Chemical Guidance</span>
                    <ul className="mt-2 space-y-1 text-xs text-on-surface-variant list-disc pl-4">
                      {result.treatment.chemical.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* History sidebar */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm">
              <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-on-surface">Recent Scans</h3>
              {scans.length === 0 ? (
                <p className="mt-4 text-xs text-on-surface-variant">No previous scans found on this device.</p>
              ) : (
                <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {scans.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setImageDataUrl(s.imageDataUrl);
                        setResult(s.result);
                      }}
                      className="flex items-center gap-3 rounded-2xl border border-outline-variant/30 p-3 hover:bg-surface-container cursor-pointer transition"
                    >
                      <img src={s.imageDataUrl} alt="scan" className="h-12 w-12 rounded-xl object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{s.result.disease}</p>
                        <p className="text-[10px] text-on-surface-variant">
                          {new Date(s.timestamp).toLocaleDateString()} · {normalizeConfidence(s.result.confidence)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
