// Lovable AI-powered diagnosis summary for the Guided Diagnosis Flow.
// Takes the collected answers + top-ranked diseases and returns a structured plan.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  cropName: string;
  symptoms: string[];
  locations: string[];
  spread: string | null;
  notes?: string;
  scanContext?: { disease: string; confidence: number; severity: string } | null;
  topCandidates: { name: string; probability: number; type: string }[];
  language: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const langMap: Record<string, string> = {
      en: "English",
      hi: "Hindi",
      kn: "Kannada",
      te: "Telugu",
    };
    const language = langMap[body.language?.slice(0, 2) ?? "en"] ?? "English";

    const systemPrompt = `You are AgroAssist, a practical Indian agronomy expert. Reply in ${language}. Keep tone clear and farmer-friendly. Never invent exact pesticide doses or claim guaranteed cures.`;

    const userPrompt = `Guided diagnosis input:
- Crop: ${body.cropName}
- Symptoms: ${body.symptoms.join(", ") || "none reported"}
- Affected parts: ${body.locations.join(", ") || "unspecified"}
- Spread pattern: ${body.spread ?? "unspecified"}
- Farmer notes: ${body.notes || "none"}
- Recent leaf scan context: ${
      body.scanContext
        ? `${body.scanContext.disease} (${body.scanContext.confidence}% confidence, ${body.scanContext.severity} severity)`
        : "none"
    }
- Top rule-based candidates: ${body.topCandidates
      .map((c) => `${c.name} (${c.type}, ${c.probability}%)`)
      .join("; ")}

Return STRICT JSON with this shape (no markdown, no commentary):
{
  "summary": string,            // 2-3 sentences explaining the most likely issue
  "likelyDisease": string,
  "confidenceLabel": "Low" | "Medium" | "High",
  "actions": string[],          // 3 actionable next steps for the farmer
  "questionsForOfficer": string[] // 2 questions the farmer can ask local krishi vigyan officer
}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Diagnosis flow AI gateway error", res.status, errText);
      return new Response(JSON.stringify({ error: `AI Gateway error ${res.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const rawContent = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(rawContent);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("diagnosis-flow error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
