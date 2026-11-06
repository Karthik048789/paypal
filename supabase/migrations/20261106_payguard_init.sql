-- PayGuard Escrow - Initial Database Migration (Supabase / PostgreSQL)
-- 12 Core Entities with UUIDs, Foreign Keys, Indexes, Constraints, and Timestamps

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  paypal_email TEXT,
  role TEXT NOT NULL DEFAULT 'CLIENT', -- 'CLIENT', 'FREELANCER', 'ADMIN'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  freelancer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  freelancer_email TEXT NOT NULL,
  title TEXT NOT NULL,
  requirements TEXT NOT NULL,
  amount INTEGER NOT NULL, -- Integer cents ($1000 = 100000)
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, AWAITING_APPROVAL, AWAITING_FUNDING, FUNDED, VERIFYING, PAID, PARTIALLY_PAID, HELD, NEEDS_REVIEW, DISPUTED, EXPIRED, CANCELLED
  deadline TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_freelancer_id ON jobs(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- 3. Checklists Table
CREATE TABLE IF NOT EXISTS checklists (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by_client_at TIMESTAMPTZ,
  approved_by_freelancer_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklists_job_id ON checklists(job_id);

-- 4. Checklist Items Table
CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  checklist_id TEXT NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  test_type TEXT NOT NULL, -- functional, responsive, console_errors, content_present, navigation
  criteria TEXT NOT NULL,
  weight INTEGER NOT NULL, -- 1-60, sum = 100
  critical BOOLEAN NOT NULL DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id);

-- 5. Payment Authorizations Table
CREATE TABLE IF NOT EXISTS payment_authorizations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  paypal_order_id TEXT,
  paypal_auth_id TEXT,
  amount INTEGER NOT NULL, -- Cents
  captured_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'CREATED', -- CREATED, AUTHORIZED, PARTIALLY_CAPTURED, COMPLETELY_CAPTURED, VOIDED, EXPIRED
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_authorizations_job_id ON payment_authorizations(job_id);
CREATE INDEX IF NOT EXISTS idx_payment_authorizations_status ON payment_authorizations(status);
CREATE INDEX IF NOT EXISTS idx_payment_authorizations_expires_at ON payment_authorizations(expires_at);

-- 6. Submissions Table
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  credentials_encrypted TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_job_id ON submissions(job_id);

-- 7. Verification Runs Table
CREATE TABLE IF NOT EXISTS verification_runs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'RUNNING', -- RUNNING, COMPLETED, FAILED, NEEDS_REVIEW, ERRORED
  score INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  kernel_session_id TEXT,
  replay_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_runs_submission_id ON verification_runs(submission_id);
CREATE INDEX IF NOT EXISTS idx_verification_runs_status ON verification_runs(status);

-- 8. Test Results Table
CREATE TABLE IF NOT EXISTS test_results (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  run_id TEXT NOT NULL REFERENCES verification_runs(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  result TEXT NOT NULL, -- pass, fail, inconclusive
  evidence_screenshot_url TEXT,
  log_excerpt TEXT,
  explanation TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_results_run_id ON test_results(run_id);
CREATE INDEX IF NOT EXISTS idx_test_results_item_id ON test_results(item_id);

-- 9. Payment Events Table (Append-only, strictly idempotent)
CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- authorize, capture, void, reauthorize, invoice
  amount INTEGER NOT NULL, -- cents
  paypal_ref TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,
  metadata TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_job_id ON payment_events(job_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_idempotency_key ON payment_events(idempotency_key);

-- 10. Reports Table
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  run_id TEXT NOT NULL REFERENCES verification_runs(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  payout_amount INTEGER NOT NULL,
  payout_percent INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_run_id ON reports(run_id);

-- 11. Disputes Table
CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  opened_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, UNDER_REVIEW, RESOLVED_UPHELD, RESOLVED_OVERRIDDEN, RESOLVED_VOIDED
  resolution TEXT,
  resolved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_disputes_job_id ON disputes(job_id);
CREATE INDEX IF NOT EXISTS idx_disputes_opened_by ON disputes(opened_by);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

-- 12. Audit Logs Table (Immutable audit trail)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  before TEXT,
  after TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor);

