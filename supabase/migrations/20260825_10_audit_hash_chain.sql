-- Migration 20260825_10_audit_hash_chain.sql — سلسلة هاش غير قابلة للعبث + طبقة مكافحة فساد

-- 1. Hash chain for audit_log — tamper-evident
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS prev_hash TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS row_hash TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS sequence BIGINT;

CREATE INDEX IF NOT EXISTS idx_audit_sequence ON audit_log(sequence);

-- Trigger to compute hash chain
CREATE OR REPLACE FUNCTION audit_hash_chain() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  prev TEXT;
  seq BIGINT;
  payload TEXT;
BEGIN
  SELECT row_hash, sequence INTO prev, seq FROM audit_log ORDER BY sequence DESC NULLS LAST LIMIT 1;
  IF prev IS NULL THEN prev := 'GENESIS'; seq := 0; END IF;
  NEW.sequence := seq + 1;
  NEW.prev_hash := prev;
  payload := COALESCE(NEW.action,'') || COALESCE(NEW.table_name,'') || COALESCE(NEW.record_id::text,'') || COALESCE(NEW.actor_id::text,'') || prev || NEW.sequence::text;
  NEW.row_hash := encode(digest(payload, 'sha256'), 'hex');
  RETURN NEW;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_audit_hash') THEN
    CREATE TRIGGER trg_audit_hash BEFORE INSERT ON audit_log FOR EACH ROW EXECUTE FUNCTION audit_hash_chain();
  END IF;
END $$;

-- 2. Make audit immutable — revoke UPDATE/DELETE for app role (defense in depth)
-- Note: requires separate app user; for now add check constraint + trigger to block
CREATE OR REPLACE FUNCTION block_audit_mutation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only — mutation blocked (hash chain)';
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_block_audit_update') THEN
    CREATE TRIGGER trg_block_audit_update BEFORE UPDATE OR DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION block_audit_mutation();
  END IF;
END $$;

-- 3. Anti-corruption layer: canonical view merging two establishment sources
CREATE OR REPLACE VIEW v_establishment_canonical AS
SELECT 
  COALESCE(le.id, ce.id) as canonical_id,
  COALESCE(le.entity_number, ce.unified_code) as unified_code,
  COALESCE(le.name_ar, ce.name_ar) as name_ar,
  COALESCE(le.governorate, ce.governorate) as governorate,
  CASE WHEN le.id IS NOT NULL AND ce.id IS NOT NULL THEN 'both'
       WHEN le.id IS NOT NULL THEN 'legal_entities'
       ELSE 'commercial_establishments' END as source,
  le.id as legal_id,
  ce.id as commercial_id
FROM legal_entities le
FULL OUTER JOIN commercial_establishments ce ON le.entity_number = ce.unified_code
WHERE COALESCE(le.deleted_at, ce.deleted_at) IS NULL;

-- 4. Integrity verification function
CREATE OR REPLACE FUNCTION verify_audit_chain() RETURNS TABLE(broken_at BIGINT, expected TEXT, actual TEXT) LANGUAGE plpgsql AS $$
DECLARE r RECORD; prev TEXT := 'GENESIS'; calc TEXT;
BEGIN
  FOR r IN SELECT * FROM audit_log ORDER BY sequence LOOP
    calc := encode(digest(COALESCE(r.action,'') || COALESCE(r.table_name,'') || COALESCE(r.record_id::text,'') || COALESCE(r.actor_id::text,'') || prev || r.sequence::text, 'sha256'), 'hex');
    IF calc != r.row_hash THEN RETURN QUERY SELECT r.sequence, calc, r.row_hash; RETURN; END IF;
    prev := r.row_hash;
  END LOOP;
END $$;
