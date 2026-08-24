-- Migration 20260825_14_final — الفهارس والقيود والمالية (تنفيذي)
-- Execution: Run after Migration 13.

-- 1. Create currencies table if not exists (for FK)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='currencies') THEN
    CREATE TABLE currencies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT UNIQUE NOT NULL,
      name_ar TEXT NOT NULL,
      name_en TEXT,
      symbol TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    INSERT INTO currencies (code, name_ar, name_en, symbol) VALUES
      ('YER', 'الريال اليمني', 'Yemeni Rial', '﷼'),
      ('USD', 'الدولار الأمريكي', 'US Dollar', '$'),
      ('SAR', 'الريال السعودي', 'Saudi Riyal', 'ﻬ'),
      ('EUR', 'اليورو', 'Euro', '€')
    ON CONFLICT (code) DO NOTHING;
    RAISE NOTICE 'Created currencies table and seeded data';
  ELSE
    RAISE NOTICE 'currencies table already exists';
  END IF;
END $$;

-- 2. Add FK currency_id to organizational_entities if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizational_entities' AND column_name='currency_id') THEN
    ALTER TABLE organizational_entities ADD COLUMN currency_id UUID REFERENCES currencies(id);
    CREATE INDEX IF NOT EXISTS idx_entities_currency ON organizational_entities(currency_id);
    RAISE NOTICE 'Added currency_id FK to organizational_entities';
  ELSE
    RAISE NOTICE 'currency_id column already exists';
  END IF;
END $$;

-- 3. Add CHECK constraints for financial amounts (non-negative)
DO $$
BEGIN
  -- organizational_entities financial fields
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

-- 4. CHECK constraints for members
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='subscription_amount') THEN
    ALTER TABLE members ADD CONSTRAINT chk_member_subscription CHECK (subscription_amount >= 0);
    RAISE NOTICE 'Added chk_member_subscription';
  END IF;
END $$;

-- 5. CHECK constraints for service_requests fee
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_requests' AND column_name='fee_amount') THEN
    ALTER TABLE service_requests ADD CONSTRAINT chk_service_fee CHECK (fee_amount >= 0);
    RAISE NOTICE 'Added chk_service_fee';
  END IF;
END $$;

-- 6. CHECK constraints for violations penalty
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='violations' AND column_name='penalty_amount') THEN
    ALTER TABLE violations ADD CONSTRAINT chk_violation_penalty CHECK (penalty_amount >= 0);
    RAISE NOTICE 'Added chk_violation_penalty';
  END IF;
END $$;

RAISE NOTICE 'Migration 14 Final executed. Financial constraints applied.';