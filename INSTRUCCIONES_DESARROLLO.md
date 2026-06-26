# Guía de Desarrollo — Plataforma SaaS Chatbot

Este archivo contiene todo lo necesario para continuar
el desarrollo del proyecto usando Claude como asistente.
Léelo completo antes de iniciar cualquier sesión.

---

## ¿Qué archivos existen y para qué sirven?

| Archivo | Propósito |
|---------|-----------|
| INSTRUCCIONES_DESARROLLO.md | Este archivo. Léelo primero siempre |
| SYSTEM_CONTEXT.md | Arquitectura completa, tablas, APIs, módulos |
| CHANGELOG.md | Historial de todo lo construido y corregido |
| .claude/SKILL.md | Reglas y patrones de código del proyecto |

---

## PASO 1 — Cómo iniciar una nueva sesión con Claude

Al abrir un chat nuevo con Claude, copia y pega 
este prompt exactamente:

═══════════════════════════════════════════════════
Eres mi asistente de desarrollo para una plataforma 
SaaS de chatbot multi-tenant construida en 
Next.js 16 + Supabase + Vercel.

Lee estos archivos del proyecto en orden antes de 
responder cualquier cosa:

1. cat SYSTEM_CONTEXT.md
2. cat .claude/SKILL.md
3. cat CHANGELOG.md

Cuando termines de leer, confirma que entendiste:
- El stack tecnológico y arquitectura del proyecto
- Las convenciones y reglas críticas de código
- Los módulos que ya están implementados
- El último trabajo realizado (último entry de CHANGELOG)
- Los bugs históricos y sus soluciones

No escribas código ni hagas sugerencias hasta que 
hayas confirmado todo lo anterior.
═══════════════════════════════════════════════════

---

## PASO 2 — Cómo pedir trabajo según el tipo de tarea

### Para CORREGIR un BUG:
═══════════════════════════════════════════════════
Tengo un bug. Antes de proponer solución:
1. Revisa si este error ya está documentado en 
   SYSTEM_CONTEXT.md sección "Bugs Históricos"
2. Muéstrame el código actual del archivo afectado
3. Propón la solución mínima necesaria sin romper 
   nada más

El error es:
[PEGA AQUÍ EL ERROR COMPLETO DEL TERMINAL]

El error aparece en:
[PEGA AQUÍ EL ERROR DEL BROWSER/CONSOLA]

El archivo afectado es:
[NOMBRE DEL ARCHIVO]
═══════════════════════════════════════════════════

### Para IMPLEMENTAR una FEATURE NUEVA:
═══════════════════════════════════════════════════
Quiero implementar: [DESCRIBE LA FEATURE]

Antes de escribir código:
1. Verifica que no existe algo similar ya en el sistema
2. Confirma si necesita cambios en la BD (SQL)
3. Lista los archivos que vas a crear o modificar
4. Confirma compatibilidad con los planes 
   (basic/pro/enterprise)
5. Muéstrame el plan paso a paso

Solo implementa cuando yo apruebe el plan.
Sigue todas las reglas de .claude/SKILL.md.
═══════════════════════════════════════════════════

### Para CONTINUAR trabajo de una sesión anterior:
═══════════════════════════════════════════════════
Continúa donde quedamos en la última sesión.
Lee el último entry de CHANGELOG.md para ver 
qué se hizo y cuáles eran los pendientes.
═══════════════════════════════════════════════════

### Para REVISAR o OPTIMIZAR código existente:
═══════════════════════════════════════════════════
Revisa [ARCHIVO O MÓDULO] y:
1. Identifica problemas según las reglas de 
   .claude/SKILL.md
2. Lista todos los cambios propuestos antes de aplicar
3. Ordénalos por prioridad/impacto
4. Aplica uno por uno con mi aprobación
═══════════════════════════════════════════════════

---

## PASO 3 — Reglas que Claude debe seguir siempre

Recuérdale a Claude estas reglas si las olvida:

### Antes de modificar cualquier archivo:
- Mostrar el código actual primero
- Proponer el cambio mínimo necesario
- No tocar archivos que no sean necesarios

### Código prohibido en este proyecto:
- ❌ window.confirm() o alert() → usar ConfirmModal
- ❌ console.log() de debug → solo console.error
- ❌ Valores hardcodeados (emails, URLs, colores)
- ❌ UUID de plan como referencia → usar slug
- ❌ .not() encadenado en Supabase → filtrar en JS
- ❌ new Date(timestamp) sin 'Z' → agregar siempre

