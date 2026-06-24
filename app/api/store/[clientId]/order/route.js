import { checkStock, updateStock, createOrder } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export async function POST(request, { params }) {
  try {
    const { clientId } = await params;
    const body = await request.json();

    console.log('[order] body recibido:', JSON.stringify(body, null, 2));

    const {
      items,
      giftItems,
      appliedRules,
      clienteNombre,
      clienteEmail,
      clienteTelefono,
      clienteDireccion,
      clienteCiudad,
      clientePais,
      notas,
      metodoPago,
      subtotal,
      descuentos,
      total,
    } = body;

    if (!clientId || !items || !clienteNombre) {
      return Response.json(
        { error: "clientId, items y clienteNombre son requeridos" },
        { status: 400 }
      );
    }

    console.log("[POST /api/store/[clientId]/order] Creando orden para:", clientId);

    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("client_id", clientId)
      .single();

    if (!tenant) {
      return Response.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    for (const item of items) {
      const hasStock = await checkStock(item.productId, item.quantity);

      if (!hasStock) {
        return Response.json(
          { error: `Stock insuficiente para ${item.nombre}` },
          { status: 400 }
        );
      }
    }

    const todosLosItems = [
      ...(items || []),
      ...(giftItems || []).map(g => ({
        ...g,
        precio: 0,
        esRegalo: true
      }))
    ];

    const order = await createOrder({
      tenantId: clientId,
      clienteNombre,
      clienteEmail: clienteEmail || undefined,
      clienteTelefono,
      clienteDireccion,
      clienteCiudad: clienteCiudad || undefined,
      clientePais: clientePais || undefined,
      notas,
      metodoPago: metodoPago || "whatsapp",
      items: todosLosItems,
      subtotal,
      descuentos,
      total,
    });

    console.log('[order] Resultado createOrder:', { order, hasError: !order });

    if (!order) {
      return Response.json(
        { error: "Error al crear la orden" },
        { status: 500 }
      );
    }

    for (const item of items) {
      await updateStock(item.productId, item.quantity);
    }

    console.log("[POST /api/store/[clientId]/order] ✓ Orden creada:", order.numero_orden);

    return Response.json({
      order: {
        id: order.id,
        numero_orden: order.numero_orden,
        status: order.status,
        trackingUrl: `/orden/${order.id}`,
        ...order,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/store/[clientId]/order] Error completo:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return Response.json(
      { error: "Error al crear la orden" },
      { status: 500 }
    );
  }
}
