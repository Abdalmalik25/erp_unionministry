-- Migration 20260825_07_payments_signatures.sql
-- Payments + Digital Signatures + QR PKI (institutional, without external gateway dependency)

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT UNIQUE NOT NULL,
  service_instance_id UUID REFERENCES service_instances(id),
  payer_type TEXT,
  payer_id UUID,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'YER',
  method TEXT CHECK (method IN ('cash','bank_transfer','electronic','exempt')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded','exempt')),
  receipt_url TEXT,
  receipt_hash TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_service ON payments(service_instance_id);

CREATE TABLE IF NOT EXISTS digital_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- service_instance, certificate, contract
  entity_id UUID NOT NULL,
  signer_person_id UUID REFERENCES persons(id),
  signer_role TEXT,
  signature_hash TEXT NOT NULL,
  certificate_hash TEXT,
  signed_at TIMESTAMPTZ DEFAULT now(),
  verification_url TEXT
);
CREATE INDEX IF NOT EXISTS idx_signatures_entity ON digital_signatures(entity_type, entity_id);

-- Extend service_instances with verification
ALTER TABLE service_instances ADD COLUMN IF NOT EXISTS verification_qr TEXT;
