import { getTenant } from "@/lib/tenants-db";
import { getDocumentsContext } from "@/lib/documents-db";
import { sendMessage } from "@/lib/ai-provider";
import { saveMessage, updateMetrics, getConversationHistory } from "@/lib/conversations-db";
import { checkMessageLimit, incrementMessageCount } from "@/lib/usage";
import { detectEscalation, createEscalation, sendEscalationEmail } from "@/lib/escalation";
import { randomUUID } from "crypto";

export async function POST(request) {
  try {
    const { messages, clientId, sessionId: providedSessionId } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: "Se requiere un arreglo 'messages' con al menos un mensaje." },
        { status: 400 }
      );
    }

    const tenant = await getTenant(clientId);
    const sessionId = providedSessionId || randomUUID();

    // Verificar límite de mensajes
    console.log('[chat] Verificando límite de mensajes para:', clientId);
    const limitCheck = await checkMessageLimit(clientId);
    if (!limitCheck.allowed) {
      console.log('[chat] Límite alcanzado:', limitCheck);
      return Response.json(
        {
          error: "Límite de mensajes alcanzado",
          limitReached: true,
          limit: limitCheck.limit,
          used: limitCheck.used,
          resetDate: limitCheck.resetDate,
          plan: limitCheck.plan,
        },
        { status: 429 }
      );
    }

    // Verificar si es una nueva sesión
    const existingMessages = await getConversationHistory(tenant.id, sessionId);
    const isNewSession = existingMessages.length === 0;

    // Verificar escalación a humano
    const userMessage = messages[messages.length - 1]?.content || "";
    const isEscalation = detectEscalation(userMessage);

    if (isEscalation && tenant.escalationEnabled) {
      console.log("[chat] Escalación detectada para:", clientId);

      // Crear registro de escalación
      await createEscalation({
        tenantId: clientId,
        sessionId,
        mensajeTrigger: userMessage,
        adminEmail: tenant.adminEmail,
      });

      // Enviar email si hay adminEmail configurado
      if (tenant.adminEmail) {
        await sendEscalationEmail({
          adminEmail: tenant.adminEmail,
          tenantNombre: tenant.nombre,
          mensajeTrigger: userMessage,
          sessionId,
        });
      }

      // Guardar mensaje del usuario
      await saveMessage(tenant.id, sessionId, "user", userMessage);

      // Retornar respuesta especial de escalación
      return Response.json({
        reply: tenant.escalationMessage,
        escalated: true,
        sessionId,
      });
    }

    // Usa el proveedor y modelo del tenant, o Claude por defecto
    const provider = tenant.aiProvider || "claude";
    const model = tenant.aiModel || "claude-sonnet-4-6";

    // Obtiene contexto de documentos base
    let systemPrompt = tenant.systemPrompt;
    const { texto: docsText, imagenes: docImages } = await getDocumentsContext(clientId);
    if (docsText) {
      systemPrompt += "\n\nCONOCIMIENTO BASE:\n" + docsText;
    }

    const response = await sendMessage({
      provider,
      model,
      systemPrompt,
      messages,
      images: docImages,
    });

    // Guardar mensaje del usuario
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "user") {
      console.log('[chat] guardando mensaje usuario, sessionId:', sessionId, 'tenantId:', tenant.id);
      await saveMessage(tenant.id, sessionId, "user", lastMessage.content);
    }

    // Guardar respuesta del bot
    console.log('[chat] guardando mensaje assistant, sessionId:', sessionId);
    await saveMessage(tenant.id, sessionId, "assistant", response.reply);

    // Actualizar métricas
    console.log('[chat] actualizando metrics para:', tenant.id, 'isNewSession:', isNewSession);
    await updateMetrics(tenant.id, isNewSession);

    // Incrementar contador de mensajes
    console.log('[chat] incrementando contador de mensajes para:', clientId);
    await incrementMessageCount(clientId);

    return Response.json({
      reply: response.reply,
      sessionId
    });
  } catch (error) {
    console.error("Error en /api/chat:", error);
    return Response.json(
      { error: error.message || "Ocurrió un error al procesar el mensaje." },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
