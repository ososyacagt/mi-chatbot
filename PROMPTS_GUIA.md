# Guía de Prompts — Plataforma SaaS Chatbot

## Estructuras listas para copiar y pegar

Usa este archivo como referencia para todas las 
interacciones con el agente IA. Copia la estructura
correspondiente, rellena los campos marcados con
[CORCHETES] y pégala en el chat.

---

## 1. INICIO DE SESIÓN
*Usar siempre al abrir un chat nuevo*

```
Lee estos archivos del proyecto en este orden:

1. SYSTEM_CONTEXT.md
   - Stack: Next.js 16.2.9, React 19.2.4, Supabase, TailwindCSS 4
   - Arquitectura: client_id (TEXT), plan.slug, await params
   - 5 módulos: Chat, E-commerce (3 opciones), POS
   - 66 rutas API documentadas
   - Bugs históricos resueltos con soluciones

2. .claude/SKILL.md
   - 10 reglas antes de escribir código
   - 12 patrones obligatorios con ejemplos reales
   - 10 cosas PROHIBIDAS y 10 OBLIGATORIAS
   - 7 errores comunes y sus soluciones
   - Checklist QA de 13 puntos

3. CHANGELOG.md
   - Último entry: [2026-06-26] Optimizaciones POS y Documentación
   - Features completadas: KDS, Caja, Configuración POS
   - Bugs corregidos: Timer UTC, estados finales, JSON doble
   - APIs creadas: status, comandas, completadas
   - Pendientes: testing, performance, integraciones

Confirma que entendiste:
- Stack completo (Next.js 16, sin TypeScript, Supabase)
- Convenciones críticas (client_id TEXT, plan.slug, await params)
- Último trabajo: POS KDS, Caja, Documentación completa
- Restricciones: no alert(), no console.log, no UUIDs de plan
- Estado actual del proyecto y módulos funcionales
```

---

## 2. CORREGIR UN BUG

```
TENGO UN BUG EN EL PROYECTO:

Error exacto:
[COPIA AQUÍ EL ERROR COMPLETO DEL TERMINAL O CONSOLA]

Dónde aparece:
[BROWSER CONSOLE / TERMINAL DEL DEV SERVER / SUPABASE / OTRO]

Archivo afectado:
[RUTA COMPLETA, e.g.: app/pos/[clientId]/caja/page.js]

Síntomas específicos:
- [SÍNTOMA 1, e.g.: "Órdenes cobradas siguen en KDS"]
- [SÍNTOMA 2, e.g.: "Timer muestra valores negativos"]

Pasos para reproducir:
1. [PASO 1]
2. [PASO 2]
3. [PASO 3]

Antes de corregir:
1. Busca si está documentado en SYSTEM_CONTEXT.md sección "Bugs"
2. Si ya está resuelto, muestra la solución histórica
3. Si es bug nuevo, muestra el código actual del archivo
4. Propón solución MÍNIMA sin romper nada más
5. Actualiza CHANGELOG.md con: [FECHA] Bugs Corregidos: descripción
```

**Ejemplo real:**
```
TENGO UN BUG EN EL PROYECTO:

Error exacto:
TypeError: Cannot read property 'numero_orden' of undefined

Dónde aparece:
Browser console al cargar /pos/bava/caja

Archivo afectado:
app/pos/[clientId]/caja/page.js línea 242

Síntomas específicos:
- Las cards de órdenes no se renderizan
- Console muestra error de undefined

Pasos para reproducir:
1. Ir a http://localhost:3000/pos/bava
2. Login con PIN
3. Click en "Caja"
4. Ver órdenes pendientes
```

---

## 3. IMPLEMENTAR UNA FEATURE NUEVA

```
QUIERO IMPLEMENTAR UNA FEATURE NUEVA:

Descripción de la feature:
[QUÉ VA A HACER]
Ejemplo: "Agregar filtro de fecha en historial de órdenes POS"

Ubicación donde va:
[DÓNDE VA A VIVIR: URL, API, BD, componente]
Ejemplo: "/admin/pos-ordenes página con nuevo filtro"

Requisitos funcionales:
- [REQUISITO 1]
- [REQUISITO 2]
- [REQUISITO 3]

Requisitos técnicos:
- ¿Necesita tabla nueva en BD?
- ¿Necesita API nueva?
- ¿Necesita cambiar componentes existentes?

Restricciones y limitaciones:
- [RESTRICCIÓN 1, e.g., "Solo en plan enterprise"]
- [RESTRICCIÓN 2, e.g., "Sin modificar tabla existing"]

Antes de implementar:
1. Verifica que algo similar NO existe ya
2. Identifica TODOS los archivos a crear/modificar
3. Verifica compatibilidad con planes (basic/pro/enterprise)
4. Crea el plan PASO A PASO
5. Espera aprobación antes de escribir código
6. Sigue TODAS las reglas de .claude/SKILL.md
7. Actualiza CHANGELOG.md cuando termines
```

