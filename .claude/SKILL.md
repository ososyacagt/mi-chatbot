# Reglas del Proyecto — Claude Code

## Checklist Pre-Escritura de Código

ANTES de escribir cualquier código, responde estos puntos:

- [ ] ¿Es un componente nuevo? → Revisar `app/admin/components/` para ver patrones
- [ ] ¿Es una tabla nueva en BD? → Agregar RLS policy (ver sección 4)
- [ ] ¿Es un campo JSONB? → Manejar serialización doble con parseJsonbArray()
- [ ] ¿Uso de timestamp? → Agregar 'Z' al parsear con Supabase dates
- [ ] ¿Necesita confirmación del usuario? → Usar ConfirmModal, NUNCA alert/confirm
- [ ] ¿Muestra feedback? → Toast, NUNCA alert()
- [ ] ¿Referencia un plan? → Usar plan.slug (TEXT), NUNCA plan.id (UUID)
- [ ] ¿Referencia un tenant? → Usar tenant.client_id (TEXT), NUNCA UUID
- [ ] ¿Es un route handler? → SIEMPRE `const { param } = await params`
- [ ] ¿Necesita filtrar múltiples estados? → NUNCA encadenar .not(), filtrar en JS
- [ ] ¿Hay console.log de debug? → REMOVER, dejar solo console.error

---

## 1. Patrones de Código Obligatorios

### 1.1 Route Handler Next.js 16+ (CRÍTICO)

**CORRECTO:**
```javascript
export async function GET(request, { params }) {
  const { clientId } = await params  // SIEMPRE await
  if (!clientId) {
    return NextResponse.json({ error: 'clientId requerido' }, { status: 400 })
  }
  // resto del código
}
```

**INCORRECTO:**
```javascript
export async function GET(request, { params }) {
  const { clientId } = params  // FALTA await → falla en prod
  // ...
}
```

---

### 1.2 Admin API con Autenticación

```javascript
import { getSession, getAdminUser } from '@/lib/auth'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    // 1. Verificar usuario autenticado
    const user = await getSession()
    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // 2. Verificar permisos admin
    const adminUser = await getAdminUser(user.id)
    if (!adminUser) {
      return NextResponse.json(
        { error: 'No tiene permisos de admin' },
        { status: 403 }
      )
    }

    // 3. Crear cliente admin
    const supabase = createSupabaseAdmin()

    // 4. Realizar operación
    const { data, error } = await supabase
      .from('tabla')
      .select('*')

    if (error) throw error

    // 5. Retornar respuesta
    return NextResponse.json({ data })
  } catch (error) {
    console.error('[GET /api/admin/...] Error:', error.message)
    return NextResponse.json(
      { error: 'Error al procesar: ' + error.message },
      { status: 500 }
    )
  }
}
```

---

### 1.3 POS API (requiere PIN/sesión)

```javascript
export async function GET(request, { params }) {
  try {
    const { clientId } = await params
    
    // Obtener sesión POS del header o body
    const posUserId = request.headers.get('x-pos-user-id')
    
    if (!posUserId) {
      return NextResponse.json(
        { error: 'Sesión POS requerida' },
        { status: 401 }
      )
    }

    const supabase = createSupabaseAdmin()
    
    // Verificar que el usuario POS pertenece a este cliente
    const { data: posUser } = await supabase
      .from('pos_users')
      .select('id, rol')
      .eq('id', posUserId)
      .eq('tenant_id', clientId)
      .single()

    if (!posUser) {
      return NextResponse.json(
        { error: 'Usuario POS inválido' },
        { status: 403 }
      )
    }

    // Continuar operación
    // ...
  } catch (error) {
    console.error('[GET /api/pos/...] Error:', error.message)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

---

### 1.4 Parsear Timestamp de Supabase (CRÍTICO)

**Supabase retorna:** `2026-06-25T10:30:00` (SIN la Z)

**CORRECTO:**
```javascript
// Función helper
const parseSupabaseDate = (timestamp) => {
  if (!timestamp) return new Date()
  // Agregar Z para forzar interpretación UTC
  const withZ = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z'
  return new Date(withZ)
}

