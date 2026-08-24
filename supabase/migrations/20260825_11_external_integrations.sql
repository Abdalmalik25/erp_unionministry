-- Migration 20260825_11_external_integrations.sql — تكامل خارجي ذكي يعمل متصل/منفصل

CREATE TABLE IF NOT EXISTS external_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- civil_id, social_insurance, commercial_register, chamber
  name_ar TEXT NOT NULL,
  name_en TEXT,
  party_type TEXT CHECK (party_type IN ('government','private','international')),
  base_url TEXT,
  auth_type TEXT CHECK (auth_type IN ('none','api_key','oauth2','mtls')),
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected','disconnected','mock','error')),
  mode TEXT DEFAULT 'fallback' CHECK (mode IN ('live','fallback','mock')), -- ذكاء: يعمل بدون ربط
  is_required BOOLEAN DEFAULT false,
  timeout_ms INTEGER DEFAULT 5000,
  retry_count INTEGER DEFAULT 2,
  last_check_at TIMESTAMPTZ,
  last_error TEXT,
  config JSONB DEFAULT '{}', -- {api_key, headers, mapping}
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ext_code ON external_integrations(code);

-- Queue for deferred sync when external is offline — اعتمادية
CREATE TABLE IF NOT EXISTS external_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_code TEXT NOT NULL REFERENCES external_integrations(code),
  payload JSONB NOT NULL,
  operation TEXT CHECK (operation IN ('verify','push','pull')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','success','failed','retrying')),
  attempts INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ DEFAULT now(),
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sync_status ON external_sync_queue(status, next_retry_at);

-- Cache for external responses — كفاءة
CREATE TABLE IF NOT EXISTS external_cache (
  cache_key TEXT PRIMARY KEY,
  integration_code TEXT REFERENCES external_integrations(code),
  response JSONB,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed: 4 أطراف خارجية أساسية — تعمل mock حتى الربط الفعلي
INSERT INTO external_integrations (code, name_ar, party_type, status, mode, is_required, config) VALUES
('civil_id','مصلحة الأحوال المدنية — التحقق من الهوية','government','mock','mock',true,'{"fields":["national_id","full_name","birth_date"]}'::jsonb),
('social_insurance','المؤسسة العامة للتأمينات','government','mock','mock',false,'{"fields":["insurance_number","status"]}'::jsonb),
('commercial_register','السجل التجاري — وزارة الصناعة','government','mock','mock',true,'{"fields":["commercial_register","owner"]}'::jsonb),
('chamber','الغرف التجارية والصناعية','private','mock','mock',false,'{"fields":["chamber_membership"]}'::jsonb)
ON CONFLICT (code) DO NOTHING;
