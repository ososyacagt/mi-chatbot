import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { getSession, getAdminUser, isSuperAdmin } from "@/lib/auth";
import { getEscalations, resolveEscalation } from "@/lib/escalation";
import { sendPushNotification } from "@/lib/push-notifications";

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

export async function POST(request) {
  try {
    const body = await request.json();
    const { escalationId, response, sessionId, tenantId, adminEmail } = body;

    if (!escalationId || !response || !sessionId || !tenantId) {
      return NextResponse.json(
        { error: "escalationId, response, sessionId y tenantId son requeridos" },
        { status: 400 }
      );
    }

    // Verificar sesión
    const user = await getSession();
    console.log("[/api/admin/escalations POST] user:", user?.id, user?.email);
    if (!user) {
      console.error("[/api/admin/escalations POST] Sin sesión");
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener datos del usuario
    const adminUser = await getAdminUser(user.id);
    console.log("[/api/admin/escalations POST] adminUser:", adminUser);
    if (!adminUser || !isSuperAdmin(adminUser)) {
      console.error("[/api/admin/escalations POST] No es superadmin");
      return NextResponse.json(
        { error: "Solo superadmin puede responder escalaciones" },
        { status: 403 }
      );
    }

    console.log("[/api/admin/escalations POST] Respondiendo a escalación:", escalationId);

    const supabase = createSupabaseAdmin();

    // 1. Actualizar escalation con respuesta de admin
    const { error: updateError } = await supabase
      .from("escalations")
      .update({
        admin_response: response,
        status: "in_progress"
      })
      .eq("id", escalationId);

    if (updateError) {
      console.error("[/api/admin/escalations POST] Error actualizando escalación:", updateError);
      throw updateError;
    }

    // 2. Insertar mensaje de admin en conversaciones
    const { error: msgError } = await supabase
      .from("conversations")
      .insert({
        tenant_id: tenantId,
        session_id: sessionId,
        role: "assistant",
        content: response,
        is_admin_response: true,
        created_at: new Date().toISOString()
      });

    if (msgError) {
      console.error("[/api/admin/escalations POST] Error insertando mensaje:", msgError);
      throw msgError;
    }

    console.log("[/api/admin/escalations POST] ✓ Respuesta guardada");

    // 3. Enviar notificación push (opcional, si el usuario está en otra ventana)
    if (adminEmail) {
      await sendPushNotification({
        adminEmail,
        title: "Escalación respondida",
        body: "Tu respuesta ha sido enviada",
        url: `/admin/escalaciones`
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[/api/admin/escalations POST] Error completo:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return NextResponse.json(
      { error: "Error al responder escalación" },
      { status: 500 }
    );
  }
}
