import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request, { params }) {
  try {
    const { clientId } = await params;
    const { searchParams } = new URL(request.url);
    const areaId = searchParams.get("areaId");
    const status = searchParams.get("status") || "pendiente";

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("orders")
      .select("*")
      .eq("tenant_id", clientId)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    // Filtrar comandas por área si se especifica
    const comandas = [];
    for (const order of orders || []) {
      const areaComandas = order.area_comandas || {};

      if (areaId && areaComandas[areaId]) {
        comandas.push({
          orderId: order.id,
          numeroOrden: order.numero_orden,
          mesa: order.tipo_orden === "mesa" ? (order.mesa_numero || order.mesa_id) : null,
          items: areaComandas[areaId],
          createdAt: order.created_at,
          tiempoTranscurrido: Math.floor(
            (Date.now() - new Date(order.created_at).getTime()) / 1000
          ),
          clienteNombre: order.cliente_nombre || "Mostrador"
        });
      } else if (!areaId) {
        // Si no especifica área, retornar todas las comandas
        Object.keys(areaComandas).forEach((aid) => {
          comandas.push({
            orderId: order.id,
            numeroOrden: order.numero_orden,
            areaId: aid,
            mesa: order.tipo_orden === "mesa" ? (order.mesa_numero || order.mesa_id) : null,
            items: areaComandas[aid],
            createdAt: order.created_at,
            tiempoTranscurrido: Math.floor(
              (Date.now() - new Date(order.created_at).getTime()) / 1000
            ),
            clienteNombre: order.cliente_nombre || "Mostrador"
          });
        });
      }
    }

    return NextResponse.json({ comandas });
  } catch (error) {
    console.error("[GET /api/pos/[clientId]/comandas] Error:", error.message);
    return NextResponse.json(
      { error: "Error al obtener comandas" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { clientId } = await params;
    const body = await request.json();
    const { orderId, areaId, itemIndex, status } = body;

    if (!clientId || !orderId || !areaId) {
      return NextResponse.json(
        { error: "orderId y areaId son requeridos" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Obtener orden actual
    const { data: order, error: getError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("tenant_id", clientId)
      .single();

    if (getError || !order) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    const areaComandas = order.area_comandas || {};

    // Actualizar estado del item
    if (areaComandas[areaId] && areaComandas[areaId][itemIndex]) {
      areaComandas[areaId][itemIndex].status = status || "lista";
    }

    // Calcular próximo pos_status del pedido general
    const allStatuses = [];
    Object.keys(areaComandas).forEach((aid) => {
      if (Array.isArray(areaComandas[aid])) {
        areaComandas[aid].forEach((item) => {
          allStatuses.push(item.status || "ingresada");
        });
      }
    });

    let nextPosStatus = order.pos_status || "enviada";
    const oldStatus = order.pos_status || "enviada";

    if (allStatuses.length > 0) {
      if (allStatuses.every(s => s === "lista" || s === "listo")) {
        nextPosStatus = "lista";
      } else if (allStatuses.some(s => s === "en_proceso" || s === "recibida")) {
        if (oldStatus === "enviada") {
          nextPosStatus = "en_preparacion";
        }
      }
    }

    const updateData = {
      area_comandas: areaComandas
    };

    if (nextPosStatus !== oldStatus) {
      updateData.pos_status = nextPosStatus;
      
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

      updateData.pos_historial = [
        ...statusHistorial,
        {
          de: oldStatus,
          a: nextPosStatus,
          posUserId: null,
          timestamp: new Date().toISOString(),
          nota: `Estado general del pedido actualizado automáticamente por Cocina a: ${nextPosStatus}`
        }
      ];
    }

    // Actualizar orden en Supabase
    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, pos_status: nextPosStatus });
  } catch (error) {
    console.error("[PUT /api/pos/[clientId]/comandas] Error:", error.message);
    return NextResponse.json(
      { error: "Error al actualizar comanda: " + error.message },
      { status: 500 }
    );
  }
}
