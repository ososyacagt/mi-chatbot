"use client"

export async function registerPushNotifications(email) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[push-client] Push notifications no soportadas')
    return false
  }

  try {
    console.log('[push-client] Registrando notificaciones push para:', email)

    // Registrar service worker
    const reg = await navigator.serviceWorker.register('/sw.js')
    console.log('[push-client] Service worker registrado')

    // Esperar a que esté listo
    await navigator.serviceWorker.ready

    // Pedir permiso
    const permission = await Notification.requestPermission()
    console.log('[push-client] Permiso:', permission)

    if (permission !== 'granted') {
      console.log('[push-client] Permiso denegado')
      return false
    }

    // Obtener public key
    const vapidRes = await fetch('/api/push/vapid')
    if (!vapidRes.ok) throw new Error('Error obteniendo VAPID key')

    const { publicKey } = await vapidRes.json()
    console.log('[push-client] VAPID key obtenida')

    // Subscribe
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    })

    console.log('[push-client] Suscripción creada:', subscription.endpoint.substring(0, 50) + '...')

    // Guardar suscripción en servidor
    const subRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        subscription: JSON.stringify(subscription)
      })
    })

    if (!subRes.ok) throw new Error('Error guardando suscripción')

    console.log('[push-client] ✓ Push notifications registradas')
    return true
  } catch (err) {
    console.error('[push-client] Error registrando:', err.message)
    return false
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
