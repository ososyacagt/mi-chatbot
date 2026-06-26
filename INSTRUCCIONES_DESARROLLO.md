# Guía de Desarrollo — Plataforma SaaS Chatbot Multi-tenant

Este archivo es el punto de entrada para cualquier
desarrollador o agente IA que trabaje en este proyecto.
Léelo completo antes de iniciar cualquier trabajo.

---

## Archivos de Documentación del Proyecto

Antes de comenzar, lee estos archivos en orden:

| Archivo | Propósito | Cuándo leer |
|---------|-----------|-------------|
| INSTRUCCIONES_DESARROLLO.md | Este archivo. Siempre primero | Inicio de cada sesión |
| SYSTEM_CONTEXT.md | Arquitectura, tablas, APIs, módulos, bugs históricos | Inicio de sesión o ante dudas |
| CHANGELOG.md | Historial completo de cambios y pendientes | Para saber dónde se quedó |
| .claude/SKILL.md | Reglas, patrones y restricciones de código | Antes de escribir cualquier código |

---

## PASO 1 — Lectura Obligatoria al Iniciar

Al comenzar cualquier sesión de trabajo, el desarrollador
o agente IA debe leer y confirmar que entendió:

### Prompt de arranque (copiar y pegar):

```
Lee los siguientes archivos del proyecto en este orden
y confirma que entendiste su contenido antes de 
escribir cualquier código o hacer cualquier sugerencia:

1. SYSTEM_CONTEXT.md
   - Stack: Next.js 16, React 19, Supabase, TailwindCSS 4
   - Arquitectura: client_id (TEXT), plan (slug), await params
   - 5 módulos: Chat, E-commerce (3 opciones), POS
   - 10 tablas de BD principales
   - 66 rutas API documentadas
   - Bugs históricos y soluciones

2. .claude/SKILL.md (o .claude/SKILL.md en cualquier editor)
   - 10 reglas obligatorias
   - 12 patrones de código con ejemplos
   - 10 cosas prohibidas
   - 7 errores comunes y soluciones
   - Checklist QA de 13 puntos

3. CHANGELOG.md
   - Último entry: qué se implementó recientemente
   - Qué está pendiente de terminar
   - Bugs conocidos por fecha

Confirma que entendiste:
- El stack completo y por qué se eligió
- Las convenciones críticas (client_id, plan.slug, await params)
- El estado actual del proyecto (últimas 2 semanas)
- Las restricciones de código que no se pueden violar
- Qué módulos ya existen y están funcionales
```

---

## PASO 2 — Tipos de Trabajo y Cómo Pedirlos

### 2.1 Corregir un Bug

Cuando pidas que se corrija un bug, proporciona:

```
TENGO UN BUG:

Error exacto:
[PEGA AQUÍ EL MENSAJE DE ERROR COMPLETO]

Dónde aparece:
[BROWSER CONSOLE / TERMINAL / SUPABASE DASHBOARD / OTRO]

Archivo afectado:
[RUTA EXACTA DEL ARCHIVO]

Pasos para reproducir:
1. ...
2. ...
3. ...

Comportamiento esperado:
[QUÉ DEBERÍA PASAR]

Comportamiento actual:
[QUÉ SÍ PASA]
```

**Lo que el desarrollador/IA debe hacer:**
1. Verificar si el bug ya está documentado en SYSTEM_CONTEXT.md sección "Bugs Históricos"
2. Leer el archivo afectado completo
3. Mostrar el código actual ANTES de proponer cambio
4. Proponer la solución MÍNIMA necesaria
5. No tocar archivos que no sean estrictamente necesarios

---

### 2.2 Implementar una Feature Nueva

Cuando pidas que se implemente una feature:

```
QUIERO IMPLEMENTAR:

Descripción:
[QUÉ SE VA A AGREGAR]

Ubicación:
[DÓNDE VA A VIVIR: URL, API, BD, etc]

Requisitos:
- [REQUISITO 1]
- [REQUISITO 2]
- ...

Restricciones:
- [RESTRICCIÓN 1]
- [RESTRICCIÓN 2]
- ...
```

