import { getSession, getAdminUser } from "@/lib/auth";
import { getTenant } from "@/lib/tenants-db";
import { getRecentConversations } from "@/lib/conversations-db";

export async function GET(request) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const adminUser = await getAdminUser(user.id);
    if (!adminUser) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return Response.json(
        { error: "Se requiere clientId" },
        { status: 400 }
      );
    }

    // Verificar permisos
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

    const conversations = await getRecentConversations(tenant.id, 50);

    console.log("[GET /api/admin/conversations] ✓", conversations.length, "conversaciones");
    return Response.json({ conversations });
  } catch (error) {
    console.error("[GET /api/admin/conversations] Error:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
