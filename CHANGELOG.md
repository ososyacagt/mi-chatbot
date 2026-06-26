# CHANGELOG

Historial completo de desarrollo de la plataforma SaaS de Chatbot Multi-tenant.

---

## [2026-06-26] — Módulo de Analíticas y Reportes

### ✅ Agregado

#### Dashboard de Analíticas y Reportes del Negocio
- **URL:** `/admin/analytics?clientId=X`
- **6 secciones de análisis en tiempo real:**
  1. **Tarjetas de resumen:** Ventas hoy vs ayer (con % de cambio), ventas mes vs mes anterior, órdenes hoy, ticket promedio
  2. **Gráfica de ventas por período:** Selector (hoy/semana/mes/rango personalizado), líneas de ventas totales con scroll horizontal
  3. **Top 10 productos:** Tabla con producto, cantidad vendida, total en ventas, con barra de progreso CSS
  4. **Ventas por método de pago:** Gráfica horizontal con efectivo, tarjeta, transferencia, WhatsApp, con colores distinguibles
  5. **Horas pico:** Barras verticales (0-23h), coloreadas por volumen, identifica hora con más órdenes
  6. **Rendimiento del equipo:** Tabla de cajeros (solo POS), órdenes cobradas, total cobrado, ordenado por mayor venta

#### Filtros Dinámicos
- Selector de período: Hoy | Esta semana | Este mes | Rango personalizado
- Selector de origen: Todo | Solo E-commerce | Solo POS
- Recalcula datos automáticamente al cambiar filtros

#### Datos Extractados de BD
- Tabla `orders`: total, metodo_pago, items (JSONB), created_at, cajero_id, origen, status
- Tabla `pos_users`: para mapear cajero_id → nombre
- Agrupaciones: por fecha, método, producto, hora, cajero
- Cálculos: % cambio, promedio, top items por cantidad

