-- ============================================================
-- DecentraCare DApp — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. USERS — wallet registry
CREATE TABLE IF NOT EXISTS users (
  wallet_address  TEXT PRIMARY KEY,
  role            TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'none')),
  name            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. APPOINTMENTS — booking records
CREATE TABLE IF NOT EXISTS appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_wallet  TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  doctor_wallet   TEXT NOT NULL,
  date            DATE,
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  tx_hash         TEXT,
  is_simulated    BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor  ON appointments(doctor_wallet);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_wallet);

-- 3. CONSULTATIONS / PRESCRIPTIONS
CREATE TABLE IF NOT EXISTS consultations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id TEXT UNIQUE NOT NULL,
  doctor_wallet   TEXT NOT NULL,
  patient_wallet  TEXT NOT NULL,
  medication      TEXT,
  diagnosis       TEXT,
  tx_hash         TEXT,
  is_simulated    BOOLEAN DEFAULT TRUE,
  timestamp       BIGINT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor  ON consultations(doctor_wallet);
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations(patient_wallet);

-- 4. ACCESS GRANTS — patient → doctor permission registry
CREATE TABLE IF NOT EXISTS access_grants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_wallet  TEXT NOT NULL,
  doctor_wallet   TEXT NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  granted_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_wallet, doctor_wallet)
);
CREATE INDEX IF NOT EXISTS idx_access_grants_doctor ON access_grants(doctor_wallet);

-- 5. ACTIVITY LOG — full audit trail of all DApp actions
CREATE TABLE IF NOT EXISTS activity_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT,
  action        TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security (RLS) ─────────────────────────────────
-- Disable for now (anon key access). Enable & add policies for production.
ALTER TABLE users          DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments   DISABLE ROW LEVEL SECURITY;
ALTER TABLE consultations  DISABLE ROW LEVEL SECURITY;
ALTER TABLE access_grants  DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log   DISABLE ROW LEVEL SECURITY;
