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
      .select("id, store_name, color_primary, currency, pos_modalidad, pos_flujo_cobro")
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
      .select("id, nombre, precio, imagenes, area_preparacion_id, category_id, customization_options")
      .eq("tenant_id", clientId)
      .eq("activo", true)
      .order("nombre");

    return NextResponse.json({
      config: {
        storeName: tenant.store_name,
        colorPrimary: tenant.color_primary,
        currency: tenant.currency || "USD",
        posModalidad: tenant.pos_modalidad || [],
        posFlujoCobro: tenant.pos_flujo_cobro || "entrega_inmediata"
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

    // Fetch tenant pos configuration to know the flow
    const { data: tenant } = await supabase
      .from("tenants")
      .select("pos_flujo_cobro")
      .eq("client_id", clientId)
      .single();

    const posFlujoCobro = tenant?.pos_flujo_cobro || "entrega_inmediata";
    const tipoOrden = body.tipoOrden || "mostrador"; // 'mostrador', 'restaurante', 'auto_servicio'

    // Determine initial pos_status
    let posStatus = "pendiente_cobro";
    if (tipoOrden === "auto_servicio") {
      posStatus = "facturado_finalizado";
    } else if (tipoOrden === "restaurante") {
      posStatus = "enviada";
    } else if (tipoOrden === "mostrador") {
      if (posFlujoCobro === "entrega_inmediata") {
        posStatus = "facturado_finalizado";
      } else {
        posStatus = "pendiente_cobro";
      }
    }

    const mainStatus = posStatus === "facturado_finalizado" ? "completada" : "pendiente";

    // Generar número de orden único
    const numeroOrden = "POS-" + Date.now().toString(36).toUpperCase();

    // Group items by preparation area to populate area_comandas
    const areaComandas = {};
    const items = body.items || [];
    items.forEach((item) => {
      // Use area_preparacion_id if available, otherwise 'sin_area'
      const areaId = item.area_preparacion_id || "sin_area";
      if (!areaComandas[areaId]) {
        areaComandas[areaId] = [];
      }
      areaComandas[areaId].push({
        id: item.id || null,
        nombre: item.nombre || "",
        cantidad: item.cantidad || 1,
        notas: item.notas || "",
        status: "ingresada"
      });
    });

    // Create history record
    const posHistorial = [
      {
        de: null,
        a: posStatus,
        posUserId: body.posUserId || null,
        timestamp: new Date().toISOString(),
        nota: "Orden creada desde POS"
      }
    ];

    // Crear orden con campos correctos de la tabla orders
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        tenant_id: clientId,
        numero_orden: numeroOrden,
        cliente_nombre: body.clienteNombre || null,
        cliente_telefono: body.clienteTelefono || null,
        cliente_direccion: body.clienteDireccion || null,
        items: items,
        subtotal: body.subtotal || 0,
        descuento: 0,
        total: body.total || 0,
        moneda: body.currency || "USD",
        metodo_pago: body.metodoPago || "efectivo",
        tipo_orden: tipoOrden,
        mesa_id: body.mesaId || null,
        mesa_numero: body.mesaNumero || null,
        status: mainStatus,
        notas: body.notas || "",
        reglas_aplicadas: [],
        origen: "pos",
        monto_recibido: body.montoRecibido || 0,
        cobrado_at: posStatus === "facturado_finalizado" ? new Date().toISOString() : null,
        pos_status: posStatus,
        pos_substatus: null,
        pos_user_id: body.posUserId || null,
        cajero_id: (posStatus === "facturado_finalizado" && body.posUserId) ? body.posUserId : null,
        pos_historial: posHistorial,
        area_comandas: areaComandas,
        status_historial: [
          {
            status: mainStatus,
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
          pos_status: order.pos_status,
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
