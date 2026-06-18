import { createSupabaseAdmin } from "./supabase-server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Palabras clave que detectan solicitud de humano
const ESCALATION_KEYWORDS = [
  "hablar con humano",
  "hablar con persona",
  "agente humano",
  "hablar con alguien",
  "persona real",
  "representante",
  "hablar con un agente",
  "soporte humano",
  "speak to human",
  "talk to human",
  "human agent",
  "real person",
  "need human",
  "necesito humano",
  "necesito persona",
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
    console.log("[escalation] ✓ Escalación creada:", data.id);
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
      console.log("[escalation] Email no configurado, saltando envío");
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
    console.log("[escalation] ✓ Email enviado a:", adminEmail);
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
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

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

    console.log("[escalation] ✓ Escalación resuelta:", escalationId);
    return true;
  } catch (err) {
    console.error("[escalation] Error resolviendo escalación:", err);
    return false;
  }
}
