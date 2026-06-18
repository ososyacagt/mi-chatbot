-- Tabla de escalaciones
CREATE TABLE IF NOT EXISTS escalations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(client_id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  mensaje_trigger TEXT NOT NULL,
  admin_email TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_escalations_tenant_id ON escalations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status);
CREATE INDEX IF NOT EXISTS idx_escalations_created_at ON escalations(created_at DESC);

-- Campos en tabla tenants para escalación
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS admin_email TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS escalation_enabled BOOLEAN DEFAULT true;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_escalations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_escalations_updated_at
  BEFORE UPDATE ON escalations
  FOR EACH ROW
  EXECUTE FUNCTION update_escalations_updated_at();
