-- Migration 20260825_08_data_quality_pgvector.sql
-- Data Quality Center + pgvector RAG foundation

-- pgvector (if available on Neon — safe fallback)
CREATE EXTENSION IF NOT EXISTS vector;

-- Quality findings
CREATE TABLE IF NOT EXISTS data_quality_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL CHECK (check_type IN ('duplicate_person','duplicate_establishment','orphan_contract','invalid_code','missing_national_id','conflicting_dates','historical_conflict')),
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','resolved','ignored')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quality_type ON data_quality_findings(check_type, status);

-- Legal embeddings (RAG)
CREATE TABLE IF NOT EXISTS legal_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_source_id UUID REFERENCES legal_sources(id),
  article_id UUID REFERENCES legal_articles(id),
  chunk_text TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
-- HNSW index for <100ms vector search
CREATE INDEX IF NOT EXISTS idx_legal_embeddings_vector ON legal_embeddings USING hnsw (embedding vector_cosine_ops);

-- Notification intelligence — deduplicate + prioritize
CREATE TABLE IF NOT EXISTS notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  recipient_role TEXT,
  title_ar TEXT NOT NULL,
  body_ar TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  dedup_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
