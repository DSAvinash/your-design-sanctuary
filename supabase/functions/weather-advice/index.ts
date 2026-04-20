// Weather-Aware Field Advice Engine
// - Pulls live weather (Open-Meteo, no key)
// - Applies rule engine for irrigation timing + disease risk + scouting checklist
// - Personalises with Lovable AI Gateway

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  crop?: string;
  growthStage?: string;
  location?: { lat?: number; lon?: number; name?: string };
  language?: string;
}

interface WeatherSnapshot {
  temperatureC: number | null;
  humidity: number | null;
  windKph: number | null;
  rainNext24hMm: number;
  rainNext72hMm: number;
  rainProbabilityNext24h: number; // 0-100
  hoursAboveHumidity80Next48h: number;
  minTempNext48hC: number | null;
  maxTempNext48hC: number | null;
  nextRainHours: number | null; // hours until next significant rain (>=1mm)
  description: string;
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherSnapshot | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation` +
      `&hourly=precipitation,precipitation_probability,relative_humidity_2m,temperature_2m` +
      `&forecast_days=4&timezone=auto`;
    const res = await fetch(url);
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

    const temps48 = slice(hourly.temperature_2m ?? [], 48).map((t: number) => Number(t));
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
    console.error("Weather fetch failed:", e);
    return null;
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

async function aiPersonalise(payload: unknown, language: string) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are an experienced field agronomist. Write in plain, simple language farmers understand. Output 3–4 sentences max in the requested language. No markdown, no headings.",
          },
          {
            role: "user",
            content:
              `Language: ${language}. Based on this weather + advice JSON, give a short field briefing summarising the single most important action today and why. JSON: ${JSON.stringify(
                payload,
              )}`,
          },
        ],
        temperature: 0.4,
      }),
    });
    if (!res.ok) {
      console.error("AI gateway error", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim?.() ?? null;
  } catch (e) {
    console.error("AI personalise failed", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    const { crop, growthStage, location, language = "en" } = body ?? {};

    if (!location?.lat || !location?.lon) {
      return new Response(
        JSON.stringify({
          error: "Location coordinates are required. Use the GPS button or enter lat,lon.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const weather = await fetchWeather(location.lat, location.lon);
    if (!weather) {
      return new Response(
        JSON.stringify({ error: "Weather service unreachable. Try again in a moment." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const irrigation = buildIrrigation(weather);
    const diseaseRisk = buildDiseaseRisk(weather, crop);
    const scouting = buildScouting(weather, diseaseRisk);

    const payload = {
      location: location.name ?? `${location.lat.toFixed(2)},${location.lon.toFixed(2)}`,
      crop: crop ?? null,
      growthStage: growthStage ?? null,
      weather,
      irrigation,
      diseaseRisk,
      scouting,
    };

    const aiBrief = await aiPersonalise(payload, language);

    return new Response(JSON.stringify({ ...payload, aiBrief }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weather-advice error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