**Lo que el desarrollador/IA debe hacer ANTES de escribir código:**
1. Buscar si algo similar ya existe en el sistema (en SYSTEM_CONTEXT.md)
2. Identificar si necesita cambios en BD (nueva tabla, nuevos campos)
3. Listar TODOS los archivos que se van a crear o modificar
4. Verificar si es compatible con los planes (basic/pro/enterprise)
5. Mostrar el plan paso a paso y esperar aprobación
6. Crear solo cuando esté aprobado

---

### 2.3 Continuar Trabajo Anterior

Cuando se retoma el trabajo:

```
CONTINUAR DESARROLLO:

Última sesión terminó en:
[LINK O DESCRIPCIÓN]

Pendientes a terminar:
- [TAREA 1]
- [TAREA 2]
- ...
```

**Lo que el desarrollador/IA debe hacer:**
1. Leer el último entry de CHANGELOG.md
2. Revisar qué está marcado como "Pendientes"
3. Reanudar desde donde se quedó
4. Actualizar CHANGELOG.md con el progreso

---

### 2.4 Revisar o Refactorizar Código

Cuando se audita código existente:

```
REVISAR:

Archivo/Módulo a revisar:
[RUTA O NOMBRE DEL MÓDULO]

Objetivo:
- [OBJETIVO 1: e.g., encontrar memory leaks]
- [OBJETIVO 2: e.g., optimizar performance]
```

**Lo que el desarrollador/IA debe hacer:**
1. Leer el archivo completo
2. Revisar contra las reglas de .claude/SKILL.md
3. Listar TODOS los problemas encontrados
4. Ordenar por prioridad/impacto
5. Proponer cambios uno por uno
6. Esperar aprobación de cada cambio

---

## PASO 3 — Reglas que SIEMPRE Deben Cumplirse

### Código PROHIBIDO en este proyecto:

```javascript
❌ window.confirm() o alert()              → Usar ConfirmModal
❌ console.log() de debug                  → Usar solo console.error
❌ Valores hardcodeados (emails, URLs)    → Usar variables de entorno o constants.js
❌ UUID de plan como referencia           → Usar plan.slug (TEXT)
❌ UUID de tenant como referencia         → Usar client_id (TEXT)
❌ .not() encadenado en Supabase         → Filtrar en JavaScript
❌ new Date(timestamp) sin 'Z'            → Siempre agregar 'Z'
❌ Double serialization de JSON           → cleanConfig filter
❌ Importar cliente regular de Supabase   → Usar createSupabaseAdmin()
❌ Componentes con alert/confirm          → Usar ConfirmModal siempre
```

### Código OBLIGATORIO en este proyecto:

```javascript
✅ const { param } = await params           (en route handlers)
✅ createSupabaseAdmin()                    (para queries admin)
✅ Array.isArray() check                    (antes de usar JSONB array)
✅ RLS policy                               (en tablas nuevas)
✅ Promise.all()                            (para fetches paralelos)
✅ Error handling con try/catch             (en toda API)
✅ Validación de entrada                    (en endpoints)
✅ Timestamps con 'Z'                       (al parsear BD)
✅ Mapeo snake_case ↔ camelCase            (API responses)
✅ Tests o verificación manual              (antes de push)
```

### Si algo falla inexplicablemente:

```bash
rm -rf .next
npm run dev
```

---

## PASO 4 — Antes de Hacer Push (Checklist)

Antes de hacer commit y push, verificar:

