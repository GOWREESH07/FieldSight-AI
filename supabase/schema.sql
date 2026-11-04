-- ============================================================
-- FieldSight — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor of your project.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS jobs (
  id                   TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','processing','done','error')),
  stage                TEXT NOT NULL DEFAULT 'uploading'
                         CHECK (stage IN (
                           'uploading','extracting_frames','detecting_objects',
                           'reasoning','scoring_risk','compiling_report','done'
                         )),
  progress             INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  video_url            TEXT,
  local_path           TEXT,
  alert_email          TEXT,
  duration_seconds     FLOAT,
  error_message        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration helper for existing databases:
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS alert_email TEXT;

CREATE TABLE IF NOT EXISTS tracks (
  id                   TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  job_id               TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  track_id             INTEGER NOT NULL,
  frame_start          INTEGER NOT NULL,
  frame_end            INTEGER NOT NULL,
  class_label          TEXT NOT NULL,
  bbox_sequence        JSONB NOT NULL DEFAULT '[]',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tracks_job_id_idx ON tracks(job_id);

CREATE TABLE IF NOT EXISTS events (
  id                   TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  job_id               TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  track_id             INTEGER,
  timestamp_start      FLOAT NOT NULL,
  timestamp_end        FLOAT NOT NULL,
  behaviour_id         INTEGER NOT NULL CHECK (behaviour_id BETWEEN 1 AND 12),
  behaviour_label      TEXT NOT NULL,
  risk_level           TEXT NOT NULL
                         CHECK (risk_level IN ('low','medium','high','critical')),
  risk_score           FLOAT NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  explanation          TEXT NOT NULL,
  confidence_tier      TEXT NOT NULL
                         CHECK (confidence_tier IN ('observed_behaviour','potential_risk')),
  contributing_factors JSONB NOT NULL DEFAULT '{}',
  expected_practice    TEXT NOT NULL,
  bbox                 JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS events_job_id_idx       ON events(job_id);
CREATE INDEX IF NOT EXISTS events_risk_level_idx   ON events(risk_level);
CREATE INDEX IF NOT EXISTS events_behaviour_id_idx ON events(behaviour_id);

CREATE TABLE IF NOT EXISTS behaviour_taxonomy (
  id               INTEGER PRIMARY KEY,
  label            TEXT NOT NULL,
  severity         TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  expected_practice TEXT NOT NULL,
  description      TEXT NOT NULL
);

INSERT INTO behaviour_taxonomy (id, label, severity, expected_practice, description) VALUES
  (1,'Dropping / throwing product','critical','Place products gently using both hands or mechanical aids; never drop from height.','Worker drops or throws items from height, risking structural damage on impact.'),
  (2,'Dragging product instead of carrying/using equipment','high','Use trolley, pallet truck, or carry correctly to prevent surface damage.','Product is pulled or dragged along the floor instead of lifted or wheeled properly.'),
  (3,'Rough handling / excessive impact','high','Handle with care; use padding for fragile items; avoid sudden movements.','Forceful contact, slamming, or sudden jolts during movement or placement.'),
  (4,'Improper stacking (heavy-on-light or unsupported)','high','Stack heavy items at bottom; ensure stable base; follow weight limits.','Heavy products placed on lighter or more fragile ones, risking crush damage.'),
  (5,'Unstable / overloaded stacking','medium','Keep stacks within height and weight limits; ensure pyramid stability.','Stack exceeds safe height or load, creating topple and damage risk.'),
  (6,'Product placed outside designated area','medium','Place all products within marked zones; follow floor layout.','Items stored or staged outside marked areas, creating tripping and loss risk.'),
  (7,'Product handled without required equipment','medium','Use appropriate handling equipment (trolley/pallet truck) for heavy/bulky items.','Large or heavy items moved manually when mechanical assistance is required.'),
  (8,'Incorrect pallet positioning / product overhang','medium','Ensure products sit within pallet edges; no overhang beyond 50mm.','Products extend beyond pallet edges, risking shift or fall during transport.'),
  (9,'Rolling a product not designed to be rolled','medium','Use wheeled equipment; never roll cartons or rigid containers.','Cartons or rigid items rolled along the floor, straining seams and edges.'),
  (10,'Standing / stepping on cartons','high','Never stand on product; use a step ladder or elevated platform.','Worker stands or steps directly on packaged goods, causing crush damage.'),
  (11,'Unsafe loading/unloading sequence','low','Follow FIFO sequence; stage items systematically before loading.','Random or chaotic staging creates congestion and increases drop/collision risk.'),
  (12,'Wet-floor / unsafe-surface handling','medium','Address wet surfaces before handling; use non-slip footwear and mats.','Handling operations continue on visibly wet or unsafe surfaces.')
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS jobs_updated_at ON jobs;
CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
