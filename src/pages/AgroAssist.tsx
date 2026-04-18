import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import DiagnosisFlowModal from "@/components/DiagnosisFlowModal";
import { toast } from "@/hooks/use-toast";
import {
  AssistantMessage,
  createWelcomeReply,
  getAiSettings,
  getRotatingSuggestions,
  isAiConfigured,
  sendAssistantMessage,
  setAiSettings,
} from "@/lib/agroAssist";
import { loadScans } from "@/lib/diagnosis";

const AgroAssist = () => {
  const { t, i18n } = useTranslation();
  const latestScan = useMemo(() => loadScans()[0] ?? null, []);
  const welcome = useMemo(
    () => createWelcomeReply({ latestScan, language: i18n.language }),
    [i18n.language, latestScan],
  );

  const [messages, setMessages] = useState<AssistantMessage[]>([
    { id: crypto.randomUUID(), role: "assistant", text: welcome.text },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [settings, setSettings] = useState(getAiSettings());
  const [suggestions, setSuggestions] = useState(() =>
    getRotatingSuggestions({ latestScan, language: i18n.language }),
  );
  const [diagnosisFlowOpen, setDiagnosisFlowOpen] = useState(false);

  const modelReady = isAiConfigured(settings);
  const featureCards = [
    {
      id: "diagnosis",
      icon: "biotech",
      title: t("assistant.capabilityDiagnosis"),
      description: t("assistant.featureDiagnosisBody"),
      points: [
        t("assistant.featureDiagnosisPoint1"),
        t("assistant.featureDiagnosisPoint2"),
        t("assistant.featureDiagnosisPoint3"),
      ],
      prompt: latestScan
        ? t("assistant.featureDiagnosisPromptWithScan", { disease: latestScan.result.disease })
        : t("assistant.featureDiagnosisPrompt"),
    },
    {
      id: "treatment",
      icon: "healing",
      title: t("assistant.capabilityTreatment"),
      description: t("assistant.featureTreatmentBody"),
      points: [
        t("assistant.featureTreatmentPoint1"),
        t("assistant.featureTreatmentPoint2"),
        t("assistant.featureTreatmentPoint3"),
      ],
      prompt: latestScan
        ? t("assistant.featureTreatmentPromptWithScan", { disease: latestScan.result.disease })
        : t("assistant.featureTreatmentPrompt"),
    },
    {
      id: "weather",
      icon: "cloud",
      title: t("assistant.capabilityWeather"),
      description: t("assistant.featureWeatherBody"),
      points: [
        t("assistant.featureWeatherPoint1"),
        t("assistant.featureWeatherPoint2"),
        t("assistant.featureWeatherPoint3"),
      ],
      prompt: t("assistant.featureWeatherPrompt"),
    },
  ];

  useEffect(() => {
    setMessages([{ id: crypto.randomUUID(), role: "assistant", text: welcome.text }]);
    setSuggestions(getRotatingSuggestions({ latestScan, language: i18n.language }));
  }, [welcome.text]);

  const saveSettings = () => {
    const normalized = {
      ...settings,
      baseUrl: settings.baseUrl.trim(),
      model: settings.model.trim(),
      apiKey: settings.apiKey.trim(),
    };

    setAiSettings(normalized);
    setSettings(normalized);

    toast({
      title: t("assistant.settingsSaved"),
      description: t("assistant.settingsSavedBody"),
    });
  };

  const sendMessage = async (text: string) => {
    const value = text.trim();
    if (!value || isSending) return;

    const history = [...messages];
    const userMessage = { id: crypto.randomUUID(), role: "user" as const, text: value };
    setMessages((current) => [...current, userMessage]);
    setSuggestions(
      getRotatingSuggestions(
        { latestScan, language: i18n.language },
        { excludePrompt: value },
      ),
    );
    setInput("");

    try {
      setIsSending(true);
      const replyText = await sendAssistantMessage({
        input: value,
        history,
        context: { latestScan, language: i18n.language },
        settings,
      });

      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", text: replyText },
      ]);
      setSuggestions(
        getRotatingSuggestions(
          { latestScan, language: i18n.language },
          { excludePrompt: value },
        ),
      );
    } catch (error) {
      const code = error instanceof Error ? error.message : "UNKNOWN";
      const description =
        code === "CONFIG_MISSING"
          ? t("assistant.errorConfig")
          : code === "EMPTY_RESPONSE"
            ? t("assistant.errorEmpty")
            : t("assistant.errorNetwork");

      toast({
        title: t("assistant.errorTitle"),
        description,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modelReady) {
      toast({
        title: t("assistant.errorConfigTitle"),
        description: t("assistant.errorConfig"),
        variant: "destructive",
      });
      return;
    }
    void sendMessage(input);
  };

  const runFeaturePrompt = (prompt: string, featureId?: string) => {
    if (featureId === "diagnosis") {
      setDiagnosisFlowOpen(true);
      return;
    }

    if (!modelReady) {
      toast({
        title: t("assistant.errorConfigTitle"),
        description: t("assistant.errorConfig"),
        variant: "destructive",
      });
      return;
    }

    void sendMessage(prompt);
  };

  const scanCard = latestScan ? (
    <div className="rounded-[2rem] border border-secondary/20 bg-secondary-container/40 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-headline text-[11px] uppercase tracking-[0.32em] text-primary/70">
            {t("assistant.memoryLabel")}
          </p>
          <h3 className="mt-2 font-headline text-2xl font-bold text-primary">
            {latestScan.result.disease}
          </h3>
          <p className="mt-2 text-sm text-on-surface-variant">
            {t("assistant.memoryDescription", {
              severity: latestScan.result.severity,
              confidence: Math.round(latestScan.result.confidence <= 1 ? latestScan.result.confidence * 100 : latestScan.result.confidence),
            })}
          </p>
        </div>
        <img
          src={latestScan.imageDataUrl}
          alt={latestScan.result.disease}
          className="h-20 w-20 rounded-2xl object-cover shadow-md"
        />
      </div>
      <Link
        to="/leaf-diagnosis"
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:opacity-80"
      >
        <span className="material-symbols-outlined text-base">biotech</span>
        {t("assistant.reviewScan")}
      </Link>
    </div>
  ) : (
    <div className="rounded-[2rem] border border-dashed border-outline-variant bg-surface-container-low p-5">
      <p className="font-headline text-[11px] uppercase tracking-[0.32em] text-primary/70">
        {t("assistant.memoryLabel")}
      </p>
      <h3 className="mt-2 font-headline text-2xl font-bold text-primary">
        {t("assistant.noScanTitle")}
      </h3>
      <p className="mt-2 text-sm text-on-surface-variant">
        {t("assistant.noScanBody")}
      </p>
      <Link
        to="/leaf-diagnosis"
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-on-primary"
      >
        <span className="material-symbols-outlined text-base">upload</span>
        {t("assistant.openDiagnosis")}
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <header className="sticky top-0 z-50 border-b border-outline-variant/40 bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-primary transition-opacity hover:opacity-80">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <div>
              <p className="font-headline text-[11px] uppercase tracking-[0.32em] text-secondary">
                {t("assistant.eyebrow")}
              </p>
              <h1 className="font-headline text-2xl font-bold text-primary">{t("assistant.title")}</h1>
            </div>
          </div>
          <LanguageSwitcher compact />
        </div>
      </header>

      <main className="mx-auto grid max-w-[1440px] gap-8 px-6 py-8 lg:grid-cols-[1.05fr_1.35fr]">
        <section className="space-y-6">
          <div className="overflow-hidden rounded-[2.5rem] bg-primary text-on-primary shadow-[0_32px_80px_rgba(42,48,20,0.18)]">
            <div className="relative overflow-hidden p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,219,169,0.22),transparent_46%),linear-gradient(145deg,rgba(255,255,255,0.06),transparent)]" />
              <div className="relative">
                <p className="font-headline text-xs uppercase tracking-[0.32em] text-on-primary/70">
                  {t("assistant.heroEyebrow")}
                </p>
                <h2 className="mt-4 max-w-xl font-headline text-4xl font-bold tracking-tight md:text-5xl">
                  {t("assistant.heroTitle")}
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-on-primary/80 md:text-base">
                  {t("assistant.heroBody")}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {featureCards.map((feature) => (
                    <button
                      key={feature.id}
                      type="button"
                      onClick={() => runFeaturePrompt(feature.prompt)}
                      disabled={!modelReady || isSending}
                      className="rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.24em] transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {feature.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {featureCards.map((feature) => (
              <div
                key={feature.id}
                className="rounded-[2rem] border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-[0_12px_30px_rgba(40,45,26,0.06)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary-container text-primary">
                    <span className="material-symbols-outlined text-xl">{feature.icon}</span>
                  </div>
                  <h3 className="font-headline text-lg font-bold text-primary">{feature.title}</h3>
                </div>
                <p className="mt-4 text-sm leading-6 text-on-surface-variant">{feature.description}</p>
                <div className="mt-4 space-y-2">
                  {feature.points.map((point) => (
                    <p key={point} className="text-sm text-on-surface">
                      {point}
                    </p>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => runFeaturePrompt(feature.prompt)}
                  disabled={!modelReady || isSending}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-on-primary disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span className="material-symbols-outlined text-base">play_arrow</span>
                  {t("assistant.tryFeature")}
                </button>
              </div>
            ))}
          </div>

          {scanCard}

          <div className="rounded-[2rem] bg-surface-container-low p-5">
            <p className="font-headline text-[11px] uppercase tracking-[0.32em] text-primary/70">
              {t("assistant.quickActions")}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {suggestions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => void sendMessage(action.prompt)}
                  disabled={isSending || !modelReady}
                  className="rounded-full border border-outline-variant/70 bg-surface px-4 py-3 text-left text-sm text-primary transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {action.prompt}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2.5rem] border border-outline-variant/30 bg-surface-container-lowest shadow-[0_24px_60px_rgba(40,45,26,0.08)]">
          <div className="border-b border-outline-variant/20 px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-headline text-[11px] uppercase tracking-[0.32em] text-primary/70">
                  {t("assistant.chatLabel")}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <h2 className="font-headline text-2xl font-bold text-primary">
                    {t("assistant.chatTitle")}
                  </h2>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] ${
                      modelReady
                        ? "bg-secondary-container text-primary"
                        : "bg-error-container text-on-error-container"
                    }`}
                  >
                    {modelReady ? t("assistant.statusReady") : t("assistant.statusSetup")}
                  </span>
                </div>
              </div>
              <Link
                to="/leaf-diagnosis"
                className="inline-flex items-center gap-2 rounded-full bg-secondary-container px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-primary"
              >
                <span className="material-symbols-outlined text-base">pest_control</span>
                {t("assistant.attachImage")}
              </Link>
            </div>
          </div>

          <div className="space-y-4 px-6 py-6">
            {!modelReady && (
              <div className="rounded-[1.75rem] border border-error/20 bg-error-container/70 px-5 py-4 text-sm leading-7 text-on-error-container">
                <p className="font-semibold">{t("assistant.setupCardTitle")}</p>
                <p className="mt-2">{t("assistant.setupCardBody")}</p>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-[1.75rem] px-5 py-4 text-sm leading-7 ${
                  message.role === "assistant"
                    ? "bg-surface-container-low text-on-surface"
                    : "ml-auto bg-primary text-on-primary"
                }`}
              >
                {message.text}
              </div>
            ))}
            {isSending && (
              <div className="max-w-[85%] rounded-[1.75rem] bg-surface-container-low px-5 py-4 text-sm leading-7 text-on-surface">
                {t("assistant.generating")}
              </div>
            )}
          </div>

          <div className="border-t border-outline-variant/20 px-6 py-5">
            <form onSubmit={onSubmit} className="space-y-4">
              <label className="sr-only" htmlFor="assistant-input">
                {t("assistant.inputPlaceholder")}
              </label>
              <textarea
                id="assistant-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={t("assistant.inputPlaceholder")}
                rows={4}
                disabled={isSending}
                className="w-full resize-none rounded-[1.5rem] border border-outline-variant/40 bg-surface px-4 py-4 text-sm outline-none transition-colors focus:border-primary"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-on-surface-variant">{t("assistant.voiceHint")}</p>
                <button
                  type="submit"
                  disabled={isSending || input.trim().length === 0 || !modelReady}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.24em] text-on-primary disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span className="material-symbols-outlined text-base">send</span>
                  {isSending ? t("assistant.sending") : t("assistant.send")}
                </button>
              </div>
            </form>

            <details className="mt-6">
              <summary className="cursor-pointer font-headline text-xs uppercase tracking-[0.24em] text-on-surface-variant hover:text-primary">
                {t("assistant.settingsTitle")}
              </summary>
              <div className="mt-4 space-y-3 rounded-[1.5rem] bg-surface-container-low p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-on-surface">
                    <span className="block font-semibold">{t("assistant.provider")}</span>
                    <select
                      value={settings.provider}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          provider: event.target.value === "ollama" ? "ollama" : "openai",
                          baseUrl:
                            event.target.value === "ollama"
                              ? "http://localhost:11434"
                              : "https://api.openai.com/v1",
                          apiKey: event.target.value === "ollama" ? "" : current.apiKey,
                        }))
                      }
                      className="w-full rounded-xl border border-outline-variant/40 bg-surface px-3 py-3"
                    >
                      <option value="openai">{t("assistant.providerOpenAi")}</option>
                      <option value="ollama">{t("assistant.providerOllama")}</option>
                    </select>
                  </label>

                  <label className="space-y-2 text-sm text-on-surface">
                    <span className="block font-semibold">{t("assistant.model")}</span>
                    <input
                      type="text"
                      value={settings.model}
                      onChange={(event) => setSettings((current) => ({ ...current, model: event.target.value }))}
                      placeholder={settings.provider === "ollama" ? "llama3.1" : "gpt-4o-mini"}
                      className="w-full rounded-xl border border-outline-variant/40 bg-surface px-3 py-3"
                    />
                  </label>
                </div>

                <label className="space-y-2 text-sm text-on-surface">
                  <span className="block font-semibold">{t("assistant.baseUrl")}</span>
                  <input
                    type="url"
                    value={settings.baseUrl}
                    onChange={(event) => setSettings((current) => ({ ...current, baseUrl: event.target.value }))}
                    placeholder={settings.provider === "ollama" ? "http://localhost:11434" : "https://api.openai.com/v1"}
                    className="w-full rounded-xl border border-outline-variant/40 bg-surface px-3 py-3"
                  />
                </label>

                {settings.provider === "openai" && (
                  <label className="space-y-2 text-sm text-on-surface">
                    <span className="block font-semibold">{t("assistant.apiKey")}</span>
                    <input
                      type="password"
                      value={settings.apiKey}
                      onChange={(event) => setSettings((current) => ({ ...current, apiKey: event.target.value }))}
                      placeholder="sk-..."
                      className="w-full rounded-xl border border-outline-variant/40 bg-surface px-3 py-3"
                    />
                  </label>
                )}

                <p className="text-xs leading-6 text-on-surface-variant">{t("assistant.settingsHint")}</p>
                <div className="rounded-xl bg-surface px-3 py-3 text-xs leading-6 text-on-surface-variant">
                  {t("assistant.settingsExamples")}
                </div>

                <button
                  type="button"
                  onClick={saveSettings}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.24em] text-on-primary"
                >
                  <span className="material-symbols-outlined text-base">tune</span>
                  {t("assistant.saveSettings")}
                </button>
              </div>
            </details>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AgroAssist;