// Uso:
const createdAt = parseSupabaseDate(order.created_at)
const diffMs = Date.now() - createdAt.getTime()

// O inline:
const date = new Date((timestamp || '') + 'Z')
```

**INCORRECTO:**
```javascript
const date = new Date(timestamp)  // Interpreta como hora local
const diffMs = Date.now() - new Date(timestamp).getTime()  // UTC != local
```

---

### 1.5 Cargar Campo JSONB Array

**Problema:** JSONB puede venir como:
- Array: `['item1', 'item2']`
- String JSON: `"[\"item1\", \"item2\"]"`
- String simple: `"item1"`
- null/undefined

**Solución:**
```javascript
const parseJsonbArray = (value) => {
  // Si ya es array, retornar
  if (Array.isArray(value)) return value

  // Si es string, intentar parsear
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : [value]
    } catch (e) {
      // Si no es JSON válido, tratar como string delimitado
      return value.includes(',')
        ? value.split(',').map(v => v.trim())
        : value ? [value] : []
    }
  }

  // Si es nulo o vacío
  return []
}

// Uso en componente:
const [posModalidad, setPosModalidad] = useState([])

useEffect(() => {
  if (configData?.pos_modalidad) {
    setPosModalidad(parseJsonbArray(configData.pos_modalidad))
  }
}, [configData])
```

---

### 1.6 Guardar Campo JSONB Array (CRÍTICO — Evitar Double Serialization)

**Problema:** Al hacer PUT con JSON.stringify, si el array ya vino como string JSON, se serializa dos veces:
```javascript
// INCORRECTO:
const body = JSON.stringify({
  pos_modalidad: JSON.stringify(['restaurante', 'mostrador'])  // double serialization
})
// Resultado en BD: "[\"[\\\\"restaurante\\\\\", \\\\\"mostrador\\\\\"]\"]"
```

**Solución:**
```javascript
// Función de limpieza
const cleanConfig = (configForm) => {
  return {
    ...configForm,
    // Filtrar arrays JSONB para evitar double serialization
    pos_modalidad: Array.isArray(configForm.pos_modalidad)
      ? configForm.pos_modalidad.filter(
          m => typeof m === 'string' && !m.startsWith('[')
        )
      : []
  }
}

// Uso:
const bodyData = cleanConfig(configForm)
const res = await fetch('/api/...', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(bodyData)  // NO hacer stringify extra del array
})
```

---

### 1.7 Confirmación de Acción Destructiva (NUNCA alert/confirm)

**INCORRECTO:**
```javascript
if (confirm('¿Eliminar este producto?')) {
  handleDelete()
}
```

**CORRECTO:**
```javascript
import ConfirmModal from '@/app/admin/components/ConfirmModal'

// En componente:
const [confirmModal, setConfirmModal] = useState({
  isOpen: false,
  title: '',
  message: '',
  onConfirm: null
})

const handleDeleteClick = () => {
  setConfirmModal({
    isOpen: true,
    title: 'Eliminar Producto',
    message: '¿Estás seguro de que quieres eliminar este producto? No se puede deshacer.',
    onConfirm: () => {
      handleDelete()
      setConfirmModal({ ...confirmModal, isOpen: false })
    }
  })
}

// En render:
<button onClick={handleDeleteClick}>Eliminar</button>

<ConfirmModal
  isOpen={confirmModal.isOpen}
  title={confirmModal.title}
  message={confirmModal.message}
  onConfirm={confirmModal.onConfirm}
  onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
/>
```

---

### 1.8 Filtrar Estados en Query Supabase (NUNCA encadenar .not())

**INCORRECTO:**
```javascript
// Supabase .not() con paréntesis NO funciona correctamente
const { data } = await supabase
  .from('orders')
  .select('*')
  .not('pos_status', 'eq', 'facturado_finalizado')
  .not('pos_status', 'eq', 'cancelada')
  // Solo el último .not() se aplica
```

**CORRECTO:**
```javascript
// Filtrar en JavaScript después de obtener datos
const { data: orders } = await supabase
  .from('orders')
  .select('*')
  .eq('tenant_id', clientId)

