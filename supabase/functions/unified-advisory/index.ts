// Unified Advisory Engine — fuses latest scan + weather + crop context into "Today's Plan"
// Returns 3 sections: irrigation, disease risk, action focus + AI brief.
import { requireUser, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  location?: { lat?: number; lon?: number; name?: string };
  latestScan?: {
    crop?: string | null;
    disease?: string | null;
    severity?: string | null;
    confidence?: number | null;
  } | null;
  language?: string;
}

async function fetchWeather(lat: number, lon: number) {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation` +
      `&hourly=precipitation,precipitation_probability,relative_humidity_2m,temperature_2m` +
      `&forecast_days=3&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const d = await res.json();
    const cur = d.current ?? {};
    const h = d.hourly ?? {};
    const slice = (a: number[], n: number) => (a ?? []).slice(0, n);
    const sum = (a: number[]) => a.reduce((x, y) => x + (Number(y) || 0), 0);
    const rain24 = sum(slice(h.precipitation, 24));
    const prob24 = (h.precipitation_probability ?? []).length
      ? Math.max(...slice(h.precipitation_probability, 24).map((n: number) => Number(n) || 0))
      : 0;
    const humAbove80 = slice(h.relative_humidity_2m, 48).filter((x: number) => Number(x) >= 80).length;
    let nextRainHours: number | null = null;
    const precipArr: number[] = h.precipitation ?? [];
    for (let i = 0; i < Math.min(precipArr.length, 72); i++) {
      if ((Number(precipArr[i]) || 0) >= 1) {
        nextRainHours = i;
        break;
      }
    }
    return {
      temperatureC: cur.temperature_2m ?? null,
      humidity: cur.relative_humidity_2m ?? null,
      windKph: cur.wind_speed_10m != null ? Math.round(cur.wind_speed_10m * 3.6) : null,
      rainNext24hMm: Math.round(rain24 * 10) / 10,
      rainProbabilityNext24h: Math.round(prob24),
      hoursAboveHumidity80Next48h: humAbove80,
      nextRainHours,
    };
  } catch (e) {
    console.error("weather", e);
    return null;
  }
}

function buildPlan(weather: NonNullable<Awaited<ReturnType<typeof fetchWeather>>>, scan: Body["latestScan"]) {
  const { rainNext24hMm, rainProbabilityNext24h, temperatureC, humidity, hoursAboveHumidity80Next48h, nextRainHours } = weather;

  // Irrigation
  let irrigation: { action: "delay" | "irrigate" | "monitor"; reason: string } = {
    action: "monitor",
    reason: "Conditions moderate — irrigate based on soil feel.",
  };
  if (rainNext24hMm >= 5 || rainProbabilityNext24h >= 60) {
    irrigation = {
      action: "delay",
      reason: `Rain expected (${rainNext24hMm}mm / ${rainProbabilityNext24h}% chance) in next 24h.`,
    };
  } else if ((temperatureC ?? 0) >= 30 && (humidity ?? 100) < 50) {
    irrigation = {
      action: "irrigate",
      reason: `Hot (${temperatureC}°C) and dry (${humidity}% RH). Irrigate early morning or evening.`,
    };
  }

  // Disease risk — combine weather + scan severity
  const warmHumid = (temperatureC ?? 0) >= 20 && (temperatureC ?? 0) <= 30 && (humidity ?? 0) >= 75;
  const longHumid = hoursAboveHumidity80Next48h >= 12;
  const sev = (scan?.severity ?? "").toLowerCase();
  const scanIsHigh = sev.includes("high") || sev.includes("severe");
  const scanIsModerate = sev.includes("moderate") || sev.includes("medium");

  let riskLevel: "low" | "medium" | "high" = "low";
  const reasons: string[] = [];
  if (scanIsHigh) {
    riskLevel = "high";
    reasons.push(`Active ${scan?.disease ?? "disease"} detected at high severity in your latest scan.`);
  } else if (scanIsModerate) {
    riskLevel = "medium";
    reasons.push(`Active ${scan?.disease ?? "disease"} detected at moderate severity in your latest scan.`);
  }
  if (warmHumid && longHumid) {
    riskLevel = riskLevel === "high" ? "high" : "high";
    reasons.push(`Warm + humid spell (${hoursAboveHumidity80Next48h}h above 80% RH) favours fungal pressure.`);
  } else if (warmHumid || longHumid) {
    if (riskLevel === "low") riskLevel = "medium";
    reasons.push("Conditions favour fungal pressure.");
  }
  if (rainNext24hMm >= 3) {
    if (riskLevel === "low") riskLevel = "medium";
    reasons.push("Rain increases bacterial/fungal spread risk.");
  }
  if (reasons.length === 0) reasons.push("No major disease pressure detected today.");

  // Today's focus action
  const actions: string[] = [];
  if (scanIsHigh || scanIsModerate) {
    actions.push(`Treat ${scan?.disease ?? "the diagnosed disease"} — see Treatment Engine for product + dosage.`);
  }
  if (irrigation.action === "delay") actions.push("Skip irrigation today.");
  if (irrigation.action === "irrigate") actions.push("Irrigate in the early morning window.");
  if (riskLevel !== "low") {
    actions.push("Scout underside of lower leaves and dense canopy zones for early symptoms.");
  }
  if (nextRainHours != null && nextRainHours <= 12 && (scanIsHigh || warmHumid)) {
    actions.push(`Apply fungicide BEFORE rain (~${nextRainHours}h away) for protective cover.`);
  }
  if (actions.length === 0) actions.push("Routine field walk — note any colour or pest changes.");

  return { irrigation, diseaseRisk: { level: riskLevel, reasons }, actions };
}

async function aiBrief(payload: unknown, language: string): Promise<string | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are an experienced field agronomist writing a 2-sentence daily briefing for a farmer. Plain language, no markdown, no headings, no bullet points. Lead with the single most important action today and why.",
          },
          {
            role: "user",
            content: `Language: ${language}. Data: ${JSON.stringify(payload)}`,
          },
        ],
        temperature: 0.4,
      }),
    });
    if (res.status === 429 || res.status === 402) {
      console.error("AI gateway limit", res.status);
      return null;
    }
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim?.() ?? null;
  } catch (e) {
    console.error("ai", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const { user } = await requireUser(req);
  if (!user) return unauthorizedResponse(corsHeaders);
  try {
    const body = (await req.json()) as Body;
    const { location, latestScan, language = "en" } = body ?? {};

    if (!location?.lat || !location?.lon) {
      return new Response(
        JSON.stringify({
          error: "Location required",
          message: "Tap 'Use my location' to enable Today's Plan.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const weather = await fetchWeather(location.lat, location.lon);
    if (!weather) {
      return new Response(
        JSON.stringify({ error: "Weather service unreachable" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const plan = buildPlan(weather, latestScan ?? null);
    const payload = {
      location: location.name ?? `${location.lat.toFixed(2)},${location.lon.toFixed(2)}`,
      crop: latestScan?.crop ?? null,
      disease: latestScan?.disease ?? null,
      severity: latestScan?.severity ?? null,
      weather,
      ...plan,
    };
    const brief = await aiBrief(payload, language);

    return new Response(JSON.stringify({ ...payload, aiBrief: brief, generatedAt: Date.now() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
