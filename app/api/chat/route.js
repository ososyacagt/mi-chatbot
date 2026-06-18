import { getTenant } from "@/lib/tenants-db";
import { getDocumentsContext } from "@/lib/documents-db";
import { sendMessage } from "@/lib/ai-provider";
import { saveMessage } from "@/lib/conversations-db";
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
      await saveMessage(tenant.id, sessionId, "user", lastMessage.content);
    }

    // Guardar respuesta del bot
    await saveMessage(tenant.id, sessionId, "assistant", response.reply);

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
