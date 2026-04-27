import { getDb } from "@/lib/db";

export type GovernanceStatus =
  | "in_force"
  | "approved_not_effective"
  | "in_negotiation"
  | "proposed"
  | "paused_or_blocked";

export interface LegislationItem {
  id: string;
  jurisdiction: string;
  region: string;
  instrument: string;
  status: GovernanceStatus;
  effective_date: string | null;
  themes: string[];
  summary: string;
  issues: string[];
  source_url: string;
  last_updated: string;
}

export interface GovernanceIssue {
  id: string;
  title: string;
  scope: "global" | "regional" | "national";
  regions: string[];
  severity: "low" | "medium" | "high";
  why_it_matters: string;
  signals_to_watch: string[];
}

export interface LegislationFilters {
  region?: string;
  status?: GovernanceStatus;
  theme?: string;
  q?: string;
}

export interface OperatorAction {
  id: string;
  title: string;
  priority: "P0" | "P1" | "P2";
  why: string;
  evidence: string[];
}

export interface OperatorPlaybook {
  score: number;
  level: "low" | "medium" | "high";
  rationale: string;
  actions: OperatorAction[];
}

// Anchor items survive any ingest failure: the EU AI Act, the US Federal
// EO, and Colorado's law are flagship instruments the tracker must always
// surface even if upstream APIs go down. Live items from
// legislation_items merge in around them, with anchor IDs winning on
// collision so we can authoritatively override stale ingested data.
const ANCHOR_ITEMS: LegislationItem[] = [
  {
    id: "eu-ai-act",
    jurisdiction: "European Union",
    region: "Europe",
    instrument: "EU AI Act",
    status: "approved_not_effective",
    effective_date: "2026-08-02",
    themes: ["risk-tiering", "foundation-models", "transparency", "conformity-assessment"],
    summary: "Comprehensive risk-based AI regulation with obligations by risk class and additional requirements for GPAI/foundation models.",
    issues: ["Open-source carve-out boundaries", "SME compliance cost", "Technical standards readiness"],
    source_url: "https://artificialintelligenceact.eu/",
    last_updated: "2026-04-01",
  },
  {
    id: "us-colorado-ai-act",
    jurisdiction: "United States (Colorado)",
    region: "North America",
    instrument: "Colorado AI Act (SB24-205)",
    status: "approved_not_effective",
    effective_date: "2026-02-01",
    themes: ["high-risk-systems", "consumer-protection", "impact-assessments", "notice"],
    summary: "State-level high-risk AI framework focused on algorithmic discrimination controls and documentation duties.",
    issues: ["Interaction with federal law", "Audit burden for startups"],
    source_url: "https://leg.colorado.gov/bills/sb24-205",
    last_updated: "2026-03-28",
  },
  {
    id: "brazil-ai-bill",
    jurisdiction: "Brazil",
    region: "Latin America",
    instrument: "PL 2338/2023 (AI framework bill)",
    status: "in_negotiation",
    effective_date: null,
    themes: ["risk-tiering", "governance", "rights", "liability"],
    summary: "National framework bill under active debate on risk classification, accountability, and supervisory authority.",
    issues: ["Final institutional design", "Enforcement model and penalties"],
    source_url: "https://www25.senado.leg.br/web/atividade/materias/-/materia/157233",
    last_updated: "2026-03-19",
  },
  {
    id: "canada-aida",
    jurisdiction: "Canada",
    region: "North America",
    instrument: "AIDA (Artificial Intelligence and Data Act)",
    status: "proposed",
    effective_date: null,
    themes: ["high-impact-systems", "safety", "harm-mitigation", "record-keeping"],
    summary: "Federal proposal imposing obligations on high-impact systems and creating regulator powers around harm mitigation.",
    issues: ["Definition of high-impact", "Timeline uncertainty"],
    source_url: "https://www.parl.ca/legisinfo/en/bill/44-1/c-27",
    last_updated: "2026-03-17",
  },
  {
    id: "uk-ai-regulatory-approach",
    jurisdiction: "United Kingdom",
    region: "Europe",
    instrument: "Cross-sector AI regulatory principles",
    status: "in_force",
    effective_date: "2024-02-06",
    themes: ["principles-based", "sector-regulators", "transparency", "accountability"],
    summary: "Non-statutory, regulator-led framework using five cross-sector principles and guidance rather than one AI law.",
    issues: ["Consistency across regulators", "Enforcement fragmentation"],
    source_url: "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach",
    last_updated: "2026-02-22",
  },
  {
    id: "china-genai-measures",
    jurisdiction: "China",
    region: "Asia-Pacific",
    instrument: "Interim Measures for Generative AI Services",
    status: "in_force",
    effective_date: "2023-08-15",
    themes: ["content-controls", "provider-obligations", "security-assessment", "data-governance"],
    summary: "Generative AI service rules focusing on provider registration, content obligations, and security/data controls.",
    issues: ["Cross-border deployment constraints", "Model update approvals"],
    source_url: "https://www.cac.gov.cn/2023-07/13/c_1690898327029107.htm",
    last_updated: "2026-03-30",
  },
  {
    id: "singapore-ai-verify",
    jurisdiction: "Singapore",
    region: "Asia-Pacific",
    instrument: "Model AI Governance Framework + AI Verify",
    status: "in_force",
    effective_date: "2022-05-26",
    themes: ["testing", "governance", "voluntary-assurance", "transparency"],
    summary: "Voluntary governance and testing toolkit widely used as practical compliance baseline for enterprise deployments.",
    issues: ["Interoperability with mandatory regimes", "Procurement uptake"],
    source_url: "https://www.imda.gov.sg/resources/press-releases-factsheets-and-speeches/press-releases/2022/ai-verify-foundation",
    last_updated: "2026-03-05",
  },
  {
    id: "india-dpdp-ai-intersection",
    jurisdiction: "India",
    region: "Asia-Pacific",
    instrument: "DPDP Act + proposed Digital India Act (AI-relevant controls)",
    status: "in_negotiation",
    effective_date: null,
    themes: ["privacy", "consent", "platform-obligations", "ai-policy"],
    summary: "AI governance currently distributed across privacy law and sector policy while broader digital regulation evolves.",
    issues: ["No unified AI statute yet", "Rapid policy shifts"],
    source_url: "https://www.meity.gov.in/",
    last_updated: "2026-03-09",
  },
  {
    id: "australia-ai-guardrails",
    jurisdiction: "Australia",
    region: "Asia-Pacific",
    instrument: "Safe and Responsible AI guardrails (consultation)",
    status: "proposed",
    effective_date: null,
    themes: ["guardrails", "high-risk-uses", "procurement", "assurance"],
    summary: "National consultation on mandatory guardrails for high-risk AI, likely blending voluntary and enforceable controls.",
    issues: ["Scope of mandatory guardrails", "Who enforces"],
    source_url: "https://www.industry.gov.au/publications/safe-and-responsible-ai-australia-consultation",
    last_updated: "2026-02-27",
  },
  {
    id: "uae-ai-governance-guidelines",
    jurisdiction: "United Arab Emirates",
    region: "Middle East & Africa",
    instrument: "Federal AI ethics/governance guidance",
    status: "in_force",
    effective_date: "2022-09-01",
    themes: ["ethics", "public-sector", "trustworthy-ai", "sector-guidance"],
    summary: "Guidance-led governance model with strong public-sector AI strategy and emerging sector-specific controls.",
    issues: ["Hard-law conversion path", "Cross-emirate consistency"],
    source_url: "https://ai.gov.ae/",
    last_updated: "2026-01-18",
  },
  {
    id: "sa-ai-framework",
    jurisdiction: "South Africa",
    region: "Middle East & Africa",
    instrument: "National AI policy framework (draft trajectory)",
    status: "proposed",
    effective_date: null,
    themes: ["policy-framework", "skills", "public-sector", "ethics"],
    summary: "Policy-first approach emphasizing national strategy, capacity building, and eventual risk governance structures.",
    issues: ["Implementation capacity", "Regulatory sequencing"],
    source_url: "https://www.dtic.gov.za/",
    last_updated: "2026-02-11",
  },
  {
    id: "us-federal-eo-14110",
    jurisdiction: "United States (Federal)",
    region: "North America",
    instrument: "Executive Order 14110 implementation",
    status: "in_force",
    effective_date: "2023-10-30",
    themes: ["model-safety", "federal-procurement", "critical-infrastructure", "reporting"],
    summary: "Federal AI governance via executive authorities, agency guidance, procurement controls, and NIST-linked standards work.",
    issues: ["Change risk across administrations", "Patchwork with state laws"],
    source_url: "https://www.whitehouse.gov/briefing-room/presidential-actions/2023/10/30/executive-order-on-the-safe-secure-and-trustworthy-development-and-use-of-artificial-intelligence/",
    last_updated: "2026-03-26",
  },
  {
    id: "eu-ai-liability-directive",
    jurisdiction: "European Union",
    region: "Europe",
    instrument: "AI Liability Directive (proposal)",
    status: "in_negotiation",
    effective_date: null,
    themes: ["liability", "high-risk-systems", "redress"],
    summary: "Proposal to ease the burden of proof for victims of AI-caused harm and align with the EU AI Act risk classification.",
    issues: ["Interaction with revised Product Liability Directive", "Scope vs. high-risk AI systems list"],
    source_url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52022PC0496",
    last_updated: "2026-04-10",
  },
  {
    id: "eu-data-act",
    jurisdiction: "European Union",
    region: "Europe",
    instrument: "EU Data Act (Regulation 2023/2854)",
    status: "in_force",
    effective_date: "2025-09-12",
    themes: ["data-governance", "interoperability", "ai-policy"],
    summary: "Rules on access to and use of data generated by connected products and related services, with downstream implications for AI training data.",
    issues: ["Trade secret carve-outs", "B2B data sharing enforcement"],
    source_url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R2854",
    last_updated: "2026-03-15",
  },
  {
    id: "eu-dsa",
    jurisdiction: "European Union",
    region: "Europe",
    instrument: "Digital Services Act (Regulation 2022/2065)",
    status: "in_force",
    effective_date: "2024-02-17",
    themes: ["content-controls", "transparency", "synthetic-media", "risk-assessments"],
    summary: "Platform accountability framework with risk assessment duties for VLOPs/VLOSEs, including AI-driven recommender systems and generative content.",
    issues: ["Generative AI risk assessment scope", "Election integrity supplementary guidance"],
    source_url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2065",
    last_updated: "2026-04-05",
  },
  {
    id: "eu-dma",
    jurisdiction: "European Union",
    region: "Europe",
    instrument: "Digital Markets Act (Regulation 2022/1925)",
    status: "in_force",
    effective_date: "2023-05-02",
    themes: ["competition", "ai-policy", "interoperability"],
    summary: "Gatekeeper obligations affecting AI distribution, app stores, and access to platform data used to train models.",
    issues: ["Designation reviews", "Bundling of AI features in core platform services"],
    source_url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R1925",
    last_updated: "2026-03-22",
  },
];

