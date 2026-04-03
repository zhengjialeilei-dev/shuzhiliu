import path from 'node:path';
import { config } from '../config.js';
import { query, withTransaction } from '../db.js';
import {
  adminSessionSchema,
  errorResponseSchema,
  resourceSchema,
  successResponseSchema,
  teachingResourceSchema,
} from '../schemas.js';
import { deleteObjectByUrl, sanitizeFilename, uploadObject } from '../storage.js';
import { createLoginRateLimiter } from '../utils/security.js';
import {
  inferContentType,
  normalizeResource,
  normalizeTeachingResource,
} from '../utils/serializers.js';

const loginRateLimiter = createLoginRateLimiter();
const AI_CATEGORIES = ['数与代数', '图形与几何', '统计与概率', '综合实践', '微课', '习题', '其他'];
const GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '通用', '拓展'];
const TEACHING_ZONES = ['standard', 'textbook', 'plan', 'courseware'];
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const HTML_EXTENSIONS = new Set(['.html', '.htm']);
const TEACHING_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.ppt', '.pptx']);

function getFileExtension(filename) {
  return path.extname(filename || '').toLowerCase();
}

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }
}

function assertAllowedValue(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    throw new Error(`${fieldName} is invalid`);
  }
}

function assertFile(file, allowedExtensions, fieldName) {
  if (!file?.filename) {
    throw new Error(`${fieldName} is required`);
  }
  const extension = getFileExtension(file.filename);
  if (!allowedExtensions.has(extension)) {
    throw new Error(`${fieldName} has an unsupported file type`);
  }
}

function validateUpload(fields, files) {
  const section = fields.section;
  if (!['ai', 'tools', 'teaching'].includes(section)) {
    throw new Error('section is invalid');
  }

  assertNonEmptyString(fields.title, 'title');

  if (section === 'ai') {
    assertNonEmptyString(fields.description, 'description');
    assertAllowedValue(fields.category, AI_CATEGORIES, 'category');
    assertAllowedValue(fields.grade, GRADES, 'grade');
    assertFile(files.htmlFile, HTML_EXTENSIONS, 'htmlFile');
    assertFile(files.coverFile, IMAGE_EXTENSIONS, 'coverFile');
  }

  if (section === 'tools') {
    assertNonEmptyString(fields.description, 'description');
    assertFile(files.htmlFile, HTML_EXTENSIONS, 'htmlFile');
    assertFile(files.coverFile, IMAGE_EXTENSIONS, 'coverFile');
  }

  if (section === 'teaching') {
    assertNonEmptyString(fields.description, 'description');
    assertAllowedValue(fields.zone, TEACHING_ZONES, 'zone');
    assertFile(files.teachingFile, TEACHING_EXTENSIONS, 'teachingFile');
  }
}

export function createNotFoundError(entityName) {
  const error = new Error(`${entityName} not found`);
  error.statusCode = 404;
  return error;
}

export function requireRow(row, entityName) {
  if (!row) {
    throw createNotFoundError(entityName);
  }

  return row;
}

