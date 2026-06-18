-- Tabla de auditoría para registrar cambios en el panel admin
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  changes JSONB,
  ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs(entity);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id
  ON audit_logs(entity_id);

-- Políticas RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Solo superadmin puede ver los logs de auditoría
CREATE POLICY "superadmin_can_view_audit_logs" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- Solo el sistema puede insertar logs
CREATE POLICY "system_can_insert_audit_logs" ON audit_logs
  FOR INSERT
  WITH CHECK (true);
