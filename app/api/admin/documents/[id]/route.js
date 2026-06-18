import { supabase } from "@/lib/supabase";
import { deleteDocument } from "@/lib/documents-db";

export async function DELETE(request, { params }) {
  try {
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
    console.error("[DELETE /api/admin/documents/[id]] Error:", error);
    return Response.json(
      { error: "Error al eliminar documento: " + error.message },
      { status: 500 }
    );
  }
}
