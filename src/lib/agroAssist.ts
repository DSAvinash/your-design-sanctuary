import { DiagnosisResult, ScanRecord, normalizeConfidence } from "@/lib/diagnosis";
import { supabase } from "@/integrations/supabase/client";

export interface QuickAction {
  id: string;
  prompt: string;
}

export interface AssistantReply {
  text: string;
  suggestions: string[];
}

export interface AssistantContext {
  latestScan?: ScanRecord | null;
  language: string;
}

export interface AssistantMessage {
  id?: string;
  role: "assistant" | "user";
  text: string;
}

export type AiProvider = "lovable" | "openai" | "ollama";

export interface AgroAssistSettings {
  provider: AiProvider;
  baseUrl: string;
  model: string;
  apiKey: string;
}

const AI_SETTINGS_KEY = "AGROASSIST_AI_SETTINGS";
const AI_SETTINGS_MIGRATION_KEY = "AGROASSIST_AI_SETTINGS_MIGRATED_V2";

const cropKeywords = [
  "tomato",
  "rice",
  "paddy",
  "wheat",
  "cotton",
  "chilli",
  "chili",
  "potato",
  "banana",
  "grape",
  "maize",
  "corn",
];

const SUGGESTION_SET_SIZE = 4;

function extractCrop(text: string) {
  const lower = text.toLowerCase();
  return cropKeywords.find((crop) => lower.includes(crop));
}

function treatmentSummary(result: DiagnosisResult) {
  const sections = [
    ...(result.treatment?.chemical ?? []),
    ...(result.treatment?.organic ?? []),
    ...(result.treatment?.prevention ?? []),
  ];

  return sections.slice(0, 3);
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function envSettings(): AgroAssistSettings {
  const provider = ((import.meta.env.VITE_AI_PROVIDER as string | undefined) ?? "lovable").toLowerCase();
  const normalized: AiProvider =
    provider === "ollama" ? "ollama" : provider === "openai" ? "openai" : "lovable";

  return {
    provider: normalized,
    baseUrl:
      (import.meta.env.VITE_AI_BASE_URL as string | undefined) ??
      (normalized === "ollama"
        ? "http://localhost:11434"
        : normalized === "openai"
          ? "https://api.openai.com/v1"
          : ""),
    model: (import.meta.env.VITE_AI_MODEL as string | undefined) ?? "",
    apiKey: (import.meta.env.VITE_AI_API_KEY as string | undefined) ?? "",
  };
}

export function getAiSettings(): AgroAssistSettings {
  const defaults = envSettings();

  if (typeof window === "undefined") return defaults;

  try {
    const raw = window.localStorage.getItem(AI_SETTINGS_KEY);
    if (!raw) return defaults;

    const parsed = JSON.parse(raw) as Partial<AgroAssistSettings>;
    const provider: AiProvider =
      parsed.provider === "ollama"
        ? "ollama"
        : parsed.provider === "openai"
          ? "openai"
          : parsed.provider === "lovable"
            ? "lovable"
            : defaults.provider;
    const merged: AgroAssistSettings = {
      provider,
      baseUrl: parsed.baseUrl?.trim() || defaults.baseUrl,
      model: parsed.model?.trim() || defaults.model,
      apiKey: parsed.apiKey?.trim() || defaults.apiKey,
    };

    return isAiConfigured(merged) ? merged : defaults;
  } catch {
    return defaults;
  }
}

export function setAiSettings(settings: AgroAssistSettings) {
  window.localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
}

export function isAiConfigured(settings: AgroAssistSettings) {
  // Lovable AI Gateway is always available via the edge function (no user setup needed).
  if (settings.provider === "lovable") return true;

  const hasBaseUrl = settings.baseUrl.trim().length > 0;
  const hasModel = settings.model.trim().length > 0;
  const hasKey = settings.provider === "ollama" || settings.apiKey.trim().length > 0;

  return hasBaseUrl && hasModel && hasKey;
}

function buildSystemPrompt(context: AssistantContext) {
  const scan = buildScanSummary(context.latestScan);

  return [
    "You are AgroAssist AI, a practical digital agronomy expert for farmers and field officers.",
    "Answer with safe, actionable farming guidance focused on crop health, diagnosis, treatment planning, prevention, irrigation timing, and scouting.",
    "Prefer concise answers with short bullet-free paragraphs unless the user clearly asks for a list.",
    "If you are uncertain, say so briefly and ask only the most necessary follow-up question.",
    "Do not invent pesticide doses, legal approvals, or guaranteed cures.",
    "Assume the farming context is India unless the user says otherwise.",
    `Reply in the language most appropriate for this locale: ${context.language}.`,
    scan
      ? `Latest diagnosis context: disease=${scan.disease}; severity=${scan.severity}; confidence=${scan.confidence}%; scanned_at=${scan.timestamp}.`
      : "No diagnosis image context is currently attached.",
  ].join(" ");
}

function normalizeAssistantContent(content: unknown): string {
  if (typeof content === "string") return content.trim();

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in item && typeof item.text === "string") return item.text;
        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

async function callOpenAiCompatibleApi(
  messages: Array<{ role: "system" | "assistant" | "user"; content: string }>,
  settings: AgroAssistSettings,
) {
  const response = await fetch(`${trimTrailingSlash(settings.baseUrl)}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    throw new Error(`API_ERROR_${response.status}`);
  }

  const data = await response.json();
  const content = normalizeAssistantContent(data?.choices?.[0]?.message?.content);

  if (!content) throw new Error("EMPTY_RESPONSE");
  return content;
}

async function callOllamaApi(
  messages: Array<{ role: "system" | "assistant" | "user"; content: string }>,
  settings: AgroAssistSettings,
) {
  const response = await fetch(`${trimTrailingSlash(settings.baseUrl)}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`API_ERROR_${response.status}`);
  }

  const data = await response.json();
  const content = normalizeAssistantContent(data?.message?.content);

  if (!content) throw new Error("EMPTY_RESPONSE");
  return content;
}

