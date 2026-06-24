import { createSupabaseAdmin } from './supabase-admin'
import webpush from 'web-push'

const VAPID_SUBJECT = process.env.NEXT_PUBLIC_CONTACT_EMAIL
  ? `mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`
  : 'mailto:support@chatbot.local'

webpush.setVapidDetails(
  VAPID_SUBJECT,
  process.env.NEXT_PUBLIC_VAPID_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export async function sendPushNotification({ adminEmail, title, body, url }) {
  const supabase = createSupabaseAdmin()
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('email', adminEmail)

  if (!subscriptions?.length) {
    return false
  }

  for (const sub of subscriptions) {
    try {
      const subscription = JSON.parse(sub.subscription)
      await webpush.sendNotification(
        subscription,
        JSON.stringify({ title, body, url })
      )
    } catch (err) {
      console.error('[push] Error enviando notificación:', err.message)
    }
  }
  return true
}
