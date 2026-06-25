import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(request, { params }) {
  try {
    const { clientId, orderId } = await params;
    const body = await request.json();
    const { items: newItems, posUserId } = body;

    if (!clientId || !orderId) {
      return NextResponse.json(
        { error: "clientId y orderId son requeridos" },
        { status: 400 }
      );
    }

    if (!newItems || !Array.isArray(newItems) || newItems.length === 0) {
      return NextResponse.json(
        { error: "items es requerido y debe ser un array no vacío" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // 1. Fetch current order
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("tenant_id", clientId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    // 2. Calculate new totals
    const currentItems = order.items || [];
    const updatedItems = [...currentItems, ...newItems];

    let newItemsTotal = 0;
    newItems.forEach(item => {
      newItemsTotal += (item.precio || 0) * (item.cantidad || 1);
    });

    const newSubtotal = (order.subtotal || 0) + newItemsTotal;
    const newTotal = (order.total || 0) + newItemsTotal;

    // 3. Update area_comandas
    const areaComandas = order.area_comandas || {};
    newItems.forEach((item) => {
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

    // 4. Update order status and history
    const oldStatus = order.pos_status || "enviada";
    const nextStatus = "enviada"; // go back to sent status so kitchen gets notified

    let statusHistorial = [];
    if (order.pos_historial) {
      try {
        statusHistorial = typeof order.pos_historial === "string"
          ? JSON.parse(order.pos_historial)
          : order.pos_historial;
      } catch (e) {
        statusHistorial = [];
      }
    }

    const updatedHistorial = [
      ...statusHistorial,
      {
        de: oldStatus,
        a: nextStatus,
        posUserId: posUserId || null,
        timestamp: new Date().toISOString(),
        nota: "Nuevos productos agregados a la orden"
      }
    ];

    // 5. Update Supabase
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        items: updatedItems,
        subtotal: newSubtotal,
        total: newTotal,
        area_comandas: areaComandas,
        pos_status: nextStatus,
        pos_historial: updatedHistorial
      })
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      order: {
        id: updatedOrder.id,
        items: updatedOrder.items,
        total: updatedOrder.total,
        pos_status: updatedOrder.pos_status
      }
    });
  } catch (error) {
    console.error("[PATCH /api/pos/[clientId]/orders/[orderId]/items] Error:", error.message);
    return NextResponse.json(
      { error: "Error al agregar ítems a la orden: " + error.message },
      { status: 500 }
    );
  }
}
