import { describe, it, expect } from "vitest";
import { isAiRelevant, inferThemes } from "@/lib/legislation-keywords";

describe("isAiRelevant", () => {
  it("matches whole-word AI", () => {
    expect(isAiRelevant("Use of AI in policing")).toBe(true);
    expect(isAiRelevant("AI Liability Directive")).toBe(true);
  });

  it("does not falsely match AI inside unrelated words", () => {
    expect(isAiRelevant("Railways Bill")).toBe(false);
    expect(isAiRelevant("Aviation (Accessibility) Bill")).toBe(false);
    expect(isAiRelevant("Vacant Commercial Properties Bill")).toBe(false);
  });

  it("matches multi-word phrases", () => {
    expect(isAiRelevant("Regulating foundation models")).toBe(true);
    expect(isAiRelevant("Algorithmic accountability act")).toBe(true);
    expect(isAiRelevant("Use of facial recognition by police")).toBe(true);
    expect(isAiRelevant("Deepfake disclosure requirements")).toBe(true);
  });

  it("rejects empty input", () => {
    expect(isAiRelevant()).toBe(false);
    expect(isAiRelevant(null, undefined, "")).toBe(false);
  });

  it("scans across multiple text fields", () => {
    expect(isAiRelevant("Random title", "summary mentions machine learning")).toBe(true);
  });
});

describe("inferThemes", () => {
  it("derives multiple themes from text", () => {
    const themes = inferThemes("High-risk AI foundation models with transparency");
    expect(themes).toContain("foundation-models");
    expect(themes).toContain("high-risk-systems");
    expect(themes).toContain("transparency");
  });

  it("falls back to ai-policy when no specific theme matches", () => {
    expect(inferThemes("Generic AI mention")).toContain("ai-policy");
  });

  it("tags biometric content", () => {
    expect(inferThemes("Facial recognition in public spaces")).toContain("biometric");
  });
});