export async function sendAssistantMessage({
  input,
  history,
  context,
  settings,
}: {
  input: string;
  history: AssistantMessage[];
  context: AssistantContext;
  settings: AgroAssistSettings;
}) {
  if (!isAiConfigured(settings)) {
    throw new Error("CONFIG_MISSING");
  }

  const systemPrompt = buildSystemPrompt(context);
  const conversation = [
    ...history.slice(-8).map((message) => ({
      role: message.role,
      content: message.text,
    })),
    { role: "user" as const, content: input },
  ];

  if (settings.provider === "lovable") {
    const { data, error } = await supabase.functions.invoke("agro-assist", {
      body: { system: systemPrompt, messages: conversation },
    });
    if (error) {
      console.error("agro-assist invoke error", error);
      throw new Error("API_ERROR");
    }
    if (data?.error) throw new Error(data.error);
    const content: string = (data?.reply ?? "").toString().trim();
    if (!content) throw new Error("EMPTY_RESPONSE");
    return content;
  }

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...conversation,
  ];

  if (settings.provider === "ollama") {
    return callOllamaApi(messages, settings);
  }

  return callOpenAiCompatibleApi(messages, settings);
}

export function buildScanSummary(scan?: ScanRecord | null) {
  if (!scan) return null;

  return {
    disease: scan.result.disease,
    severity: scan.result.severity,
    confidence: normalizeConfidence(scan.result.confidence),
    timestamp: new Date(scan.timestamp).toLocaleString(),
  };
}

