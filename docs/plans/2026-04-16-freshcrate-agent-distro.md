# freshcrate Agent Edition Implementation Plan

> For Hermes: use subagent-driven-development if executing this plan. Keep each slice independently shippable.

Goal: turn freshcrate from a package directory into a real agent operator platform by defining and eventually shipping a minimal Linux substrate for agent workstations and runtimes — opinionated, reproducible, secure, and freshcrate-native.

Architecture:
- Do NOT start with a full custom distro ISO as the first milestone. Start with a reproducible “freshcrate distro layer” on top of a stable Ubuntu base, then graduate to image builds once the package/runtime contract is stable.
- Treat the distro as three products: (1) a canonical package/runtime manifest, (2) a bootstrap/install path for existing Linux machines, and (3) later a bootable image / cloud image / VM image.
- Product philosophy: Bodhi-style minimalism for agent operators — minimal base, agentic core, optional thin UI layer, and no heavy desktop bloat by default.
- Use freshcrate itself as the control plane and package directory: distro profiles, curated bundles, validation checks, provenance, and update channels should all be represented in-app.

Tech stack:
- Base OS: Ubuntu LTS or Debian stable
- Packaging/bootstrap: shell + Ansible or shell + Nix/Home Manager style manifests
- Image build later: Packer + debootstrap/live-build or Ubuntu image tooling
- freshcrate app: Next.js pages + typed in-repo data first, then DB-backed distro catalog if needed

---

## Product framing

Call it one of these:
- freshcrate OS
- freshcrate Agent Edition
- freshcrate Runtime
- freshcrate Workbench

Recommended framing:
- freshcrate Agent Edition = the public product name
- “distro” = internal implementation term

Why:
- “Linux distro” is accurate but undersells the operator/toolchain layer.
- Agent operators care about reproducibility, orchestration, security policy, observability, and updates more than just the ISO.

---

## Non-goals for MVP

Do NOT do these in v0:
- custom kernel work
- desktop environment theming rabbit hole
- multiple architectures at once
- own package manager
- rolling-release base
- binary repo hosting before profile stability exists
- trying to replace Ubuntu fully on day one

---

## MVP definition

The MVP is NOT an ISO.
The MVP is:
1. a curated freshcrate “Agent Edition” package profile,
2. a bootstrap installer script,
3. a machine audit command,
4. a freshcrate page/section explaining the distro philosophy and bundles,
5. an update/rebuild path.

Success looks like:
- a user can take a vanilla Ubuntu machine and transform it into a freshcrate agent workstation in one command,
- the resulting machine has the exact toolchain and config expected for agent-heavy work,
- freshcrate can publish and document versioned profiles/bundles.

---

## Proposed distro pillars

### Pillar 1: Reproducible agent toolchain
Base bundle should install and configure:
- git
- node / npm
- uv + Python 3.11
- docker / podman
- tmux / zsh / jq / sqlite3 / ripgrep / fd
- gh CLI
- railway CLI
- cloud CLIs only if justified
- local model runtimes if desired (ollama / llama.cpp path)
- browser automation dependencies
- code editors optional, not core

### Pillar 2: Agent runtime safety
Ship opinionated defaults for:
- least-privilege sudo policy
- workspace isolation patterns
- per-project secrets handling
- audit/log directories
- backup/export of agent state
- review-gated deploy scripts

### Pillar 3: Orchestration ergonomics
Native distro affordances for agent orchestration:
- pre-created workspace layout
- standard directories for projects, logs, caches, model weights
- session receipts and artifact directories
- launcher scripts for multi-agent sessions
- health checks for required binaries/services

### Pillar 4: freshcrate-native discovery
Freshcrate should expose:
- distro bundles (“solo dev”, “research node”, “automation node”, “airgapped security box”)
- compatibility notes
- one-command bootstrap docs
- versioned manifests with provenance

---

## Recommended phased roadmap

## Phase 0: Spec the distro contract

### Task 0.1: Create canonical concept doc
Objective: define exactly what the distro is and is not.

Files:
- Create: docs/plans/freshcrate-agent-distro.md (this file)
- Later create: docs/distro/README.md

Output:
- base OS decision
- supported hardware target
- installer strategy
- profile/bundle model
- update model

### Task 0.2: Define supported target
Objective: pick one target only.

Recommendation:
- Ubuntu 24.04 LTS x86_64 only for v0

Why:
- broad hardware support
- good vendor docs
- least friction for devs

Acceptance:
- explicit statement in docs: “v0 supports Ubuntu 24.04 x86_64 only”

---

## Phase 1: freshcrate app support for distro content

### Task 1.1: Add a new section in freshcrate for distro/workbench
Objective: give the distro a public product home in freshcrate.

Files:
- Create: app/workbench/page.tsx or app/distro/page.tsx
- Create: lib/workbench.ts or lib/distro.ts
- Modify: app/layout.tsx
- Modify: app/sitemap.ts
- Modify: app/api/page.tsx if API docs need distro endpoints later

Page content:
- what Agent Edition is
- why curated environments beat ad-hoc agent setups
- supported targets
- distro bundles
- install command
- machine verification command
- “why not just Docker?” section

Recommendation:
- use “workbench” or “agent-edition” for public route
- keep “distro” in docs if you want

### Task 1.2: Add typed in-repo distro profile data
Objective: represent bundles as structured data before DB complexity.

File:
- Create: lib/distro.ts

