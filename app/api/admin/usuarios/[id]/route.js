import { supabase } from "@/lib/supabase";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getSession, getAdminUser } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
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
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[GET /api/admin/usuarios/[id]] Error:", error);
      return Response.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return Response.json({ usuario: data });
  } catch (error) {
    console.error("[GET /api/admin/usuarios/[id]] Error inesperado:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const user = await getSession();

    if (!user) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const adminUser = await getAdminUser(user.id);
    if (!adminUser || adminUser.role !== "superadmin") {
      return Response.json(
        { error: "Solo superadmin puede editar usuarios" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, role, tenant_ids } = body;

    console.log("[PUT /api/admin/usuarios/[id]] Actualizando usuario:", id);

    const supabaseAdmin = createSupabaseAdmin();

    // Si el email cambió, actualizar en auth
    if (email) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        email,
      });

      if (authError) {
        console.error("[PUT /api/admin/usuarios/[id]] Auth error:", authError);
        return Response.json(
          { error: "Error al actualizar email en auth" },
          { status: 500 }
        );
      }
    }

    // Si se envía nueva contraseña, actualizar en auth
    if (password) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        password,
      });

      if (authError) {
        console.error("[PUT /api/admin/usuarios/[id]] Auth password error:", authError);
        return Response.json(
          { error: "Error al actualizar contraseña en auth" },
          { status: 500 }
        );
      }
    }

    const updateData = {};
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (role === "superadmin") {
      updateData.tenant_ids = [];
      updateData.tenant_id = null;
    } else if (tenant_ids) {
      updateData.tenant_ids = tenant_ids;
      updateData.tenant_id = null;
    }

    const { data, error: dbError } = await supabase
      .from("admin_users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (dbError) {
      console.error("[PUT /api/admin/usuarios/[id]] DB error:", dbError);
      return Response.json(
        { error: "Error al actualizar usuario en BD" },
        { status: 500 }
      );
    }

    console.log("[PUT /api/admin/usuarios/[id]] ✓ Usuario actualizado:", data.id);
    return Response.json({ usuario: data });
  } catch (error) {
    console.error("[PUT /api/admin/usuarios/[id]] Error inesperado:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const user = await getSession();

    if (!user) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const adminUser = await getAdminUser(user.id);
    if (!adminUser || adminUser.role !== "superadmin") {
      return Response.json(
        { error: "Solo superadmin puede eliminar usuarios" },
        { status: 403 }
      );
    }

    console.log("[DELETE /api/admin/usuarios/[id]] Eliminando usuario:", id);

    const supabaseAdmin = createSupabaseAdmin();
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      console.error("[DELETE /api/admin/usuarios/[id]] Auth error:", authError);
    }

    const { error: dbError } = await supabase
      .from("admin_users")
      .delete()
      .eq("id", id);

    if (dbError) {
      console.error("[DELETE /api/admin/usuarios/[id]] DB error:", dbError);
      return Response.json(
        { error: "Error al eliminar usuario" },
        { status: 500 }
      );
    }

    console.log("[DELETE /api/admin/usuarios/[id]] ✓ Usuario eliminado:", id);
    return Response.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/usuarios/[id]] Error inesperado:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
