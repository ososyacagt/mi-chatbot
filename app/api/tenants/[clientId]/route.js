import { getTenant } from "@/lib/tenants-db";

export async function GET(request, { params }) {
  try {
    const { clientId } = await params;
    console.log("[GET /api/tenants/[clientId]] Obteniendo tenant:", clientId);

    if (!clientId) {
      return Response.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    const tenant = await getTenant(clientId);

    if (!tenant) {
      console.log("[GET /api/tenants/[clientId]] Tenant no encontrado:", clientId);
      return Response.json(
        { error: "Tenant no encontrado" },
        { status: 404 }
      );
    }

    console.log("[GET /api/tenants/[clientId]] ✓ Tenant encontrado:", tenant.id);

    return Response.json({ tenant });
  } catch (error) {
    console.error("[GET /api/tenants/[clientId]] Error:", error);
    return Response.json(
      { error: "Error al obtener el tenant" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
