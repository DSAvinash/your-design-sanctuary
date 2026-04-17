// Types and API client for the leaf disease detection model.
// Configure the endpoint via VITE_MODEL_API_URL in your environment, or
// override at runtime by setting localStorage.MODEL_API_URL.

export interface TreatmentInfo {
  chemical?: string[];
  organic?: string[];
  prevention?: string[];
}

export interface DiagnosisResult {
  disease: string;
  confidence: number; // 0..1 or 0..100 (we normalize)
  severity: "low" | "moderate" | "high" | "healthy" | string;
  description?: string;
  causes?: string[];
  treatment?: TreatmentInfo;
  // Optional secondary predictions
  alternatives?: { disease: string; confidence: number }[];
}

export interface ScanRecord {
  id: string;
  timestamp: number;
  imageDataUrl: string;
  result: DiagnosisResult;
}

const STORAGE_KEY = "agrovision.scans";
const URL_OVERRIDE_KEY = "MODEL_API_URL";

export function getModelApiUrl(): string | null {
  if (typeof window !== "undefined") {
    const override = window.localStorage.getItem(URL_OVERRIDE_KEY);
    if (override) return override;
  }
  return (import.meta.env.VITE_MODEL_API_URL as string | undefined) ?? null;
}

export function setModelApiUrl(url: string) {
  window.localStorage.setItem(URL_OVERRIDE_KEY, url);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function normalizeConfidence(c: number): number {
  if (c <= 1) return Math.round(c * 1000) / 10; // 0..1 -> %
  return Math.round(c * 10) / 10;
}

export async function diagnoseLeaf(imageDataUrl: string): Promise<DiagnosisResult> {
  const url = getModelApiUrl();
  if (!url) {
    throw new Error("CONFIG_MISSING");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageDataUrl }),
  });

  if (!response.ok) {
    throw new Error(`API_ERROR_${response.status}`);
  }

  const data = await response.json();
  // Best-effort normalization
  return {
    disease: data.disease ?? data.label ?? data.class ?? "Unknown",
    confidence: data.confidence ?? data.probability ?? data.score ?? 0,
    severity: data.severity ?? "moderate",
    description: data.description,
    causes: data.causes,
    treatment: data.treatment,
    alternatives: data.alternatives,
  };
}

export function loadScans(): ScanRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ScanRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveScan(record: ScanRecord) {
  const scans = loadScans();
  scans.unshift(record);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scans.slice(0, 50)));
}

export function clearScans() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function severityColorClass(severity: string): string {
  const s = severity.toLowerCase();
  if (s === "healthy" || s === "low") return "text-secondary";
  if (s === "moderate" || s === "medium") return "text-on-secondary-container";
  return "text-error";
}
