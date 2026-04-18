import { useEffect, useRef, useState } from "react";
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
  loadScans,
  normalizeConfidence,
  saveScan,
  setModelApiUrl,
  severityColorClass,
} from "@/lib/diagnosis";

const LeafDiagnosis = () => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [apiUrl, setApiUrl] = useState<string>("");

  useEffect(() => {
    setScans(loadScans());
    setApiUrl(getModelApiUrl() ?? "");
  }, []);

  const handleFile = async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    setImageDataUrl(dataUrl);
    setResult(null);
  };

  const handleDiagnose = async () => {
    if (!imageDataUrl) return;
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
      const code = err instanceof Error ? err.message : "";
      toast({
        title: t("diagnosis.errorTitle"),
        description: code === "CONFIG_MISSING" ? t("diagnosis.errorConfig") : t("diagnosis.errorNetwork"),
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveApiUrl = () => {
    setModelApiUrl(apiUrl.trim());
    toast({ title: "API URL saved" });
  };

  const reset = () => {
    setImageDataUrl(null);
    setResult(null);
  };

  const confidencePct = result ? normalizeConfidence(result.confidence) : null;
  const isHealthy = result?.severity?.toLowerCase() === "healthy";

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen">
      {/* TopAppBar */}
      <header className="bg-surface fixed top-0 w-full z-[60]">
        <div className="flex items-center justify-between px-6 py-4 w-full">
          <div className="flex items-center gap-4">
            <Link to="/" className="active:scale-95 duration-200 hover:opacity-80 transition-opacity text-primary">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h1 className="font-headline font-bold tracking-tight text-xl text-primary">
              {t("diagnosis.title")}
            </h1>
          </div>
          <div className="flex gap-3 items-center">
            <LanguageSwitcher compact />
            <button
              onClick={() => setShowHistory((s) => !s)}
              className="text-primary active:scale-95"
              aria-label={t("diagnosis.history")}
            >
              <span className="material-symbols-outlined">history</span>
            </button>
          </div>
        </div>
        <div className="h-px w-full bg-surface-container-low"></div>
      </header>

      <main className="min-h-screen pt-16 pb-32">
        {/* Hero Scanning Section */}
        <section className="relative h-[420px] md:h-[530px] overflow-hidden bg-primary-container">
          {imageDataUrl ? (
            <img alt="Selected leaf" className="absolute inset-0 w-full h-full object-cover" src={imageDataUrl} />
          ) : (
            <img
              alt="Macro shot of a green leaf"
              className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale-[0.2]"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBeAkre_euHwX7TzsCNf-eqR0NrHSwtAOeTZxo69vRh8dtfAp7rCDrvCJVKApj3oEhU_LuvUHAkgWkQSzfFfh_EMu9B9Kampm5dkjxWAMYu68EvMQxODAbQpDxyNfqkvHfqXuyb98VNNrpigX2sxANgeGaw1MDrYey6YfEoEF6023gAOp8_xTObzjrMQUhk-rWdwVrXYqb_7rjM19emD-ixZvVtp81CAw2zAhsN2yzx7WruRRoevkWSv3XA43XefWfgGA3MhmaHi0Y0"
            />
          )}
          {isAnalyzing && <div className="scanner-line opacity-60"></div>}

          <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between pointer-events-none">
            <div className="flex justify-between items-start">
              <div className="bg-surface-container-lowest/80 backdrop-blur-md p-3 rounded-xl border border-outline-variant/20">
                <p className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">
                  {t("diagnosis.confidence")}
                </p>
                <p className="font-headline text-2xl font-bold text-primary">
                  {confidencePct !== null ? `${confidencePct}%` : "—"}
                </p>
              </div>
              <div className="bg-primary/90 p-3 rounded-xl border border-outline-variant/20 text-on-primary">
                <p className="font-label text-[10px] uppercase tracking-widest opacity-80">
                  {t("diagnosis.sensorStatus")}
                </p>
                <p className="font-headline text-sm font-medium flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isAnalyzing ? "bg-secondary-container animate-pulse" : "bg-secondary-container"
                    }`}
                  ></span>
                  {isAnalyzing ? t("diagnosis.scanning") : t("diagnosis.ready")}
                </p>
              </div>
            </div>

            <div className="self-center w-56 h-56 md:w-64 md:h-64 border-2 border-dashed border-secondary-container/60 relative flex items-center justify-center">
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-secondary-container"></div>
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-secondary-container"></div>
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-secondary-container"></div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-secondary-container"></div>
              {result && (
                <div
                  className={`p-2 absolute top-6 left-6 rounded text-[10px] font-bold backdrop-blur-sm ${
                    isHealthy
                      ? "bg-secondary-container/40 border border-secondary text-on-secondary-container"
                      : "bg-error/10 border border-error/30 text-error"
                  }`}
                >
                  {isHealthy ? t("diagnosis.healthy").toUpperCase() : result.disease.toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex justify-end items-end">
              {imageDataUrl && (
                <div className="pointer-events-auto flex flex-wrap justify-end gap-3">
                  <Link
                    to="/agro-assist"
                    className="text-primary bg-secondary-container px-4 py-2 rounded-full text-xs font-headline uppercase tracking-widest hover:opacity-90 transition-opacity"
                  >
                    {t("diagnosis.chatAssist")}
                  </Link>
                  <button
                    onClick={reset}
                    className="text-on-primary bg-primary/60 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-headline uppercase tracking-widest hover:bg-primary/80 transition-colors"
                  >
                    {t("diagnosis.newScan")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Action & Results Canvas */}
        <section className="px-6 -mt-12 relative z-10">
          <div className="bg-surface-container-lowest rounded-[2rem] p-6 md:p-8 shadow-[0_20px_50px_rgba(40,45,26,0.08)]">
            <div className="text-center mb-6">
              <h2 className="font-headline text-2xl md:text-3xl font-bold text-primary mb-2">
                {result ? t("diagnosis.preliminaryFindings") : t("diagnosis.heroTitle")}
              </h2>
              <p className="text-on-surface-variant font-medium text-sm">
                {imageDataUrl ? t("diagnosis.heroSubtitle") : t("diagnosis.selectImage")}
              </p>
            </div>

            {/* Hidden inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {/* Control Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-5 bg-surface-container-low rounded-2xl hover:bg-surface-container-high transition-colors active:scale-95 duration-150 group"
              >
                <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-on-secondary-container">upload_file</span>
                </div>
                <span className="font-label text-[11px] font-bold uppercase tracking-wider text-primary">
                  {t("diagnosis.uploadPhoto")}
                </span>
              </button>
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-5 bg-surface-container-low rounded-2xl hover:bg-surface-container-high transition-colors active:scale-95 duration-150 group"
              >
                <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-on-secondary-container">photo_camera</span>
                </div>
                <span className="font-label text-[11px] font-bold uppercase tracking-wider text-primary">
                  {t("diagnosis.useCamera")}
                </span>
              </button>
            </div>

            {/* Result */}
            {result && (
              <div className="space-y-4 mb-6 animate-in fade-in duration-500">
                <div className="bg-surface-container p-5 rounded-3xl border border-outline-variant/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-secondary">analytics</span>
                      <h3 className="font-headline font-bold text-lg">{t("diagnosis.preliminaryFindings")}</h3>
                    </div>
                    <span
                      className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-tighter ${
                        isHealthy
                          ? "bg-secondary-container text-on-secondary-container"
                          : "bg-error-container text-on-error-container"
                      }`}
                    >
                      {isHealthy ? t("diagnosis.healthy") : t("diagnosis.actionRequired")}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="p-3 bg-surface-container-highest/50 rounded-xl">
                      <p className="text-[10px] font-bold font-label text-on-surface-variant uppercase">
                        {t("diagnosis.disease")}
                      </p>
                      <p className="font-bold text-primary text-sm leading-tight mt-1">{result.disease}</p>
                    </div>
                    <div className="p-3 bg-surface-container-highest/50 rounded-xl">
                      <p className="text-[10px] font-bold font-label text-on-surface-variant uppercase">
                        {t("diagnosis.confidence")}
                      </p>
                      <p className="font-bold text-secondary text-sm mt-1">{confidencePct}%</p>
                    </div>
                    <div className="p-3 bg-surface-container-highest/50 rounded-xl">
                      <p className="text-[10px] font-bold font-label text-on-surface-variant uppercase">
                        {t("diagnosis.severity")}
                      </p>
                      <p className={`font-bold text-sm mt-1 capitalize ${severityColorClass(result.severity)}`}>
                        {result.severity}
                      </p>
                    </div>
                  </div>

                  {result.description && (
                    <div className="mt-3">
                      <p className="text-[10px] font-bold font-label text-on-surface-variant uppercase mb-1">
                        {t("diagnosis.description")}
                      </p>
                      <p className="text-sm text-on-surface leading-relaxed">{result.description}</p>
                    </div>
                  )}

                  {result.causes && result.causes.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] font-bold font-label text-on-surface-variant uppercase mb-1">
                        {t("diagnosis.causes")}
                      </p>
                      <ul className="text-sm text-on-surface list-disc list-inside space-y-1">
                        {result.causes.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {result.treatment && (
                  <div className="bg-surface-container p-5 rounded-3xl border border-outline-variant/10">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="material-symbols-outlined text-secondary">healing</span>
                      <h3 className="font-headline font-bold text-lg">{t("diagnosis.treatment")}</h3>
                    </div>
                    <div className="space-y-3">
                      <TreatmentBlock
                        icon="science"
                        title={t("diagnosis.chemical")}
                        items={result.treatment.chemical}
                      />
                      <TreatmentBlock
                        icon="eco"
                        title={t("diagnosis.organic")}
                        items={result.treatment.organic}
                      />
                      <TreatmentBlock
                        icon="shield"
                        title={t("diagnosis.prevention")}
                        items={result.treatment.prevention}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Primary CTA */}
            <button
              onClick={handleDiagnose}
              disabled={!imageDataUrl || isAnalyzing}
              className="w-full py-4 md:py-5 bg-primary text-on-primary rounded-2xl font-headline font-bold text-base md:text-lg shadow-xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">{isAnalyzing ? "progress_activity" : "biotech"}</span>
              {isAnalyzing ? t("diagnosis.analyzing") : t("diagnosis.diagnoseNow")}
            </button>

            <Link
              to="/agro-assist"
              className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-outline-variant/50 bg-surface-container-low px-4 py-4 text-center font-headline text-sm font-bold uppercase tracking-[0.2em] text-primary transition-colors hover:bg-surface-container"
            >
              <span className="material-symbols-outlined">forum</span>
              {t("diagnosis.openAssistant")}
            </Link>

            {/* API URL config */}
            <details className="mt-6">
              <summary className="text-xs text-on-surface-variant cursor-pointer hover:text-primary uppercase tracking-widest font-headline">
                Model API Configuration
              </summary>
              <div className="mt-3 flex gap-2">
                <input
                  type="url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://your-model.com/predict"
                  className="flex-1 px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface text-sm font-body"
                />
                <button
                  onClick={handleSaveApiUrl}
                  className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-headline uppercase tracking-widest"
                >
                  Save
                </button>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2 leading-relaxed">
                Endpoint receives <code>{`{ image: "data:image/...;base64,..." }`}</code> and returns{" "}
                <code>{`{ disease, confidence, severity, description, causes, treatment }`}</code>.
              </p>
            </details>
          </div>
        </section>

        {/* History Drawer */}
        {showHistory && (
          <section className="px-6 mt-8">
            <div className="bg-surface-container-lowest rounded-[2rem] p-6 shadow-lg">
              <h3 className="font-headline font-bold text-xl mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">history</span>
                {t("diagnosis.history")}
              </h3>
              {scans.length === 0 ? (
                <p className="text-sm text-on-surface-variant">{t("diagnosis.noHistory")}</p>
              ) : (
                <div className="space-y-3">
                  {scans.map((scan) => (
                    <button
                      key={scan.id}
                      onClick={() => {
                        setImageDataUrl(scan.imageDataUrl);
                        setResult(scan.result);
                        setShowHistory(false);
                      }}
                      className="w-full flex gap-3 items-center p-3 bg-surface-container rounded-2xl hover:bg-surface-container-high transition-colors text-left"
                    >
                      <img src={scan.imageDataUrl} alt="" className="w-14 h-14 rounded-xl object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-primary text-sm truncate">{scan.result.disease}</p>
                        <p className="text-xs text-on-surface-variant">
                          {new Date(scan.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <span className={`text-xs font-bold ${severityColorClass(scan.result.severity)}`}>
                        {normalizeConfidence(scan.result.confidence)}%
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Quick Tips */}
        <section className="px-6 mt-8 pb-12">
          <h4 className="font-headline font-bold text-lg mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">tips_and_updates</span>
            {t("diagnosis.tipsTitle")}
          </h4>
          <div className="flex gap-4 overflow-x-auto pb-4">
            <TipCard icon="light_mode" title={t("diagnosis.tipNaturalLight")} desc={t("diagnosis.tipNaturalLightDesc")} />
            <TipCard icon="center_focus_strong" title={t("diagnosis.tipSteady")} desc={t("diagnosis.tipSteadyDesc")} />
            <TipCard icon="crop_free" title={t("diagnosis.tipFocus")} desc={t("diagnosis.tipFocusDesc")} />
          </div>
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center px-4 py-3 bg-surface/80 backdrop-blur-xl shadow-[0_-4px_32px_rgba(40,45,26,0.04)] rounded-t-xl">
        <Link to="/" className="flex flex-col items-center justify-center text-secondary px-4 py-1.5 hover:text-primary transition-colors active:scale-90 duration-150">
          <span className="material-symbols-outlined">psychology</span>
          <span className="font-label text-[10px] uppercase font-bold tracking-widest mt-1">{t("nav.fields")}</span>
        </Link>
        <Link to="/leaf-diagnosis" className="flex flex-col items-center justify-center bg-secondary-container text-primary rounded-xl px-4 py-1.5 active:scale-90 duration-150">
          <span className="material-symbols-outlined">pest_control</span>
          <span className="font-label text-[10px] uppercase font-bold tracking-widest mt-1">{t("nav.diagnosis")}</span>
        </Link>
        <button onClick={() => setShowHistory(true)} className="flex flex-col items-center justify-center text-secondary px-4 py-1.5 hover:text-primary transition-colors active:scale-90 duration-150">
          <span className="material-symbols-outlined">bar_chart</span>
          <span className="font-label text-[10px] uppercase font-bold tracking-widest mt-1">{t("nav.insights")}</span>
        </button>
        <a href="#" className="flex flex-col items-center justify-center text-secondary px-4 py-1.5 hover:text-primary transition-colors active:scale-90 duration-150">
          <span className="material-symbols-outlined">account_circle</span>
          <span className="font-label text-[10px] uppercase font-bold tracking-widest mt-1">{t("nav.profile")}</span>
        </a>
      </nav>
    </div>
  );
};

const TipCard = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
  <div className="min-w-[220px] bg-surface-container-low p-5 rounded-2xl">
    <span className="material-symbols-outlined text-secondary mb-3 block">{icon}</span>
    <p className="font-bold text-primary mb-1">{title}</p>
    <p className="text-sm text-on-surface-variant">{desc}</p>
  </div>
);

const TreatmentBlock = ({ icon, title, items }: { icon: string; title: string; items?: string[] }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="p-3 bg-surface-container-highest/50 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-secondary text-base">{icon}</span>
        <p className="text-[10px] font-bold font-label text-on-surface-variant uppercase tracking-wider">{title}</p>
      </div>
      <ul className="text-sm text-on-surface list-disc list-inside space-y-1">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

export default LeafDiagnosis;
