import fs from 'node:fs/promises';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { config, validateRuntimeConfig } from './config.js';
import { registerAuth } from './plugins/auth.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerPublicRoutes } from './routes/public.js';
import { generateWorkCover } from './utils/workCover.js';

export async function buildApp(options = {}) {
  validateRuntimeConfig();
  await fs.mkdir(config.uploadDir, { recursive: true });

  const app = Fastify({
    logger: true,
    trustProxy: config.trustProxy,
  });

  app.addHook('onRequest', async (_request, reply) => {
    reply.headers({
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
    });
  });

  const allowedOrigins = new Set(
    config.corsOrigins.length > 0
      ? config.corsOrigins
      : config.nodeEnv === 'production'
        ? []
        : ['http://localhost:5173']
  );

  await app.register(cors, {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, allowedOrigins.has(origin));
    },
    credentials: true,
  });
  await app.register(cookie);
  await app.register(jwt, { secret: config.jwtSecret });
  await app.register(rateLimit, {
    global: false,
  });
  await app.register(multipart, {
    limits: {
      fileSize: config.maxUploadFileSizeMb * 1024 * 1024,
      files: 4,
    },
  });
  await app.register(fastifyStatic, {
    root: config.uploadDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  await registerAuth(app);
  await registerPublicRoutes(app);
  await registerAdminRoutes(app, {
    coverGenerator: options.coverGenerator || generateWorkCover,
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    if (error?.code === '23505') {
      reply.code(409).send({
        error: error.constraint === 'uq_resources_route_path'
          ? '这个作品短链接已经被使用'
          : '相同的数据已经存在',
      });
      return;
    }

    if (
      error?.code === 'FST_REQ_FILE_TOO_LARGE' ||
      error?.code === 'FST_FILES_LIMIT' ||
      error?.statusCode === 413
    ) {
      reply.code(413).send({
        error: `Uploaded file is too large. Max size is ${config.maxUploadFileSizeMb}MB.`,
      });
      return;
    }

    const statusCode = error.statusCode || 500;
    const publicMessage =
      statusCode >= 500 && config.nodeEnv === 'production'
        ? 'Internal server error'
        : error.message || 'Server error';
    reply.code(statusCode).send({
      error: publicMessage,
    });
  });

  return app;
}
