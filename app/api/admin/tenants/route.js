import { supabase } from "@/lib/supabase";
import { getSession, getAdminUser } from "@/lib/auth";
import { logAudit, AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/audit";

// Mapea campos camelCase a snake_case para Supabase
function mapToDbFields(tenant) {
  return {
    client_id: tenant.client_id,
    nombre: tenant.nombre,
    system_prompt: tenant.systemPrompt,
    welcome_message: tenant.welcomeMessage,
    color_primary: tenant.colorPrimary,
    theme: tenant.theme || "auto",
    ai_provider: tenant.aiProvider || "claude",
    ai_model: tenant.aiModel || "claude-sonnet-4-6",
    plan: tenant.plan || "basic",
    mensaje_limite: tenant.mensajeLimite || 100,
    admin_email: tenant.adminEmail || null,
    escalation_enabled: tenant.escalationEnabled !== false,
    escalation_message: tenant.escalationMessage || null,
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
    theme: dbRecord.theme || "auto",
    aiProvider: dbRecord.ai_provider || "claude",
    aiModel: dbRecord.ai_model || "claude-sonnet-4-6",
    plan: dbRecord.plan || "basic",
    mensajeLimite: dbRecord.mensaje_limite || 100,
    mensajesUsados: dbRecord.mensajes_usados || 0,
    planResetDate: dbRecord.plan_reset_date,
    adminEmail: dbRecord.admin_email || null,
    escalationEnabled: dbRecord.escalation_enabled !== false,
    escalationMessage:
      dbRecord.escalation_message ||
      "¡Entendido! He notificado a un agente humano para que te atienda. Por favor espera, alguien se pondrá en contacto contigo pronto. ¿Hay algo más en lo que pueda ayudarte mientras esperas?",
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

    const user = await getSession();
    console.log("[GET /api/admin/tenants] user:", user?.id, user?.email);

    if (!user) {
      return Response.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const adminUser = await getAdminUser(user.id);
    console.log("[GET /api/admin/tenants] adminUser:", adminUser);

    if (!adminUser) {
      return Response.json(
        { error: "Usuario no tiene permisos de admin" },
        { status: 403 }
      );
    }

    console.log("[GET /api/admin/tenants] Role:", adminUser.role, "Tenants:", adminUser.tenant_ids);

    let query = supabase.from("tenants").select("*");

    if (adminUser.role === "admin" && adminUser.tenant_ids && adminUser.tenant_ids.length > 0) {
      query = query.in("client_id", adminUser.tenant_ids);
    } else if (adminUser.role !== "superadmin") {
      return Response.json(
        { error: "Rol no reconocido" },
        { status: 403 }
      );
    }

    const { data, error } = await query.order("created_at", { ascending: true });

    console.log("[GET /api/admin/tenants] Query error:", error);
    console.log("[GET /api/admin/tenants] Columns in first record:", data?.[0] ? Object.keys(data[0]) : "no data");

    if (error) {
      console.error("[GET /api/admin/tenants] Error:", error);
      return Response.json(
        { error: "Error al obtener tenants: " + error.message },
        { status: 500 }
      );
    }

    const mappedData = (data || []).map(mapFromDbFields);
    console.log(`[GET /api/admin/tenants] ✓ ${mappedData.length} tenants`);
    console.log("[GET /api/admin/tenants] Raw data from Supabase:", JSON.stringify(data?.[0], null, 2));
    console.log("[GET /api/admin/tenants] Mapped data sample:", JSON.stringify(mappedData?.[0], null, 2));

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
    console.log("[POST /api/admin/tenants] body:", JSON.stringify(body, null, 2));
    console.log("[POST /api/admin/tenants] Creando nuevo tenant:", body.client_id);

    if (!supabase) {
      return Response.json(
        { error: "Supabase no está configurado" },
        { status: 500 }
      );
    }

    const user = await getSession();
    console.log("[POST /api/admin/tenants] user:", user?.id, user?.email);

    if (!user) {
      return Response.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const adminUser = await getAdminUser(user.id);
    console.log("[POST /api/admin/tenants] adminUser:", adminUser);

    if (!adminUser || adminUser.role !== "superadmin") {
      return Response.json(
        { error: "Solo superadmin puede crear tenants" },
        { status: 403 }
      );
    }

    if (!body.client_id || !body.nombre) {
      return Response.json(
        { error: "client_id y nombre son requeridos" },
        { status: 400 }
      );
    }

    if (!body.systemPrompt || !body.systemPrompt.trim()) {
      return Response.json(
        { error: "systemPrompt es requerido" },
        { status: 400 }
      );
    }

    if (!body.welcomeMessage || !body.welcomeMessage.trim()) {
      return Response.json(
        { error: "welcomeMessage es requerido" },
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

    // Registrar en auditoría
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
               request.headers.get("x-real-ip") ||
               "unknown";
    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: AUDIT_ACTIONS.CREATE,
      entity: AUDIT_ENTITIES.TENANT,
      entityId: mappedData.client_id,
      changes: {
        nombre: mappedData.nombre,
        ai_provider: mappedData.aiProvider,
        color_primary: mappedData.colorPrimary,
      },
      ip,
    });

    return Response.json({ tenant: mappedData }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/tenants] Error inesperado:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
