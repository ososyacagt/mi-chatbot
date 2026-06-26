# SISTEMA: Plataforma SaaS de Chatbot Multi-tenant

## 1. Stack Tecnológico

- **Framework**: Next.js 16.2.9 (App Router, sin TypeScript)
- **UI**: React 19.2.4, TailwindCSS 4
- **Base de Datos**: Supabase (PostgreSQL) con RLS
- **Autenticación**: 
  - Admin: Supabase Auth (email/password)
  - POS: PIN de 4 dígitos (bcryptjs)
- **IA**: Múltiples providers (Anthropic SDK 0.104.2, OpenAI, Gemini, Groq, Mistral)
- **Email**: Resend 6.14.0
- **Push Notifications**: web-push 3.6.7, VAPID keys
- **Documentos**: PDF (pdf-parse 2.4.5), Word (mammoth 1.12.0), Excel (xlsx 0.18.5), CSV (papaparse 5.5.4)
- **Deploy**: Vercel (está en package.json scripts)

## 2. Variables de Entorno Requeridas

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://vusxvonnovjgdoncjsgc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# IA Providers
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=
GROQ_API_KEY=
MISTRAL_API_KEY=

# Email
RESEND_API_KEY=re_...

# Push Notifications
NEXT_PUBLIC_VAPID_KEY=
VAPID_PRIVATE_KEY=

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000 (o URL de prod)
NEXT_PUBLIC_BRAND_NAME=ChatBot Platform
NEXT_PUBLIC_BRAND_COLOR=#3b82f6
NEXT_PUBLIC_CONTACT_EMAIL=support@example.com
NODE_ENV=development|production
```

## 3. Arquitectura y Convenciones Críticas

### 3.1 Identificadores y Claves Foráneas

**client_id (TEXT, nunca UUID)** — Identificador único del tenant
- SIEMPRE usar `client_id` en queries, filtros y referencias
- En tablas: `tenant_id` = `client_id` del tenant
- `tenants.client_id` es PRIMARY KEY (TEXT)
- NUNCA usar UUID de tenant; siempre TEXT

**plans.slug (TEXT)** — Referencia de plan
- Valores válidos: `'basic'`, `'pro'`, `'enterprise'`
- NUNCA usar `plans.id` (UUID) como referencia
- En queries: `.eq('plan', 'pro')` no `.eq('plan_id', uuid)`

**Convención de nombres de campo:**
- BD: snake_case (client_id, numero_orden, pos_status)
- Frontend JS: camelCase (clientId, numeroOrden, posStatus)
- Mapeo necesario en cada API response

### 3.2 Next.js 16 Obligatorio

**SIEMPRE await params en route handlers:**
```javascript
export async function GET(request, { params }) {
  const { clientId } = await params  // CRÍTICO: await
  // ... resto del código
}
```

**NUNCA:**
```javascript
const { clientId } = params  // INCORRECTO — params es Promise
```

**App Router:**
- Archivos `route.js` = API endpoints
- Archivos `page.js` = páginas renderizadas
- Componentes sin "use client" = Server Components (por defecto)
- Agregar "use client" solo cuando se necesitan hooks/eventos

### 3.3 Supabase — Crítico

**Crear Admin Client:**
```javascript
import { createSupabaseAdmin } from '@/lib/supabase-admin'
const supabase = createSupabaseAdmin()
```

**NUNCA usar cliente regular para admin operations:**
```javascript
// INCORRECTO:
import { supabase } from '@/lib/supabase'
// Solo para POS login, no para admin queries

// CORRECTO:
const supabase = createSupabaseAdmin()  // Para admin APIs
```

**Timestamps — CRÍTICO:**
- BD almacena ISO strings SIN 'Z' (ej: `2026-06-25T10:30:00`)
- Al parsear, SIEMPRE agregar 'Z' antes de `new Date()`
- INCORRECTO: `new Date(timestamp)` → interpreta como local
- CORRECTO: `new Date(timestamp + 'Z')` → interpreta como UTC

**Filtros:**
- NUNCA encadenar `.not()`:
  ```javascript
  // INCORRECTO:
  .not('status', 'eq', 'completada').not('status', 'eq', 'cancelada')
  
  // CORRECTO:
  const { data } = await supabase.from('orders').select('*')
  const filtered = data.filter(o => !['completada', 'cancelada'].includes(o.status))
  ```

**RLS — Reglas de Seguridad:**
- TODAS las tablas nuevas deben tener RLS policies
- Política por defecto: acceso solo al tenant propio
- Ejemplo: `auth.uid() = ANY(select id from admin_users where client_id = tenant_id)`

### 3.4 UI — Componentes Seguros

**NUNCA usar alert/confirm:**
```javascript
// INCORRECTO:
if (confirm('¿Eliminar?')) { handleDelete() }
if (window.alert('Error')) { }

