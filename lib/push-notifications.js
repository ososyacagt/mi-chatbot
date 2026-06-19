import { createSupabaseAdmin } from './supabase-admin'

export async function sendPushNotification({ adminEmail, title, body, url }) {
  try {
    console.log('[push] Enviando notificación a:', adminEmail)

    const supabase = createSupabaseAdmin()
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('email', adminEmail)

    if (error) {
      console.error('[push] Error buscando suscripciones:', error)
      return false
    }

    if (!subscriptions?.length) {
      console.log('[push] No hay suscripciones para:', adminEmail)
      return false
    }

    console.log('[push] Encontradas', subscriptions.length, 'suscripciones')

    for (const sub of subscriptions) {
      try {
        const subscription = JSON.parse(sub.subscription)
        console.log('[push] Enviando a endpoint:', subscription.endpoint.substring(0, 50) + '...')

        await fetch(subscription.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'TTL': '86400'
          },
          body: JSON.stringify({ title, body, url })
        })

        console.log('[push] ✓ Notificación enviada')
      } catch (err) {
        console.error('[push] Error enviando a:', sub.email, err.message)
      }
    }

    return true
  } catch (err) {
    console.error('[push] Error general:', err.message)
    return false
  }
}
