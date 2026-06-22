import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { getSession, getAdminUser, isSuperAdmin } from "@/lib/auth";

export async function GET(request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const adminUser = await getAdminUser(user.id);
    if (!adminUser || !isSuperAdmin(adminUser)) {
      return NextResponse.json(
        { error: "Solo superadmin puede ver planes" },
        { status: 403 }
      );
    }

    const supabase = createSupabaseAdmin();
    console.log('[GET /api/admin/plans] Consultando tabla plans...');

    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("orden", { ascending: true });

    console.log('[GET /api/admin/plans] Resultado:', {
      count: data?.length,
      planes: data?.map(p => ({
        id: p.id,
        nombre: p.nombre,
        caracteristicas: p.caracteristicas,
        caracteristicasLength: p.caracteristicas?.length,
        caracteristicasType: typeof p.caracteristicas
      })),
      error: error?.message
    });

    if (error) throw error;

    return NextResponse.json({ plans: data || [] });
  } catch (err) {
    console.error("[/api/admin/plans] GET Error:", err);
    return NextResponse.json(
      { error: "Error obteniendo planes" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const adminUser = await getAdminUser(user.id);
    if (!adminUser || !isSuperAdmin(adminUser)) {
      return NextResponse.json(
        { error: "Solo superadmin puede crear planes" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      nombre,
      slug,
      precio,
      moneda,
      periodo,
      descripcion,
      mensajeLimite,
      documentosLimite,
      usuariosLimite,
      caracteristicas,
      destacado,
      activo,
      orden
    } = body;

    if (!nombre || !slug || precio === undefined) {
      return NextResponse.json(
        { error: "Campos requeridos: nombre, slug, precio" },
        { status: 400 }
      );
    }

    // Garantizar que características sea array
    let caracteristicasArray = [];
    if (Array.isArray(caracteristicas)) {
      caracteristicasArray = caracteristicas;
    } else if (typeof caracteristicas === 'string') {
      try {
        caracteristicasArray = JSON.parse(caracteristicas || '[]');
      } catch (e) {
        caracteristicasArray = [];
      }
    }

    console.log("[/api/admin/plans] POST Características procesadas:", caracteristicasArray);

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("plans")
      .insert({
        nombre,
        slug,
        precio: parseFloat(precio),
        moneda: moneda || "USD",
        periodo: periodo || "mes",
        descripcion,
        mensaje_limite: mensajeLimite ? parseInt(mensajeLimite) : null,
        documentos_limite: documentosLimite ? parseInt(documentosLimite) : null,
        usuarios_limite: usuariosLimite ? parseInt(usuariosLimite) : null,
        caracteristicas: caracteristicasArray,
        destacado: Boolean(destacado),
        activo: activo !== false,
        orden: parseInt(orden) || 0
      })
      .select()
      .single();

    if (error) throw error;

    console.log("[/api/admin/plans] ✓ Plan creado:", data.id, "con características:", data.caracteristicas);
    return NextResponse.json({ plan: data });
  } catch (err) {
    console.error("[/api/admin/plans] POST Error:", err);
    return NextResponse.json(
      { error: "Error creando plan" },
      { status: 500 }
    );
  }
}
