import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { getSession, getAdminUser, isSuperAdmin } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    const { id: escalationId } = await params;
    console.log('[escalation-chat GET] escalationId:', escalationId);

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

    // Verificar permisos
    const adminUser = await getAdminUser(user.id);
    if (!adminUser || !isSuperAdmin(adminUser)) {
      return NextResponse.json(
        { error: "Solo superadmin puede ver escalaciones" },
        { status: 403 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Obtener la escalación
    console.log('[escalation-chat GET] Buscando escalación con id:', escalationId);
    const { data: escalation, error: escalError } = await supabase
      .from("escalations")
      .select("*")
      .eq("id", escalationId)
      .single();

    if (escalError || !escalation) {
      console.error("[escalation-chat GET] Error obteniendo escalación:", escalError);
      return NextResponse.json(
        { error: "Escalación no encontrada" },
        { status: 404 }
      );
    }

    console.log('[escalation-chat GET] ✓ Escalación encontrada:', escalation.id);

    // Obtener historial completo de la conversación
    const { data: messages, error: msgError } = await supabase
      .from("conversations")
      .select("*")
      .eq("tenant_id", escalation.tenant_id)
      .eq("session_id", escalation.session_id)
      .order("created_at", { ascending: true });

    if (msgError) {
      console.error("[escalation chat GET] Error obteniendo mensajes:", msgError);
      return NextResponse.json(
        { error: "Error obteniendo historial: " + msgError.message },
        { status: 500 }
      );
    }

    console.log("[escalation chat GET] ✓ Retornando", messages?.length || 0, "mensajes");

    return NextResponse.json({
      escalation,
      messages: messages || [],
    });
  } catch (error) {
    console.error("[escalation chat GET] Error:", error);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { id: escalationId } = await params;
    const body = await request.json();
    const { response } = body;
    console.log('[escalation-chat POST] escalationId:', escalationId);
    console.log('[escalation-chat POST] body:', body);

    if (!escalationId || !response) {
      return NextResponse.json(
        { error: "escalationId y response son requeridos" },
        { status: 400 }
      );
    }

    // Verificar sesión
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar permisos
    const adminUser = await getAdminUser(user.id);
    if (!adminUser || !isSuperAdmin(adminUser)) {
      return NextResponse.json(
        { error: "Solo superadmin puede responder" },
        { status: 403 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Obtener la escalación
    console.log('[escalation-chat POST] Buscando escalación con id:', escalationId);
    const { data: escalation, error: escalError } = await supabase
      .from("escalations")
      .select("*")
      .eq("id", escalationId)
      .single();

    if (escalError || !escalation) {
      console.error("[escalation-chat POST] Error obteniendo escalación:", escalError);
      return NextResponse.json(
        { error: "Escalación no encontrada" },
        { status: 404 }
      );
    }

    console.log('[escalation-chat POST] ✓ Escalación encontrada:', escalation.id);

    // Guardar mensaje del admin
    const { data: message, error: msgError } = await supabase
      .from("conversations")
      .insert({
        tenant_id: escalation.tenant_id,
        session_id: escalation.session_id,
        role: "assistant",
        content: response,
        is_admin_response: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (msgError) {
      console.error("[escalation chat POST] Error guardando mensaje:", msgError);
      return NextResponse.json(
        { error: "Error guardando respuesta: " + msgError.message },
        { status: 500 }
      );
    }

    // Actualizar escalación a "in_progress" si está "pending"
    if (escalation.status === "pending") {
      const { error: updateError } = await supabase
        .from("escalations")
        .update({
          status: "in_progress",
        })
        .eq("id", escalationId);

      if (updateError) {
        console.error("[escalation chat POST] Error actualizando escalación:", updateError);
      }
    }

    console.log("[escalation chat POST] ✓ Mensaje guardado:", message.id);

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("[escalation chat POST] Error:", error);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id: escalationId } = await params;
    const body = await request.json();
    const { autoBotEnabled } = body;

    if (escalationId === undefined || autoBotEnabled === undefined) {
      return NextResponse.json(
        { error: "escalationId y autoBotEnabled son requeridos" },
        { status: 400 }
      );
    }

    // Verificar sesión
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar permisos
    const adminUser = await getAdminUser(user.id);
    if (!adminUser || !isSuperAdmin(adminUser)) {
      return NextResponse.json(
        { error: "Solo superadmin puede cambiar configuración" },
        { status: 403 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Actualizar auto_bot_enabled
    const { data: escalation, error: updateError } = await supabase
      .from("escalations")
      .update({
        auto_bot_enabled: autoBotEnabled,
      })
      .eq("id", escalationId)
      .select()
      .single();

    if (updateError) {
      console.error("[escalation chat PATCH] Error actualizando:", updateError);
      return NextResponse.json(
        { error: "Error actualizando: " + updateError.message },
        { status: 500 }
      );
    }

    console.log("[escalation chat PATCH] ✓ auto_bot_enabled:", autoBotEnabled);

    return NextResponse.json({
      success: true,
      escalation,
    });
  } catch (error) {
    console.error("[escalation chat PATCH] Error:", error);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
