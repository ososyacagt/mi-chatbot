-- Función SQL alternativa para obtener métricas
CREATE OR REPLACE FUNCTION get_metrics_by_date(
  p_tenant_id TEXT,
  p_inicio_fecha DATE,
  p_fin_fecha DATE
) RETURNS TABLE (
  id UUID,
  tenant_id TEXT,
  fecha DATE,
  total_conversaciones INT,
  total_mensajes INT,
  created_at TIMESTAMP WITH TIME ZONE
) LANGUAGE sql AS $function$
  SELECT
    m.id,
    m.tenant_id,
    m.fecha,
    m.total_conversaciones,
    m.total_mensajes,
    m.created_at
  FROM metrics m
  WHERE m.tenant_id = p_tenant_id
    AND m.fecha >= p_inicio_fecha
    AND m.fecha <= p_fin_fecha
  ORDER BY m.fecha ASC;
$function$;
