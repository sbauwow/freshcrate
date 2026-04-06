/**
 * Shared category definitions for freshcrate.
 * Single source of truth — used by API routes, submit page, and populate script.
 */

export const CATEGORIES = [
  "AI Agents",
  "Frameworks",
  "MCP Servers",
  "Developer Tools",
  "Databases",
  "Security",
  "Infrastructure",
  "Testing",
  "RAG & Memory",
  "Prompt Engineering",
  "Libraries",
  "Uncategorized",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_RULES: { match: RegExp; category: Category }[] = [
  { match: /\bmcp\b/i, category: "MCP Servers" },
  { match: /\b(sandbox|secure|permission|auth)\b/i, category: "Security" },
  { match: /\b(benchmark|eval|test|quality)\b/i, category: "Testing" },
  { match: /\b(vector|database|db|storage|embed)\b/i, category: "Databases" },
  { match: /\b(framework|orchestrat|chain|workflow|pipelin)\b/i, category: "Frameworks" },
  { match: /\b(gateway|proxy|infra|deploy|server)\b/i, category: "Infrastructure" },
  { match: /\b(agent|autonom|copilot|assistant)\b/i, category: "AI Agents" },
  { match: /\b(tool|cli|util|devtool|generat)\b/i, category: "Developer Tools" },
  { match: /\b(rag|retriev|search|context|memory)\b/i, category: "RAG & Memory" },
  { match: /\b(prompt|template)\b/i, category: "Prompt Engineering" },
];

/**
 * Categorize a project based on its name, description, and topics.
 * Returns the first matching category or "Uncategorized".
 */
export function categorize(name: string, description: string, topics: string[]): Category {
  const text = `${name} ${description} ${topics.join(" ")}`;
  for (const rule of CATEGORY_RULES) {
    if (rule.match.test(text)) return rule.category;
  }
  return "Uncategorized";
}

export const LICENSES = [
  "MIT",
  "Apache-2.0",
  "GPL-3.0",
  "BSD-3-Clause",
  "ISC",
  "AGPL-3.0",
  "Unlicense",
  "Unknown",
] as const;
