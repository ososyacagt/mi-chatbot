import { supabase } from "./supabase";
import { createSupabaseAdmin } from "./supabase-server";
import { getPlanInfo } from "./plans";

export async function checkMessageLimit(clientId) {
  try {
    // Obtener datos del tenant
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("plan, mensaje_limite, mensajes_usados, plan_reset_date")
      .eq("client_id", clientId)
      .single();

    if (tenantError || !tenant) {
      console.error("[usage] Error obteniendo tenant:", tenantError);
      return { allowed: true }; // Por defecto permitir si hay error
    }

    const today = new Date().toISOString().split("T")[0];
    let resetDate = tenant.plan_reset_date;
    let mensajeLimite = tenant.mensaje_limite;
    let mensajesUsados = tenant.mensajes_usados;

    // Si la fecha de reset ya pasó, resetear el contador
    if (resetDate && new Date(resetDate) <= new Date(today)) {
      console.log("[usage] Reseteando contador para:", clientId);

      // Calcular próxima fecha de reset (primer día del próximo mes)
      const nextReset = new Date();
      nextReset.setMonth(nextReset.getMonth() + 1);
      nextReset.setDate(1);
      const nextResetStr = nextReset.toISOString().split("T")[0];

      // Actualizar en la base de datos
      await supabase
        .from("tenants")
        .update({
          mensajes_usados: 0,
          plan_reset_date: nextResetStr,
        })
        .eq("client_id", clientId);

      mensajesUsados = 0;
      resetDate = nextResetStr;
    }

    // Verificar si está dentro del límite
    const isUnlimited = mensajeLimite === -1;
    const exceedsLimit = !isUnlimited && mensajesUsados >= mensajeLimite;

    console.log("[usage] Check limit para", clientId, ":", {
      plan: tenant.plan,
      limite: mensajeLimite,
      usados: mensajesUsados,
      allowed: !exceedsLimit,
    });

    return {
      allowed: !exceedsLimit,
      limit: mensajeLimite,
      used: mensajesUsados,
      remaining: isUnlimited ? -1 : Math.max(0, mensajeLimite - mensajesUsados),
      resetDate: resetDate,
      plan: tenant.plan,
    };
  } catch (err) {
    console.error("[usage] Error inesperado en checkMessageLimit:", err);
    return { allowed: true }; // Por defecto permitir si hay error
  }
}

export async function incrementMessageCount(clientId) {
  try {
    const supabaseAdmin = createSupabaseAdmin();

    const { data, error } = await supabaseAdmin.rpc("increment_message_count", {
      p_client_id: clientId,
    });

    if (error) {
      console.error("[usage] Error incrementando contador:", error);
      return null;
    }

    console.log("[usage] ✓ Contador incrementado para:", clientId);
    return data;
  } catch (err) {
    console.error("[usage] Error inesperado en incrementMessageCount:", err);
    return null;
  }
}
