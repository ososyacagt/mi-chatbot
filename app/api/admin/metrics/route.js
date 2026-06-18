import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase-server";
import { getSession, getAdminUser, isSuperAdmin } from "@/lib/auth";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const periodo = searchParams.get("periodo") || "7d";

    console.log("[metrics] query params:", { clientId, clientIdType: typeof clientId, periodo });

    if (!clientId) {
      console.warn("[metrics] clientId faltante");
      return NextResponse.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    // Verificar sesión
    console.log("[metrics] verificando sesión...");
    const user = await getSession();
    console.log("[metrics] user:", user?.id, user?.email);

    if (!user) {
      console.warn("[metrics] sesión no válida");
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener datos del usuario admin
    console.log("[metrics] obteniendo datos del usuario admin...");
    const adminUser = await getAdminUser(user.id);
    console.log("[metrics] adminUser:", { adminUser });

    if (!adminUser) {
      console.warn("[metrics] usuario no tiene permisos admin");
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    // Verificar permisos: admin solo puede ver sus clientes
    if (!isSuperAdmin(adminUser)) {
      const tenantIds = adminUser.tenant_ids || [];
      console.log("[metrics] admin verification:", { clientId, tenantIds, hasAccess: tenantIds.includes(clientId) });
      if (!tenantIds.includes(clientId)) {
        console.warn("[metrics] admin sin permiso para ver este cliente");
        return NextResponse.json(
          { error: "No tienes permiso para ver este cliente" },
          { status: 403 }
        );
      }
    } else {
      console.log("[metrics] usuario es superadmin, acceso total");
    }

    // Usar cliente admin para llamadas RPC
    const supabase = createSupabaseAdmin();

    // Calcular rango de fechas
    const hoy = new Date().toISOString().split("T")[0];
    const inicio = new Date();
    const dias = periodo === "30d" ? 30 : periodo === "90d" ? 90 : 7;
    inicio.setDate(inicio.getDate() - dias);
    const inicioStr = inicio.toISOString().split("T")[0];

    console.log("[metrics] rango fechas:", { inicioStr, hoy, dias, clientId });

    // Obtener métricas usando función RPC
    console.log("[metrics] llamando RPC get_metrics_by_date con:", { clientId, inicioStr, hoy });

    const { data: metrics, error: metricsError } = await supabase.rpc(
      "get_metrics_by_date",
      {
        p_tenant_id: clientId,
        p_inicio_fecha: inicioStr,
        p_fin_fecha: hoy,
      }
    );

    console.log("[metrics] RPC ejecutado:", { clientId, inicioStr, hoy });
    console.log("[metrics] datos raw de supabase:", { dataLength: metrics?.length, metricsError, data: metrics });

    if (metricsError) {
      console.error("[metrics] Error obteniendo métricas:", metricsError);
      // Si hay error, retorna estructura vacía válida en lugar de fallar
      console.log("[metrics] retornando estructura vacía debido a error");
      return NextResponse.json({
        resumen: {
          totalConversaciones: 0,
          totalMensajes: 0,
          promedioMensajesPorConversacion: 0,
          diasActivos: 0,
        },
        porDia: [],
      });
    }

    // Manejar cuando no hay datos
    const metricsData = metrics || [];
    console.log("[metrics] procesando", metricsData.length, "registros");

    // Calcular resumen
    const totalConversaciones = metricsData.reduce(
      (sum, m) => {
        const val = m.total_conversaciones || 0;
        console.log("[metrics] sumando conversaciones:", val, "suma parcial:", sum + val);
        return sum + val;
      },
      0
    );

    const totalMensajes = metricsData.reduce(
      (sum, m) => {
        const val = m.total_mensajes || 0;
        console.log("[metrics] sumando mensajes:", val, "suma parcial:", sum + val);
        return sum + val;
      },
      0
    );

    const promedioMensajesPorConversacion =
      totalConversaciones > 0
        ? parseFloat((totalMensajes / totalConversaciones).toFixed(2))
        : 0;
    const diasActivos = metricsData.length;

    const resumen = {
      totalConversaciones,
      totalMensajes,
      promedioMensajesPorConversacion,
      diasActivos,
    };

    // Preparar datos por día
    const porDia = metricsData.map((m) => ({
      fecha: m.fecha,
      conversaciones: m.total_conversaciones || 0,
      mensajes: m.total_mensajes || 0,
    }));

    console.log("[metrics] resumen calculado:", resumen);
    console.log("[metrics] ✓ retornando:", { resumen, porDiaLength: porDia.length, porDia });

    return NextResponse.json({
      resumen,
      porDia,
    });
  } catch (error) {
    console.error("[metrics] Error inesperado:", error);
    // Retornar estructura válida incluso en error
    return NextResponse.json({
      resumen: {
        totalConversaciones: 0,
        totalMensajes: 0,
        promedioMensajesPorConversacion: 0,
        diasActivos: 0,
      },
      porDia: [],
    });
  }
}
