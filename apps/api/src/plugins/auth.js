export async function registerAuth(app) {
  function unauthorized(reply) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  async function verifyAdmin(request, reply) {
    const token =
      request.cookies.mf_admin ||
      request.headers.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) return unauthorized(reply);

    try {
      const payload = await app.jwt.verify(token);
      if (payload.role !== 'admin') return unauthorized(reply);
    } catch {
      return unauthorized(reply);
    }
  }

  app.decorate('verifyAdmin', verifyAdmin);
}
