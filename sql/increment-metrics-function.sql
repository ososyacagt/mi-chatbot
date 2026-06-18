-- Función SQL para hacer upsert con incremento en la tabla metrics
CREATE OR REPLACE FUNCTION increment_metrics(
  p_tenant_id UUID,
  p_fecha DATE,
  p_mensajes INT DEFAULT 1,
  p_conversaciones INT DEFAULT 0
) RETURNS void AS $$
BEGIN
  INSERT INTO metrics (tenant_id, fecha, total_conversaciones, total_mensajes)
  VALUES (p_tenant_id, p_fecha, p_conversaciones, p_mensajes)
  ON CONFLICT (tenant_id, fecha)
  DO UPDATE SET
    total_conversaciones = CASE
      WHEN EXCLUDED.total_conversaciones > 0 THEN metrics.total_conversaciones + p_conversaciones
      ELSE metrics.total_conversaciones
    END,
    total_mensajes = metrics.total_mensajes + p_mensajes,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;