// CORRECTO: usar ConfirmModal
import ConfirmModal from '@/app/admin/components/ConfirmModal'
<ConfirmModal isOpen={...} title="Eliminar" message="¿Estás seguro?" onConfirm={...} />
```

**Feedback al usuario:**
- Toast para mensajes rápidos (éxito, error, info)
- NUNCA console.log para debug — usar console.error solo para errores
- Sin valores hardcodeados (colors, URLs, emails)

### 3.5 JSON/JSONB — Serialización Doble

**Problema común:** JSONB columns en Supabase pueden venir como:
- Array normal: `['modalidad1', 'modalidad2']`
- String JSON: `"[\"modalidad1\", \"modalidad2\"]"`
- String simple: `"modalidad1"`
- null/undefined

**Solución — Función parser:**
```javascript
const parseJsonbArray = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return value.includes(',') 
        ? value.split(',').map(v => v.trim())
        : value ? [value] : []
    }
  }
  return []
}
```

**Guardar arrays JSONB — Evitar double serialization:**
```javascript
const cleanConfig = Array.isArray(configForm.pos_modalidad)
  ? configForm.pos_modalidad.filter(m => typeof m === 'string' && !m.startsWith('['))
  : []

body: JSON.stringify({
  ...configForm,
  pos_modalidad: cleanConfig  // NO JSON.stringify aquí
})
```

## 4. Estructura Completa de Directorios

### 4.1 Páginas Principales (app/)

| URL | Archivo | Autenticación | Propósito |
|-----|---------|---------------|----------|
| `/admin` | `app/admin/page.js` | Supabase Auth | Dashboard admin |
| `/admin/login` | `app/admin/login/page.js` | Público | Login de admin |
| `/admin/inventario` | `app/admin/inventario/page.js` | Admin | Gestión de productos, categorías, reglas |
| `/admin/planes` | `app/admin/planes/page.js` | Admin | Gestión de planes |
| `/admin/metricas` | `app/admin/metricas/page.js` | Admin | Análisis y reportes |
| `/admin/pos-ordenes` | `app/admin/pos-ordenes/page.js` | Admin | Historial de órdenes POS |
| `/catalogo/[clientId]` | `app/catalogo/[clientId]/page.js` | Público | Catálogo de productos |
| `/chat/[clientId]` | `app/chat/[clientId]/page.js` | Público | Interfaz de chat |
| `/tienda/[clientId]` | `app/tienda/[clientId]/page.js` | Público | Tienda e-commerce |
| `/orden/[orderId]` | `app/orden/[orderId]/page.js` | Público | Seguimiento de orden |
| `/pos/[clientId]` | `app/pos/[clientId]/page.js` | PIN | Interfaz POS principal |
| `/pos/[clientId]/login` | `app/pos/[clientId]/login/page.js` | Público | Login POS por PIN |
| `/pos/[clientId]/caja` | `app/pos/[clientId]/caja/page.js` | PIN (cajero/supervisor) | Interfaz de cobro |
| `/pos/[clientId]/area/[areaId]` | `app/pos/[clientId]/area/[areaId]/page.js` | PIN (cocina/supervisor) | KDS (Kitchen Display System) |
| `/pos/[clientId]/entrega` | `app/pos/[clientId]/entrega/page.js` | PIN (supervisor/mesero) | Gestión de entregas |
| `/cocina/[clientId]/[areaId]` | `app/cocina/[clientId]/[areaId]/page.js` | Público | KDS alternativo |

### 4.2 API Endpoints (app/api/)

**Admin APIs** (requieren Supabase Auth):
- `GET /api/admin/me` — Usuario actual
- `GET /api/admin/tenants` — Listar tenants
- `PUT /api/admin/tenants/[id]` — Actualizar tenant
- `GET /api/admin/inventory/...` — Productos, categorías, reglas
- `PUT /api/admin/inventory/config` — Guardar configuración
- `GET /api/admin/plans` — Listar planes
- `POST /api/admin/plans` — Crear plan
- `GET /api/admin/pos-orders` — Historial POS
- `GET /api/admin/pos-users` — Usuarios POS

**POS APIs** (requieren PIN o sesión POS):
- `GET /api/pos/[clientId]` — Configuración y datos iniciales
- `POST /api/pos/[clientId]` — Crear orden
- `GET /api/pos/[clientId]/orders/active` — Órdenes activas
- `GET /api/pos/[clientId]/comandas` — Comandas por área
- `GET /api/pos/[clientId]/comandas/completed` — Comandas completadas
- `PUT /api/pos/[clientId]/orders/[orderId]/status` — Cambiar estado
- `POST /api/pos/[clientId]/auth` — Autenticar con PIN

**E-commerce APIs** (públicas):
- `GET /api/store/[clientId]` — Config de tienda
- `POST /api/store/[clientId]/order` — Crear orden
- `GET /api/order/[orderId]` — Seguimiento de orden

**Chat APIs**:
- `POST /api/chat` — Enviar mensaje y obtener respuesta

### 4.3 Librerías (lib/)

| Archivo | Propósito | Exports principales |
|---------|-----------|-------------------|
| `auth.js` | Autenticación | `getSession()`, `getAdminUser()` |
| `supabase-admin.js` | Cliente admin | `createSupabaseAdmin()` |
| `ai-provider.js` | Integración IA | `getAIProvider()`, `generateResponse()` |
| `constants.js` | Constantes | PLANES, MODALIDADES, ESTADOS |
| `plan-limits.js` | Límites por plan | `canUseEcommerceMode()`, `checkLimit()` |
| `business-rules.js` | Motor de reglas | `applyBusinessRules()`, `checkRule()` |
| `store.js` | BD de tienda | `getStoreConfig()`, `getProducts()` |
| `chatbot-store.js` | BD de chatbot | `getConversations()`, `saveMessage()` |
| `conversations-db.js` | Conversaciones | `createConversation()`, `addMessage()` |
| `escalation.js` | Escalación | `escalateToHuman()`, `handleEscalation()` |
| `push-notifications.js` | Push | `sendPushNotification()` |
| `push-client.js` | Cliente push | `registerPushSubscription()` |
| `usage.js` | Tracking de uso | `trackUsage()` |
| `tenants-db.js` | BD tenants | `getTenant()`, `updateTenant()` |

### 4.4 Componentes Admin (app/admin/components/)

| Componente | Propósito |
|-----------|-----------|
| `ConfirmModal.js` | Modal de confirmación (reemplaza alert/confirm) |
| `POSConfigTab.js` | Configuración de POS (áreas, mesas, usuarios) |
| `Toast.js` | Notificaciones de éxito/error |

## 5. Módulos del Sistema

### 5.1 Core Chat (Chatbot)

**Flujo:**
1. Usuario envía mensaje → `/chat/[clientId]`
2. Frontend envía a `POST /api/chat`
3. API obtiene contexto (documentos, historial)
4. Inyecta documentos + historial en prompt
5. Llama a AI provider (Anthropic, OpenAI, etc.)
6. Retorna respuesta con streaming opcional
7. Frontend guarda en `conversations_messages` table

**Escalación a Humano:**
- User escribe palabra clave o comando `/escalate`
- `lib/escalation.js` crea ticket de escalación
- Notifica al admin por email (Resend)
- Admin ve en `/admin/metricas`

**Notificaciones Push:**
- VAPID keys para Web Push API
- Subscriptions guardadas en `push_subscriptions` table
- `lib/push-notifications.js` envía a múltiples dispositivos

**Widget Embebible:**
- Script en `/public/widget.js`
- Inyecta iframe con `/chat/[clientId]?widget=true`
- CSS postMessage para comunicación

### 5.2 E-commerce Opción 1: Catálogo + WhatsApp

**URL:** `/catalogo/[clientId]`

**Flujo:**
1. Público ve catálogo de productos
2. Agrega al carrito
3. Sistema aplica reglas de negocio (descuentos, kits, etc.)
4. Click en "Pedir por WhatsApp"
5. Redirige a `wa.me/+[number]?text=[mensaje formateado]`
6. Usuario completa compra via WhatsApp manualmente

**Reglas de Negocio:**
- cross_sell: "Si compras X, te recomendamos Y"
- volume_pricing: Descuento por cantidad
- kit_combo: Paquetes predefinidos
- intro_price: Precio introductorio con fecha límite
- gift_purchase: "Lleva 3, paga 2"
- limited_edition: Producto disponible solo hasta fecha X

**Implementación:**
- `lib/business-rules.js` — Motor de reglas
- `applyBusinessRules()` — Aplica todas las reglas al carrito
- Reglas guardadas en `business_rules` table con JSONB config

### 5.3 E-commerce Opción 2: Chatbot con Órdenes IA

**URL:** `/chat/[clientId]`

**Flujo:**
1. Usuario conversa con chatbot
2. Describe lo que quiere ("quiero 2 hamburguesas")
3. Chatbot inyecta en prompt: catálogo completo de productos
4. IA genera JSON de orden automática
5. Frontend detecta `<order-json>` en respuesta
6. Crea orden automáticamente sin confirmación del usuario
7. Muestra número de orden en chat

**Catálogo Dinámico:**
- Se inyecta en tiempo real antes de cada llamada a IA
- Formato: `[{id, nombre, precio, descripción, categoría}]`
- Permite al chatbot recomendaciones contextuales

### 5.4 E-commerce Opción 3: Tienda Completa

**URL:** `/tienda/[clientId]`

**Flujo:**
1. Catálogo con búsqueda y filtros
2. Producto detail page con imágenes, descripción, reseñas
3. Agregar al carrito (sesión local)
4. Checkout 3 pasos:
   - Paso 1: Datos de cliente (nombre, email, teléfono, dirección)
   - Paso 2: Resumen de orden + opciones de pago
   - Paso 3: Confirmación y seguimiento
5. Orden guardada en `orders` table con `origen = 'tienda'`
6. Usuario puede trackear en `/orden/[orderId]`

**Métodos de Pago:**
- Efectivo
- Tarjeta (integración: depende de config)
- Transferencia bancaria
- Billetera digital (depende de config)

### 5.5 POS — Opción 4: Punto de Venta

**URLs:**
- `/pos/[clientId]/login` — Login por PIN (4 dígitos)
- `/pos/[clientId]` — Interfaz principal (crear órdenes)
- `/pos/[clientId]/caja` — Cobro (acceso: cajero/supervisor)
- `/pos/[clientId]/area/[areaId]` — KDS (acceso: cocina/supervisor)
- `/pos/[clientId]/entrega` — Entregas (acceso: supervisor/mesero)

**Sub-modalidades:**
- `restaurante`: Órdenes por mesa, KDS Kanban, área de comandas
- `mostrador`: Órdenes sin mesa, flujo configurable
- `autoservicio`: Kiosco público sin usuario POS

**Flujos por Modalidad:**

**Restaurante:**
```
1. Mesero crea orden (selecciona mesa)
2. Envía a cocina → orden en KDS estado "enviada"
3. Cocina: ingresada → recibida → en_proceso → lista
4. Mesero ve órdenes listas en "Órdenes Listas"
5. Mesero entrega mesa
6. Mesero cobra en Caja → pos_status = facturado_finalizado
```

**Mostrador Flujo Inmediato:**
```
1. Operador crea orden (sin mesa)
2. Envía a cocina → KDS
3. Cocina prepara → orden en estado "lista"
4. Operador retira productos
5. Cobro inmediato → pos_status = facturado_finalizado
```

**Mostrador Flujo Area Entrega:**
```
1. Operador crea orden
2. Envía a cocina → KDS
3. Cocina prepara → estado "lista"
4. Operador cobra → pos_status = facturado_pendiente_entrega
5. Entregar carga orden al módulo de entregas
6. Supervisor confirma entrega → pos_status = facturado_finalizado
```

**Regla Crítica:**
- **Restaurante SIEMPRE finaliza directo en caja** (no usa flujo area_entrega)
- Solo mostrador puro (sin restaurante) usa area_entrega

**Roles:**
| Rol | Acceso |
|-----|--------|
| supervisor | Todo (caja, KDS, entregas) |
| cajero | Solo caja |
| mesero | POS principal + entregas |
| cocina | Solo KDS (área asignada) |
| operador | POS principal (auto-servicio) |

**KDS (Kitchen Display System):**
- Kanban de 4 columnas: ingresadas → recibidas → en_proceso → listas
- Órdenes con timer (tiempo desde creación)
- Color rojo si > 15 minutos
- Botones para avanzar estado
- Filtro por área de preparación

**POS UI Obligatoria:**
- NUNCA `alert()` o `confirm()`
- SIEMPRE ConfirmModal para acciones destructivas
- Toast para feedback
- Tabs dinámicas según `config.posModalidad`

## 6. Esquema de Base de Datos

### Tabla: `tenants`
```sql
client_id (TEXT) PRIMARY KEY
nombre (TEXT)
plan (TEXT) — 'basic', 'pro', 'enterprise'
ecommerce_modes (JSONB) — ['catalogo_whatsapp', 'tienda', 'pos', ...]
ecommerce_mode (TEXT) — deprecated, usar ecommerce_modes
currency (TEXT) — 'USD', 'ARS', etc.
store_name (TEXT)
store_logo (TEXT) — URL
store_banner (TEXT) — URL
color_primary (TEXT) — hex
theme (TEXT) — 'auto', 'light', 'dark'
ai_provider (TEXT) — 'claude', 'openai', 'gemini', etc.
ai_model (TEXT) — nombre del modelo
system_prompt (TEXT) — instrucciones del chatbot
welcome_message (TEXT)
default_language (TEXT)
auto_detect_language (BOOLEAN)
escalation_enabled (BOOLEAN)
escalation_message (TEXT)
admin_email (TEXT)
pos_modalidad (JSONB) — ['restaurante', 'mostrador', 'autoservicio']
pos_flujo_cobro (TEXT) — 'entrega_inmediata', 'area_entrega'
mensaje_limite (INTEGER) — límite de mensajes/mes (plan-based)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Tabla: `orders`
```sql
id (UUID) PRIMARY KEY
tenant_id (TEXT) FK → tenants.client_id
numero_orden (TEXT) — 'TND-xxx' (tienda), 'POS-xxx'
cliente_nombre (TEXT)
cliente_telefono (TEXT)
cliente_direccion (TEXT)
cliente_email (TEXT)
items (JSONB) — [{id, nombre, precio, cantidad, notas}]
subtotal (DECIMAL)
descuento (DECIMAL)
total (DECIMAL)
moneda (TEXT) — 'USD', 'ARS'
metodo_pago (TEXT) — 'efectivo', 'tarjeta', 'transferencia'
tipo_orden (TEXT) — 'mostrador', 'mesa', 'llevar', 'autoservicio'
mesa_id (UUID) FK → pos_tables
mesa_numero (TEXT)
status (TEXT) — 'pendiente', 'confirmada', 'en_proceso', 'entregada', 'completada', 'cancelada'
pos_status (TEXT) — 'enviada', 'en_preparacion', 'lista', 'facturado_finalizado', 'facturado_pendiente_entrega', 'entregado'
pos_user_id (UUID) FK → pos_users (quien creó)
cajero_id (UUID) FK → pos_users (quien cobró)
entrega_user_id (UUID) FK → pos_users (quien entregó)
pos_historial (JSONB) — [{de, a, timestamp, posUserId, nota}]
area_comandas (JSONB) — {area_id: [{id, nombre, cantidad, notas, status}]}
notas (TEXT)
origen (TEXT) — 'tienda', 'chat', 'pos'
cobrado_at (TIMESTAMP)
entregado_at (TIMESTAMP)
monto_recibido (DECIMAL)
status_historial (JSONB) — [{status, timestamp, nota}]
reglas_aplicadas (JSONB) — [rule_ids]
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Tabla: `products`
```sql
id (UUID) PRIMARY KEY
tenant_id (TEXT) FK → tenants.client_id
nombre (TEXT)
descripcion (TEXT)
precio (DECIMAL)
imagenes (JSONB) — [url1, url2, ...]
category_id (UUID) FK → categories
activo (BOOLEAN)
area_preparacion_id (UUID) FK → pos_areas (para POS)
customization_options (JSONB) — [{tipo, nombre, opciones}]
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Tabla: `business_rules`
```sql
id (UUID) PRIMARY KEY
tenant_id (TEXT) FK → tenants.client_id
tipo (TEXT) — 'cross_sell', 'volume_pricing', 'kit_combo', 'intro_price', 'gift_purchase', 'limited_edition'
nombre (TEXT)
descripcion (TEXT)
condiciones (JSONB) — {cantidadMin, productIds, fecha_inicio, fecha_fin, descuento, etc}
aplicar_descuento (DECIMAL)
aplicar_producto (UUID)
activo (BOOLEAN)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Tabla: `pos_areas`
```sql
id (UUID) PRIMARY KEY
tenant_id (TEXT) FK → tenants.client_id
nombre (TEXT) — 'Cocina', 'Bar', 'Repostería'
tipo (TEXT) — 'cocina', 'bar', 'reposteria'
color (TEXT) — hex
activo (BOOLEAN)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Tabla: `pos_tables`
```sql
id (UUID) PRIMARY KEY
tenant_id (TEXT) FK → tenants.client_id
numero (TEXT)
nombre (TEXT)
capacidad (INTEGER)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Tabla: `pos_users`
```sql
id (UUID) PRIMARY KEY
tenant_id (TEXT) FK → tenants.client_id
nombre (TEXT)
rol (TEXT) — 'supervisor', 'cajero', 'mesero', 'cocina', 'operador'
pin (TEXT) — hash bcryptjs
area_id (UUID) FK → pos_areas (para cocina)
activo (BOOLEAN)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