```
[ ] CHANGELOG.md tiene entry con la fecha de hoy
[ ] SYSTEM_CONTEXT.md actualizado con cambios BD o APIs
[ ] .claude/SKILL.md incluye nuevos errores/patrones
[ ] Sin console.log() de debug en código
[ ] Sin alert() ni confirm() en código
[ ] Sin valores hardcodeados nuevos
[ ] Sin .not() encadenado en Supabase
[ ] Timestamps de BD con 'Z' al parsear
[ ] Test manual del flujo completo
[ ] Commit message descriptivo (feat/fix/docs)
[ ] Verificar que no rompe otras funcionalidades
[ ] Revisar diff antes de push (git diff)
```

---

## PASO 5 — Estructura de Commit y Push

### Comandos estándar:

```bash
# Ver qué cambió
git diff --name-only

# Ver diferencias en detalle
git diff

# Agregar cambios
git add .

# Commit con mensaje descriptivo
git commit -m "feat: descripción de la feature"
# o
git commit -m "fix: descripción del bug corregido"
# o
git commit -m "docs: actualizar documentación"

# Push
git push
```

### Formato de commit message:

```
feat: descripción breve (si es nueva feature)
fix: descripción breve (si es corrección de bug)
docs: qué documentación se actualizó
refactor: qué se limpió o reorganizó

Cuerpo (opcional):
- Describe el cambio más en detalle
- Explica el por qué del cambio
- Referencia a issues o bugs relacionados
```

---

## PASO 6 — Actualizar Documentación Después de Cambios

Cuando se termina una tarea importante:

### Actualizar SYSTEM_CONTEXT.md:
- Si hay tabla nueva → documenta en sección "Esquema de BD"
- Si hay API nueva → documenta en sección "Estructura de Directorios"
- Si hay módulo nuevo → agrega sección completa
- Si hay bug corregido → agrega a "Bugs Históricos Resueltos"

### Actualizar CHANGELOG.md:
Agrega al inicio un nuevo entry:

```markdown
## [2026-06-27] — Descripción de lo que se hizo

### ✅ Completado
- Feature 1 implementada
- Bug 2 corregido
- API 3 creada

### APIs Creadas
- POST /api/nuevo/endpoint

### Bugs Corregidos
- Bug 1: causa → solución aplicada

### Modificaciones
- Archivo X: cambio importante

### Pendientes
- Tarea 1 sin terminar
- Tarea 2 para próxima sesión
```

### Actualizar .claude/SKILL.md:
- Si encontraste un error nuevo → agrega a "Errores Comunes"
- Si usaste un patrón nuevo → documenta el patrón
- Si hay restricción nueva → agrega a las listas

---

## Referencia Rápida — URLs del Sistema

| URL | Descripción |
|-----|-------------|
| `/admin` | Panel de administración |
| `/admin/inventario` | Gestión de productos y categorías |
| `/admin/pos-ordenes` | Historial de órdenes POS |
| `/admin/planes` | Gestión de planes |
| `/chat/[clientId]` | Chat inteligente público |
| `/catalogo/[clientId]` | Catálogo + WhatsApp |
| `/tienda/[clientId]` | Tienda e-commerce completa |
| `/pos/[clientId]` | Punto de Venta |
| `/pos/[clientId]/login` | Login POS por PIN |
| `/pos/[clientId]/caja` | Pantalla de cobro |
| `/pos/[clientId]/area/[id]` | Kitchen Display System (KDS) |
| `/pos/[clientId]/entrega` | Gestión de entregas |
| `/orden/[orderId]` | Seguimiento público de orden |

---

## Referencia Rápida — Comandos Frecuentes

```bash
# Iniciar servidor de desarrollo
npm run dev

# Build para producción
npm run build

# Linter
npm run lint

# Fix cuando rutas API dan 404 (caché corrupto)
rm -rf .next && npm run dev

# Ver últimos commits
git log --oneline -10

# Ver archivos modificados en último commit
git diff --name-only HEAD~1

# Ver cambios en un archivo
git diff HEAD~ archivo.js

# Deshacer cambios locales (DESTRUCTIVO)
git checkout archivo.js

# Crear rama nueva
git checkout -b nombre-rama

# Cambiar de rama
git checkout nombre-rama
```

