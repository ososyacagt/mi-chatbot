import { supabase } from "@/lib/supabase";

// Mapea campos camelCase a snake_case para Supabase
function mapToDbFields(tenant) {
  return {
    client_id: tenant.client_id,
    nombre: tenant.nombre,
    system_prompt: tenant.system_prompt,
    welcome_message: tenant.welcome_message,
    color_primary: tenant.color_primary,
  };
}

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

export async function GET(request) {
  try {
    console.log("[GET /api/admin/tenants] Obteniendo lista de tenants");

    if (!supabase) {
      return Response.json(
        { error: "Supabase no está configurado" },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET /api/admin/tenants] Error:", error);
      return Response.json(
        { error: "Error al obtener tenants: " + error.message },
        { status: 500 }
      );
    }

    const mappedData = (data || []).map(mapFromDbFields);
    console.log(`[GET /api/admin/tenants] ✓ ${mappedData.length} tenants`);

    return Response.json({ tenants: mappedData });
  } catch (error) {
    console.error("[GET /api/admin/tenants] Error inesperado:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("[POST /api/admin/tenants] Creando nuevo tenant:", body.client_id);

    if (!supabase) {
      return Response.json(
        { error: "Supabase no está configurado" },
        { status: 500 }
      );
    }

    if (!body.client_id || !body.nombre) {
      return Response.json(
        { error: "client_id y nombre son requeridos" },
        { status: 400 }
      );
    }

    const dbData = mapToDbFields(body);

    const { data, error } = await supabase
      .from("tenants")
      .insert([dbData])
      .select()
      .single();

    if (error) {
      console.error("[POST /api/admin/tenants] Error:", error);
      return Response.json(
        { error: "Error al crear tenant: " + error.message },
        { status: 500 }
      );
    }

    const mappedData = mapFromDbFields(data);
    console.log("[POST /api/admin/tenants] ✓ Tenant creado:", mappedData.id);

    return Response.json({ tenant: mappedData }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/tenants] Error inesperado:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
