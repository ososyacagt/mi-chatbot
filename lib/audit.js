import { createSupabaseAdmin } from './supabase-server';

export async function logAudit({
  userId,
  userEmail,
  action,
  entity,
  entityId,
  changes,
  ip,
}) {
  try {
    const supabase = createSupabaseAdmin();
    const { error } = await supabase.from('audit_logs').insert({
      user_id: userId,
      user_email: userEmail,
      action,
      entity,
      entity_id: entityId,
      changes,
      ip,
    });

    if (error) {
      console.error('[audit] Error inserting log:', error);
    } else {
      console.log('[audit] ✓ Log registrado:', { action, entity, entityId });
    }
  } catch (err) {
    console.error('[audit] Error inesperado:', err);
  }
}

// Acciones predefinidas
export const AUDIT_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  LOGIN_BLOCKED: 'login_blocked',
};

// Entidades predefinidas
export const AUDIT_ENTITIES = {
  TENANT: 'tenant',
  USER: 'user',
  DOCUMENT: 'document',
  SESSION: 'session',
};
