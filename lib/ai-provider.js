import Anthropic from "@anthropic-ai/sdk";

export const AI_PROVIDERS = [
  {
    id: "claude",
    nombre: "Claude (Anthropic)",
    modelos: ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
    defaultModel: "claude-sonnet-4-6",
    requiresKey: true,
  },
  {
    id: "openai",
    nombre: "OpenAI (GPT)",
    modelos: ["gpt-4o", "gpt-4o-mini"],
    defaultModel: "gpt-4o-mini",
    requiresKey: true,
  },
  {
    id: "groq",
    nombre: "Groq (Gratis)",
    modelos: ["llama3-8b-8192", "llama3-70b-8192", "mixtral-8x7b-32768"],
    defaultModel: "llama3-8b-8192",
    requiresKey: true,
  },
  {
    id: "gemini",
    nombre: "Google Gemini",
    modelos: ["gemini-1.5-flash", "gemini-1.5-pro"],
    defaultModel: "gemini-1.5-flash",
    requiresKey: true,
  },
  {
    id: "mistral",
    nombre: "Mistral AI",
    modelos: ["mistral-small-latest", "mistral-medium-latest", "mistral-large-latest"],
    defaultModel: "mistral-small-latest",
    requiresKey: true,
  },
  {
    id: "ollama",
    nombre: "Ollama (Local)",
    modelos: ["llama3", "mistral", "phi3"],
    defaultModel: "llama3",
    requiresKey: false,
  },
];

async function sendWithClaude(model, systemPrompt, messages, images = []) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const processedMessages = messages.map((msg, idx) => {
    if (idx === 0 && msg.role === "user" && images.length > 0) {
      const content = [{ type: "text", text: msg.content }];
      images.forEach((img) => {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: img,
          },
        });
      });
      return { ...msg, content };
    }
    return msg;
  });

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system: systemPrompt,
    messages: processedMessages,
  });

  const reply = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  return { reply };
}

async function sendWithOpenAI(model, systemPrompt, messages, images = []) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OpenAI API key not configured. Set OPENAI_API_KEY environment variable."
    );
  }

  const processedMessages = messages.map((msg, idx) => {
    if (idx === 0 && msg.role === "user" && images.length > 0) {
      const content = [{ type: "text", text: msg.content }];
      images.forEach((img) => {
        content.push({
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${img}`,
          },
        });
      });
      return { ...msg, content };
    }
    return msg;
  });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...processedMessages],
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI error: ${error.error?.message || "Unknown error"}`);
  }

  const data = await response.json();
  return { reply: data.choices[0].message.content };
}

async function sendWithGroq(model, systemPrompt, messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Groq API key not configured. Set GROQ_API_KEY environment variable."
    );
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Groq error: ${error.error?.message || "Unknown error"}`);
  }

  const data = await response.json();
  return { reply: data.choices[0].message.content };
}

async function sendWithGemini(model, systemPrompt, messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Gemini API key not configured. Set GEMINI_API_KEY environment variable."
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini error: ${error.error?.message || "Unknown error"}`);
  }

  const data = await response.json();
  return { reply: data.candidates[0].content.parts[0].text };
}

async function sendWithMistral(model, systemPrompt, messages) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Mistral API key not configured. Set MISTRAL_API_KEY environment variable."
    );
  }

  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Mistral error: ${error.error?.message || "Unknown error"}`);
  }

  const data = await response.json();
  return { reply: data.choices[0].message.content };
}

async function sendWithOllama(model, systemPrompt, messages) {
  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama error: Make sure Ollama is running on http://localhost:11434`
    );
  }

  const data = await response.json();
  return { reply: data.message.content };
}

export async function sendMessage({ provider, model, systemPrompt, messages, images = [] }) {
  console.log(`[AI Provider] Using ${provider}:${model}`);

  try {
    switch (provider) {
      case "claude":
        return await sendWithClaude(model, systemPrompt, messages, images);
      case "openai":
        return await sendWithOpenAI(model, systemPrompt, messages, images);
      case "groq":
        return await sendWithGroq(model, systemPrompt, messages);
      case "gemini":
        return await sendWithGemini(model, systemPrompt, messages);
      case "mistral":
        return await sendWithMistral(model, systemPrompt, messages);
      case "ollama":
        return await sendWithOllama(model, systemPrompt, messages);
      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }
  } catch (error) {
    console.error(`[AI Provider] Error with ${provider}:`, error);
    throw error;
  }
}
