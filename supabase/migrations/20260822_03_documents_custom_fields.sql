-- Migration: 20260822_03_documents_custom_fields.sql
-- Extend the documents table with the Hybrid Typed Extensibility value store
-- (custom_data JSONB) so the Documents work screen benefits from the same
-- user-defined field system as evaluation certificates and organizational entities.
-- Definitions are still described centrally in custom_field_definitions (entity_type='documents').

ALTER TABLE documents ADD COLUMN IF NOT EXISTS custom_data JSONB NOT NULL DEFAULT '{}'::jsonb;
DROP INDEX IF EXISTS idx_documents_custom_data;
CREATE INDEX IF NOT EXISTS idx_documents_custom_data ON documents USING GIN (custom_data) WHERE custom_data IS NOT NULL;
