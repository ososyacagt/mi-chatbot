import { getTenant } from "@/lib/tenants-db";
import { getDocumentsContext } from "@/lib/documents-db";
import { sendMessage } from "@/lib/ai-provider";
import { saveMessage, updateMetrics, getConversationHistory } from "@/lib/conversations-db";
import { checkMessageLimit, incrementMessageCount } from "@/lib/usage";
import { detectEscalation, createEscalation, sendEscalationEmail, getActiveEscalation } from "@/lib/escalation";
import { getLanguageInstruction } from "@/lib/languages";
import { sendPushNotification } from "@/lib/push-notifications";
import { createSupabaseAdmin } from "@/lib/supabase-server";
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

    // PASO 1: Detectar escalación ANTES de cualquier otra operación
    const userMessage = messages[messages.length - 1]?.content || "";
    const isEscalation = detectEscalation(userMessage);

    if (isEscalation && tenant.escalationEnabled !== false) {
      console.log("[chat] Escalación detectada para:", clientId);
      console.log("[chat] Mensaje disparador:", userMessage);

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

      // Guardar mensaje de escalación
      await saveMessage(tenant.id, sessionId, "assistant", tenant.escalationMessage);

      // Incrementar contador de mensajes
      await incrementMessageCount(clientId);

      console.log("[chat] ✓ Escalación procesada, retornando respuesta");
      // Retornar respuesta especial de escalación SIN llamar a la IA
      return Response.json({
        reply: tenant.escalationMessage,
        escalated: true,
        sessionId,
      });
    }

    // PASO 2: Si NO es escalación, continuar con flujo normal

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

    // Verificar si hay escalación activa con bot desactivado
    const activeEscalation = await getActiveEscalation(clientId, sessionId);
    if (activeEscalation && !activeEscalation.auto_bot_enabled) {
      console.log("[chat] Bot desactivado por escalación activa:", activeEscalation.id);

      // Guardar mensaje del usuario
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") {
        await saveMessage(tenant.id, sessionId, "user", lastMessage.content);

        // Notificar al agente sobre el nuevo mensaje
        if (activeEscalation.admin_email) {
          const messagePreview = lastMessage.content.substring(0, 80);
          await sendPushNotification({
            adminEmail: activeEscalation.admin_email,
            title: "Nuevo mensaje del usuario",
            body: messagePreview + (lastMessage.content.length > 80 ? "..." : ""),
            url: `/admin/escalaciones`,
          }).catch(err => console.error("[chat] Error enviando notificación:", err));
        }
      }

      // Incrementar contador de mensajes
      await incrementMessageCount(clientId);

      return Response.json({
        reply: null,
        agentActive: true,
        sessionId,
      });
    }

    // Usa el proveedor y modelo del tenant, o Claude por defecto
    const provider = tenant.aiProvider || "claude";
    const model = tenant.aiModel || "claude-sonnet-4-6";

    // Obtiene contexto de documentos base
    let systemPrompt = tenant.systemPrompt;

    // Agregar instrucción de idioma
    const languageInstruction = getLanguageInstruction(
      tenant.defaultLanguage || "es",
      tenant.autoDetectLanguage !== false
    );
    systemPrompt += "\n\n" + languageInstruction;

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

      // Verificar si hay escalación activa y notificar al admin
      try {
        const supabase = createSupabaseAdmin();
        const { data: escalation } = await supabase
          .from("escalations")
          .select("*")
          .eq("session_id", sessionId)
          .eq("tenant_id", clientId)
          .in("status", ["pending", "in_progress"])
          .single();

        if (escalation && tenant.adminEmail) {
          console.log('[chat] Enviando notificación al admin sobre respuesta del usuario');
          const messagePreview = lastMessage.content.substring(0, 100);
          await sendPushNotification({
            adminEmail: tenant.adminEmail,
            title: "Nueva respuesta del usuario",
            body: messagePreview + (lastMessage.content.length > 100 ? "..." : ""),
            url: `/admin/escalaciones`,
          });
        }
      } catch (err) {
        console.error('[chat] Error verificando escalación activa:', err);
        // No fallar si hay error enviando notificación
      }
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