## 7. Sistema de Autenticación

### Admin (Supabase Auth)
- Email + contraseña
- Verificación de email
- `getSession()` — obtiene usuario actual
- `getAdminUser()` — valida si es admin
- Middleware protege `/admin/*`

### POS (PIN Local)
- 4 dígitos encriptados con bcryptjs
- Sin servidor de auth central
- Almacena en sessionStorage: `posUser = {id, nombre, rol, areaId}`
- Cada pantalla verifica rol
- Logout limpia sessionStorage

## 8. Bugs Históricos Resueltos

| Fecha | Bug | Causa | Solución |
|-------|-----|-------|----------|
| 2026-06-25 | Timer negativo en KDS | Fecha sin Z interpretada como local | parseDate() con 'Z' automático |
| 2026-06-24 | ecommerce_modes no persiste en planes | API no mapeaba body.ecommerce_modes | Mapeo explícito en PUT /plans |
| 2026-06-23 | Órdenes completadas en KDS activo | falta estadoFinalizado en filtro | Agregado facturado_finalizado al filtro |
| 2026-06-22 | JSON anidado doble en pos_modalidad | Re-serialización en PUT | cleanConfig filter antes de stringify |

## 9. Pasos para Correr Localmente

```bash
# Instalar deps
npm install

# Variables de entorno
cp .env.example .env.local
# Editar .env.local con credenciales

# Dev server
npm run dev

# Abrir en navegador
http://localhost:3000

# Limpiar caché Next.js si API da 404
rm -rf .next
npm run dev
```

## 10. Comandos Útiles

```bash
# Limpiar caché de Next.js y reiniciar
rm -rf .next && npm run dev

# Revisar logs de Supabase (vía dashboard)
https://app.supabase.com/project/_/sql

# Crear orden de prueba en POS
# 1. Ir a http://localhost:3000/pos/bava
# 2. Login: usuario POS (PIN)
# 3. Crear orden
# 4. Ver en /admin/pos-ordenes

# Testing
npm run test  # (si existe)
npm run lint  # ESLint
```

---

**Última actualización:** 2026-06-26
**Versión:** 0.1.0
**Mantenedor:** Oscar Yache (ososyaca@gmail.com)
