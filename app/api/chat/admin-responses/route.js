import { supabase } from "@/lib/supabase"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")
    const clientId = searchParams.get("clientId")
    const lastTimestamp = searchParams.get("lastTimestamp")

    if (!sessionId || !clientId) {
      return Response.json(
        { error: "sessionId y clientId son requeridos" },
        { status: 400 }
      )
    }

    console.log(
      "[admin-responses] Buscando respuestas para:",
      sessionId,
      clientId
    )

    let query = supabase
      .from("conversations")
      .select("*")
      .eq("client_id", clientId)
      .eq("session_id", sessionId)
      .eq("is_admin_response", true)
      .order("created_at", { ascending: true })

    if (lastTimestamp) {
      query = query.gt("created_at", lastTimestamp)
    }

    const { data, error } = await query

    if (error) {
      console.error("[admin-responses] Error Supabase:", error)
      return Response.json(
        { error: "Error buscando respuestas: " + error.message },
        { status: 500 }
      )
    }

    const newMessages = (data || []).map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.created_at,
      isAdminResponse: true
    }))

    console.log("[admin-responses] ✓ Encontrados", newMessages.length, "mensajes")

    return Response.json({ newMessages })
  } catch (err) {
    console.error("[admin-responses] Error:", err)
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
