import { NextResponse } from "next/server";
import { getTenant } from "@/lib/tenants-db";

export async function GET(request, { params }) {
  try {
    const { clientId } = await params;
    console.log("[GET /api/tenants/[clientId]] Obteniendo tenant:", clientId);

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    const tenant = await getTenant(clientId);

    if (!tenant) {
      console.log("[GET /api/tenants/[clientId]] Tenant no encontrado:", clientId);
      return NextResponse.json(
        { error: "Tenant no encontrado" },
        { status: 404 }
      );
    }

    console.log("[GET /api/tenants/[clientId]] ✓ Tenant encontrado:", tenant.id);

    return NextResponse.json(
      { tenant },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (error) {
    console.error("[GET /api/tenants/[clientId]] Error:", error);
    return NextResponse.json(
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
