import { supabase } from "@/lib/supabase";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return Response.json(
        { valid: false, reason: "Token requerido" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("invitations")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !data) {
      console.log("[GET /api/onboarding/validate] Token no encontrado");
      return Response.json({
        valid: false,
        reason: "Token inválido o expirado",
      });
    }

    // Verificar si ya fue usado
    if (data.used) {
      return Response.json({
        valid: false,
        reason: "Esta invitación ya fue utilizada",
      });
    }

    // Verificar si expiró
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      return Response.json({
        valid: false,
        reason: "Esta invitación ha expirado",
      });
    }

    return Response.json({
      valid: true,
      email: data.email,
      token,
    });
  } catch (error) {
    console.error("[GET /api/onboarding/validate] Error:", error);
    return Response.json(
      { valid: false, reason: "Error al validar token" },
      { status: 500 }
    );
  }
}
