import { NextResponse } from "next/server";
import { getSession, getAdminUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSession();
    console.log("[/api/admin/me] user:", user?.id, user?.email);

    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const adminUser = await getAdminUser(user.id);
    console.log("[/api/admin/me] adminUser:", adminUser);

    if (!adminUser) {
      return NextResponse.json(
        { error: "Usuario no tiene permisos de admin" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      email: user.email,
      role: adminUser.role,
      tenant_id: adminUser.tenant_id,
    });
  } catch (error) {
    console.error("[/api/admin/me] error completo:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return NextResponse.json({ error: "Error al obtener información del usuario" }, { status: 500 });
  }
}