export function getQuickActions(language: string): QuickAction[] {
  const lang = language.toLowerCase();

  if (lang.startsWith("hi")) {
    return [
      { id: "diagnose", prompt: "मेरी फसल में पीले धब्बे हैं, क्या जांचें?" },
      { id: "treatment", prompt: "हाल की बीमारी के लिए उपचार योजना बताइए" },
      { id: "weather", prompt: "बारिश के मौसम में सिंचाई और रोग जोखिम सलाह दें" },
    ];
  }

  if (lang.startsWith("kn")) {
    return [
      { id: "diagnose", prompt: "ನನ್ನ ಬೆಳೆ ಎಲೆಗಳಲ್ಲಿ ಹಳದಿ ಕಲೆಗಳಿವೆ, ಏನು ಪರಿಶೀಲಿಸಬೇಕು?" },
      { id: "treatment", prompt: "ಇತ್ತೀಚಿನ ರೋಗನಿರ್ಣಯಕ್ಕೆ ಚಿಕಿತ್ಸೆ ಯೋಜನೆ ನೀಡಿ" },
      { id: "weather", prompt: "ಮಳೆಯ ಅವಧಿಯಲ್ಲಿ ನೀರಾವರಿ ಮತ್ತು ರೋಗದ ಅಪಾಯ ಸಲಹೆ ನೀಡಿ" },
    ];
  }

  if (lang.startsWith("te")) {
    return [
      { id: "diagnose", prompt: "నా పంట ఆకులపై పసుపు మచ్చలు ఉన్నాయి, ఏమి చూడాలి?" },
      { id: "treatment", prompt: "ఇటీవల గుర్తించిన వ్యాధికి చికిత్స ప్రణాళిక చెప్పండి" },
      { id: "weather", prompt: "వర్షకాలంలో నీటిపారుదల మరియు వ్యాధి ప్రమాద సూచనలు ఇవ్వండి" },
    ];
  }

  return [
    { id: "diagnose", prompt: "My crop has yellow spots on the leaves. What should I check first?" },
    { id: "treatment", prompt: "Create a treatment plan for my latest diagnosis." },
    { id: "weather", prompt: "Give me irrigation and disease-risk advice for rainy weather." },
  ];
}

function shuffleList<T>(items: T[]) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

