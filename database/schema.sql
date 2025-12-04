-- Fatura Çıkarma Sistemi - PostgreSQL Schema
-- Bu dosyayı sunucuda çalıştırın: psql -d invoice_db -U invoice_user -f schema.sql

-- UUID extension'ı aktifleştir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Invoices tablosu
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    pdf_path VARCHAR(500) NOT NULL,
    pdf_size INTEGER,  -- Bytes cinsinden dosya boyutu

    -- Metadata fields
    invoice_number VARCHAR(100),
    invoice_date DATE,
    supplier VARCHAR(255),
    customer VARCHAR(255),
    total_amount DECIMAL(12, 2),
    currency VARCHAR(10) DEFAULT 'EUR',
    notes TEXT,

    -- JSON data
    extracted_data JSONB NOT NULL,
    validation_result JSONB NOT NULL,

    -- User fields
    is_favorite BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    template_id UUID,

    -- Timestamps
    processed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Templates tablosu
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    language VARCHAR(50) DEFAULT 'tr',
    sample_pdf_name VARCHAR(255),
    field_mappings JSONB NOT NULL,
    custom_prompt TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- İndeksler (performans için)
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON invoices(supplier);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_favorite ON invoices(is_favorite);
CREATE INDEX IF NOT EXISTS idx_invoices_processed ON invoices(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_data ON invoices USING GIN(extracted_data);
CREATE INDEX IF NOT EXISTS idx_invoices_validation ON invoices USING GIN(validation_result);
CREATE INDEX IF NOT EXISTS idx_invoices_tags ON invoices USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);
CREATE INDEX IF NOT EXISTS idx_templates_created ON templates(created_at DESC);

-- Trigger: updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Kullanışlı view'ler
CREATE OR REPLACE VIEW invoice_summary AS
SELECT
    DATE_TRUNC('month', invoice_date) as month,
    supplier,
    COUNT(*) as invoice_count,
    SUM(total_amount) as total_amount,
    currency
FROM invoices
WHERE invoice_date IS NOT NULL
GROUP BY DATE_TRUNC('month', invoice_date), supplier, currency
ORDER BY month DESC, total_amount DESC;

-- İstatistikler için view
CREATE OR REPLACE VIEW invoice_stats AS
SELECT
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN is_favorite THEN 1 END) as favorite_count,
    COUNT(CASE WHEN (validation_result->>'needsReview')::boolean = true THEN 1 END) as needs_review_count,
    SUM(total_amount) as total_amount_sum,
    AVG(total_amount) as average_amount,
    MAX(processed_at) as last_processed
FROM invoices;

-- Örnek sorgular (test için)
-- SELECT * FROM invoices ORDER BY processed_at DESC LIMIT 10;
-- SELECT * FROM invoice_summary;
-- SELECT * FROM invoice_stats;
-- SELECT supplier, COUNT(*) FROM invoices GROUP BY supplier ORDER BY COUNT(*) DESC;
