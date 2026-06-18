import { getSession, getAdminUser } from "@/lib/auth";
import { getTenant } from "@/lib/tenants-db";
import { getConversationHistory, deleteConversation } from "@/lib/conversations-db";
import { supabase } from "@/lib/supabase";

export async function GET(request, { params }) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const adminUser = await getAdminUser(user.id);
    if (!adminUser) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return Response.json(
        { error: "Se requiere clientId" },
        { status: 400 }
      );
    }

    const tenant = await getTenant(clientId);
    if (!tenant) {
      return Response.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    if (adminUser.role !== "superadmin" && !adminUser.tenant_ids?.includes(tenant.id)) {
      return Response.json(
        { error: "No tienes acceso a este cliente" },
        { status: 403 }
      );
    }

    console.log("[GET /api/admin/conversations/[sessionId]] Buscando mensajes para tenant.id:", tenant.id, "sessionId:", sessionId);

    const messages = await getConversationHistory(tenant.id, sessionId);

    console.log("[GET /api/admin/conversations/[sessionId]] ✓", messages.length, "mensajes encontrados");
    console.log("[GET /api/admin/conversations/[sessionId]] Mensajes:", messages);
    return Response.json({ messages });
  } catch (error) {
    console.error("[GET /api/admin/conversations/[sessionId]] Error:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const adminUser = await getAdminUser(user.id);
    if (!adminUser) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return Response.json(
        { error: "Se requiere clientId" },
        { status: 400 }
      );
    }

    const tenant = await getTenant(clientId);
    if (!tenant) {
      return Response.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    if (adminUser.role !== "superadmin" && !adminUser.tenant_ids?.includes(tenant.id)) {
      return Response.json(
        { error: "No tienes acceso a este cliente" },
        { status: 403 }
      );
    }

    await deleteConversation(tenant.id, sessionId);

    console.log("[DELETE /api/admin/conversations/[sessionId]] ✓ Conversación eliminada");
    return Response.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/conversations/[sessionId]] Error:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
