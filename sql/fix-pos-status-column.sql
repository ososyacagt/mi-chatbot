-- 1. Limpiar valores antiguos que tengan '{}' o estén vacíos para evitar conflictos
UPDATE orders
SET pos_status = '"ingresando"'::jsonb
WHERE pos_status::text = '{}' OR pos_status IS NULL;

-- 2. Convertir la columna pos_status de JSONB a TEXT extrayendo el valor de texto del JSON
ALTER TABLE orders
  ALTER COLUMN pos_status TYPE TEXT USING (pos_status->>0);

-- 3. Establecer el valor por defecto a 'ingresando' para nuevos registros
ALTER TABLE orders
  ALTER COLUMN pos_status SET DEFAULT 'ingresando';

-- 4. Asegurar que no queden valores nulos o vacíos en registros anteriores
UPDATE orders
SET pos_status = 'ingresando'
WHERE pos_status IS NULL OR pos_status = '';
