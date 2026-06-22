import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
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

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const body = await request.json();

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    console.log("[POST /api/admin/inventory/products/bulk] Importando productos para:", clientId);

    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("client_id", clientId)
      .single();

    if (!tenant) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const products = body.productos || [];
    const errors = [];
    let imported = 0;

    for (let i = 0; i < products.length; i++) {
      const p = products[i];

      if (!p.nombre || !p.precio) {
        errors.push({
          row: i + 2,
          message: "nombre y precio son requeridos",
        });
        continue;
      }

      try {
        const { error } = await supabase.from("products").insert([
          {
            tenant_id: tenant.id,
            nombre: p.nombre,
            descripcion: p.descripcion || "",
            imagen: p.imagen || null,
            precio: parseFloat(p.precio),
            precio_original: p.precio_original ? parseFloat(p.precio_original) : null,
            category_id: p.category_id || null,
            stock: parseInt(p.stock || 0),
            stock_minimo: p.stock_minimo ? parseInt(p.stock_minimo) : 0,
            stock_maximo: p.stock_maximo ? parseInt(p.stock_maximo) : null,
            sku: p.sku || null,
            es_servicio: p.es_servicio === true || p.es_servicio === "true",
            fecha_expiracion: p.fecha_expiracion || null,
            featured: p.destacado === true || p.destacado === "true",
            activo: p.activo !== false && p.activo !== "false",
          },
        ]);

        if (error) throw error;
        imported++;
      } catch (err) {
        errors.push({
          row: i + 2,
          message: err.message,
        });
      }
    }

    console.log("[POST /api/admin/inventory/products/bulk] ✓ Importados:", imported);

    return NextResponse.json({
      imported,
      errors,
      success: errors.length === 0,
    });
  } catch (error) {
    console.error("[POST /api/admin/inventory/products/bulk] Error:", {
      message: error.message,
    });
    return NextResponse.json(
      { error: "Error al importar productos" },
      { status: 500 }
    );
  }
}
