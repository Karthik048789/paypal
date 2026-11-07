# PayGuard Escrow — Autonomous AI Payment Verification & Settlement

> **Autonomous AI escrow agent that tests a freelancer's live website in a cloud browser and releases held PayPal funds based on deterministic results.**

---

## 🛠️ Architecture & Core Philosophy
**"AI Proposes, Code Disposes"**
* **The LLM** drafts checklist criteria, assists with ambiguous UI interactions, and formats plain-English explanation reports.
* **Deterministic Code** executes browser assertions, computes numerical scores, enforces hard-fail critical constraints, and triggers PayPal escrow captures/voids.

---

## 👥 Member Division of Responsibilities

### Member A: Platform, Payments & Frontend
* Core focus: `/app`, `/components`, `/lib/paypal`
* Next.js UI, client/freelancer dashboards, Supabase Auth/DB, PayPal sandbox checkout buttons & webhooks.

### Member B: AI Agent & Verification Engine (This Repository Implementation)
* Core focus: `/worker`, `/lib/agent`, `/lib/scoring`, `/demo-sites`
* Automated verification pipeline, Playwright/Kernel cloud browser agent, deterministic scoring engine, settlement orchestrator, SSRF security validation, prompt injection defense, and demo test fixtures.

---

## 📦 Directory Structure

```
├── lib/
│   ├── agent/
│   │   ├── browser.ts        # Playwright / Kernel browser primitives (viewport, overflow, console)
│   │   ├── checklist.ts      # Checklist generator & schema validator (sum=100, console check)
│   │   ├── report.ts         # Plain-English decision report generator
│   │   ├── runner.ts         # Test runner with 3-run majority voting & event streaming
│   │   └── security.ts       # SSRF URL validator & Prompt injection sanitizer
│   ├── paypal/
│   │   └── index.ts          # Shared interface contract & idempotent capture ledger
│   └── scoring/
│       ├── engine.ts         # Pure deterministic scoring function (critical-fail override)
│       └── settlement.ts     # Payout tier orchestrator & 2% platform fee calculation
├── worker/
│   └── index.ts              # Background verification worker service & event logger
├── demo-sites/
│   └── server.ts             # 5 target test sites (100% working, 70% broken mobile, <60% broken login, console errors, prompt attack)
├── types/
│   └── index.ts              # Shared TypeScript contracts (RunResult, RunEvent, ChecklistItem, etc.)
├── test/
│   ├── scoring.test.ts       # 10 unit tests for scoring engine & settlement idempotency
│   ├── agent.test.ts         # 8 unit tests for checklist validator & SSRF/prompt security
│   └── e2e.test.ts           # End-to-end integration test across all 3 payout tiers
└── package.json
```

---

## 🚀 Quickstart & Commands

### 1. Install Dependencies
```bash
pnpm install
# or
npm install
```

### 2. Run Test Suite
```bash
# Run unit & security tests
npx vitest run test/scoring.test.ts test/agent.test.ts

# Run end-to-end browser agent verification
npx vitest run test/e2e.test.ts
```

### 3. Launch Demo Test Sites
```bash
SERVE_STANDALONE=true npx tsx demo-sites/server.ts
```
* **Working Site (100% score / PAID):** `http://localhost:4100/working`
* **Broken Mobile Viewport (70% score / PARTIALLY_PAID):** `http://localhost:4100/broken-mobile`
* **Broken Authentication (<60% score / HELD):** `http://localhost:4100/broken-login`
* **Console Error Site:** `http://localhost:4100/console-errors`
* **Prompt Injection Page:** `http://localhost:4100/prompt-injection`

### 4. Run Verification Worker CLI
```bash
RUN_WORKER_CLI=true npx tsx worker/index.ts
```

---

## 🔒 Security & Reliability Guarantees
* **SSRF Shield:** Blocks private IP resolution (`127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`, `169.254.0.0/16`) on public submissions.
* **Prompt Injection Defense:** Web DOM content is treated as untrusted. Hostile instructions in page copy cannot alter agent actions or payout amounts.
* **Double-Capture Prevention:** All payment requests enforce unique idempotency keys (`job:{id}:run:{id}:capture`).
* **Majority Voting:** Each test item is executed with discrepancy detection (up to 3 runs) to ensure $\ge 95\%$ reproducibility.

