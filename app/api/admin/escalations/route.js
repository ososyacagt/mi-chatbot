import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { getSession, getAdminUser, isSuperAdmin } from "@/lib/auth";
import { getEscalations, resolveEscalation } from "@/lib/escalation";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("clientId") || searchParams.get("tenantId");
    const status = searchParams.get("status") || null;

    // Verificar sesión
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener datos del usuario
    const adminUser = await getAdminUser(user.id);
    if (!adminUser || !isSuperAdmin(adminUser)) {
      return NextResponse.json(
        { error: "Solo superadmin puede ver escalaciones" },
        { status: 403 }
      );
    }

    const escalations = await getEscalations(tenantId, status);

    return NextResponse.json({
      escalations,
    });
  } catch (error) {
    console.error("[/api/admin/escalations] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener escalaciones" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { escalationId } = body;

    if (!escalationId) {
      return NextResponse.json(
        { error: "escalationId es requerido" },
        { status: 400 }
      );
    }

    // Verificar sesión
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener datos del usuario
    const adminUser = await getAdminUser(user.id);
    if (!adminUser || !isSuperAdmin(adminUser)) {
      return NextResponse.json(
        { error: "Solo superadmin puede resolver escalaciones" },
        { status: 403 }
      );
    }

    await resolveEscalation(escalationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[/api/admin/escalations] Error:", error);
    return NextResponse.json(
      { error: "Error al resolver escalación" },
      { status: 500 }
    );
  }
}
