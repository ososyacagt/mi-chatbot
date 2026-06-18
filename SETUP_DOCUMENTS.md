# Configuración de Documentos Base

Esta guía explica cómo configurar y usar la funcionalidad de documentos base por cliente.

## Pasos de Configuración

### 1. Crear tabla en Supabase

Ejecuta el SQL en `sql/documents-table.sql` en la consola de Supabase:

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a SQL Editor
4. Crea una nueva consulta
5. Copia y pega el contenido de `sql/documents-table.sql`
6. Ejecuta la consulta

### 2. Crear Storage Bucket

1. Ve a Storage en Supabase Console
2. Crea un nuevo bucket llamado `documents`
3. Configura las políticas de acceso según necesites (el backend usará la service key)

### 3. Usar la funcionalidad

#### En el Panel Admin

1. Ve a **Gestión de Clientes** (/admin)
2. Haz clic en **Editar** en un cliente
3. En el formulario de edición, ve a la sección **"📚 Documentos Base"**
4. Arrastra y suelta archivos o haz clic para seleccionar
5. Los documentos se procesarán automáticamente:
   - **PDF**: Se extrae el texto
   - **Word (.docx)**: Se extrae el texto
   - **Excel (.xlsx)**: Se convierte a CSV
   - **Imágenes**: Se convierten a base64 para usar con visión

#### Formatos Soportados

- PDF (`.pdf`)
- Word (`.docx`, `.doc`)
- Excel (`.xlsx`, `.xls`)
- Imágenes (`.jpg`, `.png`, `.gif`, `.webp`)

**Límite de tamaño**: 10MB por archivo

#### En el Chat

Cuando un usuario envía un mensaje:

1. El sistema obtiene todos los documentos del cliente
2. El contenido se inyecta en el `systemPrompt` bajo la sección "CONOCIMIENTO BASE"
3. Si hay imágenes, se incluyen como bloques de imagen en Claude/OpenAI
4. La IA usa esta información para responder

### 4. Detalles de Implementación

#### Archivos Nuevos

- `lib/documents-db.js` - Manejo de documentos en Supabase
- `lib/document-parser.js` - Parseo de diferentes tipos de archivo
- `app/api/admin/documents/route.js` - Endpoints GET/POST para documentos
- `app/api/admin/documents/[id]/route.js` - Endpoint DELETE
- `app/admin/components/DocumentsSection.js` - UI para gestionar documentos

#### Modificaciones

- `app/admin/page.js` - Integración de DocumentsSection en el modal
- `app/api/chat/route.js` - Inyección de contexto de documentos
- `lib/ai-provider.js` - Soporte para imágenes en Claude y OpenAI

### 5. Información Técnica

#### Estructura de la tabla `documents`

```sql
- id: UUID (primary key)
- tenant_id: TEXT (referencia a tenants.client_id)
- nombre: TEXT (nombre original del archivo)
- tipo: TEXT (MIME type)
- tamanio: INTEGER (bytes)
- storage_path: TEXT (ruta en Supabase Storage)
- contenido: TEXT (texto extraído)
- base64_data: TEXT (para imágenes)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### Flujo de Subida

1. Usuario sube archivo desde DocumentsSection
2. `POST /api/admin/documents` recibe el archivo
3. Se convierte a Buffer
4. `parseFile()` extrae contenido según tipo
5. Se sube a Storage (ruta: `documents/{clientId}/{timestamp}-{filename}`)
6. Se guarda registro en BD con contenido y rutas
7. Para imágenes, se guarda base64 en `base64_data`

#### Flujo de Chat

1. Usuario envía mensaje en `/api/chat`
2. Se obtiene el tenant
3. `getDocumentsContext()` retorna: `{ texto: string, imagenes: string[] }`
4. Se inyecta en `systemPrompt`
5. Para Claude/OpenAI, imágenes se pasan como parámetro adicional
6. Las imágenes se incluyen en el primer mensaje del usuario

### 6. Troubleshooting

**Error: "documents" table not found**
- Asegúrate de ejecutar el SQL en `sql/documents-table.sql`

**Error: "documents" bucket not found**
- Crea el bucket en Supabase Storage Console

**Las imágenes no se procesan**
- Verifica que la base de datos tiene la columna `base64_data`
- Revisa los logs del servidor para errores de parsing

**Los documentos no aparecen en el chat**
- Verifica que los documentos estén asociados al client_id correcto
- Comprueba que el contenido se extrajo (no debería ser vacío)

### 7. Limitaciones Actuales

- Máximo 10MB por archivo (configurable en `DocumentsSection.js`)
- Las imágenes se incluyen solo en el primer mensaje del usuario
- Excel se convierte a CSV (mantiene estructura de tablas)
- PDF requiere que pdf-parse esté correctamente instalado

### 8. Próximas Mejoras Posibles

- Actualizar documentos (PATCH endpoint)
- Buscar dentro de documentos
- Versioning de documentos
- Resumen automático de documentos largos
- OCR para imágenes escaneadas
- Soporte para más formatos (PPT, etc.)
