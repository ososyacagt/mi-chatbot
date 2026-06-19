# Sistema de Notificaciones Push y Respuesta en Tiempo Real

## Resumen
Implementa notificaciones push del navegador y un sistema de respuesta de admin en tiempo real para escalaciones.

## Pasos de Configuración

### 1. Instalar dependencias de web-push

```bash
npm install web-push
```

### 2. Generar claves VAPID

```bash
# Generar claves (ejecutar en terminal)
npx web-push generate-vapid-keys
```

Esto retornará algo como:
```
Public Key: BJr1...
Private Key: 2N...
```

### 3. Configurar variables de entorno

Agregar a `.env.local`:
```env
NEXT_PUBLIC_VAPID_KEY=BJr1...
VAPID_PRIVATE_KEY=2N...
```

Agregar a Vercel (Settings → Environment Variables):
```
NEXT_PUBLIC_VAPID_KEY=BJr1...
VAPID_PRIVATE_KEY=2N...
```

### 4. Crear tabla en Supabase

Ejecutar en Supabase SQL Editor:

```sql
CREATE TABLE push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  subscription TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_push_subscriptions_email ON push_subscriptions(email);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver sus propias suscripciones"
  ON push_subscriptions
  FOR SELECT
  USING (email = auth.jwt() ->> 'email');
```

### 5. Agregar columnas a conversaciones (si no existen)

```sql
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS is_admin_response BOOLEAN DEFAULT false;
```

## Archivos Creados

- `public/sw.js` - Service Worker para notificaciones push
- `public/icon.svg` - Ícono de notificaciones
- `lib/push-notifications.js` - Servidor: enviar notificaciones
- `lib/push-client.js` - Cliente: registrar suscripciones
- `app/api/push/subscribe/route.js` - Guardar suscripciones
- `app/api/push/vapid/route.js` - VAPID public key
- `app/api/chat/admin-responses/route.js` - Obtener respuestas de admin

## Flujo de Funcionamiento

### Registrar Notificaciones (cuando admin inicia sesión)

```javascript
// En app/admin/layout.js
import { registerPushNotifications } from '@/lib/push-client'

useEffect(() => {
  if (!userEmail) return
  
  const registered = sessionStorage.getItem('push-registered')
  if (!registered) {
    registerPushNotifications(userEmail)
    sessionStorage.setItem('push-registered', 'true')
  }
}, [userEmail])
```

### Enviar Notificación (cuando se crea escalación)

```javascript
// En app/api/admin/escalations/route.js al crear respuesta
import { sendPushNotification } from '@/lib/push-notifications'

await sendPushNotification({
  adminEmail: admin.email,
  title: 'Nueva escalación',
  body: `De: ${tenant.nombre}`,
  url: '/admin/escalaciones'
})
```

### Recibir Respuestas en Tiempo Real (en chat)

```javascript
// En app/chat/[clientId]/page.js
useEffect(() => {
  if (!sessionId) return
  
  const interval = setInterval(async () => {
    const res = await fetch(
      `/api/chat/admin-responses?sessionId=${sessionId}&clientId=${clientId}&lastTimestamp=${lastTimestamp}`
    )
    const data = await res.json()
    if (data.newMessages?.length) {
      setMessages(prev => [...prev, ...data.newMessages])
    }
  }, 5000)
  
  return () => clearInterval(interval)
}, [sessionId, clientId])
```

## Verificación

1. Ir a `/admin` y permitir notificaciones cuando el navegador lo pida
2. Crear una escalación desde `/chat`
3. Responder desde `/admin/escalaciones`
4. Ver la respuesta en tiempo real en el chat

## Solución de Problemas

### "VAPID key no configurada"
- Ejecutar `npx web-push generate-vapid-keys`
- Agregar `NEXT_PUBLIC_VAPID_KEY` y `VAPID_PRIVATE_KEY` a `.env.local` y Vercel

### "Service Worker no se registra"
- Verificar que `public/sw.js` existe
- Abrir DevTools → Application → Service Workers
- Revisar consola para errores

### "No recibe notificaciones"
- Verificar que el permiso está otorgado en el navegador
- Revisar `push_subscriptions` en Supabase
- Verificar VAPID keys son las correctas

### "Respuestas no aparecen en tiempo real"
- Verificar que `is_admin_response = true` en BD
- Revisar intervalo de polling (5 segundos)
- Verificar logs en consola del navegador
