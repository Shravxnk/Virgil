-- Chakravyuh PostgreSQL schema
-- Run once to initialise. All statements are idempotent (IF NOT EXISTS).

-- Accounts with per-account behavioural baseline for anomaly scoring
CREATE TABLE IF NOT EXISTS accounts (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    account_type        TEXT NOT NULL,
    kyc_tier            TEXT,
    risk_rating         TEXT DEFAULT 'low',
    monthly_avg_credit  BIGINT DEFAULT 0,
    monthly_avg_debit   BIGINT DEFAULT 0,
    typical_hours_start INT DEFAULT 9,
    typical_hours_end   INT DEFAULT 21,
    city                TEXT,
    state               TEXT,
    profile             JSONB NOT NULL DEFAULT '{}'
);

-- Pre-transaction queue: ML scores the transaction BEFORE it executes
-- Powers the GPay mock real-time block/approve demo
CREATE TABLE IF NOT EXISTS pre_txn_queue (
    id           TEXT PRIMARY KEY,
    from_account TEXT NOT NULL,
    to_account   TEXT NOT NULL,
    amount       BIGINT NOT NULL,
    currency     TEXT DEFAULT 'INR',
    txn_type     TEXT NOT NULL,
    channel      TEXT NOT NULL,
    device_id    TEXT,
    device_name  TEXT,
    device_known BOOLEAN DEFAULT FALSE,
    ip_address   TEXT,
    geo_location TEXT,
    upi_ref      TEXT,
    risk_score   INT DEFAULT 0,
    risk_signals JSONB DEFAULT '{}',
    decision     TEXT DEFAULT 'pending',
    scored_at    TIMESTAMPTZ,
    completed    BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Completed transactions
CREATE TABLE IF NOT EXISTS transactions (
    id            TEXT PRIMARY KEY,
    from_account  TEXT NOT NULL,
    from_name     TEXT,
    to_account    TEXT NOT NULL,
    to_name       TEXT,
    amount        BIGINT NOT NULL,
    currency      TEXT DEFAULT 'INR',
    txn_type      TEXT NOT NULL,
    channel       TEXT NOT NULL,
    status        TEXT DEFAULT 'completed',
    risk_score    INT DEFAULT 0,
    flagged       BOOLEAN DEFAULT FALSE,
    pre_txn_id    TEXT REFERENCES pre_txn_queue(id),
    case_id       TEXT,
    post_analysis JSONB DEFAULT '{}',
    ts            TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts with generated columns for fast filtering
CREATE TABLE IF NOT EXISTS alerts (
    id         TEXT PRIMARY KEY,
    data       JSONB NOT NULL,
    severity   TEXT GENERATED ALWAYS AS (data->>'severity') STORED,
    status     TEXT GENERATED ALWAYS AS (data->>'status') STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cases with generated columns for fast filtering
CREATE TABLE IF NOT EXISTS cases (
    id         TEXT PRIMARY KEY,
    data       JSONB NOT NULL,
    status     TEXT GENERATED ALWAYS AS (data->>'status') STORED,
    risk_score INT  GENERATED ALWAYS AS ((data->>'risk_score')::INT) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GPay mock demo sessions (4 phones, queried live by dashboard)
CREATE TABLE IF NOT EXISTS demo_sessions (
    session_id  TEXT PRIMARY KEY,
    phone_label TEXT NOT NULL,
    account_id  TEXT NOT NULL,
    scenario    TEXT NOT NULL,
    status      TEXT DEFAULT 'idle',
    last_txn_id TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pre_txn_from    ON pre_txn_queue(from_account);
CREATE INDEX IF NOT EXISTS idx_pre_txn_decision ON pre_txn_queue(decision);
CREATE INDEX IF NOT EXISTS idx_pre_txn_created  ON pre_txn_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_txn_from         ON transactions(from_account);
CREATE INDEX IF NOT EXISTS idx_txn_flagged      ON transactions(flagged);
CREATE INDEX IF NOT EXISTS idx_txn_ts           ON transactions(ts DESC);
CREATE INDEX IF NOT EXISTS idx_txn_case         ON transactions(case_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity  ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_status    ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created   ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_status     ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_risk       ON cases(risk_score DESC);
