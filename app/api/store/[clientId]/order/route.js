import { checkStock, updateStock, createOrder } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export async function POST(request, { params }) {
  try {
    const { clientId } = await params;
    const {
      items,
      clienteNombre,
      clienteTelefono,
      clienteDireccion,
      notas,
      metodoPago,
      subtotal,
      descuentos,
      total,
    } = await request.json();

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

    const order = await createOrder({
      tenantId: clientId,
      clienteNombre,
      clienteTelefono,
      clienteDireccion,
      notas,
      metodoPago: metodoPago || "whatsapp",
      items,
      subtotal,
      descuentos,
      total,
    });

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
      order,
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
