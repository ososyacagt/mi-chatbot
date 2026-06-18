import { getTenant } from "@/lib/tenants-db";
import { sendMessage } from "@/lib/ai-provider";

export async function POST(request) {
  try {
    const { messages, clientId } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: "Se requiere un arreglo 'messages' con al menos un mensaje." },
        { status: 400 }
      );
    }

    const tenant = await getTenant(clientId);

    // Usa el proveedor y modelo del tenant, o Claude por defecto
    const provider = tenant.aiProvider || "claude";
    const model = tenant.aiModel || "claude-sonnet-4-6";

    const response = await sendMessage({
      provider,
      model,
      systemPrompt: tenant.systemPrompt,
      messages,
    });

    return Response.json({ reply: response.reply });
  } catch (error) {
    console.error("Error en /api/chat:", error);
    return Response.json(
      { error: error.message || "Ocurrió un error al procesar el mensaje." },
      { status: 500 }
    );
  }
}
