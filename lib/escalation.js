import { createSupabaseAdmin } from "./supabase-server";
import { sendPushNotification } from "./push-notifications";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const ESCALATION_KEYWORDS = [
  "hablar con humano",
  "hablar con un humano",
  "hablar con una humano",
  "hablar con persona",
  "hablar con una persona",
  "hablar con un persona",
  "agente humano",
  "hablar con alguien",
  "persona real",
  "representante",
  "hablar con un agente",
  "hablar con una agente",
  "soporte humano",
  "quiero hablar",
  "need to speak",
  "speak to human",
  "speak to a human",
  "talk to human",
  "talk to a human",
  "human agent",
  "real person",
  "need human",
  "necesito humano",
  "necesito persona",
  "quiero un humano",
  "quiero una persona",
  "puedo hablar",
  "podría hablar",
  "atención humana",
  "atienda humano",
];

export function detectEscalation(message) {
  const lower = message.toLowerCase();
  return ESCALATION_KEYWORDS.some((keyword) => lower.includes(keyword));
}

export async function createEscalation({
  tenantId,
  sessionId,
  mensajeTrigger,
  adminEmail,
}) {
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("escalations")
      .insert({
        tenant_id: tenantId,
        session_id: sessionId,
        mensaje_trigger: mensajeTrigger,
        admin_email: adminEmail,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    if (adminEmail) {
      await sendPushNotification({
        adminEmail: adminEmail,
        title: '🆘 Nueva escalación',
        body: `Usuario solicita atención humana en ${tenantId}`,
        url: '/admin/escalaciones'
      });
    }

    return data;
  } catch (err) {
    console.error("[escalation] Error creando escalación:", err);
    return null;
  }
}

export async function sendEscalationEmail({
  adminEmail,
  tenantNombre,
  mensajeTrigger,
  sessionId,
}) {
  try {
    if (!process.env.RESEND_API_KEY || !adminEmail) {
      return false;
    }

    await resend.emails.send({
      from: "ChatBot <onboarding@resend.dev>",
      to: adminEmail,
      subject: `🆘 Solicitud de atención humana - ${tenantNombre}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">🆘 Solicitud de atención humana</h2>
          <p>Un usuario de <strong>${tenantNombre}</strong> ha solicitado hablar con un humano.</p>
          <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Mensaje:</strong> "${mensajeTrigger}"</p>
            <p style="margin: 8px 0 0;"><strong>Session ID:</strong> ${sessionId}</p>
          </div>
          <p>Ingresa al panel de administración para ver el historial completo de la conversación.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("[escalation] Error enviando email:", err);
    return false;
  }
}

export async function getEscalations(tenantId, status = null) {
  try {
    const supabase = createSupabaseAdmin();
    let query = supabase
      .from("escalations")
      .select("*")
      .order("created_at", { ascending: false });

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("[escalation] Error obteniendo escalaciones:", err);
    return [];
  }
}

export async function resolveEscalation(escalationId) {
  try {
    const supabase = createSupabaseAdmin();
    await supabase
      .from("escalations")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", escalationId);

    return true;
  } catch (err) {
    console.error("[escalation] Error resolviendo escalación:", err);
    return false;
  }
}

export async function getActiveEscalation(tenantId, sessionId) {
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("escalations")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("session_id", sessionId)
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("[escalation] Error obteniendo escalación activa:", error);
      return null;
    }

    return data || null;
  } catch (err) {
    console.error("[escalation] Error en getActiveEscalation:", err);
    return null;
  }
}
