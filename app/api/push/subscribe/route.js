import { createSupabaseAdmin } from "@/lib/supabase-server"

export async function POST(request) {
  try {
    console.log("[push-subscribe] ===== RECIBIENDO SUSCRIPCIÓN =====")

    const { email, subscription } = await request.json()

    console.log("[push-subscribe] Email recibido:", email)
    console.log("[push-subscribe] Subscription recibida:", {
      hasEndpoint: !!subscription?.endpoint,
      hasKeys: !!subscription?.keys,
      endpoint: subscription?.endpoint?.substring(0, 50) + "..." || "N/A"
    })

    if (!email || !subscription) {
      console.error("[push-subscribe] ❌ Email o subscription faltante")
      return Response.json(
        { error: "Email y subscription son requeridos" },
        { status: 400 }
      )
    }

    console.log("[push-subscribe] Guardando suscripción para:", email)
    console.log("[push-subscribe] Tipo de subscription:", typeof subscription)

    const supabase = createSupabaseAdmin()
    const subscriptionString = typeof subscription === 'string' ? subscription : JSON.stringify(subscription)

    console.log("[push-subscribe] Ejecutando UPSERT en Supabase...")
    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          email,
          subscription: subscriptionString,
          updated_at: new Date().toISOString()
        },
        { onConflict: "email" }
      )
      .select()

    if (error) {
      console.error("[push-subscribe] ❌ Error Supabase:", error)
      console.error("[push-subscribe] Error message:", error.message)
      console.error("[push-subscribe] Error code:", error.code)
      return Response.json(
        { error: "Error guardando suscripción: " + error.message },
        { status: 500 }
      )
    }

    console.log("[push-subscribe] ✓ Suscripción guardada para:", email)
    console.log("[push-subscribe] Data guardada:", data)
    console.log("[push-subscribe] ===== SUSCRIPCIÓN COMPLETADA =====")
    return Response.json({ success: true, data })
  } catch (err) {
    console.error("[push-subscribe] Error:", err)
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
