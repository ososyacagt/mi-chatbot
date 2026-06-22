import { supabase } from "@/lib/supabase";
import { getDocuments, uploadDocument } from "@/lib/documents-db";
import { parseFile } from "@/lib/document-parser";
import { getSession, getAdminUser, isSuperAdmin } from "@/lib/auth";

async function authCheck() {
  const user = await getSession();
  if (!user) {
    return { error: "No autorizado", status: 401 };
  }

  const adminUser = await getAdminUser(user.id);
  if (!adminUser || !isSuperAdmin(adminUser)) {
    return { error: "Solo superadmin puede gestionar documentos", status: 403 };
  }

  return null;
}

export async function GET(request) {
  try {
    const authError = await authCheck();
    if (authError) {
      return Response.json(
        { error: authError.error },
        { status: authError.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return Response.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    console.log("[GET /api/admin/documents] Obteniendo documentos para:", clientId);

    const documents = await getDocuments(clientId);
    return Response.json({ documents });
  } catch (error) {
    console.error("[GET /api/admin/documents] Error:", error);
    return Response.json(
      { error: "Error al obtener documentos" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const authError = await authCheck();
    if (authError) {
      return Response.json(
        { error: authError.error },
        { status: authError.status }
      );
    }

    const formData = await request.formData();
    const clientId = formData.get("clientId");
    const file = formData.get("file");

    if (!clientId || !file) {
      return Response.json(
        { error: "clientId y file son requeridos" },
        { status: 400 }
      );
    }

    console.log("[POST /api/admin/documents] Subiendo documento para:", clientId);
    console.log("[POST /api/admin/documents] Archivo:", file.name, file.type, file.size);

    const buffer = await file.arrayBuffer();
    const { contenido, esImagen, base64 } = await parseFile(
      Buffer.from(buffer),
      file.type,
      file.name
    );

    const documento = await uploadDocument(clientId, file, contenido);

    if (esImagen && base64) {
      await supabase
        .from("documents")
        .update({ base64_data: base64 })
        .eq("id", documento.id);
    }

    console.log("[POST /api/admin/documents] ✓ Documento subido:", documento.id);

    return Response.json({ document: documento }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/documents] Error completo:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return Response.json(
      { error: "Error al subir documento" },
      { status: 500 }
    );
  }
}
