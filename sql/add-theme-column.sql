-- Agregar columna theme a la tabla tenants
ALTER TABLE tenants
ADD COLUMN theme TEXT DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'auto'));

-- Crear índice para búsquedas por tema (opcional pero útil)
CREATE INDEX IF NOT EXISTS idx_tenants_theme ON tenants(theme);

-- Comentario para documentación
COMMENT ON COLUMN tenants.theme IS 'Tema visual del chat: light, dark, o auto (sigue preferencia del sistema)';
