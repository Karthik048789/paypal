# PayGuard Escrow — Member A: Platform, Payments & Frontend

> **Autonomous AI Escrow for Verified Software Deliverables**  
> *"Money is correct and the UI is smooth"*

PayGuard Escrow holds client funds in a PayPal authorization hold (`intent=AUTHORIZE`), allows an AI cloud browser to verify web deliverables against a deterministic rubric, and autonomously executes proportional or full captures based on pass/fail scoring.

---

## 🏛️ System Architecture & Member A Scope

Member A is responsible for the full platform infrastructure, transactional database models, security/auth, PayPal sandbox integrations, shared team contracts, and complete frontend user experience.

### Core Architecture Principles
1. **Idempotent Money:** Every payment action is safe to retry using the unique key pattern `job:{id}:run:{id}:capture`. Double captures are strictly prevented at both the database and API level.
2. **Transactional Integrity:** Payment authorization updates, append-only `PaymentEvent` entries, and `Job` lifecycle status changes are guaranteed in a single atomic database transaction (`prisma.$transaction`).
3. **Event-Driven Realtime UI:** Live milestone timeline and verification activity feed stream in real-time via Server-Sent Events (`/api/jobs/[id]/events`) without page reloads.
4. **Deterministic Scoring (BR-1 to BR-5):** AI plans and tests, but deterministic TypeScript code computes the score and triggers payouts.

---

## 📦 12 Core Database Entities (Prisma & Supabase Migration)

Both SQLite (zero-config local dev & instant testing) and PostgreSQL (Supabase production migration at `supabase/migrations/20261106_payguard_init.sql`) are supported.

1. `User`: Authentication, roles (`CLIENT`, `FREELANCER`, `ADMIN`), PayPal emails.
2. `Job`: Escrow contracts, requirements (20–2000 chars), amounts ($5–$5000 USD in integer cents), lifecycle status, deadlines.
3. `Checklist`: Versioned rubrics, dual approval timestamps (`approvedByClientAt`, `approvedByFreelancerAt`), immutable locking flag.
4. `ChecklistItem`: Descriptions, test types (`functional`, `responsive`, `console_errors`, `content_present`, `navigation`), weights (sum = 100), critical flag (BR-5).
5. `PaymentAuthorization`: PayPal order IDs, authorization IDs, amount, captured amount, status, expiration dates.
6. `Submission`: Submitted URLs, encrypted test credentials (AES-256-GCM), notes.
7. `VerificationRun`: Status (`RUNNING`, `COMPLETED`, `FAILED`, `NEEDS_REVIEW`, `ERRORED`), scores (0–100), session IDs, replay stream URLs.
8. `TestResult`: Pass/fail/inconclusive verdicts, evidence screenshots, terminal log excerpts, explanations.
9. `PaymentEvent`: Append-only immutable payment audit trail with unique `idempotencyKey` constraint.
10. `Report`: Plain-English rationale, score breakdowns, released payout amounts and percentages.
11. `Dispute`: Freeze controls, statements, Admin resolution (`uphold`, `override`, `void`), audit details.
12. `AuditLog`: Immutable change log for all state transitions, financial executions, and admin overrides.

---

## 🤝 Member A Interface Contract (`lib/paypal/index.ts`)

Exported functions invoked by Member B's settlement orchestrator or background worker:

```typescript
// Owned by Member A, called by Member B's settlement orchestrator
export async function captureAuthorization({
  jobId, runId, amountCents, finalCapture
}: {
  jobId: string;
  runId: string;
  amountCents: number;
  finalCapture: boolean;
}): Promise<PaymentResult>;

export async function voidAuthorization({
  jobId, reason
}: {
  jobId: string;
  reason: string;
}): Promise<PaymentResult>;

export async function getAuthorizationStatus(jobId: string): Promise<AuthStatus>;
```

### Shared Types (`/types/index.ts`)
- `JobStatus`: `'DRAFT' | 'AWAITING_APPROVAL' | 'AWAITING_FUNDING' | 'FUNDED' | 'VERIFYING' | 'PAID' | 'PARTIALLY_PAID' | 'HELD' | 'NEEDS_REVIEW' | 'DISPUTED' | 'EXPIRED' | 'CANCELLED'`
- `RunEvent`: `{ runId: string, type: 'step' | 'test_result' | 'viewport' | 'score' | 'payout', message: string, data?: any, ts: number }`
- `RunResult`: `{ runId: string, score: number, tier: ScoreTier, payoutPercent: number, results: TestResultDTO[], reportId?: string }`

---

## ⚖️ Business Rules & Deterministic Scoring (BR-1 to BR-6)

- **BR-1 (Score ≥ 90):** 100% full capture (`final_capture = true`). State → `PAID` (Green).
- **BR-2 (Score 60–89):** 70% partial capture (`final_capture = false`). State → `PARTIALLY_PAID` (Yellow). Remaining 30% held for re-test.
- **BR-3 (Score < 60):** 0% capture. State → `HELD` (Red). Freelancer can fix issues and submit re-test.
- **BR-5 (Hard-Fail Critical Check):** If any item marked `critical: true` fails, score is overridden to 0, state moves to `HELD`.
- **BR-6 (Platform Fee):** 2% fee deducted from payouts, displayed upfront before client funding.
- **FR-23 (Inconclusive Threshold):** If >30% of tests are inconclusive, state moves to `NEEDS_REVIEW`.
- **FR-29 & FR-30 (Re-test Cap):** Up to 3 re-tests permitted. On re-test score ≥ 90, the remaining held 30% is captured.

---

## 🛡️ Security Implementation
- **NFR-S3 Credentials Encryption:** Sensitive test credentials encrypted at rest using AES-256-GCM (`lib/security.ts`).
- **NFR-S5 SSRF Protection:** Validates submitted URLs to ensure HTTPS protocol and resolves hostnames to reject private, loopback, or link-local IP ranges (e.g. `127.0.0.0/8`, `10.0.0.0/8`, `169.254.169.254`, `::1`).
- **NFR-S6 Webhook Deduplication:** Deduplicates incoming PayPal events by unique ID in `app/api/webhooks/paypal/route.ts`.
- **NFR-S8 Immutable Audit Trail:** All financial actions and state transitions logged in `audit_logs`.

---

## 🚀 Quickstart & Verification

### 1. Install & Setup Database
```bash
npm install
npx prisma db push
npm run seed
```

### 2. Run Comprehensive Test Suite
```bash
npm test
```
All 36 unit and integration tests verify:
- Deterministic scoring boundaries (59, 60, 89, 90, and critical fail)
- Strict state machine transitions and invalid transition blocking
- Checklist rubric validation (weights sum = 100, console health ≥ 10, 3–12 items)
- AES-256-GCM encryption/decryption round-trip
- SSRF IP validator blocking loopback, AWS metadata, and internal IPs
- PayPal capture, void, and strict idempotency prevention against double capture

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎭 Pre-Configured Demo Accounts (1-Click Switcher)

The top navigation bar features a 1-click role switcher for seamless evaluations:
- **Alice (Client):** `client@payguard.dev` / `password123`
- **Bob (Freelancer):** `freelancer@payguard.dev` / `password123`
- **Admin:** `admin@payguard.dev` / `password123`

### Built-in Demo Target Profiles:
- `/demo/good`: Fully passing site (100% score → $1,000 full capture)
- `/demo/mobile-broken`: Horizontal scroll overflow on 390px mobile viewport (70% score → $700 partial capture, $300 held)
- `/demo/broken-login`: Authentication failure (<60% score → 0% captured, HELD state)
- `/demo/prompt-injection`: Adversarial prompt injection defense test page