const GOVERNANCE_ISSUES: GovernanceIssue[] = [
  {
    id: "compute-threshold-fragmentation",
    title: "Compute-threshold fragmentation",
    scope: "global",
    regions: ["North America", "Europe", "Asia-Pacific"],
    severity: "high",
    why_it_matters: "Different compute or capability thresholds can force multiple model-release and reporting playbooks.",
    signals_to_watch: [
      "Diverging threshold definitions in implementing acts",
      "Cross-border model registration obligations",
      "Cloud provider attestation requirements",
    ],
  },
  {
    id: "open-source-liability-boundaries",
    title: "Open-source liability boundaries",
    scope: "global",
    regions: ["Europe", "North America", "Asia-Pacific"],
    severity: "high",
    why_it_matters: "Unclear liability perimeter for open-weight and community-fine-tuned models can chill OSS ecosystems.",
    signals_to_watch: [
      "New guidance on who is an AI provider/deployer",
      "Case law involving open-weight releases",
      "OSS-specific safe harbor proposals",
    ],
  },
  {
    id: "audit-capacity-gap",
    title: "Independent audit capacity gap",
    scope: "global",
    regions: ["Global"],
    severity: "medium",
    why_it_matters: "Mandatory assessment rules may outpace availability of qualified auditors and evaluators.",
    signals_to_watch: [
      "Backlogs in conformity assessments",
      "Regulator-approved auditor lists",
      "Standardized audit schema adoption",
    ],
  },
  {
    id: "election-integrity-and-synthetic-media",
    title: "Election integrity + synthetic media",
    scope: "regional",
    regions: ["North America", "Europe", "Latin America", "Asia-Pacific"],
    severity: "high",
    why_it_matters: "Fast-moving deepfake controls can trigger emergency restrictions on model features and distribution.",
    signals_to_watch: [
      "Election-period content labeling mandates",
      "Rapid takedown liability windows",
      "Jurisdictional bans on specific tooling",
    ],
  },
  {
    id: "public-sector-procurement-controls",
    title: "Public-sector procurement as de facto regulation",
    scope: "national",
    regions: ["North America", "Europe", "Middle East & Africa"],
    severity: "medium",
    why_it_matters: "Government procurement requirements are becoming practical compliance standards even before hard law.",
    signals_to_watch: [
      "Model cards/evaluation report requirements",
      "Cybersecurity attestations for AI vendors",
      "Mandatory red-team evidence in bids",
    ],
  },
];

