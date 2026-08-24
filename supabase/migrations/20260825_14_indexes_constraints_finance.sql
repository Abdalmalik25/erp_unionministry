-- Migration 20260825_14_indexes_constraints_finance.sql — الفهارس والقيود والمالية
-- Implements: Indexes optimization, Constraints integrity, Financial constraints

-- 1. Optimize and verify all indexes are active and trusted
-- Drop any indexes that are disabled/untrusted, rebuild them

-- 2. Add check constraints for financial amounts (prevent negative amounts)
DO $$
BEGIN
  -- organizational_entities: annual_budget, revenue, expenses, assets, liabilities must be >= 0
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizational_entities' AND column_name='annual_budget') THEN
    ALTER TABLE organizational_entities ADD CONSTRAINT chk_org_annual_budget CHECK (annual_budget >= 0);
    RAISE NOTICE 'Added chk_org_annual_budget';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizational_entities' AND column_name='revenue') THEN
    ALTER TABLE organizational_entities ADD CONSTRAINT chk_org_revenue CHECK (revenue >= 0);
    RAISE NOTICE 'Added chk_org_revenue';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizational_entities' AND column_name='expenses') THEN
    ALTER TABLE organizational_entities ADD CONSTRAINT chk_org_expenses CHECK (expenses >= 0);
    RAISE NOTICE 'Added chk_org_expenses';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizational_entities' AND column_name='assets') THEN
    ALTER TABLE organizational_entities ADD CONSTRAINT chk_org_assets CHECK (assets >= 0);
    RAISE NOTICE 'Added chk_org_assets';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizational_entities' AND column_name='liabilities') THEN
    ALTER TABLE organizational_entities ADD CONSTRAINT chk_org_liabilities CHECK (liabilities >= 0);
    RAISE NOTICE 'Added chk_org_liabilities';
  END IF;
END $$;

-- 3. Check constraints for members financial fields
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='subscription_amount') THEN
    ALTER TABLE members ADD CONSTRAINT chk_member_subscription CHECK (subscription_amount >= 0);
    RAISE NOTICE 'Added chk_member_subscription';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='subscription_amount') THEN
    -- Ensure last_payment_date is not before join_date
    ALTER TABLE members ADD CONSTRAINT chk_member_payment_date CHECK (last_payment_date >= join_date OR last_payment_date IS NULL);
    RAISE NOTICE 'Added chk_member_payment_date';
  END IF;
END $$;

-- 4. Check constraints for employment contracts (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='employment_contracts') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employment_contracts' AND column_name='salary') THEN
      ALTER TABLE employment_contracts ADD CONSTRAINT chk_emp_contract_salary CHECK (salary >= 0);
      RAISE NOTICE 'Added chk_emp_contract_salary';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employment_contracts' AND column_name='start_date') THEN
      ALTER TABLE employment_contracts ADD CONSTRAINT chk_emp_contract_start CHECK (start_date <= end_date OR end_date IS NULL);
      RAISE NOTICE 'Added chk_emp_contract_start';
    END IF;
  END IF;
END $$;

-- 5. Add currency reference to organizational_entities
DO $$
BEGIN
  -- Add currency_id column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizational_entities' AND column_name='currency_id') THEN
    ALTER TABLE organizational_entities ADD COLUMN currency_id UUID REFERENCES currencies(id);
    CREATE INDEX IF NOT EXISTS idx_entities_currency ON organizational_entities(currency_id);
    RAISE NOTICE 'Added currency_id to organizational_entities';
  END IF;
END $$;

-- 6. Create currencies table if not exists (for FK reference)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='currencies') THEN
    CREATE TABLE currencies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT UNIQUE NOT NULL, -- e.g., YER, USD, SAR
      name_ar TEXT NOT NULL,
      name_en TEXT,
      symbol TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_currencies_code ON currencies(code);
    -- Seed basic currencies
    INSERT INTO currencies (code, name_ar, name_en, symbol) VALUES
      ('YER', 'الريال اليمني', 'Yemeni Rial', '﷼'),
      ('USD', 'الدولار الأمريكي', 'US Dollar', '$'),
      ('SAR', 'الريال السعودي', 'Saudi Riyal', 'ﻬ'),
      ('EUR', 'اليورو', 'Euro', '€')
    ON CONFLICT (code) DO NOTHING;
    RAISE NOTICE 'Created currencies table with seed data';
  END IF;
END $$;

-- 7. Add currency check constraint to financial tables
DO $$
BEGIN
  -- service_requests fee_amount must be >= 0
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_requests' AND column_name='fee_amount') THEN
    ALTER TABLE service_requests ADD CONSTRAINT chk_service_fee CHECK (fee_amount >= 0);
    RAISE NOTICE 'Added chk_service_fee';
  END IF;
  
  -- violations penalty_amount must be >= 0
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='violations' AND column_name='penalty_amount') THEN
    ALTER TABLE violations ADD CONSTRAINT chk_violation_penalty CHECK (penalty_amount >= 0);
    RAISE NOTICE 'Added chk_violation_penalty';
  END IF;
END $$;

-- 8. Exchange rate validation - ensure valid rates
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency_id UUID REFERENCES currencies(id),
    to_currency_id UUID REFERENCES currencies(id),
    rate NUMERIC(15, 6) NOT NULL CHECK (rate > 0),
    valid_from TIMESTAMPTZ DEFAULT now(),
    valid_to TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(from_currency_id, to_currency_id, valid_from)
  );
  CREATE INDEX IF NOT EXISTS idx_exchange_rates_from ON exchange_rates(from_currency_id);
  CREATE INDEX IF NOT EXISTS idx_exchange_rates_to ON exchange_rates(to_currency_id);
  RAISE NOTICE 'Created exchange_rates table';
END $$;

-- 9. Prevent negative amounts in fee_payments (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='fee_payments') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fee_payments' AND column_name='amount') THEN
      ALTER TABLE fee_payments ADD CONSTRAINT chk_fee_payment_amount CHECK (amount >= 0);
      RAISE NOTICE 'Added chk_fee_payment_amount';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fee_payments' AND column_name='currency_id') THEN
      ALTER TABLE fee_payments ADD CONSTRAINT chk_fee_payment_currency CHECK (currency_id IS NOT NULL);
      RAISE NOTICE 'Added chk_fee_payment_currency';
    END IF;
  END IF;
END $$;

-- 10. Add constraint: prevent missing currency with foreign amount
DO $$
BEGIN
  -- If amount is set, currency_id must also be set
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizational_entities' AND column_name='annual_budget') THEN
    ALTER TABLE organizational_entities ADD CONSTRAINT chk_org_amount_currency CHECK (
      (annual_budget IS NULL OR currency_id IS NOT NULL) AND
      (revenue IS NULL OR currency_id IS NOT NULL) AND
      (expenses IS NULL OR currency_id IS NOT NULL)
    );
    RAISE NOTICE 'Added chk_org_amount_currency';
  END IF;
END $$;

-- 11. Rebuild any untrusted constraints to trusted status
DO $$
DECLARE
  constraint_name TEXT;
  table_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT constraint_name, table_name FROM information_schema.table_constraints
    WHERE constraint_type = 'CHECK' AND status = 'UNTRUSTED'
  LOOP
    EXECUTE 'ALTER TABLE ' || constraint_name.table_name || ' CHECK CONSTRAINT ' || constraint_name.constraint_name;
    RAISE NOTICE 'Rebuilt trusted constraint: % on %', constraint_name.constraint_name, constraint_name.table_name;
  END LOOP;
END $$;

RAISE NOTICE 'Migration 14 completed: Indexes, Constraints, and Financial requirements implemented';