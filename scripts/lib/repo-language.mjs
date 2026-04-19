const DOC_META_PATTERNS = [
  /\bawesome\b/i,
  /\bprompt(s)?\b/i,
  /\bguide\b/i,
  /\binterview\b/i,
  /\bbenchmark\b/i,
  /\bleaderboard\b/i,
  /\bpaper(s)?\b/i,
  /\bresource(s)?\b/i,
  /\bcurat(ed|ion)?\b/i,
  /\bworld models?\b/i,
  /\bcontext engineering\b/i,
  /\bhow to\b/i,
  /\bvibecoding\b/i,
];

const MANUAL_LANGUAGE_MAP = {
  "kledidoda/skill-evolution": "Docs / Meta",
  "aionsystem/synara": "Docs / Meta",
  "facujuli6/antigravity-agent": "Docs / Meta",
  "yorbisanthony/auto-survey-agent": "Docs / Meta",
  "shuklao/call-with-ai-agent": "TypeScript",
  "duowg08/claude-terminal": "Docs / Meta",
  "nithis77/claude-trinity": "Docs / Meta",
  "tauhidislam929/crypto_market_analysis": "Python",
  "muxueqingze/heartbeat-agent-framework": "Docs / Meta",
  "kaua433/maestro-skill": "Docs / Meta",
  "dangamuwagedilshan/x0": "Docs / Meta",
};

const MANIFEST_LANGUAGE_RULES = [
  { language: "Python", match: (names) => names.has("pyproject.toml") || names.has("requirements.txt") || names.has("setup.py") || names.has("pipfile") || names.has("poetry.lock") },
  { language: "Rust", match: (names) => names.has("cargo.toml") },
  { language: "Go", match: (names) => names.has("go.mod") },
  { language: "TypeScript", match: (names) => names.has("tsconfig.json") || names.has("deno.json") || names.has("deno.jsonc") },
  { language: "JavaScript", match: (names) => names.has("package.json") || names.has("bunfig.toml") },
  { language: "Java", match: (names) => names.has("pom.xml") || names.has("build.gradle") || names.has("gradlew") },
  { language: "Kotlin", match: (names) => names.has("build.gradle.kts") || names.has("settings.gradle.kts") },
  { language: "Ruby", match: (names) => names.has("gemfile") },
  { language: "Swift", match: (names) => names.has("package.swift") },
  { language: "C#", match: (names) => Array.from(names).some((name) => name.endsWith(".csproj") || name.endsWith(".sln")) },
  { language: "Jupyter Notebook", match: (names) => Array.from(names).some((name) => name.endsWith(".ipynb")) },
  { language: "C++", match: (names) => names.has("cmakelists.txt") || Array.from(names).some((name) => name.endsWith(".cpp") || name.endsWith(".hpp") || name.endsWith(".cc")) },
  { language: "C", match: (names) => Array.from(names).some((name) => name.endsWith(".c") || name.endsWith(".h")) },
  { language: "Shell", match: (names) => Array.from(names).some((name) => name.endsWith(".sh")) || names.has("makefile") },
];

function normalizeRootNames(rootContents = []) {
  return new Set(
    rootContents
      .map((item) => (typeof item === "string" ? item : item?.name || ""))
      .map((item) => item.toLowerCase())
      .filter(Boolean),
  );
}

function zipOnlyArchive(rootNames) {
  const codeLike = Array.from(rootNames).some((name) =>
    name.endsWith(".ts") || name.endsWith(".tsx") || name.endsWith(".js") || name.endsWith(".jsx") ||
    name.endsWith(".py") || name.endsWith(".rs") || name.endsWith(".go") || name.endsWith(".java") ||
    name.endsWith(".kt") || name.endsWith(".rb") || name.endsWith(".php") || name.endsWith(".cs") ||
    name.endsWith(".cpp") || name.endsWith(".c")
  );
  const hasZip = Array.from(rootNames).some((name) => name.endsWith(".zip"));
  return hasZip && !codeLike;
}

export function inferRepoLanguage({ repo, rootContents = [], readmeText = "" }) {
  const fullName = repo?.full_name?.toLowerCase?.();
  if (fullName && MANUAL_LANGUAGE_MAP[fullName]) {
    return MANUAL_LANGUAGE_MAP[fullName];
  }

  if (repo?.language) {
    return repo.language;
  }

  const rootNames = normalizeRootNames(rootContents);
  const detected = MANIFEST_LANGUAGE_RULES.filter((rule) => rule.match(rootNames)).map((rule) => rule.language);
  if (detected.length === 1) {
    return detected[0];
  }
  if (detected.length > 1) {
    if (detected.includes("TypeScript") && detected.includes("JavaScript")) return "TypeScript";
    if (detected.includes("Kotlin") && detected.includes("Java")) return "Kotlin";
    return "Mixed";
  }

  const text = [repo?.name, repo?.description, ...(repo?.topics || []), readmeText]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const docsHeavy = Array.from(rootNames).every((name) =>
    name.endsWith(".md") ||
    name === "license" ||
    name === "docs" ||
    name === ".github" ||
    name === "resources" ||
    name === "guides" ||
    name === "skills" ||
    name === "prompts" ||
    name === "agents" ||
    name === "leaderboard" ||
    name === "eval" ||
    name === "benchmarks" ||
    name === "benchmark" ||
    name === "opendata" ||
    name === "pic"
  );

  if (zipOnlyArchive(rootNames)) {
    return "Docs / Meta";
  }

  if (DOC_META_PATTERNS.some((pattern) => pattern.test(text)) || docsHeavy) {
    return "Docs / Meta";
  }

  return "";
}
