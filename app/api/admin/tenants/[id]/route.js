import { supabase } from "@/lib/supabase";
import { getSession, getAdminUser } from "@/lib/auth";
import { logAudit, AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/audit";

// Mapea campos snake_case de Supabase a camelCase
function mapFromDbFields(dbRecord) {
  return {
    id: dbRecord.client_id,
    client_id: dbRecord.client_id,
    nombre: dbRecord.nombre,
    systemPrompt: dbRecord.system_prompt,
    welcomeMessage: dbRecord.welcome_message,
    colorPrimary: dbRecord.color_primary,
    aiProvider: dbRecord.ai_provider || "claude",
    aiModel: dbRecord.ai_model || "claude-sonnet-4-6",
  };
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    console.log("[PUT /api/admin/tenants/[id]] ID recibido en params:", id);
    console.log("[PUT /api/admin/tenants/[id]] Body recibido:", JSON.stringify(body, null, 2));

    if (!supabase) {
      return Response.json(
        { error: "Supabase no está configurado" },
        { status: 500 }
      );
    }

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
        { error: "Usuario no tiene permisos de admin" },
        { status: 403 }
      );
    }

    if (adminUser.role === "admin" && adminUser.tenant_id !== id) {
      return Response.json(
        { error: "No tienes permiso para editar este tenant" },
        { status: 403 }
      );
    }

    if (!body.nombre) {
      return Response.json(
        { error: "nombre es requerido" },
        { status: 400 }
      );
    }

    console.log("[PUT /api/admin/tenants/[id]] Actualizando con client_id:", id);

    const { data, error } = await supabase
      .from("tenants")
      .update({
        nombre: body.nombre,
        system_prompt: body.system_prompt,
        welcome_message: body.welcome_message,
        color_primary: body.color_primary,
        ai_provider: body.ai_provider || "claude",
        ai_model: body.ai_model || "claude-sonnet-4-6",
      })
      .eq("client_id", id)
      .select();

    console.log("[PUT /api/admin/tenants/[id]] Resultado Supabase - data:", JSON.stringify(data, null, 2));
    console.log("[PUT /api/admin/tenants/[id]] Resultado Supabase - error:", error);

    if (error) {
      console.error("[PUT /api/admin/tenants/[id]] Error:", error);
      return Response.json(
        { error: "Error al actualizar tenant: " + error.message },
        { status: 500 }
      );
    }

    // Si hay error o no hay datos, retornar 404
    if (!data || data.length === 0) {
      return Response.json(
        { error: "No se encontró el tenant para actualizar" },
        { status: 404 }
      );
    }

    const mappedData = mapFromDbFields(data[0]);
    console.log("[PUT /api/admin/tenants/[id]] ✓ Tenant actualizado:", mappedData.id);

    // Registrar en auditoría
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
               request.headers.get("x-real-ip") ||
               "unknown";
    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.TENANT,
      entityId: id,
      changes: body,
      ip,
    });

    return Response.json({ tenant: mappedData });
  } catch (error) {
    console.error("[PUT /api/admin/tenants/[id]] Error inesperado:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    console.log("[DELETE /api/admin/tenants/[id]] Eliminando tenant:", id);

    if (!supabase) {
      return Response.json(
        { error: "Supabase no está configurado" },
        { status: 500 }
      );
    }

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
        { error: "Usuario no tiene permisos de admin" },
        { status: 403 }
      );
    }

    if (adminUser.role === "admin" && adminUser.tenant_id !== id) {
      return Response.json(
        { error: "No tienes permiso para eliminar este tenant" },
        { status: 403 }
      );
    }

    if (adminUser.role !== "superadmin" && adminUser.role !== "admin") {
      return Response.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("tenants")
      .delete()
      .eq("client_id", id);

    if (error) {
      console.error("[DELETE /api/admin/tenants/[id]] Error:", error);
      return Response.json(
        { error: "Error al eliminar tenant: " + error.message },
        { status: 500 }
      );
    }

    console.log("[DELETE /api/admin/tenants/[id]] ✓ Tenant eliminado:", id);

    // Registrar en auditoría
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
               request.headers.get("x-real-ip") ||
               "unknown";
    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: AUDIT_ACTIONS.DELETE,
      entity: AUDIT_ENTITIES.TENANT,
      entityId: id,
      changes: { deleted: true },
      ip,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/tenants/[id]] Error inesperado:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
