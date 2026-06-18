import { supabase } from "@/lib/supabase";
import { getSession, getAdminUser } from "@/lib/auth";

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

    const { error: authError } = await supabase.auth.admin.deleteUser(id);

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
