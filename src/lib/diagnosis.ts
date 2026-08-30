// Types, validation and API client for the leaf disease detection model.

export interface TreatmentInfo {
  chemical: string[];
  organic: string[];
  prevention: string[];
}

export type SeverityLevel = "low" | "moderate" | "high" | "healthy" | "unknown";

export interface DiagnosisResult {
  disease: string;
  confidence: number; // 0..100 normalized
  severity: SeverityLevel;
  description?: string;
  causes: string[];
  treatment: TreatmentInfo;
  alternatives: { disease: string; confidence: number }[];
}

export interface ScanRecord {
  id: string;
  timestamp: number;
  imageDataUrl: string;
  result: DiagnosisResult;
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

const STORAGE_KEY = "agrovision.scans";
const URL_OVERRIDE_KEY = "MODEL_API_URL";
const GEMINI_KEY_STORAGE = "GEMINI_API_KEY";

export function getModelApiUrl(): string | null {
  if (typeof window !== "undefined") {
    const override = window.localStorage.getItem(URL_OVERRIDE_KEY);
    if (override && override.trim()) return override.trim();
  }
  return (import.meta.env.VITE_MODEL_API_URL as string | undefined) ?? null;
}

export function setModelApiUrl(url: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(URL_OVERRIDE_KEY, url.trim());
  }
}

export function getGeminiApiKey(): string | null {
  if (typeof window !== "undefined") {
    const override = window.localStorage.getItem(GEMINI_KEY_STORAGE);
    if (override && override.trim()) return override.trim();
  }
  const envKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  return envKey && envKey.trim() ? envKey.trim() : null;
}

export function setGeminiApiKey(key: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
  }
}

export function isDiagnosisConfigured(): boolean {
  return !!getGeminiApiKey() || !!getModelApiUrl();
}

