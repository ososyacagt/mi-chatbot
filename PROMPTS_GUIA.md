# Guía de Prompts
## Plataforma SaaS Chatbot Multi-tenant

Cómo usar este archivo:
1. Busca la sección que necesitas
2. Copia el bloque marcado como ═══ COPIAR ═══
3. Pégalo en el chat con la IA
4. Rellena los espacios entre [corchetes]
5. Envía

---

## SECCIÓN 1 — INICIAR UNA SESIÓN NUEVA
Úsalo cada vez que abras un chat nuevo con la IA.

DÓNDE: Al inicio de cualquier conversación nueva.

═══ COPIAR ═══
Lee estos archivos del proyecto en orden:
1. cat SYSTEM_CONTEXT.md
2. cat .claude/SKILL.md
3. cat CHANGELOG.md

Cuando termines confirma:
- Stack tecnológico del proyecto
- Reglas críticas que no se pueden violar
- Módulos implementados y su estado
- Último trabajo realizado y pendientes

No escribas código hasta confirmar todo esto.
═══════════════

---

## SECCIÓN 2 — CORREGIR UN BUG
Úsalo cuando algo no funciona.

DÓNDE: En el chat después de haber iniciado sesión.

ANTES DE COPIAR necesitas tener:
- El error completo del terminal del servidor
- El error completo de la consola del browser
- El nombre del archivo donde ocurre

═══ COPIAR ═══
Tengo un bug. Antes de proponer solución:
1. Verifica si este error ya está en 
   SYSTEM_CONTEXT.md sección Bugs Históricos
2. Muéstrame el código actual del archivo afectado
3. Propón solo el cambio mínimo necesario
4. No modifiques archivos que no sean necesarios

ERROR EN TERMINAL:
[pega aquí el error del servidor]

ERROR EN BROWSER:
[pega aquí el error de la consola]

ARCHIVO AFECTADO:
[nombre del archivo]

QUÉ ESTABA HACIENDO:
[describe qué acción causó el error]
═══════════════

EJEMPLO DE CÓMO SE VE RELLENO:
---
Tengo un bug. Antes de proponer solución:
1. Verifica si este error ya está en 
   SYSTEM_CONTEXT.md sección Bugs Históricos
2. Muéstrame el código actual del archivo afectado
3. Propón solo el cambio mínimo necesario
4. No modifiques archivos que no sean necesarios

ERROR EN TERMINAL:
Could not find the 'cliente_nombre_pos' column
of 'orders' in the schema cache
POST /api/pos/bava 500 in 235ms

ERROR EN BROWSER:
POST http://localhost:3000/api/pos/bava 500

ARCHIVO AFECTADO:
app/api/pos/[clientId]/route.js

QUÉ ESTABA HACIENDO:
Intentando crear una orden desde el POS,
después de agregar el módulo de punto de venta
---

---

## SECCIÓN 3 — IMPLEMENTAR FEATURE NUEVA
Úsalo cuando quieres agregar algo nuevo al sistema.

DÓNDE: En el chat después de haber iniciado sesión.

ANTES DE COPIAR necesitas saber:
- Qué quieres implementar
- Quién lo va a usar
- En qué parte del sistema vivirá

═══ COPIAR ═══
Quiero implementar una feature nueva.
Antes de escribir código:
1. Verifica en SYSTEM_CONTEXT.md que no existe 
   algo similar ya implementado
2. Verifica si afecta los planes basic/pro/enterprise
3. Preséntame el plan completo:
   - Archivos que vas a crear
   - Archivos que vas a modificar
   - SQL necesario (si aplica)
   - Impacto en lo que ya existe
4. Espera mi aprobación antes de implementar
5. Aplica los cambios uno por uno

FEATURE:
[describe qué quieres implementar]

PARA QUIÉN:
[admin / cajero / mesero / cliente / cocina]

DÓNDE VIVIRÁ:
[panel admin / POS / tienda / catálogo / API]

CONTEXTO ADICIONAL:
[detalles del negocio que la IA deba conocer]
═══════════════

