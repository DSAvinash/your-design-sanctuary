import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  crop: string;
  disease?: string;
  severity?: "low" | "medium" | "high";
  symptoms?: string[];
  growthStage?: string;
  landSizeAcres?: number;
  location?: { lat?: number; lon?: number; name?: string };
  language?: string;
}

interface WeatherSummary {
  temperatureC: number | null;
  humidity: number | null;
  rainNext24hMm: number | null;
  rainNext72hMm: number | null;
  windKph: number | null;
  description: string;
}

async function fetchWeather(
  lat?: number,
  lon?: number,
): Promise<WeatherSummary | null> {
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=precipitation&forecast_days=3&timezone=auto`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const data = await r.json();
    const precip: number[] = data?.hourly?.precipitation ?? [];
    const next24 = precip.slice(0, 24).reduce((a, b) => a + (b ?? 0), 0);
    const next72 = precip.reduce((a: number, b: number) => a + (b ?? 0), 0);
    return {
      temperatureC: data?.current?.temperature_2m ?? null,
      humidity: data?.current?.relative_humidity_2m ?? null,
      rainNext24hMm: Number(next24.toFixed(1)),
      rainNext72hMm: Number(next72.toFixed(1)),
      windKph: data?.current?.wind_speed_10m ?? null,
      description:
        next24 > 5
          ? "Significant rainfall expected within 24 hours"
          : next72 > 10
            ? "Wet spell forecast over next 3 days"
            : "Mostly dry conditions expected",
    };
  } catch (e) {
    console.error("weather error", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RequestBody;
    const crop = (body.crop ?? "").trim().toLowerCase();
    if (!crop) {
      return new Response(JSON.stringify({ error: "Crop is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    let disease = body.disease?.trim();
    let suggestedDiseases: Array<{ disease: string; probability: number }> = [];

    if (!disease) {
      const { data: candidates } = await supabase
        .from("crop_disease_map")
        .select("disease, probability, symptoms")
        .eq("crop", crop);

      if (candidates && candidates.length > 0) {
        const userSymptoms = (body.symptoms ?? []).map((s) =>
          s.toLowerCase(),
        );
        const scored = candidates
          .map((c: any) => {
            const matches = (c.symptoms as string[]).filter((s) =>
              userSymptoms.some((us) => us.includes(s) || s.includes(us)),
            );
            return {
              disease: c.disease as string,
              probability: (c.probability as number) * (matches.length + 1),
            };
          })
          .sort((a: any, b: any) => b.probability - a.probability);

        disease = scored[0].disease;
        suggestedDiseases = scored.slice(0, 3).map((s: any) => ({
          disease: s.disease,
          probability: Math.min(0.99, Number((s.probability / 2).toFixed(2))),
        }));
      } else {
        disease = `${crop} foliar disorder`;
      }
    }

    const severity: "low" | "medium" | "high" = body.severity ?? "medium";

    let chemicalResult: any = null;
    let organicResult: any = null;

    const { data: chem } = await supabase
      .from("treatments")
      .select("*")
      .ilike("crop", `%${crop}%`)
      .ilike("disease", `%${disease}%`)
      .eq("type", "chemical")
      .maybeSingle();
    chemicalResult = chem;

    const { data: org } = await supabase
      .from("treatments")
      .select("*")
      .ilike("crop", `%${crop}%`)
      .ilike("disease", `%${disease}%`)
      .eq("type", "organic")
      .maybeSingle();
    organicResult = org;

    if (!chemicalResult && !organicResult) {
      const { data: fallbackChem } = await supabase
        .from("treatments")
        .select("*")
        .ilike("crop", `%${crop}%`)
        .eq("type", "chemical")
        .maybeSingle();
      chemicalResult = fallbackChem;

      const { data: fallbackOrg } = await supabase
        .from("treatments")
        .select("*")
        .ilike("crop", `%${crop}%`)
        .eq("type", "organic")
        .maybeSingle();
      organicResult = fallbackOrg;
    }

    const weather = await fetchWeather(
      body.location?.lat,
      body.location?.lon,
    );

    const landAcres = body.landSizeAcres ?? 1;
    const sprayVolumePerAcreLitres = 200;
    const totalSprayVolumeLitres = Math.round(
      landAcres * sprayVolumePerAcreLitres,
    );

    let chemicalAmount: string | null = null;
    if (chemicalResult?.dosage) {
      const match = chemicalResult.dosage.match(/([\d.]+)\s*(g|ml|kg|l)/i);
      if (match) {
        const val = parseFloat(match[1]);
        const unit = match[2].toLowerCase();
        const total = val * totalSprayVolumeLitres;
        chemicalAmount =
          total >= 1000 && (unit === "g" || unit === "ml")
            ? `${(total / 1000).toFixed(2)} ${unit === "g" ? "kg" : "L"}`
            : `${total.toFixed(0)} ${unit}`;
      } else {
        chemicalAmount = `${chemicalResult.dosage} mixed for ${totalSprayVolumeLitres} L water`;
      }
    }

    const immediateActions: string[] = [];
    if (severity === "high") {
      immediateActions.push(
        "Isolate severely infected plants immediately to prevent spore dispersal.",
      );
      immediateActions.push(
        "Apply emergency curative spray within 24 hours.",
      );
    } else if (severity === "medium") {
      immediateActions.push(
        "Prune and burn/bury lower infected leaves showing spots.",
      );
      immediateActions.push("Prepare preventive spray for entire crop block.");
    } else {
      immediateActions.push(
        "Monitor canopy daily; clean tools after working infected rows.",
      );
    }

    if (weather && (weather.rainNext24hMm ?? 0) > 5) {
      immediateActions.push(
        "⚠️ Delay chemical spray: Heavy rain expected within 24 hours will wash off treatment.",
      );
    }

    const cultural: string[] = [
      "Improve row spacing and prune lower foliage for canopy ventilation.",
      "Avoid overhead sprinkler irrigation; switch to drip to keep leaves dry.",
      "Disinfect shears and equipment between plots.",
    ];

    const prevention: string[] = [
      "Rotate crop family next season to break soil-borne pathogen cycles.",
      "Use pathogen-free certified seeds and resistant cultivars.",
      "Apply bio-fungicide (Trichoderma) at soil preparation stage.",
    ];

    const alerts: string[] = [];
    if (weather) {
      if ((weather.humidity ?? 0) > 80 && (weather.temperatureC ?? 0) > 20) {
        alerts.push(
          "High humidity + warm temperature: High risk of rapid fungal spore multiplication.",
        );
      }
      if ((weather.rainNext72hMm ?? 0) > 15) {
        alerts.push(
          "Upcoming wet spell: Bacterial blight risk elevated. Ensure field drainage.",
        );
      }
    }

    const payload = {
      crop,
      disease,
      severity,
      immediateActions,
      treatment: {
        chemical: chemicalResult
          ? {
              name: chemicalResult.name,
              dosage: chemicalResult.dosage,
              frequency: chemicalResult.frequency,
              phi_days: chemicalResult.phi_days ?? 7,
            }
          : {
              name: "Broad-spectrum Fungicide (e.g., Mancozeb / Copper Oxychloride)",
              dosage: "2 g/L water",
              frequency: "Every 7-10 days",
              phi_days: 7,
            },
        organic: organicResult
          ? {
              name: organicResult.name,
              dosage: organicResult.dosage,
              frequency: organicResult.frequency,
            }
          : {
              name: "Neem Oil 1500 ppm + Bio-agent (Trichoderma)",
              dosage: "5 ml/L water",
              frequency: "Every 5-7 days",
            },
        cultural,
      },
      prevention,
      alerts,
      weather,
      dosageCalc: {
        landAcres,
        totalSprayVolumeLitres,
        chemicalAmount,
      },
      suggestedDiseases,
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("treatment-engine error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