#### Interfaz
- Gráficas con CSS puro (barras verticales/horizontales con `height`/`width` proporcional)
- Sin nuevas dependencias (no se agregó Chart.js)
- Responsive: grid de cards, scroll en gráficas largas
- Toast para feedback
- Colores por método de pago (efectivo=#10b981, tarjeta=#3b82f6, transferencia=#a855f7, WhatsApp=#14b8a6)

#### Botón en Admin Dashboard
- TenantCard: grid de gestión cambió de `grid-cols-4` a `grid-cols-5`
- Nuevo botón "Analíticas" entre Métricas e Inventario
- Ícono de gráfica de barras (SVG)
- Link: `/admin/analytics?clientId={tenant.client_id}`

### APIs Creadas
- `GET /api/admin/analytics` — Parámetros: `clientId` (required), `fechaInicio`, `fechaFin`, `tipo`
  - Retorna: resumen, ventasPorDia, topProductos, porMetodoPago, horasPico, rendimientoEquipo
  - Queries paralelas (Promise.all): órdenes + usuarios POS
  - Autenticación: getSession() + getAdminUser() + isSuperAdmin check

### Páginas Creadas
- `app/admin/analytics/page.js` (519 líneas) — Dashboard completo con 6 secciones
- `app/api/admin/analytics/route.js` (233 líneas) — API de análisis

### Páginas Modificadas
- `app/admin/page.js` — Grid gestión 5 cols + botón Analíticas + ícono analytics

### Bugs Resueltos (Debugging 2026-06-26)

| Bug | Causa | Solución |
|-----|-------|----------|
| Inputs de "Rango personalizado" no visibles | JSX con condicional `{periodo === 'custom' && ...}` dentro de divs anidados complejos ocultaba visualmente los inputs | Simplificar estructura: sacar selectores de div anidado, poner inputs en contenedor propio con `border-2` azul y `padding` generoso |
| Error "Por favor ingresa fecha de inicio y fin" al seleccionar "Rango personalizado" | Inputs vacíos (null) → useEffect reclama fechas incompletas | Auto-llenar ambos campos con fecha de hoy en `handlePeriodChange('custom')` |
| Fechas inválidas: desde > hasta | Sin sincronización automática | En onChange: si desde > hasta → copiar desde a hasta; si hasta < desde → copiar hasta a desde |
| `console.log` de debug en producción | Console statements para debugging dejadas en código | Remover todos los console.log de debug (mantener solo console.error) |

### Reglas Aplicadas
- ✅ Timestamps con 'Z': `new Date(ts + 'Z')` para parsear created_at
- ✅ Nunca `.not()` encadenado: filtrar origen en JS
- ✅ `parseJsonbArray()` para items (puede ser string o array)
- ✅ `client_id` TEXT en queries
- ✅ Promise.all para queries paralelas
- ✅ Sin `console.log` (solo console.error en API)

---

## [2026-06-26] — Componentes de Producto, Bloqueo de Cobro y UX Mejoras

### ✅ Agregado

#### Eliminación de Componentes en Productos de Servicio
- **Mesero y roles autorizados** pueden eliminar ingredientes, modificadores y opciones de selección de un producto antes de enviarlo al área
- Aplica a todos los tipos de componente: simples (checkbox), selección única y selección múltiple
- Se muestra checkbox "Incluir/Excluir" por cada componente en el modal de producto (`/pos/[clientId]`)
- Los componentes eliminados se guardan en el campo `componentes_eliminados` (JSONB) del item en la orden
- **Sección de Observaciones**: campo de texto libre por producto para que el mesero ingrese notas especiales
- Observaciones y componentes eliminados se muestran en el área KDS (`/pos/[clientId]/area/[areaId]`) en secciones destacadas y visibles

#### Bloqueo de Cobro si Productos no están Listos (Modalidad Restaurante)
- En **modalidad Restaurante**, el cajero o supervisor NO puede finalizar/cobrar una orden si algún producto aún no está en estado `lista` en su área correspondiente
- Botón "Cobrar" se deshabilita y muestra tooltip explicando cuántos productos faltan
- La validación consulta la tabla `order_item_status` cruzando los items de la orden con sus estados por área
- En modalidades **Mostrador** y otras: el bloqueo no aplica (flujo libre)
- **Roles afectados**: cajero, supervisor

#### Scroll en Pantalla de Caja
- Agregado scroll vertical en la grilla de órdenes de `/pos/[clientId]/caja`
- Evita que órdenes fuera de pantalla queden inaccesibles al acumularse múltiples órdenes activas

### APIs Modificadas
- `GET /api/pos/[clientId]/orders/[orderId]/items-status` — **NUEVA**: devuelve estado de cada item por área para validar si todos están listos antes de cobrar
- `POST /api/pos/[clientId]/orders` — Guarda `componentes_eliminados` y `observacion` por item en el JSONB de la orden

### Páginas Modificadas
- `app/pos/[clientId]/page.js` — Modal de producto con eliminación de componentes y campo de observación
- `app/pos/[clientId]/caja/page.js` — Validación de items listos + scroll en grilla de órdenes
- `app/pos/[clientId]/area/[areaId]/page.js` — Muestra componentes eliminados y observaciones en tarjetas KDS

### Bugs Resueltos
- Componentes de tipo selección única/múltiple que no mostraban opciones eliminables
- Scroll bloqueado en grilla de órdenes en pantalla de caja

---

## [2026-06-26] — Optimizaciones POS y Documentación

### ✅ Completado

#### Lógica de Flujo POS
- **Modalidad Restaurante:** SIEMPRE finaliza directo al cobrar (facturado_finalizado)
- **Modalidad Mostrador + area_entrega:** Usa flujo pendiente_entrega
- Lógica de nextStatus en Caja ahora valida esRestaurante

#### Filtros KDS y Completadas
- Agregado `facturado_pendiente_entrega` a estadosFinalesPOS
- Órdenes en estado facturado_pendiente_entrega ahora se excluyen del KDS
- Modal "Ver completadas" incluye ambos estados de finalización

#### Documentación del Sistema
- Creado SYSTEM_CONTEXT.md (documentación técnica completa)
- Creado .claude/SKILL.md (reglas de código y patrones)
- Creado CHANGELOG.md (este archivo)

### APIs Modificadas
- `PUT /api/pos/[clientId]/orders/[orderId]/status` — Log de cobro agregado
- `GET /api/pos/[clientId]/comandas` — Filtro actualizado
- `GET /api/pos/[clientId]/comandas/completed` — Filtro actualizado

### Páginas Modificadas
- `app/pos/[clientId]/caja/page.js` — Lógica de status mejorada
- `app/pos/[clientId]/caja/page.js` — Muestra cliente en cobro

### Commits
- `addcd75` - Fix: Lógica de status de cobro para modalidades y filtro de completadas
- `effab85` - Fix: Log de cobro y mostrar nombre cliente en Caja

---

## [2026-06-25] — Sistema KDS y Flujo Cobro Completado

### ✅ Completado

#### Kitchen Display System (KDS)
- **URL:** `/pos/[clientId]/area/[areaId]`
- Kanban de 4 columnas: ingresadas → recibidas → en_proceso → listas
- Timer dinámico con colores:
  - Verde: < 10 minutos
  - Amarillo: 10-20 minutos
  - Rojo: > 20 minutos
- Modal "Ver completadas" con historial del día
- Scroll en columnas (CSS fix: max-h-[calc(100vh-200px)])

#### Sistema de Cobro (Caja)
- **URL:** `/pos/[clientId]/caja`
- Acceso: cajero o supervisor
- Cards por orden con Mesa/Mostrador + Cliente
- Selección de método de pago
- Modal de confirmación de pago (no alert)
- Transición a próximo estado según flujo

#### Estados POS Correctos
- Estado machine: enviada → en_preparacion → lista → facturado_finalizado
- Historial de cambios guardado en `pos_historial`
- Log cuando orden se marca cobrada

### Bugs Corregidos

| Bug | Causa | Solución |
|-----|-------|----------|
| Timer negativo (-359m) | Timestamp sin Z interpretado como local | parseDate() agrega Z automático |
| Órdenes en LISTAS después de cobrar | falta estado en filtro | Agregar facturado_finalizado a estadosFinalesPOS |
| Scroll no funciona en KDS | overflow-hidden bloqueaba | Remover overflow, agregar max-h |
| clientId undefined en KDS | falta await params | Agregar await en route handlers |

### APIs Creadas
- `GET /api/pos/[clientId]/comandas` — Órdenes activas por área
- `GET /api/pos/[clientId]/comandas/completed` — Órdenes completadas hoy
- `PUT /api/pos/[clientId]/orders/[orderId]/status` — Cambiar estado

### Componentes Creados
- `app/pos/[clientId]/area/[areaId]/page.js` — KDS completo
- `app/pos/[clientId]/caja/page.js` — Interfaz de cobro

### Cambios BD
- Tabla `orders`: campos pos_status, pos_historial, cajero_id, cobrado_at
- Función parseDate() para timestamps UTC

### Commits
- `41582a9` - Fix: Timer muestra 5h+ por fecha sin timezone UTC
- `fdd737c` - Fix: Filtrado de órdenes y endpoint completadas
- `7a9352c` - Fix: Ordenar completadas por created_at con fallback updatedAt
- `bc7d698` - Fix: Filtrado de órdenes con logs y scroll en columnas KDS

---

## [2026-06-24] — Configuración POS y Usuarios

### ✅ Completado

#### Configuración POS en Admin
- **URL:** `/admin/inventario` (tab POS)
- Seleccionar modalidades: restaurante, mostrador, autoservicio
- Flujo de cobro: entrega_inmediata, caja_primero, area_entrega
- Gestión de áreas de preparación
- Gestión de mesas (solo para restaurante)
- Gestión de usuarios POS con PIN

#### Usuarios POS
- Roles: supervisor, cajero, mesero, cocina, operador
- PIN de 4 dígitos (encriptado con bcryptjs)
- Asignación a área (para cocina)
- Estado activo/inactivo

#### Órdenes POS Admin
- **URL:** `/admin/pos-ordenes`
- Historial de órdenes POS
- Filtros: cliente, método de pago, tipo de orden
- Totales: cantidad, ventas, por método
- Modal de detalle de orden

#### Login POS
- **URL:** `/pos/[clientId]/login`
- PIN de 4 dígitos
- Redirección por rol:
  - cocina → KDS área
  - cajero → Caja
  - supervisor/mesero → Principal

### APIs Creadas
- `GET /api/admin/pos-orders` — Historial de órdenes
- `DELETE /api/admin/inventory/mesas/[id]` — Eliminar mesa
- `DELETE /api/admin/inventory/areas/[id]` — Eliminar área
- `POST /api/pos/[clientId]/auth` — Autenticar con PIN

### Páginas Creadas
- `/admin/pos-ordenes` — Historial POS
- `/pos/[clientId]/login` — Login POS

### Cambios BD
- Tabla `tenants`: pos_modalidad (JSONB), pos_flujo_cobro
- Tabla `pos_users`: id, nombre, rol, pin (hash), area_id, activo
- Tabla `pos_areas`: id, nombre, tipo, color, activo
- Tabla `pos_tables`: id, numero, nombre, capacidad
- Tabla `orders`: origen = 'pos'

### Commits
- `03c1b29` - Fix: Use select('*') instead of explicit fields to avoid 404
- `04d0e00` - Rediseño completo del sistema

---

## [2026-06-23] — Multi-Modalidades E-commerce

### ✅ Completado

#### Conversión de single a multiple ecommerce_modes
- Cambio de `ecommerce_mode` (TEXT) a `ecommerce_modes` (JSONB array)
- Migración en `/admin/planes`:
  - Checkboxes para catalogo_whatsapp, tienda, chatbot, pos
  - Guardar como array en BD
- Cada plan define modalidades habilitadas

#### Planes Configurables
- **Basic:** sin e-commerce (default)
- **Pro:** catalogo_whatsapp + chatbot (50 productos, 10 categorías, 5 reglas)
- **Enterprise:** todo habilitado (500 productos, 50 categorías, 20 reglas)
- Límites por modalidad verificados en backend y frontend

#### Validación de Límites
- `lib/plan-limits.js`: `canUseEcommerceMode()`, `checkProductLimit()`
- Verificaciones en API antes de crear recurso
- Feedback al usuario en admin si límite alcanzado

#### Admin Buttons Dinámicos
- Botones visibles según ecommerce_modes del tenant:
  - 📊 Órdenes E-commerce (si catalogo_whatsapp o tienda)
  - 🤖 Órdenes Chat (si chatbot)
  - 💳 Órdenes POS (si pos)

### APIs Modificadas
- `PUT /api/admin/plans/[id]` — Mapeo de ecommerce_modes
- `GET /api/admin/inventory/config` — Retorna pos_modalidad y pos_flujo_cobro

### Páginas Modificadas
- `/admin/planes` — Checkboxes para modalidades
- `/admin/page.js` — Botones dinámicos

### Cambios BD
- Tabla `tenants`: ecommerce_modes (JSONB array)
- Tabla `plans`: ecommerce_modes (JSONB array)

### Commits
- `fde2525` - Fix customer data display - use correct field names (snake_case)
- `e66a4ed` - Fix order status tracking and customer data display

---

## [2026-06-22] — Sistema de Escalación y Push Notifications

### ✅ Completado

#### Escalación a Humano
- Usuarios pueden escribir `/escalate` en chat
- Crea ticket de escalación con contexto
- Admin notificado por email
- Historial de escalaciones en `/admin/metricas`

#### Notificaciones Push
- VAPID keys configurables
- Subscriptions guardadas en BD
- Envío a múltiples dispositivos
- Service Worker para background notifications

#### Motor de Reglas de Negocio
- 6 tipos: cross_sell, volume_pricing, kit_combo, intro_price, gift_purchase, limited_edition
- Almacenadas en `business_rules` table
- Aplicadas dinámicamente en carrito y recomendaciones
- Mapeo correcto de nombres: DB → Frontend

### APIs Creadas
- `POST /api/push/subscribe` — Registrar device para push
- `GET /api/push/vapid` — Obtener clave pública VAPID

### Librerías
- `lib/escalation.js` — Escalación con email
- `lib/push-notifications.js` — Envío de notificaciones
- `lib/business-rules.js` — Motor de reglas

### Cambios BD
- Tabla `escalations`: id, tenant_id, user_id, mensaje, estado, created_at
- Tabla `push_subscriptions`: id, tenant_id, subscription (JSONB)
- Tabla `business_rules`: id, tenant_id, tipo, condiciones (JSONB), activo

### Commits
- Múltiples commits de integración de IA y chat

---

## [2026-06-21] — Tienda E-commerce Completa

### ✅ Completado

#### Tienda Web Completa
- **URL:** `/tienda/[clientId]`
- Catálogo con búsqueda y filtros
- Product detail pages con imágenes
- Carrito persistente (sesión local)
- Checkout 3 pasos:
  1. Datos cliente (nombre, email, teléfono, dirección)
  2. Resumen de orden + método de pago
  3. Confirmación y seguimiento
- Integración de reglas de negocio (descuentos, kits)

#### Seguimiento de Órdenes
- **URL:** `/orden/[orderId]`
- Público (sin autenticación)
- Estados: pendiente → confirmada → en_proceso → entregada
- Timeline visual de cambios

#### Métodos de Pago
- Efectivo
- Tarjeta
- Transferencia
- Billetera digital (configurable)

### APIs Creadas
- `POST /api/store/[clientId]/order` — Crear orden
- `GET /api/store/[clientId]` — Config tienda
- `GET /api/orden/[orderId]` — Seguimiento orden

### Páginas Creadas
- `/tienda/[clientId]` — Tienda completa
- `/tienda/[clientId]/orden/[orderId]` — Checkout
- `/orden/[orderId]` — Seguimiento público

### Cambios BD
- Tabla `orders`: cantidad, tipo_orden, estado, origen
- Tabla `categories`: para organizar productos

---

## [2026-06-20] — Catálogo y WhatsApp

### ✅ Completado

#### Catálogo Público
- **URL:** `/catalogo/[clientId]`
- Productos con descripción, precio, imagen
- Carrito simple
- "Pedir por WhatsApp" → redirige a wa.me

#### Integración WhatsApp
- Mensaje formateado con orden
- Link wa.me con número de negocio
- Flujo manual de compra via WhatsApp

### APIs Creadas
- `GET /api/store/[clientId]` — Productos y config

### Páginas Creadas
- `/catalogo/[clientId]` — Catálogo público

---

## [2026-06-19] — Chatbot Inteligente

### ✅ Completado

#### Core Chat
- **URL:** `/chat/[clientId]`
- Conversación multi-turno
- Inyección dinámica de catálogo
- Respuestas con streaming (SSE)
- Historial persistente
- Multiidioma (detección automática)

#### Escalación a Humano
- Palabras clave para detectar necesidad de escalación
- Notificación a admin
- Generación de ticket

#### Personalización
- System prompt por tenant
- Selección de AI provider (Anthropic, OpenAI, Gemini, Groq, Mistral)
- Tema (light/dark/auto)
- Idioma (ES, EN, PT)

### APIs Creadas
- `POST /api/chat` — Enviar mensaje
- `GET /api/chat/admin-responses` — Admin ve escalaciones

### Librerías
- `lib/ai-provider.js` — Routing a múltiples IA
- `lib/chatbot-store.js` — Persistencia de conversaciones
- `lib/conversations-db.js` — BD de mensajes

---

## [2026-06-18] — Estructura Base y Admin

### ✅ Completado

#### Admin Dashboard
- **URL:** `/admin`
- Login con Supabase Auth
- Gestión de tenants
- Configuración de chatbot (prompt, idioma, tema)

#### Gestión de Productos
- **URL:** `/admin/inventario`
- CRUD de productos
- Categorías
- Precios y stock
- Upload de imágenes

#### Gestión de Planes
- **URL:** `/admin/planes`
- CRUD de planes (basic/pro/enterprise)
- Límites por plan
- Modalidades habilitadas

#### Gestión de Reglas
- Business rules CRUD
- 6 tipos de reglas
- Activación/desactivación

### Middleware
- Protección de `/admin/*` con Supabase Auth
- Header de admin role para endpoints

### Librerías Creadas
- `lib/auth.js` — getSession(), getAdminUser()
- `lib/supabase-admin.js` — Cliente admin
- `lib/constants.js` — Constantes del sistema
- `lib/plan-limits.js` — Validación de límites
- `lib/store.js` — Operaciones de tienda
- `lib/business-rules.js` — Lógica de reglas

### APIs Creadas (Admin)
- `GET /api/admin/me` — Usuario actual
- `GET /api/admin/tenants` — Listar tenants
- `PUT /api/admin/tenants/[id]` — Actualizar tenant
- `GET /api/admin/inventory/*` — Gestión de inventario
- `GET /api/admin/plans` — Gestión de planes

### Páginas Creadas
- `/admin` — Dashboard
- `/admin/login` — Login
- `/admin/inventario` — Productos, categorías, reglas
- `/admin/planes` — Planes
- `/admin/metricas` — Analytics

---

## [2026-06-16] — Inicialización del Proyecto

### ✅ Completado

#### Stack
- Next.js 16.2.9 (App Router)
- React 19.2.4
- TailwindCSS 4
- Supabase (PostgreSQL)
- Anthropic SDK 0.104.2

#### Setup Inicial
- package.json con dependencias
- next.config.mjs
- tailwind.config.js
- Middleware TypeScript
- Estructura de carpetas

#### Conexión a Supabase
- Variables de entorno
- Cliente standard y admin
- Autenticación configurada

---

## Estado Actual (2026-06-26)

### ✅ Completado (100%)

- [x] Core Chat con IA
- [x] Escalación a humano
- [x] Notificaciones Push
- [x] Catálogo + WhatsApp
- [x] Tienda E-commerce completa
- [x] Seguimiento de órdenes
- [x] Motor de reglas de negocio
- [x] Admin Dashboard
- [x] Multi-tenants
- [x] Planes y límites
- [x] **POS Punto de Venta completo**
  - [x] Login por PIN
  - [x] Interfaz de órdenes
  - [x] Kitchen Display System (KDS)
  - [x] Caja de cobro
  - [x] Gestión de áreas y mesas
  - [x] Roles y permisos
  - [x] Historial de órdenes
- [x] Documentación técnica completa
- [x] Reglas de código y patrones

### 🔄 En Progreso

- [ ] Testing (unit, e2e)
- [ ] Performance optimization
- [ ] Analytics mejorado

### ❌ Pendientes / Futuros

- [ ] Pago online integrado (Stripe/PayPal)
- [ ] Facturación automatizada
- [ ] Reportes avanzados
- [ ] Mobile app nativa
- [ ] Integraciones adicionales (ERP, CRM)
- [ ] SMS notifications
- [ ] Video chat para escalación

---

## Estadísticas

### Código
- **Archivos JS:** 107 en app/, 23 en lib/
- **Rutas API:** 66 endpoints
- **Tablas BD:** 15+
- **Componentes Admin:** 3+
- **Líneas SYSTEM_CONTEXT.md:** ~850
- **Líneas SKILL.md:** ~600
- **Líneas CHANGELOG.md:** ~400

### Commits
- **Total commits:** 8+ desde refactor POS
- **Último commit:** `addcd75` (2026-06-26)

---

## Comandos Frecuentes

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Lint
npm run lint

# Limpiar caché y reiniciar
rm -rf .next && npm run dev

# Acceder a BD
# Dashboard: https://app.supabase.com/project/_/editor
```

---

## Contacto y Mantenimiento

- **Proyecto:** mi-chatbot
- **Versión:** 0.1.0
- **Mantenedor:** Oscar Yache (ososyaca@gmail.com)
- **Stack:** Next.js 16, React 19, Supabase, TailwindCSS 4
- **Última actualización:** 2026-06-26

---

**Fin del CHANGELOG**
