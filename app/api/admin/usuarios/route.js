import { supabase } from "@/lib/supabase";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getSession, getAdminUser } from "@/lib/auth";

export async function GET(request) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const adminUser = await getAdminUser(user.id);
    if (!adminUser || adminUser.role !== "superadmin") {
      return Response.json(
        { error: "Solo superadmin puede ver usuarios" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("admin_users")
      .select("id, email, role, tenant_id, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/admin/usuarios] Error:", error);
      return Response.json(
        { error: "Error al obtener usuarios" },
        { status: 500 }
      );
    }

    console.log("[GET /api/admin/usuarios] ✓", data.length, "usuarios");
    return Response.json({ usuarios: data });
  } catch (error) {
    console.error("[GET /api/admin/usuarios] Error inesperado:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const adminUser = await getAdminUser(user.id);
    if (!adminUser || adminUser.role !== "superadmin") {
      return Response.json(
        { error: "Solo superadmin puede crear usuarios" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, role, tenant_ids } = body;

    if (!email || !password || !role) {
      return Response.json(
        { error: "Email, password y role son requeridos" },
        { status: 400 }
      );
    }

    console.log("[POST /api/admin/usuarios] Creando usuario:", email);

    const supabaseAdmin = createSupabaseAdmin();

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error("[POST /api/admin/usuarios] Auth error:", authError);
      return Response.json(
        { error: "Error al crear usuario: " + authError.message },
        { status: 500 }
      );
    }

    console.log("[POST /api/admin/usuarios] Usuario creado en auth:", authData.user.id);

    const { data, error: dbError } = await supabase
      .from("admin_users")
      .insert({
        id: authData.user.id,
        email,
        role,
        tenant_id: null,
        tenant_ids: role === "superadmin" ? [] : (tenant_ids || []),
      })
      .select()
      .single();

    if (dbError) {
      console.error("[POST /api/admin/usuarios] DB error:", dbError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return Response.json(
        { error: "Error al guardar usuario en BD" },
        { status: 500 }
      );
    }

    console.log("[POST /api/admin/usuarios] ✓ Usuario creado:", data.id);
    return Response.json({ usuario: data }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/usuarios] Error inesperado:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
