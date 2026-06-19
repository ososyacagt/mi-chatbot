import { supabase } from "@/lib/supabase"

export async function POST(request) {
  try {
    const { email, subscription } = await request.json()

    if (!email || !subscription) {
      return Response.json(
        { error: "Email y subscription son requeridos" },
        { status: 400 }
      )
    }

    console.log("[push/subscribe] Guardando suscripción para:", email)

    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          email,
          subscription,
          updated_at: new Date().toISOString()
        },
        { onConflict: "email" }
      )
      .select()

    if (error) {
      console.error("[push/subscribe] Error Supabase:", error)
      return Response.json(
        { error: "Error guardando suscripción: " + error.message },
        { status: 500 }
      )
    }

    console.log("[push/subscribe] ✓ Suscripción guardada")
    return Response.json({ success: true, data })
  } catch (err) {
    console.error("[push/subscribe] Error:", err)
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
