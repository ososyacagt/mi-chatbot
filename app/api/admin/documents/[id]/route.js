import { supabase } from "@/lib/supabase";
import { deleteDocument } from "@/lib/documents-db";
import { getSession, getAdminUser, isSuperAdmin } from "@/lib/auth";

async function authCheck() {
  const user = await getSession();
  if (!user) {
    return { error: "No autorizado", status: 401 };
  }

  const adminUser = await getAdminUser(user.id);
  if (!adminUser || !isSuperAdmin(adminUser)) {
    return { error: "Solo superadmin puede eliminar documentos", status: 403 };
  }

  return null;
}

export async function DELETE(request, { params }) {
  try {
    const authError = await authCheck();
    if (authError) {
      return Response.json(
        { error: authError.error },
        { status: authError.status }
      );
    }

    const { id } = await params;

    console.log("[DELETE /api/admin/documents/[id]] Eliminando documento:", id);

    if (!supabase) {
      return Response.json(
        { error: "Supabase no está configurado" },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from("documents")
      .select("storage_path")
      .eq("id", id)
      .single();

    if (error || !data) {
      return Response.json(
        { error: "Documento no encontrado" },
        { status: 404 }
      );
    }

    await deleteDocument(id, data.storage_path);

    console.log("[DELETE /api/admin/documents/[id]] ✓ Documento eliminado:", id);

    return Response.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/documents/[id]] Error completo:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return Response.json(
      { error: "Error al eliminar documento" },
      { status: 500 }
    );
  }
}
