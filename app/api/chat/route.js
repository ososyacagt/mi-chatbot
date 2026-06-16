import Anthropic from "@anthropic-ai/sdk";
import { getTenant } from "@/lib/tenants-db";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
  try {
    const { messages, clientId } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: "Se requiere un arreglo 'messages' con al menos un mensaje." },
        { status: 400 }
      );
    }

    // Busca la configuración del tenant en Supabase; si falla,
    // usa datos mínimos hardcodeados en lib/tenants-db.js
    const tenant = await getTenant(clientId);

    // Mantiene el historial de la conversación: el cliente envía todos los
    // mensajes previos (usuario y asistente) y se reenvían tal cual a Claude.
    const anthropicMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: tenant.systemPrompt,
      messages: anthropicMessages,
    });

    const reply = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    return Response.json({ reply });
  } catch (error) {
    console.error("Error en /api/chat:", error);
    return Response.json(
      { error: "Ocurrió un error al contactar a Claude." },
      { status: 500 }
    );
  }
}
