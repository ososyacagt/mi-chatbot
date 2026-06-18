const attempts = new Map();

export function checkRateLimit(identifier, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const key = identifier;

  if (!attempts.has(key)) {
    attempts.set(key, { count: 1, firstAttempt: now, blocked: false });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  const record = attempts.get(key);

  // Limpiar si pasó el tiempo de ventana
  if (now - record.firstAttempt > windowMs) {
    attempts.set(key, { count: 1, firstAttempt: now, blocked: false });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  // Si está bloqueado
  if (record.blocked) {
    const waitMs = windowMs - (now - record.firstAttempt);
    const waitMin = Math.ceil(waitMs / 60000);
    return { allowed: false, remaining: 0, waitMinutes: waitMin };
  }

  record.count++;

  if (record.count >= maxAttempts) {
    record.blocked = true;
    return { allowed: false, remaining: 0, waitMinutes: 15 };
  }

  return { allowed: true, remaining: maxAttempts - record.count };
}

export function clearRateLimit(identifier) {
  attempts.delete(identifier);
}

// Limpiar entradas antiguas cada 30 minutos
setInterval(() => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  for (const [key, record] of attempts.entries()) {
    if (now - record.firstAttempt > windowMs) {
      attempts.delete(key);
    }
  }
}, 30 * 60 * 1000);
