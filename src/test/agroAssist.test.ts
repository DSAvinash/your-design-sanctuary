import { describe, expect, it } from "vitest";
import {
  createWelcomeReply,
  generateAssistantReply,
  getAiSettings,
  getQuickActions,
  getRotatingSuggestions,
  isAiConfigured,
  setAiSettings,
} from "@/lib/agroAssist";
import type { ScanRecord } from "@/lib/diagnosis";

const scan: ScanRecord = {
  id: "scan-1",
  timestamp: new Date("2026-04-17T10:00:00Z").getTime(),
  imageDataUrl: "data:image/png;base64,test",
  result: {
    disease: "Tomato Early Blight",
    confidence: 0.92,
    severity: "moderate",
    treatment: {
      chemical: ["Apply a labeled fungicide on affected rows."],
      organic: ["Use neem-based foliar spray as a supportive measure."],
      prevention: ["Remove lower infected leaves and improve airflow."],
    },
  },
};

describe("agroAssist", () => {
  it("creates a welcome reply using the latest scan", () => {
    const reply = createWelcomeReply({ latestScan: scan, language: "en" });

    expect(reply.text).toContain("Tomato Early Blight");
    expect(reply.text).toContain("92%");
  });

  it("returns multilingual quick actions", () => {
    const actions = getQuickActions("kn");

    expect(actions).toHaveLength(3);
    expect(actions[0].prompt).toContain("ಹಳದಿ");
  });

  it("returns rotating suggestions and excludes the current prompt", () => {
    const suggestions = getRotatingSuggestions(
      { latestScan: scan, language: "en" },
      { excludePrompt: "Create a treatment plan for my latest diagnosis." },
    );

    expect(suggestions).toHaveLength(4);
    expect(suggestions.some((item) => item.prompt === "Create a treatment plan for my latest diagnosis.")).toBe(
      false,
    );
  });

  it("uses treatment details from the latest diagnosis", () => {
    const reply = generateAssistantReply("Need treatment for this disease", {
      latestScan: scan,
      language: "en",
    });

    expect(reply.text).toContain("Tomato Early Blight");
    expect(reply.text).toContain("fungicide");
  });

  it("stores and reads ai settings", () => {
    setAiSettings({
      provider: "ollama",
      baseUrl: "http://localhost:11434",
      model: "llama3.1",
      apiKey: "",
    });

    const settings = getAiSettings();

    expect(settings.provider).toBe("ollama");
    expect(settings.model).toBe("llama3.1");
    expect(isAiConfigured(settings)).toBe(true);
  });
});
