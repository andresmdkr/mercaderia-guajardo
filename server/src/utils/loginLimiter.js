// Límite de intentos de ingreso: después de varios errores seguidos, el ingreso se bloquea unos minutos.
// Se cuenta por persona + computadora (no solo por usuario): así, quien adivina contraseñas desde otra PC no puede
// dejar afuera al dueño de la cuenta. Todo vive en memoria: al reiniciar el programa se vacía.

function createLimiter({ maxFailures = 5, lockMs = 5 * 60 * 1000, windowMs = 15 * 60 * 1000, now = () => Date.now() } = {}) {
  const entries = new Map(); // clave → { failures, firstAt, lockedUntil }

  const prune = () => {
    const current = now();
    for (const [key, entry] of entries) {
      if (entry.lockedUntil <= current && current - entry.firstAt > windowMs) entries.delete(key);
    }
  };

  return {
    // Segundos que faltan para poder volver a intentar (0 = puede intentar).
    secondsLeft(key) {
      const entry = entries.get(key);
      const current = now();
      return entry && entry.lockedUntil > current ? Math.ceil((entry.lockedUntil - current) / 1000) : 0;
    },
    fail(key) {
      if (entries.size > 2000) prune();
      const current = now();
      let entry = entries.get(key);
      if (!entry || current - entry.firstAt > windowMs) {
        entry = { failures: 0, firstAt: current, lockedUntil: 0 };
        entries.set(key, entry);
      }
      entry.failures += 1;
      if (entry.failures >= maxFailures) {
        entry.lockedUntil = current + lockMs;
        entry.failures = 0;
        entry.firstAt = current;
      }
    },
    succeed(key) {
      entries.delete(key);
    },
  };
}

// Por persona + computadora: 5 errores seguidos → 5 minutos. Por computadora sola (probando muchos usuarios): 20 errores.
module.exports = { createLimiter, userLimiter: createLimiter({ maxFailures: 5 }), ipLimiter: createLimiter({ maxFailures: 20 }) };
