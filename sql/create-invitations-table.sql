-- Crear tabla de invitaciones para el onboarding
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID NOT NULL UNIQUE,
  email TEXT,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  tenant_id TEXT REFERENCES tenants(client_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_used ON invitations(used);
CREATE INDEX IF NOT EXISTS idx_invitations_created_at ON invitations(created_at);

-- Habilitar RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Superadmin puede ver todas las invitaciones
CREATE POLICY "Superadmin can view all invitations" ON invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'superadmin'
    )
  );

-- Cualquiera puede validar una invitación con un token válido (para onboarding público)
CREATE POLICY "Anyone can validate invitation by token" ON invitations
  FOR SELECT
  USING (TRUE);

-- Superadmin puede crear invitaciones
CREATE POLICY "Superadmin can create invitations" ON invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'superadmin'
    )
  );

-- Superadmin puede actualizar invitaciones
CREATE POLICY "Superadmin can update invitations" ON invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'superadmin'
    )
  );

-- Superadmin puede eliminar invitaciones
CREATE POLICY "Superadmin can delete invitations" ON invitations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'superadmin'
    )
  );
