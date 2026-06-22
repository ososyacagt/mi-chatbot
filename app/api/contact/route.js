import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contacto@ejemplo.com";

export async function POST(request) {
  try {
    const { nombre, email, empresa, plan, mensaje } = await request.json();

    if (!nombre || !email || !empresa || !mensaje) {
      return Response.json(
        { error: "Campos requeridos faltantes" },
        { status: 400 }
      );
    }

    console.log("[contact] Enviando solicitud de contacto:", {
      nombre,
      email,
      empresa,
      plan
    });

    // Enviar email al admin
    await resend.emails.send({
      from: "ChatBot <onboarding@resend.dev>",
      to: CONTACT_EMAIL,
      replyTo: email,
      subject: `📋 Nueva solicitud de contacto - Plan ${plan || "General"}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Nueva solicitud de contacto</h2>

          <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Nombre:</strong> ${nombre}</p>
            <p style="margin: 8px 0 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 8px 0 0;"><strong>Empresa:</strong> ${empresa}</p>
            ${plan ? `<p style="margin: 8px 0 0;"><strong>Plan interesado:</strong> ${plan}</p>` : ""}
          </div>

          <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid ${process.env.NEXT_PUBLIC_BRAND_COLOR || '#3b82f6'}; margin: 16px 0;">
            <h3 style="margin: 0 0 8px 0; color: #1e293b;">Mensaje:</h3>
            <p style="margin: 0; white-space: pre-wrap; color: #475569;">${mensaje}</p>
          </div>

          <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
            Responde a este email para contactar directamente con el cliente.
          </p>
        </div>
      `
    });

    // Enviar confirmación al cliente
    await resend.emails.send({
      from: "ChatBot <onboarding@resend.dev>",
      to: email,
      subject: "Hemos recibido tu solicitud",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">¡Gracias por tu interés!</h2>
          <p style="color: #475569;">Hola ${nombre},</p>
          <p style="color: #475569;">Hemos recibido tu solicitud correctamente. Nuestro equipo de ventas se pondrá en contacto contigo pronto.</p>

          <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
            Si tienes dudas, no dudes en responder a este email.
          </p>
        </div>
      `
    });

    console.log("[contact] ✓ Emails enviados correctamente");

    return Response.json({ success: true });
  } catch (err) {
    console.error("[contact] Error:", err);
    return Response.json(
      { error: "Error enviando solicitud de contacto" },
      { status: 500 }
    );
  }
}
