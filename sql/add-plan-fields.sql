-- Agregar campos de plan a la tabla tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'basic';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mensaje_limite INT DEFAULT 100;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mensajes_usados INT DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_reset_date DATE DEFAULT CURRENT_DATE;

-- Crear función RPC para incrementar contador de mensajes
CREATE OR REPLACE FUNCTION increment_message_count(p_client_id TEXT)
RETURNS TABLE (
  mensajes_usados INT,
  mensaje_limite INT,
  plan_reset_date DATE
) LANGUAGE sql AS $function$
  UPDATE tenants
  SET mensajes_usados = mensajes_usados + 1
  WHERE client_id = p_client_id
  RETURNING mensajes_usados, mensaje_limite, plan_reset_date;
$function$;
