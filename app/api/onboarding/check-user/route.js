import { supabase } from "@/lib/supabase";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return Response.json(
        { error: "Email requerido" },
        { status: 400 }
      );
    }

    // Buscar el usuario en admin_users
    const { data, error } = await supabase
      .from("admin_users")
      .select("id, email, role, tenant_ids")
      .eq("email", email.toLowerCase())
      .single();

    if (error || !data) {
      return Response.json({
        exists: false,
      });
    }

    return Response.json({
      exists: true,
      user: {
        id: data.id,
        email: data.email,
        role: data.role,
        tenant_ids: data.tenant_ids || [],
      },
    });
  } catch (error) {
    console.error("[GET /api/onboarding/check-user] Error:", error);
    return Response.json(
      { error: "Error al verificar usuario" },
      { status: 500 }
    );
  }
}
