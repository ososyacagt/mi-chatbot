import { createSupabaseAdmin } from './supabase-admin'
import webpush from 'web-push'

// Configurar VAPID details
webpush.setVapidDetails(
  'mailto:' + (process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contacto@ejemplo.com'),
  process.env.NEXT_PUBLIC_VAPID_KEY,
  process.env.VAPID_PRIVATE_KEY
)

console.log('[push] VAPID configurado:', {
  public: process.env.NEXT_PUBLIC_VAPID_KEY?.substring(0, 10) + '...',
  private: !!process.env.VAPID_PRIVATE_KEY,
  subject: 'mailto:' + (process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contacto@ejemplo.com')
})

export async function sendPushNotification({ adminEmail, title, body, url }) {
  console.log('[push] Iniciando envío a:', adminEmail)
  console.log('[push] VAPID PUBLIC KEY:', !!process.env.NEXT_PUBLIC_VAPID_KEY)
  console.log('[push] VAPID PRIVATE KEY:', !!process.env.VAPID_PRIVATE_KEY)

  const supabase = createSupabaseAdmin()
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('email', adminEmail)

  console.log('[push] Suscripciones encontradas:', subscriptions?.length)
  console.log('[push] Error supabase:', error)

  if (!subscriptions?.length) {
    console.log('[push] ⚠️ No hay suscripciones para:', adminEmail)
    return false
  }

  for (const sub of subscriptions) {
    try {
      console.log('[push] Enviando a suscripción:', sub.id)
      const subscription = JSON.parse(sub.subscription)
      await webpush.sendNotification(
        subscription,
        JSON.stringify({ title, body, url })
      )
      console.log('[push] ✓ Notificación enviada a:', adminEmail)
    } catch (err) {
      console.error('[push] ✗ Error completo:', err)
      console.error('[push] Status code:', err.statusCode)
      console.error('[push] Body:', err.body)
    }
  }
  return true
}