const ACTION_LIBRARY: Record<string, OperatorAction> = {
  "incident-response": {
    id: "incident-response",
    title: "Stand up AI incident response runbook",
    priority: "P0",
    why: "Regimes are converging on rapid reporting, takedowns, and documented mitigations.",
    evidence: [
      "Named incident commander + escalation matrix",
      "72h incident timeline template",
      "Tabletop exercise logs for model misuse scenarios",
    ],
  },
  "model-card-and-risk-register": {
    id: "model-card-and-risk-register",
    title: "Maintain model cards + risk register per deployed model",
    priority: "P0",
    why: "Explainability, traceability, and deployment controls increasingly hinge on living documentation.",
    evidence: [
      "Versioned model card in repo",
      "Risk register with owner, status, and mitigation",
      "Change-log linking model updates to risk impacts",
    ],
  },
  "red-team-and-evals": {
    id: "red-team-and-evals",
    title: "Operationalize red-team and safety eval cadence",
    priority: "P0",
    why: "High-risk and foundation-model regimes require demonstrable pre/post-deployment testing.",
    evidence: [
      "Quarterly adversarial test reports",
      "Safety benchmark dashboard with pass/fail thresholds",
      "Remediation tickets tied to eval failures",
    ],
  },
  "content-provenance": {
    id: "content-provenance",
    title: "Ship synthetic media provenance + labeling",
    priority: "P1",
    why: "Election and consumer-protection measures are tightening around synthetic content disclosure.",
    evidence: [
      "Watermarking or provenance metadata spec",
      "User-visible labeling on generated outputs",
      "Detection/abuse monitoring metrics",
    ],
  },
  "vendor-and-procurement-pack": {
    id: "vendor-and-procurement-pack",
    title: "Create regulator-ready vendor assurance packet",
    priority: "P1",
    why: "Public-sector and enterprise procurement increasingly acts as de facto AI regulation.",
    evidence: [
      "Security architecture + SBOM",
      "Data governance and retention policy",
      "Third-party audit attestations",
    ],
  },
  "oss-policy": {
    id: "oss-policy",
    title: "Define open-source release policy and liability perimeter",
    priority: "P2",
    why: "Open-weight distribution obligations are still moving; explicit guardrails reduce legal ambiguity.",
    evidence: [
      "OSS release decision tree",
      "Acceptable use policy for downstream use",
      "Exception approvals for high-risk capabilities",
    ],
  },
};

