import { getSession, getAdminUser } from "@/lib/auth";

export async function GET(request) {
  try {
    const user = await getSession();

    if (!user) {
      return Response.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const adminUser = await getAdminUser(user.id);

    if (!adminUser) {
      return Response.json(
        { error: "Usuario no es admin" },
        { status: 403 }
      );
    }

    console.log("[GET /api/admin/me] ✓ Sesión:", user.email, "Role:", adminUser.role);

    return Response.json({
      email: adminUser.email,
      role: adminUser.role,
      tenant_id: adminUser.tenant_id,
    });
  } catch (error) {
    console.error("[GET /api/admin/me] Error:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
