import { config } from '../config.js';
import { query } from '../db.js';
import {
  errorResponseSchema,
  healthCheckSchema,
  resourceSchema,
  teachingResourceSchema,
} from '../schemas.js';
import {
  buildHtmlProxyAllowlist,
  fetchHealth,
  isAllowedProxyUrl,
  normalizeResource,
  normalizeTeachingResource,
} from '../utils/serializers.js';

export async function registerPublicRoutes(app) {
  const htmlProxyAllowHosts = buildHtmlProxyAllowlist();

  app.get(
    '/api/health',
    {
      schema: {
        response: {
          200: healthCheckSchema,
        },
      },
    },
    async () => fetchHealth()
  );

  app.get(
    '/api/resources',
    {
      schema: {
        response: {
          200: {
            type: 'array',
            items: resourceSchema,
          },
        },
      },
    },
    async () => {
      const result = await query('SELECT * FROM resources ORDER BY created_at DESC');
      return result.rows.map(normalizeResource);
    }
  );

  app.get(
    '/api/teaching-resources',
    {
      schema: {
        response: {
          200: {
            type: 'array',
            items: teachingResourceSchema,
          },
        },
      },
    },
    async () => {
      const result = await query('SELECT * FROM teaching_resources ORDER BY created_at DESC');
      return result.rows.map(normalizeTeachingResource);
    }
  );

  app.get(
    '/api/html-proxy',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          required: ['url'],
          properties: {
            url: { type: 'string', minLength: 1 },
          },
        },
        response: {
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { url } = request.query || {};
      if (!url || typeof url !== 'string') {
        return reply.code(400).send({ error: 'Missing url' });
      }

      if (!isAllowedProxyUrl(url, htmlProxyAllowHosts)) {
        return reply.code(400).send({ error: 'URL not allowed' });
      }

      const targetUrl = url.startsWith('/uploads/')
        ? `${config.apiBaseUrl || `http://127.0.0.1:${config.port}`}${url}`
        : url;

      const response = await fetch(targetUrl);
      if (!response.ok) {
        return reply.code(response.status).send({
          error: `Upstream error: ${response.status} ${response.statusText}`,
        });
      }

      const text = await response.text();
      reply.header('Content-Type', 'text/html; charset=utf-8');
      reply.header('Cache-Control', 'public, max-age=300');
      return reply.send(text);
    }
  );
}