const THEME_TO_ACTIONS: Record<string, string[]> = {
  "risk-tiering": ["model-card-and-risk-register", "red-team-and-evals"],
  "foundation-models": ["model-card-and-risk-register", "red-team-and-evals", "oss-policy"],
  "transparency": ["model-card-and-risk-register", "content-provenance"],
  "conformity-assessment": ["red-team-and-evals", "vendor-and-procurement-pack"],
  "high-risk-systems": ["model-card-and-risk-register", "red-team-and-evals"],
  "impact-assessments": ["model-card-and-risk-register"],
  "notice": ["content-provenance"],
  "governance": ["model-card-and-risk-register", "incident-response"],
  "liability": ["oss-policy", "incident-response"],
  "high-impact-systems": ["model-card-and-risk-register", "red-team-and-evals"],
  "record-keeping": ["model-card-and-risk-register"],
  "content-controls": ["content-provenance", "incident-response"],
  "security-assessment": ["red-team-and-evals", "vendor-and-procurement-pack"],
  "data-governance": ["vendor-and-procurement-pack"],
  "voluntary-assurance": ["red-team-and-evals"],
  "procurement": ["vendor-and-procurement-pack"],
};

interface LegislationRow {
  id: string;
  jurisdiction: string;
  region: string;
  instrument: string;
  status: GovernanceStatus;
  effective_date: string | null;
  themes: string;
  summary: string;
  issues: string;
  source_url: string;
  last_updated: string;
}