**Ejemplo real:**
```
QUIERO IMPLEMENTAR UNA FEATURE NUEVA:

Descripción de la feature:
"Agregar reportes de ventas por método de pago en /admin/pos-ordenes"

Ubicación donde va:
/admin/pos-ordenes → nueva sección "Reportes"

Requisitos funcionales:
- Mostrar total de ventas por método de pago (efectivo, tarjeta, etc)
- Filtro por rango de fechas
- Tabla con totales
- Exportar a CSV

Requisitos técnicos:
- Nueva API: GET /api/admin/pos-orders/report
- Modificar: app/admin/pos-ordenes/page.js
- Componente: Tabla de reportes

Restricciones:
- Solo acceso admin
- Solo para órdenes con origen='pos'
```

---

## 4. CONTINUAR TRABAJO ANTERIOR

```
CONTINUAR DESARROLLO DESDE ÚLTIMA SESIÓN:

Última sesión:
[DESCRIBE DÓNDE SE QUEDÓ O USA CHANGELOG]

Tareas completadas:
- [TAREA 1 ✅]
- [TAREA 2 ✅]

Tareas pendientes:
- [TAREA PENDIENTE 1]
- [TAREA PENDIENTE 2]

Dificultades encontradas:
[SI HUBO PROBLEMAS, DESCRIBE CUÁL FUE]

Antes de continuar:
1. Lee el último entry de CHANGELOG.md
2. Verifica qué está marcado como "Pendientes"
3. Continúa desde donde se quedó
4. Actualiza CHANGELOG.md con progreso
```

**Ejemplo real:**
```
CONTINUAR DESARROLLO DESDE ÚLTIMA SESIÓN:

Última sesión:
2026-06-26 - Documentación completa del sistema

Tareas completadas:
- SYSTEM_CONTEXT.md (632 líneas) ✅
- .claude/SKILL.md (740 líneas) ✅
- CHANGELOG.md (513 líneas) ✅
- INSTRUCCIONES_DESARROLLO.md (500 líneas) ✅

Tareas pendientes:
- Testing de POS (KDS, Caja, Entregas)
- Performance optimization
- Pago online integrado (Stripe)

Dificultades encontradas:
Ninguna en la sesión anterior
```

---

## 5. REVISAR O REFACTORIZAR CÓDIGO

```
REVISAR CÓDIGO EN BÚSQUEDA DE PROBLEMAS:

Archivo/Módulo a revisar:
[RUTA O NOMBRE DEL MÓDULO]
Ejemplo: app/pos/[clientId]/caja/page.js

Objetivo de la revisión:
- [ ] Buscar violaciones de .claude/SKILL.md
- [ ] Optimizar performance
- [ ] Mejorar legibilidad
- [ ] Encontrar memory leaks
- [ ] Otro: [ESPECIFICA]

Enfoque específico:
[SI HAY ÁREA ESPECÍFICA A REVISAR, DESCRIBE]

Líneas aproximadas (si aplica):
[LÍNEAS ESPECÍFICAS, e.g., "100-150"]

Luego de revisar:
1. Lista TODOS los problemas encontrados
2. Ordena por prioridad/impacto (CRÍTICO > IMPORTANTE > MENOR)
3. Propone cambios UNO POR UNO
4. Espera aprobación antes de cada cambio
5. Ejecuta los cambios aprobados
6. Actualiza CHANGELOG.md
```

**Ejemplo real:**
```
REVISAR CÓDIGO EN BÚSQUEDA DE PROBLEMAS:

Archivo/Módulo a revisar:
app/api/pos/[clientId]/orders/[orderId]/status/route.js

Objetivo de la revisión:
- Buscar violaciones de .claude/SKILL.md
- Verificar manejo de errores
- Validar lógica de status transitions

Enfoque específico:
Asegurar que los status transitions de POS son correctos
(enviada → en_preparacion → lista → facturado_finalizado)

Líneas aproximadas:
Archivo completo (68 líneas)
```

