export async function GET() {
  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_KEY

    if (!publicKey) {
      console.error("[push/vapid] NEXT_PUBLIC_VAPID_KEY no está configurada")
      return Response.json(
        { error: "VAPID key no configurada" },
        { status: 500 }
      )
    }

    return Response.json({ publicKey })
  } catch (err) {
    console.error("[push/vapid] Error:", err)
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
