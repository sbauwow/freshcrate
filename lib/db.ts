import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { runMigrations } from "@/lib/migrate";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "freshcrate.db");
const SEED_DB_PATH = path.join(process.cwd(), "freshcrate.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    bootstrapVolumeIfNeeded();
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initDb(db);
  }
  return db;
}

function bootstrapVolumeIfNeeded() {
  if (DB_PATH === SEED_DB_PATH) return;
  if (fs.existsSync(DB_PATH)) return;
  if (!fs.existsSync(SEED_DB_PATH)) return;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.copyFileSync(SEED_DB_PATH, DB_PATH);
  console.log(`[db] bootstrapped ${DB_PATH} from ${SEED_DB_PATH}`);
}

/** Replace the DB instance (used by tests with in-memory SQLite). */
export function _setDb(instance: Database.Database): void {
  db = instance;
}

/** Reset the DB singleton (used by tests for cleanup). */
export function _resetDb(): void {
  if (db) {
    try { db.close(); } catch { /* ignore */ }
  }
  db = undefined as unknown as Database.Database;
}

function initDb(db: Database.Database) {
  // Run all pending migrations (schema creation, FTS, etc.)
  runMigrations(db);

  // Seed some data if empty
  const count = db.prepare("SELECT COUNT(*) as c FROM projects").get() as { c: number };
  if (count.c === 0) {
    seedData(db);
  }
}