---

## Para Desarrolladores Nuevos en el Equipo

Si es tu primera vez en el proyecto:

### Setup inicial (5 minutos):

```bash
# 1. Clonar
git clone https://github.com/ososyacagt/mi-chatbot.git
cd mi-chatbot

# 2. Instalar dependencias
npm install

# 3. Variables de entorno
cp .env.example .env.local
# Editar .env.local con credenciales reales
# (disponibles en SYSTEM_CONTEXT.md o en el team)

# 4. Iniciar
npm run dev

# 5. Abrir en navegador
# http://localhost:3000
```

### Onboarding (1 hora):

1. Leer este archivo (INSTRUCCIONES_DESARROLLO.md) — 15 min
2. Leer SYSTEM_CONTEXT.md completo — 20 min
3. Leer .claude/SKILL.md completo — 15 min
4. Abrir el dev server y explorar las URLs del sistema — 10 min

### Primer cambio:

1. Escoger un bug pequeño de CHANGELOG.md "Pendientes"
2. Crear rama: `git checkout -b fix/nombre-del-bug`
3. Hacer el cambio (máximo 1-2 archivos)
4. Actualizar CHANGELOG.md
5. Push con commit descriptivo

---

## Variables de Entorno Necesarias

Todas documentadas en SYSTEM_CONTEXT.md sección "Variables de Entorno".

Resumen:
- `NEXT_PUBLIC_SUPABASE_URL` — Base de datos
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Autenticación pública
- `SUPABASE_SERVICE_ROLE_KEY` — Operaciones admin
- `NEXT_PUBLIC_VAPID_KEY` — Notificaciones push
- Múltiples IA provider keys (Anthropic, OpenAI, Gemini, etc.)
- Email key (Resend)
- URLs y configuración de marca

Ver SYSTEM_CONTEXT.md para detalles exactos.

---

## Estructura de Carpetas Clave

```
mi-chatbot/
├── app/                          # Páginas y APIs (Next.js App Router)
│   ├── admin/                    # Panel de administración
│   ├── chat/                     # Chat inteligente
│   ├── catalogo/                 # Catálogo + WhatsApp
│   ├── tienda/                   # Tienda e-commerce
│   ├── pos/                      # Punto de Venta
│   ├── api/                      # Endpoints REST
│   └── layout.js                 # Layout global
├── lib/                          # Librerías y utilidades
│   ├── auth.js                   # Autenticación
│   ├── supabase-admin.js         # Cliente admin
│   ├── constants.js              # Constantes
│   ├── business-rules.js         # Motor de reglas
│   └── ... (23 archivos)
├── public/                       # Archivos estáticos
├── .claude/SKILL.md              # Reglas de código (este proyecto)
├── SYSTEM_CONTEXT.md             # Documentación técnica
├── CHANGELOG.md                  # Historial de cambios
├── INSTRUCCIONES_DESARROLLO.md   # Este archivo
├── package.json                  # Dependencias
├── next.config.mjs               # Configuración Next.js
└── middleware.ts                 # Middleware de autenticación
```

---

## Contacto y Escalación

**Mantenedor principal:** Oscar Yache (ososyaca@gmail.com)

Si algo no está documentado o hay confusión:
1. Buscar en SYSTEM_CONTEXT.md
2. Buscar en .claude/SKILL.md
3. Buscar en CHANGELOG.md (bugs históricos)
4. Contactar al mantenedor

---

## Versión y Última Actualización

**Versión del proyecto:** 0.1.0 (alpha)  
**Stack:** Next.js 16 + React 19 + Supabase + Vercel  
**Última documentación:** Ver CHANGELOG.md  
**Última sesión:** 2026-06-26  

Última línea de este archivo: recuerda leer SYSTEM_CONTEXT.md antes de empezar.

---

*Documento agnóstico a cualquier herramienta IA o desarrollador.*