Suggested types:
```ts
export interface DistroBundle {
  id: string;
  name: string;
  target: "ubuntu-24.04-x86_64";
  persona: "solo-dev" | "research" | "automation" | "security";
  summary: string;
  packages: string[];
  services: string[];
  bootstrapCommand: string;
  verificationChecks: string[];
}
```

Seed bundles:
- Solo Builder
- Multi-Agent Lab
- Research Node
- Security Ops Node

Acceptance:
- bundles render on page
- users can see exact package/service composition

---

## Phase 2: bootstrap installer (real MVP)

### Task 2.1: Create bootstrap script
Objective: one script to convert supported Ubuntu host into freshcrate Agent Edition.

Files:
- Create: scripts/bootstrap-agent-edition.sh
- Create: scripts/lib/bootstrap-common.sh

Behavior:
- verify OS and arch
- install base dependencies
- install node, uv, docker/podman, gh, railway, jq, rg, fd, sqlite3, tmux, zsh
- create standard directories:
  - ~/workspace
  - ~/.freshcrate
  - ~/.freshcrate/logs
  - ~/.freshcrate/receipts
  - ~/.freshcrate/models
  - ~/.freshcrate/cache
- install optional agent helpers
- write a machine receipt JSON

Acceptance:
- script is idempotent enough to rerun safely
- script exits nonzero on unsupported host
- script emits receipt with installed versions

### Task 2.2: Create verify command
Objective: prove a machine matches the distro profile.

Files:
- Create: scripts/verify-agent-edition.sh

Checks:
- commands exist
- versions meet minimums
- directories exist
- daemon/services healthy where applicable
- shell env hooks present

Acceptance:
- machine gets pass/fail summary
- outputs JSON and human-readable modes

### Task 2.3: Create uninstall/repair notes
Objective: avoid trapping users in a messy half-install.

Files:
- Create: docs/distro/recovery.md

Acceptance:
- clear repair flow
- rollback caveats documented

---

## Phase 3: freshcrate-native distro bundles

### Task 3.1: Add bundle detail pages
Objective: each bundle has a permalink and install instructions.

Files:
- Create: app/workbench/[bundle]/page.tsx
- Modify: app/sitemap.ts

Content:
- who it is for
- installed packages and services
- security posture
- expected resource profile
- bootstrap command
- verify command

### Task 3.2: Add API surface for bundles
Objective: agents can ask freshcrate for distro profiles.

Files:
- Create: app/api/workbench/route.ts
- Create: app/api/workbench/[bundle]/route.ts
- Test: tests/workbench.test.ts

Returns:
- bundle metadata
- bootstrap command
- package list
- verification checklist

Why:
- your own agents can self-provision from freshcrate

---

## Phase 4: artifact builds

### Task 4.1: Build cloud VM image first, not ISO
Objective: easier path than desktop installer ISO.

Files:
- Create: infra/images/packer.pkr.hcl
- Create: infra/images/scripts/provision.sh

Outputs:
- qcow2 / raw image for VM
- maybe cloud-init compatible image later

Why:
- fastest way to validate real reproducible environment
- useful for headless agent nodes immediately

### Task 4.2: Build bootable ISO only after profile stability
Objective: desktop install media for wider distribution.

Files:
- Create later: infra/iso/*

Prereq:
- bootstrap and verify flow stable across multiple test machines

---

## Strong opinionated best practices for agent distro design

1. Reproducibility beats cleverness
- pin versions where possible
- emit receipts for every install
- keep install logs

2. Review-gated side effects should be part of the distro UX
- deploy helpers should default to dry-run or review-first behavior
- production push scripts should be explicit wrappers, not invisible magic

3. Logs and artifacts are first-class
- every orchestration environment should have canonical places for:
  - receipts
  - session logs
  - patch bundles
  - test outputs
  - deploy notes

4. Prefer bootstrap-first over image-first
- images freeze bad assumptions too early
- bootstrap makes iteration cheap

5. One supported base is power
- one OS target now is worth more than five flaky targets

6. Security defaults matter more than package count
- minimal sudo
- explicit secret locations
- no silent privilege escalation
- clear daemon inventory

7. The distro should be freshcrate-native, not adjacent
- freshcrate should be the catalog and control plane for bundles and verification

---

## Suggested immediate next slice

If starting now, do this exact order:

1. Add a public freshcrate “workbench” or “agent edition” page
2. Add typed distro bundle data in-repo
3. Create bootstrap script for Ubuntu 24.04 x86_64
4. Create verify script
5. Add bundle API endpoints
6. Test on one clean VM
7. Only then think about images/ISO

---

## Recommended first shipping name + route

Recommendation:
- Product name: freshcrate Agent Edition
- Route: /workbench

Why:
- sounds higher-end than “distro”
- still compatible with future VM image / ISO / cloud node products

---

## Verification checklist for MVP

- `npm run build` passes
- freshcrate page renders with bundles and install docs
- bootstrap script runs on clean Ubuntu 24.04 VM
- verify script returns pass on provisioned machine
- freshcrate API exposes bundle definitions
- no runtime DB coupling required for first slice

---

## Proposed commit sequence

1. `feat: add workbench section for agent edition`
2. `feat: add distro bundle data and pages`
3. `feat: add agent edition bootstrap script`
4. `feat: add machine verification script`
5. `feat: add workbench bundle api`
6. `docs: add freshcrate agent edition operating guide`
