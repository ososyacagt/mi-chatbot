-- Tabla para almacenar documentos base de clientes
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(client_id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL, -- MIME type del archivo
  tamanio INTEGER NOT NULL,
  storage_path TEXT NOT NULL, -- Ruta en Supabase Storage
  contenido TEXT NOT NULL, -- Texto extraído del documento
  base64_data TEXT, -- Para imágenes: base64 encoded
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para queries comunes
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- Storage bucket para documentos (ejecutar manualmente en Supabase Console)
-- 1. Ve a Storage en Supabase Console
-- 2. Crea un nuevo bucket llamado "documents"
-- 3. Haz el bucket público para lectura (aunque no es necesario para el backend)
-- 4. Configura las políticas según necesites
