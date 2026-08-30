import { getGeminiApiKey } from "./diagnosis";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

export type RiskLevel = "low" | "medium" | "high";

export interface WeatherAdviceResponse {
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

export interface UnifiedAdvisoryResponse {
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
  irrigation: { action: "delay" | "irrigate" | "monitor"; reason: string };
  diseaseRisk: { level: RiskLevel; reasons: string[] };
  actions: string[];
  aiBrief: string | null;
  generatedAt: number;
}

interface WeatherSnapshot {
  temperatureC: number | null;
  humidity: number | null;
  windKph: number | null;
  rainNext24hMm: number;
  rainNext72hMm: number;
  rainProbabilityNext24h: number;
  hoursAboveHumidity80Next48h: number;
  minTempNext48hC: number | null;
  maxTempNext48hC: number | null;
  nextRainHours: number | null;
  description: string;
}

export async function fetchOpenMeteoWeather(lat: number, lon: number): Promise<WeatherSnapshot | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation` +
      `&hourly=precipitation,precipitation_probability,relative_humidity_2m,temperature_2m` +
      `&forecast_days=4&timezone=auto`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();

    const cur = data.current ?? {};
    const hourly = data.hourly ?? {};
    const precipArr: number[] = hourly.precipitation ?? [];
    const probArr: number[] = hourly.precipitation_probability ?? [];
    const humArr: number[] = hourly.relative_humidity_2m ?? [];

    const slice = (arr: number[], n: number) => arr.slice(0, n);
    const sum = (arr: number[]) => arr.reduce((a, b) => a + (Number(b) || 0), 0);

    const rain24 = sum(slice(precipArr, 24));
    const rain72 = sum(slice(precipArr, 72));
    const prob24 = probArr.length ? Math.max(...slice(probArr, 24).map((n) => Number(n) || 0)) : 0;
    const humAbove80 = slice(humArr, 48).filter((h) => Number(h) >= 80).length;

    const temps48 = slice(hourly.temperature_2m ?? [], 48).map((t) => Number(t));
    const minT = temps48.length ? Math.min(...temps48) : null;
    const maxT = temps48.length ? Math.max(...temps48) : null;

    let nextRainHours: number | null = null;
    for (let i = 0; i < Math.min(precipArr.length, 72); i++) {
      if ((Number(precipArr[i]) || 0) >= 1) {
        nextRainHours = i;
        break;
      }
    }

    let description = "Mild conditions";
    if (rain24 >= 5) description = "Significant rain expected within 24h";
    else if (prob24 >= 60) description = "High chance of rain within 24h";
    else if (humAbove80 >= 6 && (cur.temperature_2m ?? 0) >= 20)
      description = "Warm and humid — fungal-friendly conditions";
    else if ((cur.temperature_2m ?? 0) >= 33) description = "Hot and dry — high evapotranspiration";

    return {
      temperatureC: cur.temperature_2m ?? null,
      humidity: cur.relative_humidity_2m ?? null,
      windKph: cur.wind_speed_10m != null ? Math.round(cur.wind_speed_10m * 3.6) : null,
      rainNext24hMm: Math.round(rain24 * 10) / 10,
      rainNext72hMm: Math.round(rain72 * 10) / 10,
      rainProbabilityNext24h: Math.round(prob24),
      hoursAboveHumidity80Next48h: humAbove80,
      minTempNext48hC: minT,
      maxTempNext48hC: maxT,
      nextRainHours,
      description,
    };
  } catch (e) {
    console.warn("Weather fetch failed or timed out:", e);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function nextRainWindowLabel(hours: number | null): string {
  if (hours == null) return "No significant rain expected in the next 72h";
  if (hours <= 6) return `Rain likely within ${hours}h`;
  if (hours <= 24) return `Rain expected in ~${hours}h`;
  if (hours <= 48) return `Rain expected in ~${Math.round(hours / 24)} day(s)`;
  return `Rain expected in ~${Math.round(hours / 24)} days`;
}

function buildIrrigation(weather: WeatherSnapshot) {
  const { rainNext24hMm, rainProbabilityNext24h, temperatureC, humidity, nextRainHours } = weather;
  const isHotDry =
    (temperatureC ?? 0) >= 30 && (humidity ?? 100) < 50 && rainNext24hMm < 2 && rainProbabilityNext24h < 40;

  if (rainNext24hMm >= 5 || rainProbabilityNext24h >= 60) {
    return {
      action: "delay" as const,
      reason: `Rain expected (${rainNext24hMm}mm in 24h, ${rainProbabilityNext24h}% probability). Irrigating now wastes water and risks waterlogging.`,
      nextWindow:
        nextRainHours != null && nextRainHours < 48
          ? `After rain stops — likely in ${nextRainHours + 6}–${nextRainHours + 18}h`
          : "Re-check in 24h once forecast updates",
    };
  }
  if (isHotDry) {
    return {
      action: "irrigate" as const,
      reason: `Hot (${temperatureC}°C) and dry (${humidity}% RH) with no rain in 24h. Plants are losing water fast.`,
      nextWindow: "Best window: early morning (5–8 AM) or late evening to minimise evaporation",
    };
  }
  return {
    action: "monitor" as const,
    reason: "Conditions are moderate — irrigate based on soil feel and crop stage.",
    nextWindow: nextRainWindowLabel(nextRainHours),
  };
}

function buildDiseaseRisk(weather: WeatherSnapshot, crop?: string) {
  const { humidity, temperatureC, hoursAboveHumidity80Next48h, rainNext24hMm } = weather;
  const warmHumid = (temperatureC ?? 0) >= 20 && (temperatureC ?? 0) <= 30 && (humidity ?? 0) >= 75;
  const wet = rainNext24hMm >= 3;
  const longHumidSpell = hoursAboveHumidity80Next48h >= 12;

  let level: "low" | "medium" | "high" = "low";
  const reasons: string[] = [];
  const likely: string[] = [];
  const actions: string[] = [];

  if (warmHumid && longHumidSpell) {
    level = "high";
    reasons.push(`Warm (${temperatureC}°C) + high humidity (${humidity}%) for ${hoursAboveHumidity80Next48h}h ahead`);
    likely.push("Fungal infections (blight, mildew, rust)");
    actions.push("Inspect underside of leaves for spots and powdery growth");
    actions.push("Consider preventive fungicide (organic: neem 3–5 ml/L) before next rain");
  } else if (warmHumid || longHumidSpell) {
    level = "medium";
    reasons.push("Conditions favour fungal pressure");
    likely.push("Early-stage fungal infection");
    actions.push("Scout high-canopy and shaded zones");
  }

  if (wet) {
    if (level === "low") level = "medium";
    reasons.push(`Rain (${rainNext24hMm}mm) increases bacterial spread risk`);
    likely.push("Bacterial leaf spot");
    actions.push("Avoid working in wet fields to prevent spreading pathogens");
  }

  if (crop && /tomato|potato|chilli|chili|pepper/i.test(crop) && level !== "low") {
    likely.push("Late blight (Phytophthora) risk — characteristic dark water-soaked lesions");
  }
  if (crop && /rice|paddy/i.test(crop) && (humidity ?? 0) >= 80) {
    likely.push("Rice blast risk under prolonged humid conditions");
  }

  if (level === "low") {
    reasons.push("Conditions are not currently favourable for major disease outbreaks");
    actions.push("Continue routine weekly scouting");
  }

  return { level, reason: reasons.join(". "), likely: Array.from(new Set(likely)), actions };
}

function buildScouting(weather: WeatherSnapshot, risk: ReturnType<typeof buildDiseaseRisk>) {
  const checklist: string[] = [];
  if (risk.level !== "low") {
    checklist.push("Check underside of lower leaves for spots, mildew or discoloration");
    checklist.push("Inspect dense canopy and shaded zones first (poor airflow)");
  }
  if (weather.rainNext24hMm >= 3 || weather.rainNext72hMm >= 8) {
    checklist.push("Walk waterlogged or low-lying patches — drainage issues spread disease fast");
  }
  if ((weather.humidity ?? 0) >= 80) {
    checklist.push("Look for early discoloration or wilting on new growth");
  }
  if ((weather.temperatureC ?? 0) >= 32) {
    checklist.push("Check for heat stress: leaf curling, flower drop, edge scorch");
  }
  if ((weather.windKph ?? 0) >= 25) {
    checklist.push("Inspect plant supports and tall crops for wind damage");
  }
  if (checklist.length === 0) {
    checklist.push("Routine scout: 5–10 plants in 4 quadrants of the field");
    checklist.push("Note any anomalies in colour, shape, or pest activity");
  }
  return checklist;
}

async function generateGeminiWeatherBrief(payload: Record<string, unknown>, language: string): Promise<string | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  try {
    const prompt = `You are an experienced agricultural scientist and field agronomist. 
Write a short, practical 2-3 sentence field briefing for a farmer in the requested language (${language}) based on this weather and agronomic risk assessment data:
${JSON.stringify(payload)}

Highlight the single most important action to take today (e.g. irrigation timing, fungicide spray timing before rain, or pest scouting) and why.
Keep it direct, actionable, and friendly. Output plain text with no headings or markdown fences.`;

    const models = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];
    for (const model of models) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3 },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) return text;
        }
      } catch {
        // try next
      }
    }
  } catch (err) {
    console.warn("Gemini weather brief generation error:", err);
  }
  return null;
}

export async function getWeatherAdvice(params: {
  lat: number;
  lon: number;
  name?: string;
  crop?: string;
  growthStage?: string;
  language?: string;
}): Promise<WeatherAdviceResponse> {
  const { lat, lon, name, crop, growthStage, language = "en" } = params;

  try {
    const { data, error } = await supabase.functions.invoke("weather-advice", {
      body: {
        crop: crop || undefined,
        growthStage: growthStage || undefined,
        location: { lat, lon, name },
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
          // ignore
        }
      }
    }

    if (payload && !payload.error && payload.weather) {
      return payload;
    }
  } catch (err) {
    console.warn("Supabase weather-advice edge function failed, running client engine:", err);
  }

  const weather = await fetchOpenMeteoWeather(lat, lon);
  if (!weather) {
    throw new Error("Unable to fetch weather data from Open-Meteo. Please verify your connection.");
  }

  const irrigation = buildIrrigation(weather);
  const diseaseRisk = buildDiseaseRisk(weather, crop);
  const scouting = buildScouting(weather, diseaseRisk);

  const locationLabel = name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;

  const basePayload = {
    location: locationLabel,
    crop: crop ?? null,
    growthStage: growthStage ?? null,
    weather: {
      temperatureC: weather.temperatureC,
      humidity: weather.humidity,
      windKph: weather.windKph,
      rainNext24hMm: weather.rainNext24hMm,
      rainNext72hMm: weather.rainNext72hMm,
      rainProbabilityNext24h: weather.rainProbabilityNext24h,
      description: weather.description,
    },
    irrigation,
    diseaseRisk,
    scouting,
  };

  const aiBrief = await generateGeminiWeatherBrief(basePayload, language);

  return {
    ...basePayload,
    aiBrief,
  };
}

export async function getUnifiedAdvisory(params: {
  lat: number;
  lon: number;
  latestScan?: {
    crop?: string | null;
    disease?: string | null;
    severity?: string | null;
    confidence?: number | null;
  } | null;
  language?: string;
}): Promise<UnifiedAdvisoryResponse> {
  const { lat, lon, latestScan, language = "en" } = params;

  try {
    const { data: res, error } = await supabase.functions.invoke("unified-advisory", {
      body: { location: { lat, lon }, latestScan, language },
    });

    let payload: UnifiedAdvisoryResponse | null = (res as UnifiedAdvisoryResponse | null) ?? null;
    if (error) {
      if (error instanceof FunctionsHttpError && error.context) {
        try {
          const b = await error.context.json();
          if (b && typeof b === "object") payload = b as UnifiedAdvisoryResponse;
        } catch {
          // ignore
        }
      }
    }

    if (payload && !payload.error && payload.weather && payload.actions) {
      return payload;
    }
  } catch (err) {
    console.warn("unified-advisory edge function failed, running client engine:", err);
  }

  const weather = await fetchOpenMeteoWeather(lat, lon);
  if (!weather) {
    throw new Error("Unable to fetch weather data for Today's Plan.");
  }

  const irrigation = buildIrrigation(weather);
  const diseaseRisk = buildDiseaseRisk(weather, latestScan?.crop || undefined);
  const scouting = buildScouting(weather, diseaseRisk);

  const actions: string[] = [];
  if (irrigation.action === "delay") {
    actions.push(`Hold off irrigation — rain expected in 24h.`);
  } else if (irrigation.action === "irrigate") {
    actions.push("Irrigate early morning or evening to prevent heat and water stress.");
  }

  if (latestScan) {
    actions.push(`Scout for ${latestScan.disease || "crop symptoms"} progression in affected rows.`);
    actions.push("Prune severely spotted lower leaves to prevent spore spread.");
  } else {
    actions.push(scouting[0] || "Routine scout: inspect 5-10 plants across field quadrants.");
  }

  if (actions.length < 3 && scouting[1]) {
    actions.push(scouting[1]);
  }

  const planPayload = {
    location: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    crop: latestScan?.crop ?? null,
    disease: latestScan?.disease ?? null,
    severity: latestScan?.severity ?? null,
    weather: {
      temperatureC: weather.temperatureC,
      humidity: weather.humidity,
      windKph: weather.windKph,
      rainNext24hMm: weather.rainNext24hMm,
      rainProbabilityNext24h: weather.rainProbabilityNext24h,
    },
    irrigation: {
      action: irrigation.action,
      reason: irrigation.reason,
    },
    diseaseRisk: {
      level: diseaseRisk.level,
      reasons: diseaseRisk.reason ? [diseaseRisk.reason] : [],
    },
    actions,
    generatedAt: Date.now(),
  };

  const aiBrief = await generateGeminiWeatherBrief(planPayload, language);

  return {
    ...planPayload,
    aiBrief,
  };
}
