-- Tabla para métricas de conversaciones por cliente
CREATE TABLE IF NOT EXISTS metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  total_conversaciones INT DEFAULT 0,
  total_mensajes INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, fecha)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_metrics_tenant_fecha
  ON metrics(tenant_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_tenant_date_range
  ON metrics(tenant_id, fecha);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_metrics_updated_at
  BEFORE UPDATE ON metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_metrics_updated_at();