export function getSuggestionDeck(context: AssistantContext): QuickAction[] {
  const lang = context.language.toLowerCase();
  const scan = buildScanSummary(context.latestScan);
  const crop = context.latestScan?.result?.disease?.split(" ")[0];
  const base = getQuickActions(context.language);

  if (lang.startsWith("hi")) {
    return [
      ...base,
      { id: "scan-compare", prompt: "मेरे पिछले स्कैन और अभी की स्थिति में क्या फर्क है?" },
      { id: "organic-only", prompt: "क्या आप केवल जैविक उपाय सुझा सकते हैं?" },
      { id: "field-check", prompt: "अगले 3 दिनों के लिए खेत निरीक्षण चेकलिस्ट दें" },
      { id: "spread-risk", prompt: "बारिश के बाद रोग फैलने का जोखिम कितना है?" },
      scan
        ? { id: "scan-treatment", prompt: `${scan.disease} के लिए अगला सबसे अच्छा कदम क्या है?` }
        : { id: "upload-scan", prompt: "यदि मैं पत्ती की फोटो अपलोड करूँ तो क्या बेहतर निदान मिलेगा?" },
    ];
  }

  if (lang.startsWith("kn")) {
    return [
      ...base,
      { id: "scan-compare", prompt: "ಹಿಂದಿನ ಸ್ಕ್ಯಾನ್ ಮತ್ತು ಈಗಿನ ಸ್ಥಿತಿಯಲ್ಲಿ ಏನು ವ್ಯತ್ಯಾಸ ಇದೆ?" },
      { id: "organic-only", prompt: "ಸಾವಯವ ಪರಿಹಾರಗಳನ್ನು ಮಾತ್ರ ಸೂಚಿಸಬಹುದೇ?" },
      { id: "field-check", prompt: "ಮುಂದಿನ 3 ದಿನಗಳಿಗೆ ಹೊಲ ಪರಿಶೀಲನಾ ಪಟ್ಟಿ ನೀಡಿ" },
      { id: "spread-risk", prompt: "ಮಳೆಯ ನಂತರ ರೋಗದ ಹರಡುವ ಅಪಾಯ ಎಷ್ಟು?" },
      scan
        ? { id: "scan-treatment", prompt: `${scan.disease} ಗೆ ಮುಂದಿನ ಉತ್ತಮ ಕ್ರಮ ಯಾವುದು?` }
        : { id: "upload-scan", prompt: "ನಾನು ಎಲೆಯ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿದರೆ ಉತ್ತಮ ರೋಗನಿರ್ಣಯ ಸಿಗುತ್ತದೆಯೇ?" },
    ];
  }

  if (lang.startsWith("te")) {
    return [
      ...base,
      { id: "scan-compare", prompt: "గత స్కాన్‌తో ఇప్పటి పరిస్థితిలో తేడా ఏమిటి?" },
      { id: "organic-only", prompt: "కేవలం సేంద్రీయ పరిష్కారాలు మాత్రమే సూచించగలరా?" },
      { id: "field-check", prompt: "తర్వాతి 3 రోజుల ఫీల్డ్ తనిఖీ జాబితా ఇవ్వండి" },
      { id: "spread-risk", prompt: "వర్షం తర్వాత వ్యాధి వ్యాప్తి ప్రమాదం ఎంత?" },
      scan
        ? { id: "scan-treatment", prompt: `${scan.disease} కోసం తర్వాత చేయాల్సిన మంచి చర్య ఏమిటి?` }
        : { id: "upload-scan", prompt: "నేను ఆకు ఫోటో అప్లోడ్ చేస్తే మంచి నిర్ధారణ వస్తుందా?" },
    ];
  }

  return [
    ...base,
    { id: "scan-compare", prompt: "Compare my latest scan with what I should inspect in the field today." },
    { id: "organic-only", prompt: "Suggest only organic remedies for this problem." },
    { id: "field-check", prompt: "Give me a 3-day scouting checklist for my field." },
    { id: "spread-risk", prompt: "How likely is this disease to spread after rain?" },
    scan
      ? { id: "scan-treatment", prompt: `What is the best next step after my ${scan.disease} result?` }
      : { id: "upload-scan", prompt: "Will uploading a leaf image improve the diagnosis?" },
    crop
      ? { id: "crop-care", prompt: `Give me a quick care plan for ${crop} this week.` }
      : { id: "prevention-routine", prompt: "Create a weekly disease-prevention routine for my farm." },
  ];
}

export function getRotatingSuggestions(
  context: AssistantContext,
  options?: { excludePrompt?: string; count?: number },
): QuickAction[] {
  const count = options?.count ?? SUGGESTION_SET_SIZE;
  const excludePrompt = options?.excludePrompt?.trim().toLowerCase();

  const filtered = getSuggestionDeck(context).filter(
    (item) => !excludePrompt || item.prompt.trim().toLowerCase() !== excludePrompt,
  );

  return shuffleList(filtered).slice(0, count);
}

export function createWelcomeReply(context: AssistantContext): AssistantReply {
  const scan = buildScanSummary(context.latestScan);

  if (scan) {
    return {
      text: `I’m ready to help with your farm decisions. I can see your latest diagnosis was ${scan.disease} with ${scan.confidence}% confidence and ${scan.severity} severity. Ask for treatment, prevention, irrigation timing, or next-step scouting.`,
      suggestions: getQuickActions(context.language).map((action) => action.prompt),
    };
  }

  return {
    text: "I’m your AI agronomy assistant. Tell me the crop, symptoms, weather conditions, or upload a diagnosis first, and I’ll guide you step by step with practical actions.",
    suggestions: getQuickActions(context.language).map((action) => action.prompt),
  };
}

