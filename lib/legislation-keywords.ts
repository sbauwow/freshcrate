// Keyword whitelist used to decide whether an upstream bill / rule / act
// is relevant to AI governance. Applied by every ingestor before writing
// to the legislation_items table — keeps ~90% of irrelevant general bills
// out of the tracker without needing an LLM classifier.
//
// Match is case-insensitive, whole-word for short tokens to avoid
// matching e.g. "rail" or "ml" inside unrelated words.

const WHOLE_WORD_TERMS = [
  "ai",
  "ml",
  "llm",
  "llms",
  "gpai",
  "agi",
] as const;

const SUBSTRING_TERMS = [
  "artificial intelligence",
  "machine learning",
  "deep learning",
  "neural network",
  "foundation model",
  "large language model",
  "generative model",
  "generative ai",
  "automated decision",
  "automated decision-making",
  "algorithmic",
  "algorithm",
  "deepfake",
  "deep fake",
  "synthetic media",
  "facial recognition",
  "biometric",
  "autonomous system",
  "autonomous vehicle",
  "chatbot",
  "predictive model",
  "high-risk ai",
  "high risk ai",
  "ai system",
  "ai model",
  "ai safety",
  "ai governance",
  "ai act",
] as const;

const wholeWordRe = new RegExp(
  `\\b(${WHOLE_WORD_TERMS.join("|")})\\b`,
  "i"
);

export function isAiRelevant(...texts: Array<string | null | undefined>): boolean {
  const haystack = texts.filter(Boolean).join(" ").toLowerCase();
  if (!haystack) return false;
  if (wholeWordRe.test(haystack)) return true;
  for (const term of SUBSTRING_TERMS) {
    if (haystack.includes(term)) return true;
  }
  return false;
}

// Map matched keywords back to canonical themes so ingested items get
// useful theme tags (currently every UK bill on prod is mistagged as
// "ai-policy" or "foundation-models" because no theme inference runs).
const THEME_RULES: Array<{ pattern: RegExp; theme: string }> = [
  { pattern: /\bfoundation model|large language model|gpai\b/i, theme: "foundation-models" },
  { pattern: /\bgenerative\b/i, theme: "generative-ai" },
  { pattern: /\bdeepfake|deep fake|synthetic media\b/i, theme: "synthetic-media" },
  { pattern: /\bfacial recognition|biometric\b/i, theme: "biometric" },
  { pattern: /\bautomated decision/i, theme: "automated-decisions" },
  { pattern: /\balgorithm/i, theme: "algorithmic-accountability" },
  { pattern: /\bhigh[- ]risk\b/i, theme: "high-risk-systems" },
  { pattern: /\bsafety|safe and responsible\b/i, theme: "safety" },
  { pattern: /\btransparency|disclosure\b/i, theme: "transparency" },
  { pattern: /\bliability\b/i, theme: "liability" },
  { pattern: /\bprivacy|data protection\b/i, theme: "privacy" },
];

export function inferThemes(...texts: Array<string | null | undefined>): string[] {
  const haystack = texts.filter(Boolean).join(" ");
  const themes = new Set<string>();
  for (const { pattern, theme } of THEME_RULES) {
    if (pattern.test(haystack)) themes.add(theme);
  }
  if (themes.size === 0) themes.add("ai-policy");
  return Array.from(themes);
}