function seedData(db: Database.Database) {
  const insertProject = db.prepare(
    "INSERT INTO projects (name, short_desc, description, homepage_url, repo_url, license, category, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertRelease = db.prepare(
    "INSERT INTO releases (project_id, version, changes, urgency) VALUES (?, ?, ?, ?)"
  );
  const insertTag = db.prepare(
    "INSERT INTO tags (project_id, tag) VALUES (?, ?)"
  );

  const projects = [
    {
      name: "claw-agent",
      short_desc: "Autonomous coding agent with tool-use and planning capabilities",
      description: "A fully autonomous coding agent that can read, write, and refactor code across large codebases. Supports MCP tool servers, multi-step planning, and git-aware workflows.",
      homepage: "https://github.com/example/claw-agent",
      repo: "https://github.com/example/claw-agent",
      license: "Apache-2.0",
      category: "AI Agents",
      author: "AgentForge Labs",
      version: "2.4.0",
      changes: "Added parallel tool execution, improved context window management, fixed memory leak in long sessions",
      urgency: "Medium",
      tags: ["agent", "coding", "autonomous", "mcp", "typescript"],
    },
    {
      name: "mcp-toolbox",
      short_desc: "Collection of 50+ MCP tool servers for common dev tasks",
      description: "A curated collection of Model Context Protocol tool servers covering file ops, git, databases, APIs, cloud providers, and more. Drop-in ready for any MCP-compatible agent.",
      homepage: "https://github.com/example/mcp-toolbox",
      repo: "https://github.com/example/mcp-toolbox",
      license: "MIT",
      category: "MCP Servers",
      author: "ToolSmith Collective",
      version: "1.12.0",
      changes: "New tools: Kubernetes management, Terraform plan/apply, CloudFlare DNS. Improved error handling across all servers.",
      urgency: "Low",
      tags: ["mcp", "tools", "devops", "kubernetes", "terraform"],
    },
    {
      name: "promptchain",
      short_desc: "DAG-based prompt orchestration framework for multi-agent workflows",
      description: "Define complex multi-agent workflows as directed acyclic graphs. Each node is a prompt or agent call with typed inputs/outputs. Built-in retry, fallback, and observability.",
      homepage: "https://github.com/example/promptchain",
      repo: "https://github.com/example/promptchain",
      license: "MIT",
      category: "Frameworks",
      author: "ChainWorks",
      version: "0.9.0",
      changes: "Breaking: new DAG syntax. Added conditional branching, loop nodes, and streaming intermediate results.",
      urgency: "High",
      tags: ["orchestration", "multi-agent", "dag", "workflow", "python"],
    },
    {
      name: "vectorvault",
      short_desc: "Embedded vector database optimized for agent memory and RAG",
      description: "A lightweight, embedded vector database designed for AI agent memory. Supports hybrid search (vector + keyword), automatic chunking, and incremental indexing. No external dependencies.",
      homepage: "https://github.com/example/vectorvault",
      repo: "https://github.com/example/vectorvault",
      license: "BSD-3-Clause",
      category: "Databases",
      author: "MemoryLabs",
      version: "3.1.2",
      changes: "Fixed HNSW index corruption on large batches, added WASM build target, 40% faster similarity search",
      urgency: "Medium",
      tags: ["vector-db", "embeddings", "rag", "memory", "rust"],
    },
    {
      name: "agentbench",
      short_desc: "Standardized benchmarks for evaluating autonomous coding agents",
      description: "A suite of 200+ real-world coding tasks for benchmarking agent performance. Includes SWE-bench integration, custom eval harness, and leaderboard publishing.",
      homepage: "https://github.com/example/agentbench",
      repo: "https://github.com/example/agentbench",
      license: "Apache-2.0",
      category: "Testing",
      author: "EvalOps",
      version: "1.0.0",
      changes: "Initial stable release. 200 curated tasks across Python, TypeScript, Go, and Rust. Docker-based sandboxed execution.",
      urgency: "Low",
      tags: ["benchmark", "evaluation", "testing", "swe-bench", "python"],
    },
    {
      name: "sandcastle",
      short_desc: "Secure sandboxed execution environments for untrusted agent code",
      description: "Spin up isolated execution environments for agents to run arbitrary code safely. Uses gVisor/Firecracker under the hood. Sub-second cold starts, resource limits, network policies.",
      homepage: "https://github.com/example/sandcastle",
      repo: "https://github.com/example/sandcastle",
      license: "GPL-3.0",
      category: "Security",
      author: "SecureAgent Inc",
      version: "0.5.3",
      changes: "Added ARM64 support, fixed container escape vulnerability (CVE-2026-1234), improved cleanup on OOM kill",
      urgency: "Critical",
      tags: ["sandbox", "security", "containers", "gvisor", "go"],
    },
    {
      name: "llm-gateway",
      short_desc: "Unified API gateway for 20+ LLM providers with smart routing",
      description: "A single API endpoint that routes to OpenAI, Anthropic, Google, Mistral, local models, and more. Supports fallback chains, cost optimization, rate limiting, and usage analytics.",
      homepage: "https://github.com/example/llm-gateway",
      repo: "https://github.com/example/llm-gateway",
      license: "MIT",
      category: "Infrastructure",
      author: "GatewayAI",
      version: "4.0.0",
      changes: "Major rewrite: async streaming, OpenTelemetry traces, prompt caching across providers, new admin dashboard",
      urgency: "High",
      tags: ["llm", "gateway", "api", "routing", "typescript"],
    },
    {
      name: "agentfs",
      short_desc: "FUSE filesystem that gives agents a structured view of codebases",
      description: "Mount any codebase as a virtual filesystem optimized for agent consumption. Auto-generates summaries, dependency graphs, and semantic indexes. Agents see files through an intelligent lens.",
      homepage: "https://github.com/example/agentfs",
      repo: "https://github.com/example/agentfs",
      license: "MIT",
      category: "Developer Tools",
      author: "FSAgent",
      version: "0.3.1",
      changes: "Added incremental index updates, Python AST support, fixed symlink handling on macOS",
      urgency: "Low",
      tags: ["filesystem", "fuse", "codebase", "indexing", "rust"],
    },
    {
      name: "swarmkit",
      short_desc: "Lightweight framework for coordinating swarms of specialized agents",
      description: "Deploy and coordinate multiple specialized agents that collaborate on complex tasks. Built-in message passing, shared memory, role assignment, and consensus protocols.",
      homepage: "https://github.com/example/swarmkit",
      repo: "https://github.com/example/swarmkit",
      license: "Apache-2.0",
      category: "Frameworks",
      author: "SwarmAI",
      version: "1.2.0",
      changes: "New: agent discovery protocol, improved deadlock detection, Redis-backed shared state, Python 3.13 support",
      urgency: "Medium",
      tags: ["multi-agent", "swarm", "coordination", "distributed", "python"],
    },
    {
      name: "tool-forge",
      short_desc: "Generate MCP tool servers from OpenAPI specs automatically",
      description: "Point it at any OpenAPI/Swagger spec and get a fully functional MCP tool server. Handles auth, pagination, error mapping, and generates typed tool schemas automatically.",
      homepage: "https://github.com/example/tool-forge",
      repo: "https://github.com/example/tool-forge",
      license: "MIT",
      category: "MCP Servers",
      author: "ForgeWorks",
      version: "2.0.0",
      changes: "Complete rewrite in Rust. 10x faster generation, streaming responses, OAuth2 flow support, GraphQL spec support",
      urgency: "High",
      tags: ["mcp", "openapi", "codegen", "tools", "rust"],
    },
    {
      name: "context-window",
      short_desc: "Smart context management and compression for long agent sessions",
      description: "Automatically manages context windows for long-running agent sessions. Implements rolling summarization, priority-based eviction, and semantic deduplication to maximize useful context.",
      homepage: "https://github.com/example/context-window",
      repo: "https://github.com/example/context-window",
      license: "MIT",
      category: "AI Agents",
      author: "ContextAI",
      version: "1.5.0",
      changes: "Added token counting for Claude 4.5, improved summarization quality, new priority heuristics for code vs prose",
      urgency: "Medium",
      tags: ["context", "memory", "compression", "tokens", "typescript"],
    },
    {
      name: "permit-agent",
      short_desc: "Fine-grained permission system for agent tool access and actions",
      description: "Define and enforce what tools agents can use, what files they can access, and what actions they can take. Policy-as-code with RBAC, audit logging, and real-time monitoring.",
      homepage: "https://github.com/example/permit-agent",
      repo: "https://github.com/example/permit-agent",
      license: "Apache-2.0",
      category: "Security",
      author: "PermitAI",
      version: "0.8.0",
      changes: "New policy DSL, OIDC integration, Slack alerting on policy violations, improved audit log querying",
      urgency: "Medium",
      tags: ["permissions", "security", "rbac", "policy", "go"],
    },
  ];

  const tx = db.transaction(() => {
    for (const p of projects) {
      const result = insertProject.run(
        p.name, p.short_desc, p.description, p.homepage, p.repo, p.license, p.category, p.author
      );
      const projectId = result.lastInsertRowid;
      insertRelease.run(projectId, p.version, p.changes, p.urgency);
      for (const tag of p.tags) {
        insertTag.run(projectId, tag);
      }
    }
  });
  tx();
}
