import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireUser, unauthorizedResponse } from "../_shared/auth.ts";

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

  const { user } = await requireUser(req);
  if (!user) return unauthorizedResponse(corsHeaders);

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

    // 1. Resolve disease — direct, or by symptom search via crop_disease_map
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
              userSymptoms.some(
                (u) => u.includes(s.toLowerCase()) || s.toLowerCase().includes(u),
              ),
            ).length;
            const score =
              Number(c.probability) * 0.5 +
              (matches / Math.max(c.symptoms.length, 1)) * 0.5;
            return { disease: c.disease, probability: Number(score.toFixed(2)) };
          })
          .sort((a, b) => b.probability - a.probability);

        suggestedDiseases = scored.slice(0, 3);
        disease = scored[0]?.disease;
      }
    }

    if (!disease) {
      return new Response(
        JSON.stringify({
          error:
            "Could not identify a disease. Please provide a disease name or more specific symptoms.",
          suggestedDiseases,
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const severity = body.severity ?? "medium";

    // 2. Fetch best-matching treatment row (fall back to any severity)
    const { data: rows } = await supabase
      .from("treatments")
      .select("*")
      .eq("crop", crop)
      .eq("disease", disease);

    const treatment =
      rows?.find((r: any) => r.severity === severity) ??
      rows?.find((r: any) => r.severity === "medium") ??
      rows?.[0] ??
      null;

    if (!treatment) {
      return new Response(
        JSON.stringify({
          error: `No treatment record found for ${crop} / ${disease}`,
          suggestedDiseases,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 3. Weather enrichment
    const weather = await fetchWeather(body.location?.lat, body.location?.lon);

    // 4. Dosage calc helper
    const acres = body.landSizeAcres && body.landSizeAcres > 0 ? body.landSizeAcres : 1;
    const sprayVolumeLitres = Math.round(acres * 200); // ~200 L spray vol per acre

    // 5. AI personalization (Lovable AI)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let personalization: {
      summary: string;
      extraAlerts: string[];
      explanation: string;
    } | null = null;

    if (LOVABLE_API_KEY) {
      try {
        const aiPrompt = `You are an Indian agronomy expert. Give a concise farmer-friendly briefing for the following diagnosis and the prepared treatment record. Reply in ${body.language ?? "English"}.

Crop: ${crop}
Disease: ${disease}
Severity: ${severity}
Growth stage: ${body.growthStage ?? "unknown"}
Land size: ${acres} acre(s)
Symptoms reported: ${(body.symptoms ?? []).join(", ") || "none"}
Location: ${body.location?.name ?? "unknown"}
Weather: ${weather ? JSON.stringify(weather) : "unavailable"}
Selected treatment: ${JSON.stringify({
          immediate_actions: treatment.immediate_actions,
          chemical: treatment.chemical,
          organic: treatment.organic,
          cultural: treatment.cultural,
          prevention: treatment.prevention,
        })}`;

        const aiRes = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content:
                    "You are an Indian agronomy expert. Be concise, safety-first, and never invent dosages — only adapt the ones provided. Output JSON via the tool.",
                },
                { role: "user", content: aiPrompt },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "treatment_brief",
                    description: "Personalized treatment brief.",
                    parameters: {
                      type: "object",
                      properties: {
                        summary: {
                          type: "string",
                          description:
                            "2-3 sentence farmer-friendly summary of what to do first.",
                        },
                        extraAlerts: {
                          type: "array",
                          items: { type: "string" },
                          description:
                            "Up to 3 weather/timing alerts specific to today's forecast.",
                        },
                        explanation: {
                          type: "string",
                          description:
                            "Short explanation of why this treatment was chosen for this severity and stage.",
                        },
                      },
                      required: ["summary", "extraAlerts", "explanation"],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: {
                type: "function",
                function: { name: "treatment_brief" },
              },
            }),
          },
        );

        if (aiRes.ok) {
          const data = await aiRes.json();
          const args =
            data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          if (args) {
            try {
              personalization = JSON.parse(args);
            } catch (e) {
              console.error("AI JSON parse error", e);
            }
          }
        } else if (aiRes.status === 429 || aiRes.status === 402) {
          console.warn("AI gateway throttled / payment required:", aiRes.status);
        } else {
          console.error("AI gateway error", aiRes.status, await aiRes.text());
        }
      } catch (e) {
        console.error("AI call failed", e);
      }
    }

    return new Response(
      JSON.stringify({
        crop,
        disease,
        severity,
        suggestedDiseases,
        immediateActions: treatment.immediate_actions,
        treatment: {
          chemical: treatment.chemical,
          organic: treatment.organic,
          cultural: treatment.cultural,
        },
        prevention: treatment.prevention,
        alerts: [
          ...(treatment.alerts ?? []),
          ...(personalization?.extraAlerts ?? []),
        ],
        notes: treatment.notes,
        weather,
        dosageCalc: {
          landAcres: acres,
          totalSprayVolumeLitres: sprayVolumeLitres,
          chemicalAmount:
            treatment.chemical?.dosage
              ? `${treatment.chemical.dosage} × ${sprayVolumeLitres} L = total spray mix for ${acres} acre(s)`
              : null,
        },
        aiBrief: personalization?.summary ?? null,
        explanation: personalization?.explanation ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("treatment-engine error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