EJEMPLO DE CÓMO SE VE RELLENO:
---
Quiero implementar una feature nueva.
Antes de escribir código:
1. Verifica en SYSTEM_CONTEXT.md que no existe 
   algo similar ya implementado
2. Verifica si afecta los planes basic/pro/enterprise
3. Preséntame el plan completo con archivos y SQL
4. Espera mi aprobación antes de implementar
5. Aplica los cambios uno por uno

FEATURE:
Descuento manual que el cajero pueda aplicar 
a una orden antes de cobrar, puede ser 
porcentaje o monto fijo

PARA QUIÉN:
cajero y supervisor del POS

DÓNDE VIVIRÁ:
pantalla de caja /pos/[clientId]/caja

CONTEXTO ADICIONAL:
Solo cajero y supervisor pueden aplicarlo.
Debe quedar registrado en el historial de la orden.

si tienes alguna duda haz las consultas que consideres y sigue las reglas definidas del proyecto
---

---

## SECCIÓN 4 — CONTINUAR TRABAJO ANTERIOR
Úsalo cuando retomas trabajo de una sesión pasada.

DÓNDE: Al inicio del chat después del prompt de inicio.

═══ COPIAR ═══
Continúa el trabajo de la sesión anterior.
1. Lee el último entry de CHANGELOG.md
2. Dime qué se completó
3. Dime qué quedó pendiente
4. Propón por dónde continuar
5. Espera mi confirmación antes de proceder
═══════════════

---

## SECCIÓN 5 — REVISAR CÓDIGO EXISTENTE
Úsalo cuando quieres mejorar código sin agregar features.

DÓNDE: En el chat después de haber iniciado sesión.

ANTES DE COPIAR necesitas saber:
- Qué archivo o módulo quieres revisar

═══ COPIAR ═══
Revisa este archivo y:
1. Lee .claude/SKILL.md antes de revisar
2. Lista todos los problemas encontrados con nivel:
   CRITICO / MEDIO / BAJO
3. Ordénalos de mayor a menor prioridad
4. Propón los cambios antes de aplicar
5. Aplica uno por uno con mi aprobación
6. No cambies lógica de negocio sin confirmarme

ARCHIVO A REVISAR:
[nombre del archivo]

QUÉ BUSCAR:
[ ] console.log de debug
[ ] alert() o confirm() nativos
[ ] Valores hardcodeados
[ ] Timestamps sin la Z de UTC
[ ] Fetches innecesarios o lentos
[ ] Todo lo anterior
═══════════════

---

## SECCIÓN 6 — CAMBIO EN BASE DE DATOS
Úsalo cuando necesitas agregar tablas o columnas.

DÓNDE: En el chat después de haber iniciado sesión.

IMPORTANTE: La IA te muestra el SQL, 
TÚ lo ejecutas en Supabase → SQL Editor.
La IA no ejecuta SQL directamente.

═══ COPIAR ═══
Necesito un cambio en la base de datos.
1. Muéstrame el SQL completo antes de ejecutar
2. Usa IF NOT EXISTS para columnas y tablas nuevas
3. Incluye política RLS si es tabla nueva
4. Dime si hay datos existentes que migrar
5. Yo ejecuto el SQL en Supabase y te confirmo
6. Solo después de mi confirmación actualiza el código

CAMBIO NECESARIO:
[describe qué necesitas agregar o modificar]

TABLA AFECTADA:
[nombre de la tabla existente o "tabla nueva"]

POR QUÉ SE NECESITA:
[explica para qué sirve el cambio]
═══════════════

EJEMPLO DE CÓMO SE VE RELLENO:
---
Necesito un cambio en la base de datos.
1. Muéstrame el SQL completo antes de ejecutar
2. Usa IF NOT EXISTS
3. Incluye RLS si es tabla nueva
4. Yo ejecuto el SQL en Supabase y te confirmo
5. Solo después actualiza el código

CAMBIO NECESARIO:
Agregar columna updated_at con trigger de 
auto-actualización

TABLA AFECTADA:
orders

POR QUÉ SE NECESITA:
El KDS necesita ordenar por fecha de última 
actualización y la columna no existe
---

---

## SECCIÓN 7 — CONSULTA TÉCNICA
Úsalo cuando tienes una duda sin querer cambiar código.

