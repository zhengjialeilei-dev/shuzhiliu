const attemptsByKey = new Map();

export function resetRateLimiterState() {
  attemptsByKey.clear();
}

function getKey(request) {
  return request?.ip || 'unknown';
}

function pruneEntry(entry, now, timeWindowMs) {
  entry.timestamps = entry.timestamps.filter((timestamp) => now - timestamp < timeWindowMs);
}

function pruneExpiredEntries(now, timeWindowMs) {
  for (const [key, entry] of attemptsByKey.entries()) {
    pruneEntry(entry, now, timeWindowMs);

    if (entry.timestamps.length === 0) {
      attemptsByKey.delete(key);
    }
  }
}

function getOrCreateEntry(key) {
  const existing = attemptsByKey.get(key);
  if (existing) {
    return existing;
  }

  const entry = { timestamps: [] };
  attemptsByKey.set(key, entry);
  return entry;
}

export function createLoginRateLimiter({ maxAttempts = 5, timeWindowMs = 15 * 60 * 1000 } = {}) {
  const loginRateLimiter = async function loginRateLimiter(request, reply) {
    const now = Date.now();
    const key = getKey(request);

    pruneExpiredEntries(now, timeWindowMs);

    const entry = attemptsByKey.get(key);
    if (!entry) {
      return;
    }

    if (entry.timestamps.length >= maxAttempts) {
      const oldest = entry.timestamps[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((timeWindowMs - (now - oldest)) / 1000));
      reply.header('Retry-After', retryAfterSeconds);
      return reply.code(429).send({
        error: 'Too many login attempts. Please try again later.',
        retryAfter: retryAfterSeconds,
      });
    }
  };

  loginRateLimiter.recordFailure = (request) => {
    const now = Date.now();
    const key = getKey(request);

    pruneExpiredEntries(now, timeWindowMs);

    const entry = getOrCreateEntry(key);
    entry.timestamps.push(now);
  };

  loginRateLimiter.reset = (request) => {
    attemptsByKey.delete(getKey(request));
  };

  loginRateLimiter.resetAll = () => {
    resetRateLimiterState();
  };

  loginRateLimiter.getAttemptCount = (request) => {
    const now = Date.now();
    const key = getKey(request);
    const entry = attemptsByKey.get(key);

    if (!entry) {
      return 0;
    }

    pruneEntry(entry, now, timeWindowMs);
    if (entry.timestamps.length === 0) {
      attemptsByKey.delete(key);
      return 0;
    }

    return entry.timestamps.length;
  };

  return loginRateLimiter;
}
