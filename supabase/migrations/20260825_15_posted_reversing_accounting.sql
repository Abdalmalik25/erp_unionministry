-- Migration 20260825_15_posted_reversing_accounting.sql — القيود المرحلة والتوازن المحاسبي
-- Implements: Immutable POSTED/REVERSED constraints, Accounting balance checks

-- 1. Create status enum for financial entries if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'financial_entry_status') THEN
    CREATE TYPE financial_entry_status AS ENUM ('draft', 'posted', 'reversed', 'corrected');
    RAISE NOTICE 'Created financial_entry_status enum';
  END IF;
END $$;

-- 2. Add status column to financial tables if not exists, with constraint
DO $$
BEGIN
  -- Add status to organizational_entities if not exists (simplified: using renewal_status already exists)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizational_entities' AND column_name='entry_status') THEN
    ALTER TABLE organizational_entities ADD COLUMN entry_status financial_entry_status DEFAULT 'draft';
    RAISE NOTICE 'Added entry_status to organizational_entities';
  END IF;
END $$;

-- 3. Create table for financial entries/ledger (general ledger)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='financial_ledger') THEN
    CREATE TABLE financial_ledger (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_id UUID REFERENCES organizational_entities(entity_id),
      transaction_date DATE NOT NULL,
      description TEXT NOT NULL,
      debit NUMERIC(15, 2) DEFAULT 0 CHECK (debit >= 0),
      credit NUMERIC(15, 2) DEFAULT 0 CHECK (credit >= 0),
      status financial_entry_status NOT NULL DEFAULT 'draft',
      reference_id UUID, -- reference to related record (violation, contract, etc.)
      reference_type TEXT, -- e.g., 'violation', 'contract', 'expense'
      created_by UUID REFERENCES profiles(id),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_ledger_entity ON financial_ledger(entity_id);
    CREATE INDEX IF NOT EXISTS idx_ledger_status ON financial_ledger(status);
    RAISE NOTICE 'Created financial_ledger table';
  END IF;
END $$;

-- 4. Make POSTED/REVERSED entries immutable - prevent updates/deletions
DO $$
BEGIN
  -- Create trigger to prevent modification of posted entries
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_financial_ledger_immutable') THEN
    CREATE OR REPLACE FUNCTION block_financial_ledger_modification() RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.status IN ('posted', 'reversed') THEN
        RAISE EXCEPTION 'Cannot modify financial entry with status POSTED or REVERSED';
      END IF;
      RETURN NEW;
    END $$;
    
    CREATE OR REPLACE FUNCTION block_financial_ledger_deletion() RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      IF OLD.status IN ('posted', 'reversed') THEN
        RAISE EXCEPTION 'Cannot delete financial entry with status POSTED or REVERSED';
      END IF;
      RETURN NEW;
    END $$;
    
    CREATE TRIGGER trg_financial_ledger_immutable
      BEFORE UPDATE OR DELETE ON financial_ledger
      FOR EACH ROW EXECUTE FUNCTION block_financial_ledger_modification();
    
    CREATE TRIGGER trg_financial_ledger_deletion
      BEFORE DELETE ON financial_ledger
      FOR EACH ROW EXECUTE FUNCTION block_financial_ledger_deletion();
    
    RAISE NOTICE 'Added immutable triggers for financial_ledger';
  END IF;
END $$;

-- 5. Correction mechanism: generating opposite entry ( reversal )
DO $$
BEGIN
  -- Function to create a correcting entry (opposite debit/credit)
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_correction_entry') THEN
    CREATE OR REPLACE FUNCTION create_correction_entry(
      p_entity_id UUID,
      p_transaction_date DATE,
      p_description TEXT,
      p_original_id UUID
    ) RETURNS UUID AS $$
    DECLARE
      v_original_row financial_ledger%ROWTYPE;
      v_correction_id UUID;
    BEGIN
      -- Get the original entry
      SELECT * INTO v_original_row FROM financial_ledger WHERE reference_id = p_original_id LIMIT 1;
      
      -- Create correction with opposite debit/credit
      INSERT INTO financial_ledger (entity_id, transaction_date, description, debit, credit, status, reference_id, reference_type, created_by)
      VALUES (
        p_entity_id,
        p_transaction_date,
        'Correction: ' || p_description,
        -- Swap debit and credit
        CASE WHEN v_original_row.credit > 0 THEN v_original_row.credit ELSE 0 END,
        CASE WHEN v_original_row.debit > 0 THEN v_original_row.debit ELSE 0 END,
        'corrected',
        p_original_id,
        'correction',
        p_entity_id -- or get from context
      )
      RETURNING id INTO v_correction_id;
      
      RETURN v_correction_id;
    END $$ LANGUAGE plpgsql;
    
    RAISE NOTICE 'Created create_correction_entry function';
  END IF;
END $$;

-- 6. Accounting balance check: verify debits = credits per period
DO $$
BEGIN
  CREATE OR REPLACE VIEW v_financial_balance AS
  SELECT
    entity_id,
    DATE_TRUNC('month', transaction_date) AS month,
    SUM(debit) AS total_debits,
    SUM(credit) AS total_credits,
    SUM(debit - credit) AS difference
  FROM financial_ledger
  WHERE status != 'draft' -- only posted/corrected
  GROUP BY entity_id, month
  HAVING ABS(SUM(debit - credit)) > 0.01; -- tolerance of 0.01
  WITH CHECK OPTION;
  
  RAISE NOTICE 'Created v_financial_balance view';
END $$;

-- 7. Function to check accounting balance for a specific entity and period
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION check_entity_balance(
    p_entity_id UUID,
    p_month DATE
  ) RETURNS TABLE(
    entity_id UUID,
    month DATE,
    total_debits NUMERIC(15, 2),
    total_credits NUMERIC(15, 2),
    difference NUMERIC(15, 2),
    is_balanced BOOLEAN
  ) AS $$
  BEGIN
    RETURN QUERY
    SELECT
      entity_id,
      DATE_TRUNC('month', transaction_date) AS month,
      SUM(debit) AS total_debits,
      SUM(credit) AS total_credits,
      SUM(debit - credit) AS difference,
      ABS(SUM(debit - credit)) <= 0.01 AS is_balanced
    FROM financial_ledger
    WHERE entity_id = p_entity_id
      AND status IN ('posted', 'corrected')
      AND transaction_date >= p_month
      AND transaction_date < p_month + INTERVAL '1 month'
    GROUP BY entity_id, DATE_TRUNC('month', transaction_date);
  END $$ LANGUAGE plpgsql;
  
  RAISE NOTICE 'Created check_entity_balance function';
END $$;

-- 8. Add constraint on organizational_entities to prevent negative financial differences
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizational_entities' AND column_name='entry_status') THEN
    ALTER TABLE organizational_entities ADD CONSTRAINT chk_org_entry_status CHECK (
      entry_status IN ('draft', 'posted', 'reversed', 'corrected')
    );
    RAISE NOTICE 'Added chk_org_entry_status';
  END IF;
END $$;

RAISE NOTICE 'Migration 15 completed: Posted/Reversed constraints and Accounting Balance implemented';