export async function registerAdminRoutes(app) {
  app.post(
    '/api/admin/login',
    {
      preHandler: loginRateLimiter,
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['password'],
          properties: {
            password: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          429: errorResponseSchema,
          503: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { password } = request.body || {};
      if (!config.adminPassword) {
        return reply.code(503).send({ error: 'ADMIN_PASSWORD is not configured' });
      }

      if (!password || password !== config.adminPassword) {
        loginRateLimiter.recordFailure(request);
        return reply.code(401).send({ error: '密码错误' });
      }

      loginRateLimiter.reset(request);

      const token = await reply.jwtSign({ role: 'admin' }, { expiresIn: '12h' });
      reply.setCookie('mf_admin', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.cookieSecure,
        path: '/',
        maxAge: 12 * 60 * 60,
      });

      return { success: true };
    }
  );

  app.post(
    '/api/admin/logout',
    {
      preHandler: app.verifyAdmin,
      schema: {
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      reply.clearCookie('mf_admin', { path: '/' });
      return { success: true };
    }
  );

  app.get(
    '/api/admin/session',
    {
      schema: {
        response: {
          200: adminSessionSchema,
        },
      },
    },
    async (request) => {
      const token = request.cookies.mf_admin;
      if (!token) return { authenticated: false };

      try {
        const payload = await app.jwt.verify(token);
        return { authenticated: payload.role === 'admin' };
      } catch {
        return { authenticated: false };
      }
    }
  );

  app.post(
    '/api/admin/resources',
    {
      preHandler: app.verifyAdmin,
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'description', 'category', 'grade'],
          properties: {
            title: { type: 'string', minLength: 1 },
            description: { type: 'string', minLength: 1 },
            category: { type: 'string', enum: AI_CATEGORIES },
            grade: { type: 'string', enum: GRADES },
            image_url: { type: 'string' },
            file_path: { type: ['string', 'null'] },
            route_path: { type: ['string', 'null'] },
            resource_type: { type: 'string', enum: ['html', 'react'] },
          },
        },
        response: {
          201: resourceSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const payload = request.body || {};
      const result = await query(
        `INSERT INTO resources
          (title, description, category, grade, image_url, file_path, route_path, resource_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          payload.title,
          payload.description,
          payload.category,
          payload.grade,
          payload.image_url || '',
          payload.file_path || null,
          payload.route_path || null,
          payload.resource_type || 'html',
        ]
      );
      reply.code(201);
      return normalizeResource(result.rows[0]);
    }
  );

  app.put(
    '/api/admin/resources/:id',
    {
      preHandler: app.verifyAdmin,
      schema: {
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['id'],
          properties: {
            id: { type: 'string', minLength: 1 },
          },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'description', 'category', 'grade'],
          properties: {
            title: { type: 'string', minLength: 1 },
            description: { type: 'string', minLength: 1 },
            category: { type: 'string', enum: [...AI_CATEGORIES, '赋能教学'] },
            grade: { type: 'string', enum: GRADES },
          },
        },
        response: {
          200: resourceSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const payload = request.body || {};
      const result = await query(
        `UPDATE resources
         SET title = $1, description = $2, category = $3, grade = $4
         WHERE id = $5
         RETURNING *`,
        [payload.title, payload.description, payload.category, payload.grade, request.params.id]
      );
      return normalizeResource(requireRow(result.rows[0], 'Resource'));
    }
  );

  app.delete(
    '/api/admin/resources/:id',
    {
      preHandler: app.verifyAdmin,
      schema: {
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['id'],
          properties: {
            id: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const deleted = await withTransaction(async (client) => {
        const existing = await client.query('SELECT * FROM resources WHERE id = $1', [request.params.id]);
        const row = existing.rows[0];
        if (!row) return false;

        await deleteObjectByUrl(row.file_path);
        await deleteObjectByUrl(row.image_url);
        await client.query('DELETE FROM resources WHERE id = $1', [request.params.id]);
        return true;
      });

      if (!deleted) {
        throw createNotFoundError('Resource');
      }

      return { success: true };
    }
  );

  app.post(
    '/api/admin/teaching-resources',
    {
      preHandler: app.verifyAdmin,
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'description', 'zone'],
          properties: {
            title: { type: 'string', minLength: 1 },
            description: { type: 'string', minLength: 1 },
            zone: { type: 'string', enum: TEACHING_ZONES },
            file_url: { type: 'string' },
            file_type: { type: 'string' },
          },
        },
        response: {
          201: teachingResourceSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const payload = request.body || {};
      const result = await query(
        `INSERT INTO teaching_resources
          (title, description, zone, file_url, file_type)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [payload.title, payload.description, payload.zone, payload.file_url || '', payload.file_type || 'pdf']
      );
      reply.code(201);
      return normalizeTeachingResource(result.rows[0]);
    }
  );

  app.put(
    '/api/admin/teaching-resources/:id',
    {
      preHandler: app.verifyAdmin,
      schema: {
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['id'],
          properties: {
            id: { type: 'string', minLength: 1 },
          },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'description', 'zone'],
          properties: {
            title: { type: 'string', minLength: 1 },
            description: { type: 'string', minLength: 1 },
            zone: { type: 'string', enum: TEACHING_ZONES },
          },
        },
        response: {
          200: teachingResourceSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const payload = request.body || {};
      const result = await query(
        `UPDATE teaching_resources
         SET title = $1, description = $2, zone = $3
         WHERE id = $4
         RETURNING *`,
        [payload.title, payload.description, payload.zone, request.params.id]
      );
      return normalizeTeachingResource(requireRow(result.rows[0], 'Teaching resource'));
    }
  );

  app.delete(
    '/api/admin/teaching-resources/:id',
    {
      preHandler: app.verifyAdmin,
      schema: {
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['id'],
          properties: {
            id: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const deleted = await withTransaction(async (client) => {
        const existing = await client.query('SELECT * FROM teaching_resources WHERE id = $1', [
          request.params.id,
        ]);
        const row = existing.rows[0];
        if (!row) return false;

        await deleteObjectByUrl(row.file_url);
        await client.query('DELETE FROM teaching_resources WHERE id = $1', [request.params.id]);
        return true;
      });

      if (!deleted) {
        throw createNotFoundError('Teaching resource');
      }

      return { success: true };
    }
  );

  app.post(
    '/api/admin/upload',
    {
      preHandler: app.verifyAdmin,
      schema: {
        response: {
          201: {
            oneOf: [resourceSchema, teachingResourceSchema],
          },
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const fields = {};
      const files = {};

      for await (const part of request.parts()) {
        if (part.type === 'file') {
          files[part.fieldname] = {
            filename: part.filename,
            mimetype: part.mimetype,
            buffer: await part.toBuffer(),
          };
          continue;
        }

        fields[part.fieldname] = part.value;
      }

      try {
        validateUpload(fields, files);
      } catch (error) {
        return reply.code(400).send({
          error: error instanceof Error ? error.message : 'Invalid upload payload',
        });
      }

      const section = fields.section;

      if (section === 'ai' || section === 'tools') {
        const htmlFile = files.htmlFile;
        const coverFile = files.coverFile;

        const htmlKey = `apps/${sanitizeFilename(htmlFile.filename)}`;
        const coverKey = `images/${sanitizeFilename(coverFile.filename)}`;
        const [fileUrl, imageUrl] = await Promise.all([
          uploadObject({
            key: htmlKey,
            body: htmlFile.buffer,
            contentType: inferContentType(htmlFile.filename, htmlFile.mimetype),
          }),
          uploadObject({
            key: coverKey,
            body: coverFile.buffer,
            contentType: inferContentType(coverFile.filename, coverFile.mimetype),
          }),
        ]);

        const result = await query(
          `INSERT INTO resources
            (title, description, category, grade, image_url, file_path, route_path, resource_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            fields.title,
            fields.description || '',
            section === 'tools' ? '赋能教学' : fields.category,
            section === 'tools' ? '通用' : fields.grade,
            imageUrl,
            fileUrl,
            null,
            'html',
          ]
        );

        reply.code(201);
        return normalizeResource(result.rows[0]);
      }

      if (section === 'teaching') {
        const teachingFile = files.teachingFile;
        const fileExt = path.extname(teachingFile.filename).replace('.', '').toLowerCase() || 'file';
        const fileKey = `${fields.zone || 'misc'}/${sanitizeFilename(teachingFile.filename)}`;
        const fileUrl = await uploadObject({
          key: fileKey,
          body: teachingFile.buffer,
          contentType: inferContentType(teachingFile.filename, teachingFile.mimetype),
        });

        const result = await query(
          `INSERT INTO teaching_resources (title, description, zone, file_url, file_type)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [fields.title, fields.description || '', fields.zone, fileUrl, fileExt]
        );

        reply.code(201);
        return normalizeTeachingResource(result.rows[0]);
      }

      return reply.code(400).send({ error: `Unsupported section: ${section}` });
    }
  );
}
