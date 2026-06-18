import { checkRateLimit, clearRateLimit } from "@/lib/rate-limit";
import { logAudit, AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/audit";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { email, action } = await request.json();

    if (!email || !action) {
      return NextResponse.json(
        { error: "Email y action son requeridos" },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const identifier = `${ip}:${email}`;

    if (action === "check") {
      // Verificar si el rate limit permite el intento
      const result = checkRateLimit(identifier, 5, 15 * 60 * 1000);
      console.log(`[LOGIN] Rate limit check for ${identifier}:`, result);

      // Si está bloqueado, registrar en auditoría
      if (!result.allowed) {
        await logAudit({
          userId: null,
          userEmail: email,
          action: AUDIT_ACTIONS.LOGIN_BLOCKED,
          entity: AUDIT_ENTITIES.SESSION,
          entityId: email,
          changes: { attempts_exceeded: true },
          ip,
        });
      }

      return NextResponse.json(result);
    }

    if (action === "failed") {
      // Incrementar contador cuando falla el login
      checkRateLimit(identifier, 5, 15 * 60 * 1000);
      const result = checkRateLimit(identifier, 5, 15 * 60 * 1000);
      console.log(`[LOGIN] Failed attempt for ${identifier}:`, result);

      // Registrar intento fallido en auditoría
      await logAudit({
        userId: null,
        userEmail: email,
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        entity: AUDIT_ENTITIES.SESSION,
        entityId: email,
        changes: { remaining_attempts: result.remaining },
        ip,
      });

      return NextResponse.json(result);
    }

    if (action === "success") {
      // Limpiar contador cuando es exitoso
      clearRateLimit(identifier);
      console.log(`[LOGIN] ✓ Successful login for ${identifier}`);

      // Registrar login exitoso en auditoría
      await logAudit({
        userId: null, // Se puede actualizar cuando se obtiene el userId de la sesión
        userEmail: email,
        action: AUDIT_ACTIONS.LOGIN,
        entity: AUDIT_ENTITIES.SESSION,
        entityId: email,
        changes: { success: true },
        ip,
      });

      return NextResponse.json({ cleared: true });
    }

    return NextResponse.json(
      { error: "Acción inválida" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[/api/admin/login] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
