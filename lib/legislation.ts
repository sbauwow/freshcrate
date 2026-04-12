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
}

const LEGISLATION_ITEMS: LegislationItem[] = [
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

export function getLegislation(filters: LegislationFilters = {}): LegislationItem[] {
  return LEGISLATION_ITEMS
    .filter((item) => (filters.region ? item.region === filters.region : true))
    .filter((item) => (filters.status ? item.status === filters.status : true))
    .filter((item) => (filters.theme ? item.themes.includes(filters.theme) : true))
    .sort((a, b) => a.jurisdiction.localeCompare(b.jurisdiction));
}

export function getGovernanceIssues(region?: string): GovernanceIssue[] {
  return GOVERNANCE_ISSUES.filter((issue) => {
    if (!region) return true;
    return issue.regions.includes("Global") || issue.regions.includes(region);
  });
}

export function getLegislationFilterOptions() {
  const regions = Array.from(new Set(LEGISLATION_ITEMS.map((item) => item.region))).sort();
  const statuses = Array.from(new Set(LEGISLATION_ITEMS.map((item) => item.status))).sort();
  const themes = Array.from(new Set(LEGISLATION_ITEMS.flatMap((item) => item.themes))).sort();
  return { regions, statuses, themes };
}

export function getLegislationSummary() {
  const total = LEGISLATION_ITEMS.length;
  const inForce = LEGISLATION_ITEMS.filter((x) => x.status === "in_force").length;
  const negotiatedOrProposed = LEGISLATION_ITEMS.filter((x) => x.status === "in_negotiation" || x.status === "proposed").length;
  const approvedPending = LEGISLATION_ITEMS.filter((x) => x.status === "approved_not_effective").length;
  return { total, inForce, negotiatedOrProposed, approvedPending };
}
