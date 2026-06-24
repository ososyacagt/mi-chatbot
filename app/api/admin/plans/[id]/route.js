import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { getSession, getAdminUser, isSuperAdmin } from "@/lib/auth";

async function authCheck() {
  const user = await getSession();
  if (!user) {
    return { error: "No autorizado", status: 401 };
  }

  const adminUser = await getAdminUser(user.id);
  if (!adminUser || !isSuperAdmin(adminUser)) {
    return { error: "Solo superadmin puede modificar planes", status: 403 };
  }

  return null;
}

export async function PUT(request, { params }) {
  try {
    const authError = await authCheck();
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      );
    }

    // Next.js 16: await params antes de leer id
    const { id } = await params;
    console.log('[PUT plans] params id:', id);

    const body = await request.json();
    console.log('[PUT plans] body recibido:', body);

    const supabase = createSupabaseAdmin();

    // Mapear campos de camelCase a snake_case con conversiones de tipo correctas
    const updateData = {};

    if (body.nombre !== undefined) updateData.nombre = body.nombre;
    if (body.slug !== undefined) updateData.slug = body.slug;

    if (body.precio !== undefined) {
      updateData.precio = parseFloat(body.precio);
      console.log('[PUT plans] precio convertido:', updateData.precio);
    }

    if (body.moneda !== undefined) updateData.moneda = body.moneda;
    if (body.periodo !== undefined) updateData.periodo = body.periodo;
    if (body.descripcion !== undefined) updateData.descripcion = body.descripcion;

    if (body.mensajeLimite !== undefined) {
      updateData.mensaje_limite = body.mensajeLimite ? parseInt(body.mensajeLimite) : null;
      console.log('[PUT plans] mensaje_limite:', updateData.mensaje_limite);
    }

    if (body.documentosLimite !== undefined) {
      updateData.documentos_limite = body.documentosLimite ? parseInt(body.documentosLimite) : null;
      console.log('[PUT plans] documentos_limite:', updateData.documentos_limite);
    }

    if (body.usuariosLimite !== undefined) {
      updateData.usuarios_limite = body.usuariosLimite ? parseInt(body.usuariosLimite) : null;
      console.log('[PUT plans] usuarios_limite:', updateData.usuarios_limite);
    }

    if (body.caracteristicas !== undefined) {
      // Asegurar que características es un array
      if (typeof body.caracteristicas === 'string') {
        try {
          updateData.caracteristicas = JSON.parse(body.caracteristicas);
        } catch (e) {
          updateData.caracteristicas = [];
        }
      } else if (Array.isArray(body.caracteristicas)) {
        updateData.caracteristicas = body.caracteristicas;
      } else {
        updateData.caracteristicas = [];
      }
      console.log('[PUT plans] características procesadas:', updateData.caracteristicas);
    }

    if (body.destacado !== undefined) updateData.destacado = Boolean(body.destacado);
    if (body.activo !== undefined) updateData.activo = Boolean(body.activo);

    if (body.orden !== undefined) {
      updateData.orden = parseInt(body.orden) || 0;
      console.log('[PUT plans] orden:', updateData.orden);
    }

    if (body.ecommerce_modes !== undefined) {
      updateData.ecommerce_modes = Array.isArray(body.ecommerce_modes)
        ? body.ecommerce_modes
        : [];
      console.log('[PUT plan] ecommerce_modes recibido:', updateData.ecommerce_modes);
    }

    if (body.max_productos !== undefined) {
      updateData.max_productos = parseInt(body.max_productos) || 0;
      console.log('[PUT plan] max_productos:', updateData.max_productos);
    }

    if (body.max_categorias !== undefined) {
      updateData.max_categorias = parseInt(body.max_categorias) || 0;
      console.log('[PUT plan] max_categorias:', updateData.max_categorias);
    }

    if (body.max_reglas !== undefined) {
      updateData.max_reglas = parseInt(body.max_reglas) || 0;
      console.log('[PUT plan] max_reglas:', updateData.max_reglas);
    }

    console.log('[PUT plans] updateData final:', JSON.stringify(updateData, null, 2));

    const { data, error } = await supabase
      .from("plans")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    console.log('[PUT plans] supabase result:', {
      success: !error,
      dataId: data?.id,
      error: error?.message
    });

    if (error) {
      console.error('[PUT plans] error detallado:', error);
      throw error;
    }

    console.log("[/api/admin/plans/[id]] ✓ Plan actualizado:", id);
    return NextResponse.json({ plan: data });
  } catch (err) {
    console.error("[/api/admin/plans/[id]] PUT Error completo:", {
      message: err.message,
      code: err.code,
      details: err.details,
      stack: err.stack
    });
    return NextResponse.json(
      { error: "Error actualizando plan: " + err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const authError = await authCheck();
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      );
    }

    // Next.js 16: await params
    const { id } = await params;
    console.log('[DELETE plans] id:', id);

    const supabase = createSupabaseAdmin();

    const { error } = await supabase
      .from("plans")
      .delete()
      .eq("id", id);

    if (error) {
      console.error('[DELETE plans] error:', error);
      throw error;
    }

    console.log("[/api/admin/plans/[id]] ✓ Plan eliminado:", id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/admin/plans/[id]] DELETE Error:", err.message);
    return NextResponse.json(
      { error: "Error eliminando plan" },
      { status: 500 }
    );
  }
}
