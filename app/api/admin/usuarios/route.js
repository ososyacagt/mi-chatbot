import { supabase } from "@/lib/supabase";
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
    const { email, password, role, tenant_id } = body;

    if (!email || !password || !role) {
      return Response.json(
        { error: "Email, password y role son requeridos" },
        { status: 400 }
      );
    }

    console.log("[POST /api/admin/usuarios] Creando usuario:", email);

    const authUser = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authUser.error) {
      console.error("[POST /api/admin/usuarios] Auth error:", authUser.error);
      return Response.json(
        { error: "Error al crear usuario: " + authUser.error.message },
        { status: 500 }
      );
    }

    const { data, error: dbError } = await supabase
      .from("admin_users")
      .insert({
        id: authUser.data.user.id,
        email,
        role,
        tenant_id: role === "superadmin" ? null : tenant_id,
      })
      .select()
      .single();

    if (dbError) {
      console.error("[POST /api/admin/usuarios] DB error:", dbError);
      await supabase.auth.admin.deleteUser(authUser.data.user.id);
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
