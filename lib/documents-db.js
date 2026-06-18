import { supabase } from "./supabase";

export async function getDocuments(clientId) {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("tenant_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getDocuments] Error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[getDocuments] Error inesperado:", error);
    return [];
  }
}

export async function uploadDocument(clientId, file, contenido) {
  try {
    const fileName = `${Date.now()}-${file.name}`;
    const storagePath = `documents/${clientId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, { upsert: false });

    if (uploadError) {
      console.error("[uploadDocument] Storage error:", uploadError);
      throw uploadError;
    }

    const { data, error: dbError } = await supabase
      .from("documents")
      .insert({
        tenant_id: clientId,
        nombre: file.name,
        tipo: file.type,
        tamanio: file.size,
        storage_path: storagePath,
        contenido,
      })
      .select()
      .single();

    if (dbError) {
      console.error("[uploadDocument] DB error:", dbError);
      await supabase.storage.from("documents").remove([storagePath]);
      throw dbError;
    }

    console.log("[uploadDocument] ✓ Documento subido:", data.id);
    return data;
  } catch (error) {
    console.error("[uploadDocument] Error:", error);
    throw error;
  }
}

export async function deleteDocument(id, storagePath) {
  try {
    const { error: storageError } = await supabase.storage
      .from("documents")
      .remove([storagePath]);

    if (storageError) {
      console.error("[deleteDocument] Storage error:", storageError);
    }

    const { error: dbError } = await supabase
      .from("documents")
      .delete()
      .eq("id", id);

    if (dbError) {
      console.error("[deleteDocument] DB error:", dbError);
      throw dbError;
    }

    console.log("[deleteDocument] ✓ Documento eliminado:", id);
  } catch (error) {
    console.error("[deleteDocument] Error:", error);
    throw error;
  }
}

export async function getDocumentsContext(clientId) {
  try {
    const documents = await getDocuments(clientId);

    if (documents.length === 0) {
      return { texto: "", imagenes: [] };
    }

    const textos = [];
    const imagenes = [];

    documents.forEach((doc) => {
      if (doc.base64_data) {
        imagenes.push(doc.base64_data);
      } else if (doc.contenido && !doc.contenido.startsWith("[Imagen:")) {
        textos.push(`[${doc.nombre}]\n${doc.contenido}`);
      }
    });

    const contextoTexto = textos.join("\n\n---\n\n");

    return { texto: contextoTexto, imagenes };
  } catch (error) {
    console.error("[getDocumentsContext] Error:", error);
    return { texto: "", imagenes: [] };
  }
}
