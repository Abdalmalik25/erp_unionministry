-- Migration: 20260824_02_commercial_establishments.sql
-- Creating tables for commercial establishments and their sub-records
-- Commercial Establishments table
CREATE TABLE IF NOT EXISTS commercial_establishments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id VARCHAR(50) UNIQUE,
    unified_code VARCHAR(50) UNIQUE,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    commercial_register_number VARCHAR(50),
    entity_type VARCHAR(100),
    sector VARCHAR(100),
    classification VARCHAR(100),
    governorate VARCHAR(100),
    city VARCHAR(100),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    status VARCHAR(50),
    registration_date DATE,
    establishment_date DATE,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Branches table
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id VARCHAR(50),
    establishment_id UUID REFERENCES commercial_establishments(id) ON DELETE CASCADE,
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(establishment_id, branch_id)
);
-- Equipment table
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id VARCHAR(50),
    establishment_id UUID REFERENCES commercial_establishments(id) ON DELETE CASCADE,
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    type VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    purchase_date DATE,
    status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(establishment_id, equipment_id)
);
-- Warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id VARCHAR(50),
    establishment_id UUID REFERENCES commercial_establishments(id) ON DELETE CASCADE,
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    location TEXT,
    capacity VARCHAR(100),
    status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(establishment_id, warehouse_id)
);
-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id VARCHAR(50),
    establishment_id UUID REFERENCES commercial_establishments(id) ON DELETE CASCADE,
    title_ar VARCHAR(255),
    title_en VARCHAR(255),
    type VARCHAR(100),
    start_date DATE,
    end_date DATE,
    amount DECIMAL(15, 2),
    status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(establishment_id, contract_id)
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_commercial_establishments_sector ON commercial_establishments(sector);
CREATE INDEX IF NOT EXISTS idx_commercial_establishments_classification ON commercial_establishments(classification);
CREATE INDEX IF NOT EXISTS idx_commercial_establishments_governorate ON commercial_establishments(governorate);
CREATE INDEX IF NOT EXISTS idx_commercial_establishments_status ON commercial_establishments(status);
CREATE INDEX IF NOT EXISTS idx_commercial_establishments_unified_code ON commercial_establishments(unified_code);
CREATE INDEX IF NOT EXISTS idx_commercial_establishments_establishment_id ON commercial_establishments(establishment_id);
-- Indexes for sub-records
CREATE INDEX IF NOT EXISTS idx_branches_establishment_id ON branches(establishment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_establishment_id ON equipment(establishment_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_establishment_id ON warehouses(establishment_id);
CREATE INDEX IF NOT EXISTS idx_contracts_establishment_id ON contracts(establishment_id);