DÓNDE: En el chat en cualquier momento de la sesión.

═══ COPIAR ═══
Tengo una consulta sobre el proyecto.
Responde basándote en SYSTEM_CONTEXT.md y el 
código actual. Si no estás seguro dilo claramente,
no inventes.

PREGUNTA:
[tu pregunta]

POR QUÉ LO NECESITO SABER:
[contexto de para qué usarás la respuesta]
═══════════════

---

## SECCIÓN 8 — CERRAR SESIÓN Y HACER PUSH
Úsalo siempre antes de terminar y hacer push.

DÓNDE: Al final de cada sesión de trabajo.

PASO 1 — Pega esto en el chat para que la IA 
actualice la documentación:

═══ COPIAR ═══
Antes de terminar actualiza estos archivos 
con todo lo que trabajamos hoy:

1. CHANGELOG.md — agrega al inicio:
## [fecha de hoy]
### Agregado
- (lo nuevo que se implementó)
### Corregido
- (bugs: síntoma, causa y solución)
### Modificado
- (cambios en código o BD existente)
### Pendientes
- (lo que quedó sin terminar)

2. SYSTEM_CONTEXT.md — actualiza si hubo:
- APIs nuevas
- Tablas o columnas nuevas en BD
- Módulos o pantallas nuevas
- Bugs nuevos resueltos

3. .claude/SKILL.md — agrega si aplica:
- Errores nuevos y su solución exacta
- Patrones nuevos usados
- Restricciones nuevas descubiertas

Cuando termines dame el comando git 
para hacer el push.
═══════════════

PASO 2 — La IA te dará un comando así, 
ejecútalo en tu terminal:

git add .
git commit -m "descripción del trabajo realizado"
git push

---

## SECCIÓN 9 — VERIFICAR ANTES DEL PUSH
Úsalo justo antes de ejecutar el comando git push.

DÓNDE: En el chat antes del paso 2 de la sección 8.

═══ COPIAR ═══
Antes del push verifica que todo esté correcto:

DOCUMENTACIÓN:
[ ] CHANGELOG.md tiene entry con fecha de hoy
[ ] SYSTEM_CONTEXT.md está actualizado
[ ] .claude/SKILL.md tiene nuevos aprendizajes

CÓDIGO en archivos modificados:
[ ] Sin console.log de debug
[ ] Sin alert() ni confirm()
[ ] Sin valores hardcodeados
[ ] Sin UUID de plan (usar slug)
[ ] Timestamps con Z donde aplica

FUNCIONALIDAD:
[ ] Se probó el flujo completo
[ ] No se rompió funcionalidad existente
[ ] SQL nuevo ya ejecutado en Supabase

Dime qué encontraste en cada punto.
═══════════════

---

## SECCIÓN 10 — RECUPERAR CONTEXTO PERDIDO
Úsalo si la IA empieza a cometer errores básicos.

SEÑALES de que la IA perdió el contexto:
- Propone usar alert() o confirm()
- Usa UUID en lugar de slug para planes
- No muestra código antes de modificar
- Sugiere algo ya documentado como bug resuelto
- Modifica muchos archivos a la vez sin pedir permiso

DÓNDE: En cualquier momento del chat.

═══ COPIAR ═══
Para. Estás cometiendo errores del proyecto.
Lee nuevamente:
1. cat SYSTEM_CONTEXT.md
2. cat .claude/SKILL.md

Errores que estás cometiendo:
[describe qué está haciendo mal]

Cuando termines de leer retoma desde:
[describe el último punto correcto]
═══════════════

---

## RESUMEN RÁPIDO

| Situación | Sección |
|-----------|---------|
| Abrir chat nuevo | Sección 1 |
| Algo no funciona | Sección 2 |
| Agregar algo nuevo | Sección 3 |
| Retomar trabajo | Sección 4 |
| Mejorar código | Sección 5 |
| Modificar BD | Sección 6 |
| Tengo una duda | Sección 7 |
| Terminar sesión | Sección 8 |
| Antes del push | Sección 9 |
| IA con errores | Sección 10 |

---

Última actualización: 2026-06-26