---

## 6. DEPURACIÓN DE PROBLEMA INEXPLICABLE

```
TENGO UN ERROR INEXPLICABLE:

El problema:
[DESCRIBE EXACTAMENTE QUÉ ESTÁ PASANDO]

Lo que intenté:
- [INTENTO 1]
- [INTENTO 2]
- [INTENTO 3]

Síntomas extraños:
[QUÉ HACE QUE SEA EXTRAÑO]

Archivos afectados:
[LISTA DE ARCHIVOS]

Logs o errores (si los hay):
[COPIA AQUÍ CUALQUIER LOG/ERROR]

Antes de hacer nada:
1. Ejecuta: rm -rf .next && npm run dev
2. Recarga el browser (Ctrl+Shift+R para caché limpio)
3. Si persiste, copia-pega este prompt
4. Describe el problema exacto después del reinicio
```

**Ejemplo real:**
```
TENGO UN ERROR INEXPLICABLE:

El problema:
Las rutas /api/admin/* dan 404 aunque existen los archivos

Lo que intenté:
- Verificar que los archivos existen (existen)
- Revisar npm run build (sin errores)
- Revisar middleware (parece OK)

Síntomas extraños:
- /api/admin/me retorna HTML 404 en lugar de JSON
- npm run build compila exitosamente
- Los archivos route.js están ahí

Archivos afectados:
- app/api/admin/me/route.js
- app/api/admin/tenants/route.js
- middleware.ts

Solución:
rm -rf .next && npm run dev
```

---

## 7. ACTUALIZAR DOCUMENTACIÓN DESPUÉS DE CAMBIOS

```
ACTUALIZAR DOCUMENTACIÓN DESPUÉS DE CAMBIOS:

Tipo de cambio:
- [ ] Nueva tabla en BD
- [ ] Nueva API endpoint
- [ ] Nuevo módulo/feature
- [ ] Bug corregido
- [ ] Cambio importante en código

Archivos a actualizar:

1. SYSTEM_CONTEXT.md:
   - Sección: [SECCIÓN A ACTUALIZAR]
   - Cambio: [QUÉ VA A CAMBIAR]

2. .claude/SKILL.md:
   - Error nuevo encontrado: [DESCRIBE]
   - Patrón nuevo usado: [DESCRIBE]

3. CHANGELOG.md:
   Nuevo entry:
   ```markdown
   ## [FECHA] — [DESCRIPCIÓN DE LO HECHO]
   
   ### ✅ Completado
   - Feature/Bug: descripción
   
   ### APIs Creadas
   - POST/GET/PUT /api/ruta
   
   ### Cambios BD
   - Nueva tabla o campos
   ```
```

**Ejemplo real:**
```
ACTUALIZAR DOCUMENTACIÓN DESPUÉS DE CAMBIOS:

Tipo de cambio:
- [x] Nueva API endpoint
- [x] Bug corregido
- [x] Cambio importante en código

Archivos a actualizar:

1. SYSTEM_CONTEXT.md:
   - Sección: "Módulos del Sistema - 5.5 POS"
   - Cambio: Agregar regla crítica de modalidad restaurante

2. .claude/SKILL.md:
   - Error encontrado: "facturado_pendiente_entrega no está en filtro"
   - Patrón nuevo: Validar posModalidad antes de determinar nextStatus

3. CHANGELOG.md:
   Nuevo entry:
   ## [2026-06-26] — Optimizaciones POS
   
   ### ✅ Completado
   - Lógica de status por modalidad
   
   ### APIs Modificadas
   - PUT /api/pos/[clientId]/orders/[orderId]/status
```

---

## 8. CREAR COMMIT CON CAMBIOS

```
COMMIT Y PUSH DE CAMBIOS:

Tipo de cambio:
- [ ] feat: Feature nueva
- [ ] fix: Bug corregido
- [ ] docs: Solo documentación
- [ ] refactor: Limpieza de código

Descripción breve:
[UNA LÍNEA DESCRIBIENDO EL CAMBIO]

Archivos modificados:
- [ARCHIVO 1]
- [ARCHIVO 2]

Por qué este cambio:
[RAZÓN O BENEFICIO DEL CAMBIO]

Checklist antes de push:
- [ ] CHANGELOG.md actualizado
- [ ] SYSTEM_CONTEXT.md si hay cambios importantes
- [ ] .claude/SKILL.md si hay nuevos aprendizajes
- [ ] Sin console.log de debug
- [ ] Sin alert() ni confirm()
- [ ] Sin valores hardcodeados
- [ ] Probado el flujo completo
- [ ] git diff revisado antes de push
```