### Código obligatorio en este proyecto:
- ✅ const { param } = await params en route handlers
- ✅ createSupabaseAdmin() para queries de admin
- ✅ Array.isArray() al cargar campos jsonb
- ✅ RLS policy en tablas nuevas de Supabase
- ✅ Promise.all() para fetches paralelos

### Si algo da error inexplicable:
```bash
rm -rf .next && npm run dev
```

---

## PASO 4 — Cómo cerrar una sesión correctamente

Antes de cerrar el chat, pega este prompt:

═══════════════════════════════════════════════════
Antes de terminar, actualiza la documentación 
con todo lo que trabajamos en esta sesión:

1. SYSTEM_CONTEXT.md:
   - Agrega cualquier módulo, API o tabla nueva
   - Actualiza secciones que hayan cambiado
   - Agrega bugs nuevos a la sección de históricos

2. CHANGELOG.md, agrega al inicio:
   ## [FECHA DE HOY]
   ### Agregado
   - (lo nuevo que se implementó)
   ### Corregido
   - (bugs resueltos con su causa y solución)
   ### Modificado
   - (cambios importantes en código existente)
   ### Pendientes
   - (lo que quedó sin terminar)

3. .claude/SKILL.md:
   - Agrega errores nuevos encontrados y soluciones
   - Agrega patrones nuevos que se usaron

Cuando termines ejecuta:
git add .
git commit -m "docs: actualizar documentación [FECHA]"
git push
═══════════════════════════════════════════════════

---

## PASO 5 — Actualización automática al hacer git push

Cada vez que hagas push, los archivos de 
documentación deben estar actualizados.

### Checklist antes de cada push:
- [ ] CHANGELOG.md tiene entry con la fecha de hoy
- [ ] SYSTEM_CONTEXT.md refleja el estado actual
- [ ] .claude/SKILL.md tiene nuevos aprendizajes
- [ ] No hay console.log de debug en el código
- [ ] No hay alert() ni confirm() en el código
- [ ] No hay valores hardcodeados nuevos
- [ ] Se probó el flujo completo de lo que se cambió

### Comandos para el push:
```bash
# 1. Verificar qué cambió
git diff --name-only

# 2. Agregar todo
git add .

# 3. Commit descriptivo
git commit -m "feat: descripción de lo nuevo"
# o
git commit -m "fix: descripción del bug corregido"
# o  
git commit -m "docs: actualizar documentación"

# 4. Push
git push
```

---

## Referencia rápida — URLs del sistema

| URL | Descripción |
|-----|-------------|
| /admin | Panel de administración |
| /admin/inventario?clientId=X | Inventario del cliente |
| /admin/ordenes | Órdenes e-commerce |
| /admin/pos-ordenes | Órdenes POS |
| /admin/planes | Gestión de planes |
| /chat/[clientId] | Chat público |
| /catalogo/[clientId] | Catálogo + WhatsApp |
| /tienda/[clientId] | Tienda completa |
| /pos/[clientId] | Punto de Venta |
| /pos/[clientId]/login | Login POS por PIN |
| /pos/[clientId]/caja | Pantalla cajero |
| /pos/[clientId]/area/[id] | KDS / Cocina |
| /pos/[clientId]/entrega | Pantalla entrega |
| /orden/[orderId] | Seguimiento público |
| /precios | Página de precios |

---

## Referencia rápida — Comandos frecuentes

```bash
# Iniciar desarrollo
npm run dev

# Fix cuando rutas API dan 404
rm -rf .next && npm run dev

# Ver últimos cambios
git log --oneline -10

# Ver archivos modificados en último commit
git diff --name-only HEAD~1

# Push completo con docs actualizadas
git add . && git commit -m "descripción" && git push
```

---

## Para desarrolladores nuevos en el equipo

Si es tu primera vez en el proyecto:

1. Clona el repositorio
2. Copia .env.example a .env.local y llena las variables
3. Ejecuta npm install
4. Lee SYSTEM_CONTEXT.md completo
5. Lee .claude/SKILL.md completo
6. Ejecuta npm run dev
7. Inicia una sesión con Claude usando el 
   prompt del PASO 1 de esta guía

Las variables de entorno necesarias están 
documentadas en SYSTEM_CONTEXT.md sección 
"Variables de Entorno".

---

*Última actualización: ver CHANGELOG.md*
