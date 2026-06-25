import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request, { params }) {
  try {
    const { clientId } = await params;
    console.log('[pos] GET clientId:', clientId);

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Obtener configuración del tenant
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, store_name, color_primary, currency")
      .eq("client_id", clientId)
      .single();

    if (tenantError || !tenant) {
      console.log('[pos] Error tenant:', tenantError, 'tenant:', tenant);
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    // Obtener áreas
    const { data: areas } = await supabase
      .from("pos_areas")
      .select("*")
      .eq("tenant_id", clientId)
      .eq("activo", true);

    // Obtener mesas
    const { data: mesas } = await supabase
      .from("pos_tables")
      .select("*")
      .eq("tenant_id", clientId)
      .order("numero");

    // Obtener categorías
    const { data: categories } = await supabase
      .from("categories")
      .select("id, nombre, emoji")
      .eq("tenant_id", clientId)
      .eq("activo", true)
      .order("nombre");

    // Obtener productos
    const { data: products } = await supabase
      .from("products")
      .select("id, nombre, precio, imagenes, area_preparacion_id, category_id")
      .eq("tenant_id", clientId)
      .eq("activo", true)
      .order("nombre");

    return NextResponse.json({
      config: {
        storeName: tenant.store_name,
        colorPrimary: tenant.color_primary,
        currency: tenant.currency || "USD"
      },
      areas: areas || [],
      mesas: mesas || [],
      categories: categories || [],
      products: products || []
    });
  } catch (error) {
    console.error("[GET /api/pos/[clientId]] Error:", error.message);
    console.error("[GET /api/pos/[clientId]] Stack:", error.stack);
    return NextResponse.json(
      { error: "Error al obtener configuración del POS: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { clientId } = await params;
    const body = await request.json();
    console.log('[pos] POST clientId:', clientId);
    console.log('[pos] POST body:', JSON.stringify(body, null, 2));

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Generar número de orden único
    const numeroOrden = "POS-" + Date.now().toString(36).toUpperCase();

    // Crear orden con campos correctos de la tabla orders
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        tenant_id: clientId,
        numero_orden: numeroOrden,
        cliente_nombre: body.clienteNombre || null,
        cliente_telefono: body.clienteTelefono || null,
        cliente_direccion: body.clienteDireccion || null,
        items: body.items || [],
        subtotal: body.subtotal || 0,
        descuento: 0,
        total: body.total || 0,
        moneda: body.currency || "USD",
        metodo_pago: body.metodoPago || "efectivo",
        tipo_orden: body.tipoOrden || "mostrador",
        mesa_id: body.mesaId || null,
        mesa_numero: body.mesaNumero || null,
        status: "pendiente",
        notas: body.notas || "",
        reglas_aplicadas: [],
        origen: "pos",
        monto_recibido: body.montoRecibido || 0,
        status_historial: [
          {
            status: "pendiente",
            timestamp: new Date().toISOString(),
            nota: "Orden creada desde POS"
          }
        ]
      })
      .select()
      .single();

    if (orderError) {
      console.log('[pos] Error creating order:', orderError);
      throw orderError;
    }

    console.log('[pos] ✓ Orden creada:', order.id, numeroOrden);

    return NextResponse.json(
      {
        order: {
          id: order.id,
          numeroOrden: order.numero_orden,
          status: order.status,
          total: order.total,
          moneda: order.moneda
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/pos/[clientId]] Error:", error.message);
    console.error("[POST /api/pos/[clientId]] Stack:", error.stack);
    return NextResponse.json(
      { error: "Error al crear orden: " + error.message },
      { status: 500 }
    );
  }
}
