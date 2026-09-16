import { resourceSchema, teachingResourceSchema, errorResponseSchema } from '../schemas.js';
import { normalizeResource, normalizeTeachingResource } from '../utils/serializers.js';

const pagination = {
  page: { type: 'integer', minimum: 1, maximum: 100000, default: 1 },
  pageSize: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
};
const pageSchema = (item, teaching = false) => ({
  type: 'object', required: ['items', 'total', 'page', 'pageSize', 'hasMore', 'source'],
  properties: {
    items: { type: 'array', items: item }, total: { type: 'integer' }, page: { type: 'integer' },
    pageSize: { type: 'integer' }, hasMore: { type: 'boolean' }, source: { type: 'string', enum: ['database', 'demo'] },
    ...(teaching ? { zones: { type: 'object', additionalProperties: { type: 'integer' } } } : {}),
  },
});

export function registerCatalogRoutes(app, catalog) {
  app.get('/api/resources/page', {
    schema: {
      querystring: { type: 'object', additionalProperties: false, properties: {
        ...pagination, section: { type: 'string', enum: ['all', 'ai', 'games', 'tools'], default: 'all' },
        category: { type: 'string', maxLength: 50 }, grade: { type: 'string', maxLength: 20 }, q: { type: 'string', maxLength: 100 },
      } },
      response: { 200: pageSchema(resourceSchema), 503: errorResponseSchema },
    },
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    const page = await catalog.resourcePage(request.query);
    return { ...page, items: page.items.map(normalizeResource) };
  });
  app.get('/api/teaching-resources/page', {
    schema: {
      querystring: { type: 'object', additionalProperties: false, properties: {
        ...pagination, zone: { type: 'string', enum: ['standard', 'textbook', 'plan', 'courseware'] },
      } },
      response: { 200: pageSchema(teachingResourceSchema, true), 503: errorResponseSchema },
    },
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    const page = await catalog.teachingPage(request.query);
    return { ...page, items: page.items.map(normalizeTeachingResource) };
  });
}