function loadAllLegislation(): LegislationItem[] {
  const anchorIds = new Set(ANCHOR_ITEMS.map((a) => a.id));
  let dbItems: LegislationItem[] = [];
  try {
    const rows = getDb()
      .prepare(
        `SELECT id, jurisdiction, region, instrument, status, effective_date,
                themes, summary, issues, source_url, last_updated
         FROM legislation_items`
      )
      .all() as LegislationRow[];
    dbItems = rows
      .filter((r) => !anchorIds.has(r.id))
      .map((r) => ({
        id: r.id,
        jurisdiction: r.jurisdiction,
        region: r.region,
        instrument: r.instrument,
        status: r.status,
        effective_date: r.effective_date,
        themes: safeJsonArray(r.themes),
        summary: r.summary,
        issues: safeJsonArray(r.issues),
        source_url: r.source_url,
        last_updated: r.last_updated,
      }));
  } catch (err) {
    // Table may not exist yet (pre-migration test envs) — fall back to
    // anchors only rather than crashing the page.
    if (process.env.NODE_ENV !== "test") {
      console.warn("[legislation] DB read failed, using anchors only:", err);
    }
  }
  return [...ANCHOR_ITEMS, ...dbItems];
}

function safeJsonArray(s: string): string[] {
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getLegislation(filters: LegislationFilters = {}): LegislationItem[] {
  const q = filters.q?.trim().toLowerCase();

  return loadAllLegislation()
    .filter((item) => (filters.region ? item.region === filters.region : true))
    .filter((item) => (filters.status ? item.status === filters.status : true))
    .filter((item) => (filters.theme ? item.themes.includes(filters.theme) : true))
    .filter((item) => {
      if (!q) return true;
      const haystack = [
        item.jurisdiction,
        item.instrument,
        item.summary,
        item.region,
        ...item.themes,
        ...item.issues,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => a.jurisdiction.localeCompare(b.jurisdiction));
}

export function getGovernanceIssues(region?: string): GovernanceIssue[] {
  return GOVERNANCE_ISSUES.filter((issue) => {
    if (!region) return true;
    return issue.regions.includes("Global") || issue.regions.includes(region);
  });
}

export function getOperatorPlaybook(filters: LegislationFilters = {}): OperatorPlaybook {
  const laws = getLegislation(filters);
  const issues = getGovernanceIssues(filters.region);

  const severityWeight = issues.reduce((sum, issue) => {
    if (issue.severity === "high") return sum + 8;
    if (issue.severity === "medium") return sum + 4;
    return sum + 2;
  }, 0);

  const statusWeight = laws.reduce((sum, law) => {
    if (law.status === "in_force") return sum + 7;
    if (law.status === "approved_not_effective") return sum + 5;
    if (law.status === "in_negotiation") return sum + 3;
    if (law.status === "proposed") return sum + 2;
    return sum + 1;
  }, 0);

  const base = Math.min(100, statusWeight + severityWeight);
  const score = Math.max(5, Math.round(base));

  let level: OperatorPlaybook["level"] = "low";
  if (score >= 60) level = "high";
  else if (score >= 30) level = "medium";

  const actionIds = new Set<string>();
  for (const law of laws) {
    for (const theme of law.themes) {
      for (const actionId of THEME_TO_ACTIONS[theme] ?? []) {
        actionIds.add(actionId);
      }
    }
  }

  if (issues.some((i) => i.severity === "high")) {
    actionIds.add("incident-response");
    actionIds.add("red-team-and-evals");
  }

  if (actionIds.size === 0) {
    actionIds.add("model-card-and-risk-register");
    actionIds.add("vendor-and-procurement-pack");
  }

  const priorityOrder: Record<OperatorAction["priority"], number> = { P0: 0, P1: 1, P2: 2 };
  const actions = Array.from(actionIds)
    .map((id) => ACTION_LIBRARY[id])
    .filter(Boolean)
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 6);

  const rationale = `${laws.length} instruments + ${issues.length} governance issues in scope.`;

  return { score, level, rationale, actions };
}

export function getLegislationFilterOptions() {
  const all = loadAllLegislation();
  const regions = Array.from(new Set(all.map((item) => item.region))).sort();
  const statuses = Array.from(new Set(all.map((item) => item.status))).sort();
  const themes = Array.from(new Set(all.flatMap((item) => item.themes))).sort();
  return { regions, statuses, themes };
}

export function getLegislationSummary() {
  const all = loadAllLegislation();
  const total = all.length;
  const inForce = all.filter((x) => x.status === "in_force").length;
  const negotiatedOrProposed = all.filter((x) => x.status === "in_negotiation" || x.status === "proposed").length;
  const approvedPending = all.filter((x) => x.status === "approved_not_effective").length;
  return { total, inForce, negotiatedOrProposed, approvedPending };
}
