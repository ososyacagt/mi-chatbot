import { supabase } from "./supabase";

export async function saveMessage(tenantId, sessionId, role, content) {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        tenant_id: tenantId,
        session_id: sessionId,
        role,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error("[saveMessage] Error:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("[saveMessage] Error inesperado:", error);
    throw error;
  }
}

export async function getConversationHistory(tenantId, sessionId) {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[getConversationHistory] Error:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("[getConversationHistory] Error inesperado:", error);
    throw error;
  }
}

export async function getRecentConversations(tenantId, limit = 20) {
  try {
    const { data: messages, error } = await supabase
      .from("conversations")
      .select("session_id, created_at, role, content")
      .eq("tenant_id", tenantId)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[getRecentConversations] Error:", error);
      throw error;
    }

    const conversations = messages || [];

    const result = [];
    const seenSessions = new Set();

    for (const msg of conversations) {
      if (!seenSessions.has(msg.session_id)) {
        seenSessions.add(msg.session_id);

        const { data: allMessages } = await supabase
          .from("conversations")
          .select("*")
          .eq("session_id", msg.session_id)
          .order("created_at", { ascending: true });

        result.push({
          session_id: msg.session_id,
          created_at: msg.created_at,
          first_message: msg.content,
          total_messages: allMessages?.length || 0,
        });
      }
    }

    return result;
  } catch (error) {
    console.error("[getRecentConversations] Error inesperado:", error);
    throw error;
  }
}

export async function deleteConversation(tenantId, sessionId) {
  try {
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("session_id", sessionId);

    if (error) {
      console.error("[deleteConversation] Error:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("[deleteConversation] Error inesperado:", error);
    throw error;
  }
}
