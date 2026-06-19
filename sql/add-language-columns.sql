-- Agregar columnas de idioma a la tabla tenants
ALTER TABLE tenants
ADD COLUMN default_language VARCHAR(10) DEFAULT 'es' CHECK (default_language IN ('es', 'en', 'pt', 'fr', 'de', 'it', 'zh', 'ja', 'ar')),
ADD COLUMN auto_detect_language BOOLEAN DEFAULT true;

-- Crear índice para búsquedas por idioma
CREATE INDEX idx_tenants_default_language ON tenants(default_language);