**Ejemplo real:**
```
COMMIT Y PUSH DE CAMBIOS:

Tipo de cambio:
- [x] fix: Bug corregido
- [x] docs: Actualizar documentación

Descripción breve:
"Fix: Lógica de status de cobro para modalidades y filtro de completadas"

Archivos modificados:
- app/pos/[clientId]/caja/page.js
- app/api/pos/[clientId]/comandas/route.js
- app/api/pos/[clientId]/comandas/completed/route.js
- CHANGELOG.md

Por qué este cambio:
Restaurante SIEMPRE debe finalizar directo al cobrar,
no usar flujo area_entrega. Ordenesfinalizadas deben
estar en modal completadas.
```

---

## 9. PLANTILLA GENÉRICA PARA CUALQUIER TAREA

```
TAREA GENERAL:

Qué necesito:
[DESCRIBE EXACTAMENTE QUÉ NECESITAS]

Por qué lo necesito:
[CONTEXTO: CUÁL ES EL OBJETIVO FINAL]

Restricciones:
- [RESTRICCIÓN 1]
- [RESTRICCIÓN 2]

Ejemplos de lo que espero:
[DESCRIBE CON EJEMPLOS]

Archivos involucrados:
[LISTA DE ARCHIVOS QUE SE VERÁN AFECTADOS]

Antes de continuar:
1. Confirma que entendiste la tarea
2. Lista el plan paso a paso
3. Espera aprobación
4. Implementa
5. Actualiza documentación
```

---

## 10. SOLICITAR REVISIÓN DE CÓDIGO

```
REVISAR MI CÓDIGO:

El código:
[PEGA AQUÍ EL CÓDIGO A REVISAR]

Contexto:
[QUÉ HACE ESTE CÓDIGO]

Dónde va:
[ARCHIVO Y LÍNEA APROXIMADA]

Mis dudas:
- [DUDA 1]
- [DUDA 2]

Después de revisar:
1. Señala problemas contra .claude/SKILL.md
2. Sugiere mejoras
3. Propone código alternativo si hay
4. Explica el por qué de cada sugerencia
```

**Ejemplo real:**
```
REVISAR MI CÓDIGO:

El código:
const parseDate = (dateStr) => {
  if (!dateStr) return new Date()
  if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
    return new Date(dateStr + 'Z')
  }
  return new Date(dateStr)
}

Contexto:
Esta función parsea timestamps de Supabase que vienen sin 'Z'

Dónde va:
app/pos/[clientId]/area/[areaId]/page.js

Mis dudas:
- ¿El logic de condición es correcto?
- ¿Hay edge cases que no cubro?
```

---

## Referencia Rápida — Stack Real del Proyecto

```
Frontend:
- Next.js 16.2.9 (App Router, sin TypeScript)
- React 19.2.4
- TailwindCSS 4

Backend:
- Next.js API Routes
- Supabase (PostgreSQL) con RLS
- Autenticación: Supabase Auth (admin) + PIN (POS)

IA:
- Anthropic SDK 0.104.2 (principal)
- OpenAI, Gemini, Groq, Mistral (fallback)

Otros:
- Email: Resend 6.14.0
- Push: web-push 3.6.7
- Documentos: PDF, Word, Excel, CSV
- Deploy: Vercel
```

---

## Referencia Rápida — Convenciones Críticas

```
Identificadores:
- client_id: TEXT (nunca UUID)
- plan: slug TEXT ('basic', 'pro', 'enterprise')
- Campos en BD: snake_case
- Campos en JS: camelCase

Route Handlers:
- SIEMPRE: const { param } = await params

Timestamps:
- SIEMPRE: agregar 'Z' al parsear de Supabase
- Ejemplo: new Date(timestamp + 'Z')

Supabase:
- Admin: createSupabaseAdmin()
- NUNCA: .not() encadenado, filtrar en JS

UI:
- NUNCA: alert(), confirm() → usar ConfirmModal
- NUNCA: console.log debug → solo console.error
- NUNCA: valores hardcodeados → constants o env
```

---

*Última actualización: 2026-06-26*
*Todos los ejemplos son reales del proyecto actual*
