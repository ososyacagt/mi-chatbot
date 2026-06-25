import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request, { params }) {
  try {
    const { clientId, orderId } = await params;
    const body = await request.json();
    const { newOrders, remainingItems } = body;

    if (!clientId || !orderId) {
      return NextResponse.json(
        { error: "clientId y orderId son requeridos" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // 1. Fetch original order
    const { data: originalOrder, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("tenant_id", clientId)
      .single();

    if (fetchError || !originalOrder) {
      return NextResponse.json(
        { error: "Orden original no encontrada" },
        { status: 404 }
      );
    }

    // 2. Update original order
    const remainingSubtotal = (remainingItems || []).reduce(
      (sum, item) => sum + (item.precio * (item.quantity || item.cantidad || 1)),
      0
    );

    // Group remaining items by preparation area for area_comandas
    const remainingAreaComandas = {};
    (remainingItems || []).forEach(item => {
      const areaId = item.area_preparacion_id || "sin_area";
      if (!remainingAreaComandas[areaId]) {
        remainingAreaComandas[areaId] = [];
      }
      remainingAreaComandas[areaId].push({
        id: item.productId || item.id || null,
        nombre: item.nombre || "",
        cantidad: item.quantity || item.cantidad || 1,
        notas: item.notas || "",
        status: item.status || "ingresada"
      });
    });

    const originalHistorial = Array.isArray(originalOrder.pos_historial)
      ? originalOrder.pos_historial
      : [];

    const updatedOriginalHistorial = [
      ...originalHistorial,
      {
        de: originalOrder.pos_status,
        a: originalOrder.pos_status,
        posUserId: originalOrder.pos_user_id,
        timestamp: new Date().toISOString(),
        nota: "Orden dividida. Items transferidos a otras cuentas."
      }
    ];

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        items: remainingItems || [],
        subtotal: remainingSubtotal,
        total: remainingSubtotal,
        area_comandas: remainingAreaComandas,
        pos_historial: updatedOriginalHistorial
      })
      .eq("id", orderId);

    if (updateError) throw updateError;

    // 3. Create new orders
    for (let i = 0; i < (newOrders || []).length; i++) {
      const splitInfo = newOrders[i];
      const splitItems = splitInfo.items || [];
      const splitSubtotal = splitItems.reduce(
        (sum, item) => sum + (item.precio * (item.quantity || item.cantidad || 1)),
        0
      );
      const numeroOrden = "POS-SPL-" + Date.now().toString(36).toUpperCase() + "-" + (i + 1);

      // Group split items by area for area_comandas
      const splitAreaComandas = {};
      splitItems.forEach(item => {
        const areaId = item.area_preparacion_id || "sin_area";
        if (!splitAreaComandas[areaId]) {
          splitAreaComandas[areaId] = [];
        }
        splitAreaComandas[areaId].push({
          id: item.productId || item.id || null,
          nombre: item.nombre || "",
          cantidad: item.quantity || item.cantidad || 1,
          notas: item.notas || "",
          status: "ingresada"
        });
      });

      const splitHistorial = [
        {
          de: null,
          a: originalOrder.pos_status,
          posUserId: originalOrder.pos_user_id,
          timestamp: new Date().toISOString(),
          nota: `Orden creada por división de la orden ${originalOrder.numero_orden}`
        }
      ];

      const { error: insertError } = await supabase
        .from("orders")
        .insert({
          tenant_id: clientId,
          numero_orden: numeroOrden,
          cliente_nombre: splitInfo.clienteNombre || `Mesa ${originalOrder.mesa_numero} - Cuenta ${i + 2}`,
          items: splitItems,
          subtotal: splitSubtotal,
          descuento: 0,
          total: splitSubtotal,
          moneda: originalOrder.moneda || "USD",
          metodo_pago: originalOrder.metodo_pago || "efectivo",
          tipo_orden: "mesa",
          mesa_id: originalOrder.mesa_id,
          mesa_numero: originalOrder.mesa_numero,
          status: originalOrder.status || "pendiente",
          notas: originalOrder.notas || "",
          origen: "pos",
          pos_status: originalOrder.pos_status || "enviada",
          pos_user_id: originalOrder.pos_user_id || null,
          pos_historial: splitHistorial,
          area_comandas: splitAreaComandas
        });

      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/pos/[clientId]/orders/[orderId]/split] Error:", error.message);
    return NextResponse.json(
      { error: "Error al dividir la cuenta: " + error.message },
      { status: 500 }
    );
  }
}