const estadosFinal = ['facturado_finalizado', 'cancelada', 'entregada']
const ordenesActivas = (orders || []).filter(o => 
  !estadosFinal.includes(o.pos_status)
)
```

---

### 1.9 useEffect Optimizado (Separar dependencias)

**INCORRECTO:**
```javascript
useEffect(() => {
  if (!clientId) return
  
  loadProducts()      // depende de clientId
  loadConfig()        // depende de clientId
  
  if (activeTab === 'productos') loadCategoryFilters()  // depende de activeTab
  if (activeTab === 'config') loadConfigOptions()      // depende de activeTab
}, [clientId, activeTab]) // demasiadas dependencias, re-ejecuta todo
```

**CORRECTO:**
```javascript
// Effect 1: solo cambios de clientId
useEffect(() => {
  if (!clientId) return
  
  loadProducts()
  loadConfig()
}, [clientId])

// Effect 2: solo cambios de activeTab
useEffect(() => {
  if (!clientId) return  // aún requiere clientId, pero no dispara si es igual
  
  if (activeTab === 'productos') loadCategoryFilters()
  if (activeTab === 'config') loadConfigOptions()
}, [activeTab, clientId])
```

---

### 1.10 Fetches Paralelos (NUNCA secuencial en loop)

**INCORRECTO:**
```javascript
// Secuencial — espera cada uno
for (const item of items) {
  const res = await fetch(`/api/item/${item.id}`)
  const data = await res.json()
  results.push(data)
}
// Si 10 items × 200ms cada uno = 2000ms total
```

**CORRECTO:**
```javascript
// Paralelo — todos al mismo tiempo
const results = await Promise.all(
  items.map(item => 
    fetch(`/api/item/${item.id}`).then(r => r.json())
  )
)
// Si 10 items × 200ms = ~200ms total
```

---

### 1.11 Validación de Plan (NUNCA usar UUID)

**INCORRECTO:**
```javascript
const planId = tenant.plan_id  // UUID
const { data: plan } = await supabase
  .from('plans')
  .select('*')
  .eq('id', planId)  // UUID comparison — slow, wrong
  .single()
```

**CORRECTO:**
```javascript
const planSlug = tenant.plan  // 'basic', 'pro', 'enterprise'
const { data: plan } = await supabase
  .from('plans')
  .select('*')
  .eq('slug', planSlug)  // Text comparison — fast, correcto
  .single()
```

---

### 1.12 Referencia de Tenant (NUNCA UUID)

**INCORRECTO:**
```javascript
const tenantId = session.user.id  // UUID del usuario
const { data } = await supabase
  .from('orders')
  .select('*')
  .eq('tenant_id', tenantId)  // FALTA — tenantId es usuario, no tenant
```

**CORRECTO:**
```javascript
const clientId = 'bava'  // TEXT, el client_id del tenant
const { data } = await supabase
  .from('orders')
  .select('*')
  .eq('tenant_id', clientId)
  .single()
```

---

## 2. Componentes Reutilizables Disponibles

### ConfirmModal
**Ubicación:** `app/admin/components/ConfirmModal.js`

**Props:**
```javascript
<ConfirmModal
  isOpen={boolean}
  title={string}
  message={string}
  onConfirm={function}
  onCancel={function}
  confirmText={string} // default: "Confirmar"
  cancelText={string}  // default: "Cancelar"
/>
```

**Uso:**
```javascript
const [modal, setModal] = useState({ isOpen: false, onConfirm: null })

<button onClick={() => setModal({ isOpen: true, onConfirm: handleDelete })}>
  Eliminar
</button>

<ConfirmModal
  isOpen={modal.isOpen}
  title="Eliminar"
  message="¿Estás seguro?"
  onConfirm={() => { modal.onConfirm?.(); setModal({ isOpen: false }) }}
  onCancel={() => setModal({ isOpen: false })}
/>
```

---

### POSConfigTab
**Ubicación:** `app/admin/components/POSConfigTab.js`

**Propósito:** Gestión de configuración POS (áreas, mesas, usuarios)

**Props:**
```javascript
<POSConfigTab
  tenant={object}
  onSave={function}