export function validateLeafFile(file: File): ImageValidationResult {
  if (!file) {
    return { valid: false, error: "Please select an image file to upload." };
  }

  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file format. Please upload a JPEG, PNG, or WebP photo of the leaf.",
    };
  }

  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: "Image is too large. Please upload an image smaller than 15MB.",
    };
  }

  if (file.size < 100) {
    return {
      valid: false,
      error: "File appears empty or corrupted. Please choose a valid image.",
    };
  }

  return { valid: true };
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const validation = validateLeafFile(file);
    if (!validation.valid) {
      reject(new Error(validation.error || "INVALID_IMAGE_FILE"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
          reject(new Error("Corrupted or unreadable image. Please upload a clear photo."));
          return;
        }

        const MAX_DIM = 1024;
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.85);
        resolve(compressed);
      };
      img.onerror = () => {
        reject(new Error("Invalid or corrupted image format. Please upload a clear leaf photo."));
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

export function normalizeConfidence(c: number): number {
  if (typeof c !== "number" || isNaN(c)) return 85;
  if (c <= 1) return Math.min(100, Math.max(0, Math.round(c * 1000) / 10));
  return Math.min(100, Math.max(0, Math.round(c * 10) / 10));
}

function normalizeSeverity(s: unknown): SeverityLevel {
  if (typeof s !== "string") return "moderate";
  const lower = s.toLowerCase().trim();
  if (lower.includes("healthy")) return "healthy";
  if (lower.includes("low") || lower.includes("mild")) return "low";
  if (lower.includes("high") || lower.includes("severe")) return "high";
  if (lower.includes("mod") || lower.includes("med")) return "moderate";
  return "unknown";
}

async function callGeminiDiagnosis(imageDataUrl: string, apiKey: string, signal?: AbortSignal): Promise<DiagnosisResult> {
  const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("INVALID_IMAGE_FORMAT");
  }

  const mimeType = match[1];
  const base64Data = match[2];

  const prompt = `You are an expert plant pathologist and agronomist. Analyze this leaf/crop photo carefully.
Provide a strict, validated diagnosis JSON matching this schema:
{
  "disease": "Crop Name - Disease/Condition (e.g. 'Tomato - Early Blight', 'Rice - Blast', or 'Healthy Leaf')",
  "confidence": 92,
  "severity": "low | moderate | high | healthy",
  "description": "2-3 sentences explaining visual symptoms, lesions, or leaf vigor.",
  "causes": ["Causative pathogen (fungus/bacteria/virus/pest)", "Environmental conditions"],
  "treatment": {
    "organic": ["Organic remedy / Bio-fungicide application"],
    "chemical": ["Standard active ingredient / dosage advisory"],
    "prevention": ["Cultural practice / crop sanitation"]
  },
  "alternatives": [
    { "disease": "Other possible condition", "confidence": 15 }
  ]
}

If no plant or leaf is detected in the image, set disease to "No Plant Detected", severity to "healthy", confidence to 99.
Output pure JSON only.`;

  const models = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];
  let lastError: Error | null = null;

  for (const model of models) {
    if (signal?.aborted) throw new Error("REQUEST_ABORTED");

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const errMsg = errorBody?.error?.message || `HTTP_${response.status}`;
        throw new Error(errMsg);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("EMPTY_GEMINI_RESPONSE");

      const cleanJson = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleanJson);

      const validated: DiagnosisResult = {
        disease: typeof parsed.disease === "string" && parsed.disease.trim() ? parsed.disease.trim() : "Unknown Plant Condition",
        confidence: normalizeConfidence(parsed.confidence),
        severity: normalizeSeverity(parsed.severity),
        description: typeof parsed.description === "string" ? parsed.description.trim() : undefined,
        causes: Array.isArray(parsed.causes) ? parsed.causes.filter((c: unknown) => typeof c === "string") : [],
        treatment: {
          organic: Array.isArray(parsed.treatment?.organic) ? parsed.treatment.organic.filter((t: unknown) => typeof t === "string") : [],
          chemical: Array.isArray(parsed.treatment?.chemical) ? parsed.treatment.chemical.filter((t: unknown) => typeof t === "string") : [],
          prevention: Array.isArray(parsed.treatment?.prevention) ? parsed.treatment.prevention.filter((t: unknown) => typeof t === "string") : [],
        },
        alternatives: Array.isArray(parsed.alternatives)
          ? parsed.alternatives
              .filter((a: any) => a && typeof a.disease === "string")
              .map((a: any) => ({
                disease: a.disease,
                confidence: normalizeConfidence(a.confidence),
              }))
          : [],
      };

      return validated;
    } catch (err) {
      if ((err as Error)?.name === "AbortError") throw err;
      console.warn(`Diagnosis with ${model} failed, trying fallback:`, err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error("DIAGNOSIS_FAILED");
}

export async function diagnoseLeaf(imageDataUrl: string): Promise<DiagnosisResult> {
  const geminiApiKey = getGeminiApiKey();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

  try {
    if (geminiApiKey) {
      return await callGeminiDiagnosis(imageDataUrl, geminiApiKey, controller.signal);
    }

    const url = getModelApiUrl();
    if (!url) {
      throw new Error("CONFIG_MISSING");
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ image: imageDataUrl }),
    });

    if (!response.ok) {
      throw new Error(`API_ERROR_${response.status}`);
    }

    const data = await response.json();
    return {
      disease: typeof data.disease === "string" ? data.disease : data.label || "Unknown Condition",
      confidence: normalizeConfidence(data.confidence ?? data.probability ?? 85),
      severity: normalizeSeverity(data.severity),
      description: data.description,
      causes: Array.isArray(data.causes) ? data.causes : [],
      treatment: {
        organic: Array.isArray(data.treatment?.organic) ? data.treatment.organic : [],
        chemical: Array.isArray(data.treatment?.chemical) ? data.treatment.chemical : [],
        prevention: Array.isArray(data.treatment?.prevention) ? data.treatment.prevention : [],
      },
      alternatives: Array.isArray(data.alternatives) ? data.alternatives : [],
    };
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      throw new Error("Diagnosis request timed out. Please check your connection and retry.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function loadScans(): ScanRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r) => r && r.id && r.result);
  } catch {
    return [];
  }
}

export function saveScan(record: ScanRecord) {
  if (typeof window === "undefined") return;
  let scans = loadScans();
  // Prevent exact duplicates within short interval
  scans = scans.filter((s) => s.id !== record.id);
  scans.unshift(record);

  let count = Math.min(scans.length, 25);
  while (count > 0) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scans.slice(0, count)));
      break;
    } catch {
      count = Math.floor(count / 2);
    }
  }
}

export function clearScans() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function severityColorClass(severity: string): string {
  const s = (severity || "").toLowerCase();
  if (s === "healthy" || s === "low") return "text-secondary";
  if (s === "moderate" || s === "medium") return "text-on-secondary-container";
  return "text-error";
}
