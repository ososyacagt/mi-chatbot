import { supabase } from "@/lib/supabase";
import { getSession, getAdminUser } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET(request) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const adminUser = await getAdminUser(user.id);
    if (!adminUser || adminUser.role !== "superadmin") {
      return Response.json(
        { error: "Solo superadmin puede ver invitaciones" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("invitations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/admin/invitations] Error:", error);
      return Response.json(
        { error: "Error al obtener invitaciones" },
        { status: 500 }
      );
    }

    return Response.json({ invitations: data || [] });
  } catch (error) {
    console.error("[GET /api/admin/invitations] Error inesperado:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    const user = await getSession();
    if (!user) {
      return Response.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const adminUser = await getAdminUser(user.id);
    if (!adminUser || adminUser.role !== "superadmin") {
      return Response.json(
        { error: "Solo superadmin puede crear invitaciones" },
        { status: 403 }
      );
    }

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expira en 7 días

    const { data, error } = await supabase
      .from("invitations")
      .insert([
        {
          token,
          email: email || null,
          used: false,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("[POST /api/admin/invitations] Error:", error);
      return Response.json(
        { error: "Error al crear invitación" },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invitationUrl = `${appUrl}/onboarding?token=${token}`;

    return Response.json(
      {
        invitation: {
          ...data,
          url: invitationUrl,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/admin/invitations] Error inesperado:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