/>
```

---

## 3. Errores Comunes y Soluciones

### Error 1: "Cannot read property 'x' of undefined"

**Síntoma:**
```
TypeError: Cannot read property 'numero_orden' of undefined
```

**Causa:** Data de Supabase retorna null o undefined

**Solución:**
```javascript
// ANTES:
const numeroOrden = order.numero_orden  // ❌ puede fallar

// DESPUÉS:
const numeroOrden = order?.numero_orden || "SIN-NÚMERO"  // ✓ safe
const numeroOrden = (order || {}).numero_orden  // ✓ alternative
```

---

### Error 2: "await params" falta en route handler

**Síntoma:**
```
TypeError: Cannot destructure property 'clientId' of undefined
```

**Causa:** No hacer await en params (Next.js 16+)

**Solución:**
```javascript
// ANTES:
const { clientId } = params  // ❌ params es Promise

// DESPUÉS:
const { clientId } = await params  // ✓ correcto
```

---

### Error 3: JSON doble serialización en JSONB

**Síntoma:**
```
pos_modalidad en BD: "[\"[\\\\"restaurante\\\\\"]\"]"
// Triple nested — INCORRECTO
```

**Causa:** JSON.stringify en array que ya viene serializado

**Solución:**
```javascript
// ANTES:
body: JSON.stringify({
  pos_modalidad: JSON.stringify(['restaurante'])  // ❌ double
})

// DESPUÉS:
const clean = {
  ...config,
  pos_modalidad: Array.isArray(config.pos_modalidad)
    ? config.pos_modalidad.filter(m => !m.startsWith('['))
    : []
}
body: JSON.stringify(clean)  // ✓ single serialization
```

---

### Error 4: Timestamp negativo en timer

**Síntoma:**
```
Timer muestra: -359 minutos, -5 horas, etc.
```

**Causa:** Timestamp sin 'Z' interpretado como hora local, no UTC

**Solución:**
```javascript
// ANTES:
const diffMs = Date.now() - new Date(timestamp).getTime()

// DESPUÉS:
const diffMs = Date.now() - new Date(timestamp + 'Z').getTime()

// O con helper:
const parseDate = (ts) => {
  if (!ts) return new Date()
  if (!ts.endsWith('Z') && !ts.includes('+')) ts = ts + 'Z'
  return new Date(ts)
}
const diffMs = Date.now() - parseDate(timestamp).getTime()
```

---

### Error 5: ConfirmModal no abre

**Síntoma:**
```
Modal no aparece aunque isOpen={true}
```

**Causa:** ConfirmModal no renderizado en el árbol del componente

**Solución:**
```javascript
// Verificar que ConfirmModal esté en el JSX:
return (
  <div>
    <button onClick={...}>Acción</button>
    
    {/* ✓ ConfirmModal debe estar aquí */}
    <ConfirmModal isOpen={...} ... />
  </div>
)
```

---

### Error 6: Órdenes cobradas siguen en KDS

**Síntoma:**
```
Orden se cobra (facturado_finalizado) pero sigue en columna LISTAS del KDS
```

**Causa:** `facturado_finalizado` no incluido en `estadosFinalesPOS` del filtro

**Solución:**
```javascript
// En comandas/route.js:
const estadosFinalesPOS = [
  'facturado_finalizado',        // ✓ AGREGAR
  'facturado_pendiente_entrega', // ✓ AGREGAR
  'entregado',
  'cerrado'
]

// Filtrar órdenes activas:
const ordenesActivas = orders.filter(o => 
  !estadosFinalesPOS.includes(o.pos_status)
)
```

---

### Error 7: No se guarda pos_modalidad en config

**Síntoma:**
```
Se muestra "Configuración guardada" pero pos_modalidad vacío en BD
```

**Causa:** loadConfig() no carga el campo al setear estado inicial

**Solución:**
```javascript
// En app/admin/inventario/page.js loadConfig():
const { data } = await fetch(`/api/admin/inventory/config?clientId=${clientId}`)

