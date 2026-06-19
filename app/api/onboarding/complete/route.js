import { supabase } from "@/lib/supabase";
import { createSupabaseAdmin } from "@/lib/supabase-server";

function mapToDbFields(tenant) {
  return {
    client_id: tenant.clientId,
    nombre: tenant.nombre,
    system_prompt: tenant.systemPrompt,
    welcome_message: tenant.welcomeMessage,
    color_primary: tenant.colorPrimary,
    theme: "auto",
    ai_provider: tenant.aiProvider || "claude",
    ai_model: tenant.aiModel || "claude-sonnet-4-6",
    plan: "basic",
    mensaje_limite: 100,
    admin_email: tenant.adminEmail || null,
    escalation_enabled: true,
    escalation_message: null,
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      token,
      nombre,
      clientId,
      colorPrimary,
      systemPrompt,
      welcomeMessage,
      aiProvider,
      aiModel,
      adminEmail,
      adminPassword,
      createUser,
    } = body;

    if (
      !token ||
      !nombre ||
      !clientId ||
      !colorPrimary ||
      !systemPrompt ||
      !welcomeMessage ||
      !adminEmail
    ) {
      return Response.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    if (createUser && !adminPassword) {
      return Response.json(
        { error: "Contraseña requerida para usuario nuevo" },
        { status: 400 }
      );
    }

    // Validar token
    const { data: invitation, error: invError } = await supabase
      .from("invitations")
      .select("*")
      .eq("token", token)
      .single();

    if (invError || !invitation) {
      return Response.json(
        { error: "Token inválido" },
        { status: 400 }
      );
    }

    if (invitation.used) {
      return Response.json(
        { error: "Esta invitación ya fue utilizada" },
        { status: 400 }
      );
    }

    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      return Response.json(
        { error: "Esta invitación ha expirado" },
        { status: 400 }
      );
    }

    // Crear tenant
    const tenantData = mapToDbFields({
      clientId,
      nombre,
      colorPrimary,
      systemPrompt,
      welcomeMessage,
      aiProvider,
      aiModel,
      adminEmail,
    });

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert([tenantData])
      .select()
      .single();

    if (tenantError) {
      console.error("[POST /api/onboarding/complete] Error creando tenant:", tenantError);
      return Response.json(
        { error: "Error al crear el tenant" },
        { status: 500 }
      );
    }

    let adminUser = null;

    // Manejar usuario administrador
    if (createUser) {
      // Crear usuario nuevo en Supabase Auth
      const supabaseAdmin = createSupabaseAdmin();

      try {
        const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: adminEmail.toLowerCase(),
          password: adminPassword,
          email_confirm: true,
        });

        if (authError) {
          console.error("[POST /api/onboarding/complete] Error creando usuario Auth:", authError);
          return Response.json(
            { error: "Error al crear usuario: " + authError.message },
            { status: 500 }
          );
        }

        // Insertar en admin_users
        const { data: insertedUser, error: insertError } = await supabase
          .from("admin_users")
          .insert([
            {
              id: newAuthUser.user.id,
              email: adminEmail.toLowerCase(),
              role: "admin",
              tenant_ids: [clientId],
            },
          ])
          .select()
          .single();

        if (insertError) {
          console.error("[POST /api/onboarding/complete] Error insertando admin_user:", insertError);
          return Response.json(
            { error: "Error al crear usuario administrador" },
            { status: 500 }
          );
        }

        adminUser = insertedUser;
      } catch (err) {
        console.error("[POST /api/onboarding/complete] Error inesperado creando usuario:", err);
        return Response.json(
          { error: "Error al crear usuario administrador" },
          { status: 500 }
        );
      }
    } else {
      // Usuario existente - agregar clientId a su array tenant_ids
      const { data: existingUser, error: fetchError } = await supabase
        .from("admin_users")
        .select("id, email, role, tenant_ids")
        .eq("email", adminEmail.toLowerCase())
        .single();

      if (fetchError || !existingUser) {
        return Response.json(
          { error: "Usuario no encontrado" },
          { status: 400 }
        );
      }

      // Agregar clientId al array si no existe
      const tenantIds = existingUser.tenant_ids || [];
      if (!tenantIds.includes(clientId)) {
        tenantIds.push(clientId);
      }

      const { data: updatedUser, error: updateError } = await supabase
        .from("admin_users")
        .update({ tenant_ids: tenantIds })
        .eq("id", existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error("[POST /api/onboarding/complete] Error actualizando admin_user:", updateError);
        return Response.json(
          { error: "Error al asignar cliente al usuario" },
          { status: 500 }
        );
      }

      adminUser = updatedUser;
    }

    // Marcar invitación como usada
    const { error: updateError } = await supabase
      .from("invitations")
      .update({
        used: true,
        used_at: new Date().toISOString(),
        tenant_id: tenant.client_id,
      })
      .eq("token", token);

    if (updateError) {
      console.error("[POST /api/onboarding/complete] Error actualizando invitación:", updateError);
      // No retornamos error aquí porque el tenant ya fue creado
    }

    return Response.json({
      success: true,
      clientId: tenant.client_id,
      userCreated: createUser,
      adminEmail: adminEmail.toLowerCase(),
    });
  } catch (error) {
    console.error("[POST /api/onboarding/complete] Error inesperado:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
