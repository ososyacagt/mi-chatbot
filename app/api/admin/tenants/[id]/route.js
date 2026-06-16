import { supabase } from "@/lib/supabase";

// Mapea campos snake_case de Supabase a camelCase
function mapFromDbFields(dbRecord) {
  return {
    id: dbRecord.client_id,
    client_id: dbRecord.client_id,
    nombre: dbRecord.nombre,
    systemPrompt: dbRecord.system_prompt,
    welcomeMessage: dbRecord.welcome_message,
    colorPrimary: dbRecord.color_primary,
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

    return Response.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/tenants/[id]] Error inesperado:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