setPosConfigForm({
  ...data.config,
  // ✓ AGREGAR estos campos:
  pos_modalidad: Array.isArray(data.config.pos_modalidad)
    ? data.config.pos_modalidad
    : (data.config.pos_modalidad ? [data.config.pos_modalidad] : []),
  pos_flujo_cobro: data.config.pos_flujo_cobro || 'entrega_inmediata'
})
```

---

## 4. Tablas de Base de Datos — Campos Críticos

### tenants
| Campo | Tipo | Crítico | Notas |
|-------|------|---------|-------|
| client_id | TEXT | ⭐⭐⭐ | PRIMARY KEY, NUNCA UUID |
| plan | TEXT | ⭐⭐ | slug ('basic', 'pro', 'enterprise') |
| ecommerce_modes | JSONB | ⭐ | Array de modalidades habilitadas |
| pos_modalidad | JSONB | ⭐ | Array: 'restaurante', 'mostrador', 'autoservicio' |
| pos_flujo_cobro | TEXT | ⭐ | 'entrega_inmediata' o 'area_entrega' |

### orders
| Campo | Tipo | Crítico | Notas |
|-------|------|---------|-------|
| id | UUID | ⭐⭐ | PRIMARY KEY |
| tenant_id | TEXT | ⭐⭐ | FK a tenants.client_id (TEXT, not UUID) |
| numero_orden | TEXT | ⭐ | Identificador visible (TND-xxx, POS-xxx) |
| pos_status | TEXT | ⭐⭐ | Estado actual: enviada, en_preparacion, lista, facturado_finalizado, facturado_pendiente_entrega |
| origen | TEXT | ⭐ | 'tienda', 'chat', 'pos' |
| items | JSONB | ⭐ | Array de items [{id, nombre, precio, cantidad}] |

---

## 5. Arquitectura y Decisiones de Diseño

### NUNCA hacer esto:

1. ❌ `alert()` o `confirm()` → Usar ConfirmModal
2. ❌ `console.log()` debug → Usar console.error solo
3. ❌ Valores hardcodeados (emails, URLs, colores) → Constants o config
4. ❌ Timestamps sin 'Z' → Agregar 'Z' antes de new Date()
5. ❌ Encadenar .not() en Supabase → Filtrar en JavaScript
6. ❌ Usar plan.id (UUID) → Usar plan.slug (TEXT)
7. ❌ Usar tenant.id (UUID) → Usar tenant.client_id (TEXT)
8. ❌ JSON.stringify en JSONB → cleanConfig filter primero
9. ❌ await params — const { id } = params → SIEMPRE await
10. ❌ seqüencial en loops → Promise.all para paralelo

### SIEMPRE hacer esto:

1. ✅ Usar ConfirmModal para confirmaciones
2. ✅ Toast para feedback al usuario
3. ✅ Separar effects por dependencias
4. ✅ Agregar 'Z' a timestamps de Supabase
5. ✅ Filtrar en JavaScript cuando .not() no funciona
6. ✅ Usar plan.slug y client_id en queries
7. ✅ cleanConfig filter antes de stringify
8. ✅ const { param } = await params
9. ✅ Promise.all para paralelo
10. ✅ Verificar Array.isArray() en campos JSONB

---

## 6. Checklist de QA Pre-Commit

- [ ] ✅ Sin window.confirm() o alert() en código
- [ ] ✅ Sin console.log() de debug (solo console.error)
- [ ] ✅ Sin valores hardcodeados (usar constants.js)
- [ ] ✅ Timestamps con 'Z' al parsear de BD
- [ ] ✅ client_id como TEXT (no UUID)
- [ ] ✅ plan como slug (no UUID)
- [ ] ✅ Arrays JSONB con Array.isArray() check
- [ ] ✅ const { param } = await params en route.js
- [ ] ✅ RLS policies en tablas nuevas
- [ ] ✅ Probado flujo completo end-to-end
- [ ] ✅ Logs relevantes sin ruido
- [ ] ✅ Manejo de errores con try/catch
- [ ] ✅ Validación de entrada en endpoints

---

**Última actualización:** 2026-06-26
