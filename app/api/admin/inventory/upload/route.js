import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getSession, getAdminUser } from "@/lib/auth";

async function authCheck() {
  const user = await getSession();
  if (!user) {
    return { error: "No autorizado", status: 401 };
  }

  const adminUser = await getAdminUser(user.id);
  if (!adminUser) {
    return { error: "No eres administrador", status: 403 };
  }

  return null;
}

export async function POST(request) {
  try {
    const authError = await authCheck();
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const tenantId = formData.get("tenantId");
    const productId = formData.get("productId");

    console.log("[POST /api/admin/inventory/upload] Uploading image:", {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      tenantId,
      productId,
    });

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!tenantId || !productId) {
      return NextResponse.json(
        { error: "tenantId y productId son requeridos" },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Usa: JPEG, PNG, WebP o GIF" },
        { status: 400 }
      );
    }

    // Convertir archivo a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generar nombre único
    const timestamp = Date.now();
    const ext = file.name.split(".").pop();
    const filename = `${productId}-${timestamp}.${ext}`;
    const filepath = `${tenantId}/${productId}/${filename}`;

    console.log("[POST /api/admin/inventory/upload] Uploading to storage:", filepath);

    const supabaseAdmin = createSupabaseAdmin();

    // Subir a Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from("product-images")
      .upload(filepath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("[POST /api/admin/inventory/upload] Upload error:", error);
      throw error;
    }

    // Obtener URL pública
    const { data: publicUrlData } = supabaseAdmin.storage
      .from("product-images")
      .getPublicUrl(filepath);

    const publicUrl = publicUrlData?.publicUrl;

    console.log("[POST /api/admin/inventory/upload] ✓ Upload successful:", {
      path: filepath,
      publicUrl,
    });

    return NextResponse.json({ url: publicUrl }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/admin/inventory/upload] Error completo:", {
      message: error.message,
      code: error.code,
      details: error,
    });
    return NextResponse.json(
      { error: "Error al subir imagen" },
      { status: 500 }
    );
  }
}
