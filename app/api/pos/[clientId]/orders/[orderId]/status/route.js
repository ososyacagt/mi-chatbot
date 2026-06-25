import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function PUT(request, { params }) {
  try {
    const { clientId, orderId } = await params;
    const body = await request.json();
    const { nuevoStatus, posUserId, nota, montoRecibido } = body;

    if (!clientId || !orderId) {
      return NextResponse.json(
        { error: "clientId y orderId son requeridos" },
        { status: 400 }
      );
    }

    if (!nuevoStatus) {
      return NextResponse.json(
        { error: "nuevoStatus es requerido" },
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

    const oldStatus = order.pos_status || "ingresando";
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

    // 2. Determine fields to update
    const updateData = {
      pos_status: nuevoStatus,
      pos_historial: [
        ...statusHistorial,
        {
          de: oldStatus,
          a: nuevoStatus,
          posUserId: posUserId || null,
          timestamp: new Date().toISOString(),
          nota: nota || ""
        }
      ]
    };

    // If order is paid, update the main status as well
    if (nuevoStatus === "facturado_finalizado") {
      updateData.status = "completada";
    }

    // Update cajero_id & cobrado_at on billing transitions
    if (nuevoStatus === "facturado_finalizado" || nuevoStatus === "facturado_pendiente_entrega") {
      if (posUserId) {
        updateData.cajero_id = posUserId;
      }
      updateData.cobrado_at = new Date().toISOString();
      if (montoRecibido !== undefined) {
        updateData.monto_recibido = montoRecibido;
      }
    }

    // Update entrega_user_id & entregado_at on delivery finalization
    if (nuevoStatus === "facturado_finalizado" && oldStatus === "facturado_pendiente_entrega") {
      if (posUserId) {
        updateData.entrega_user_id = posUserId;
      }
      updateData.entregado_at = new Date().toISOString();
    }

    // 3. Perform update in Supabase
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      order: {
        id: updatedOrder.id,
        pos_status: updatedOrder.pos_status,
        pos_historial: updatedOrder.pos_historial,
        status: updatedOrder.status
      }
    });
  } catch (error) {
    console.error("[PUT /api/pos/[clientId]/orders/[orderId]/status] Error:", error.message);
    return NextResponse.json(
      { error: "Error al actualizar estado de la orden: " + error.message },
      { status: 500 }
    );
  }
}