export function generateAssistantReply(input: string, context: AssistantContext): AssistantReply {
  const lower = input.toLowerCase();
  const crop = extractCrop(input);
  const latestScan = context.latestScan?.result;
  const scanSummary = buildScanSummary(context.latestScan);
  const isGreeting = /\b(hi|hello|hey|namaste)\b/.test(lower);

  if (isGreeting) {
    return {
      text: "Share the crop name, visible symptoms, field condition, or your latest scan result. I’ll help narrow the issue and suggest the next best action.",
      suggestions: getQuickActions(context.language).map((action) => action.prompt),
    };
  }

  if (lower.includes("weather") || lower.includes("rain") || lower.includes("irrigation")) {
    return {
      text: `For rainy conditions, avoid late-evening irrigation, improve drainage around the root zone, and scout the lower canopy every 2 to 3 days for fresh lesions. ${crop ? `Since you mentioned ${crop}, prioritize leaf wetness control and remove heavily infected leaves early.` : "If you tell me the crop and growth stage, I can tighten this into a field-ready plan."}`,
      suggestions: [
        "What preventive spray schedule should I follow?",
        "How do I reduce fungal spread after rain?",
        "Give me a scouting checklist for the next 3 days.",
      ],
    };
  }

  if (lower.includes("treatment") || lower.includes("spray") || lower.includes("medicine")) {
    if (latestScan) {
      const actions = treatmentSummary(latestScan);
      return {
        text: `Based on your latest diagnosis of ${latestScan.disease}, start with an isolation pass in the affected patch, then use a treatment plan matched to severity ${latestScan.severity}. ${actions.length > 0 ? `Recommended actions: ${actions.join(" | ")}.` : "I don’t have stored treatment lines for that scan yet, so tell me the crop and area affected and I’ll suggest a practical sequence."}`,
        suggestions: [
          "Give me organic remedies only.",
          "How urgently should I spray?",
          "What prevention steps should I follow next week?",
        ],
      };
    }

    return {
      text: "I can build a treatment plan, but I need either the crop and symptoms or a diagnosis result first. Tell me what crop you have, what the spots look like, and whether the spread is low, moderate, or severe.",
      suggestions: [
        "My tomato leaves have brown circular spots.",
        "The disease is spreading fast after rain.",
        "I want organic treatment options.",
      ],
    };
  }

  if (lower.includes("diagnosis") || lower.includes("disease") || lower.includes("spots") || lower.includes("leaf")) {
    return {
      text: `${crop ? `For ${crop},` : "For leaf symptom diagnosis,"} start with four checks: crop stage, exact spot color, whether lesions are on old or new leaves, and whether the problem increased after rain or overhead watering. ${scanSummary ? `Your latest scan already points to ${scanSummary.disease}, so compare new symptoms against that pattern before spraying the full field.` : "If you upload a leaf image through the diagnosis tool, I can use that result as context for more specific advice."}`,
      suggestions: [
        "Open the diagnosis scanner",
        "How do I tell nutrient deficiency from disease?",
        "What photo angle gives the best diagnosis?",
      ],
    };
  }

  if (lower.includes("prevent") || lower.includes("prevention")) {
    return {
      text: "Prevention should focus on airflow, irrigation timing, field sanitation, and repeat scouting. Remove badly infected plant material, avoid water splash between rows, and keep a simple log of where symptoms started so outbreaks can be contained early.",
      suggestions: [
        "Create a weekly prevention routine",
        "How often should I scout the field?",
        "What sanitation steps matter most?",
      ],
    };
  }

  return {
    text: `${scanSummary ? `I’m factoring in your recent ${scanSummary.disease} scan while answering.` : "I can still help without a scan."} Tell me the crop, symptom pattern, recent weather, and how much of the field is affected, and I’ll turn that into a diagnosis path, treatment plan, or prevention checklist.`,
    suggestions: [
      "Build a guided diagnosis flow for me.",
      "Suggest immediate next steps for my field.",
      "Summarize the likely disease risks this week.",
    ],
  };
}
