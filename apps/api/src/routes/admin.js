import path from 'node:path';
import { config } from '../config.js';
import { query, withTransaction } from '../db.js';
import {
  AI_CATEGORIES,
  ALL_RESOURCE_CATEGORIES,
  GAME_CATEGORY,
  GRADES,
  TEACHING_ZONES,
  TOOL_CATEGORY,
  normalizeExternalTeachingUrl,
  normalizeRoutePath,
  validateResourceReplacement,
  validateUpload,
} from '../domain/uploadPolicy.js';
import {
  adminSessionSchema,
  errorResponseSchema,
  resourceSchema,
  successResponseSchema,
  teachingResourceSchema,
} from '../schemas.js';
import { sanitizeFilename, uploadFile } from '../storage.js';
import {
  cleanupObjects,
  cleanupReplacedResourceObjects,
  cleanupResourceObjects,
  collectMultipartUpload,
  removeTempDirectory,
  uploadWorkFile,
} from '../services/uploadAssets.js';
import { createLoginRateLimiter } from '../utils/security.js';
import {
  inferContentType,
  normalizeResource,
  normalizeTeachingResource,
} from '../utils/serializers.js';

const loginRateLimiter = createLoginRateLimiter();

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

export async function registerAdminRoutes(app, { coverGenerator }) {
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
            category: { type: 'string', enum: ALL_RESOURCE_CATEGORIES },
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
            category: { type: 'string', enum: ALL_RESOURCE_CATEGORIES },
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

  app.post(
    '/api/admin/resources/:id/replace',
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
          200: resourceSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
          422: errorResponseSchema,
          503: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { fields, files, tempDir } = await collectMultipartUpload(request);
      const uploadedUrls = [];

      try {
        validateResourceReplacement(fields, files);

        const regenerateCover = fields.regenerateCover === 'true';
        if (regenerateCover && !files.htmlFile) {
          return reply.code(400).send({ error: '重新生成封面时必须同时上传新的作品文件' });
        }

        const existingResult = await query('SELECT * FROM resources WHERE id = $1', [request.params.id]);
        const previous = requireRow(existingResult.rows[0], 'Resource');
        let fileUrl = previous.file_path;
        let imageUrl = previous.image_url;
        let previewFilePath = null;

        if (files.htmlFile) {
          const uploadedWork = await uploadWorkFile(files.htmlFile, tempDir, uploadedUrls);
          fileUrl = uploadedWork.fileUrl;
          previewFilePath = uploadedWork.previewFilePath;
        }

        if (files.coverFile || regenerateCover) {
          let coverPath = files.coverFile?.filePath;
          let coverFilename = files.coverFile?.filename;
          let coverMimetype = files.coverFile?.mimetype;
          if (regenerateCover && !files.coverFile) {
            coverPath = path.join(tempDir, 'replacement-cover.png');
            coverFilename = `${fields.title}-cover.png`;
            coverMimetype = 'image/png';
            await coverGenerator({
              htmlFilePath: previewFilePath,
              outputPath: coverPath,
              title: fields.title,
            });
          }

          const coverKey = `images/${sanitizeFilename(coverFilename)}`;
          imageUrl = await uploadFile({
            key: coverKey,
            filePath: coverPath,
            contentType: inferContentType(coverFilename, coverMimetype),
          });
          uploadedUrls.push(imageUrl);
        }

        const result = await query(
          `UPDATE resources
           SET title = $1, description = $2, category = $3, grade = $4,
               file_path = $5, image_url = $6
           WHERE id = $7
           RETURNING *`,
          [fields.title, fields.description, fields.category, fields.grade, fileUrl, imageUrl, request.params.id]
        );
        const updated = requireRow(result.rows[0], 'Resource');

        await cleanupReplacedResourceObjects(previous, updated, app.log);
        return normalizeResource(updated);
      } catch (error) {
        await cleanupObjects(uploadedUrls, app.log);
        throw error;
      } finally {
        await removeTempDirectory(tempDir);
      }
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
        if (!row) return null;

        await client.query('DELETE FROM resources WHERE id = $1', [request.params.id]);
        return row;
      });

      if (!deleted) {
        throw createNotFoundError('Resource');
      }

      await cleanupResourceObjects(deleted.file_path, deleted.image_url, app.log);

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
          required: ['title', 'description', 'zone', 'file_url'],
          properties: {
            title: { type: 'string', minLength: 1 },
            description: { type: 'string', minLength: 1 },
            zone: { type: 'string', enum: TEACHING_ZONES },
            file_url: { type: 'string', minLength: 1, maxLength: 2048 },
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
      const fileUrl = normalizeExternalTeachingUrl(payload.file_url);
      const result = await query(
        `INSERT INTO teaching_resources
          (title, description, zone, file_url, file_type)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [payload.title, payload.description, payload.zone, fileUrl, 'link']
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
            file_url: { type: 'string', minLength: 1, maxLength: 2048 },
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
      const fileUrl = payload.file_url === undefined ? null : normalizeExternalTeachingUrl(payload.file_url);
      const result = await query(
        `UPDATE teaching_resources
         SET title = $1, description = $2, zone = $3,
             file_url = COALESCE($4, file_url),
             file_type = CASE WHEN $4 IS NULL THEN file_type ELSE 'link' END
         WHERE id = $5
         RETURNING *`,
        [payload.title, payload.description, payload.zone, fileUrl, request.params.id]
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
        if (!row) return null;

        await client.query('DELETE FROM teaching_resources WHERE id = $1', [request.params.id]);
        return row;
      });

      if (!deleted) {
        throw createNotFoundError('Teaching resource');
      }

      await cleanupObjects([deleted.file_url], app.log);

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
          409: errorResponseSchema,
          422: errorResponseSchema,
          503: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { fields, files, tempDir } = await collectMultipartUpload(request);

      try {
        validateUpload(fields, files);
      } catch (error) {
        await removeTempDirectory(tempDir);
        return reply.code(400).send({
          error: error instanceof Error ? error.message : 'Invalid upload payload',
        });
      }

      try {
        const section = fields.section;
        const routePath = section === 'teaching' ? null : normalizeRoutePath(fields.routeSlug);
        if (routePath) {
          const existingRoute = await query('SELECT id FROM resources WHERE route_path = $1 LIMIT 1', [routePath]);
          if (existingRoute.rows.length > 0) {
            return reply.code(409).send({ error: '这个作品短链接已经被使用' });
          }
        }

        if (section === 'ai' || section === 'games' || section === 'tools') {
          const htmlFile = files.htmlFile;
          const coverFile = files.coverFile;

          const uploadedUrls = [];
          try {
            const { fileUrl, previewFilePath } = await uploadWorkFile(htmlFile, tempDir, uploadedUrls);
            let coverPath = coverFile?.filePath;
            let coverFilename = coverFile?.filename;
            let coverMimetype = coverFile?.mimetype;
            if (!coverPath) {
              coverPath = path.join(tempDir, 'auto-cover.png');
              coverFilename = `${fields.title}-cover.png`;
              coverMimetype = 'image/png';
              await coverGenerator({
                htmlFilePath: previewFilePath,
                outputPath: coverPath,
                title: fields.title,
              });
            }
            const coverKey = `images/${sanitizeFilename(coverFilename)}`;
            const imageUrl = await uploadFile({
              key: coverKey,
              filePath: coverPath,
              contentType: inferContentType(coverFilename, coverMimetype),
            });
            uploadedUrls.push(imageUrl);

            const result = await query(
              `INSERT INTO resources
                (title, description, category, grade, image_url, file_path, route_path, resource_type)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               RETURNING *`,
              [
                fields.title,
                fields.description || '',
                section === 'tools' ? TOOL_CATEGORY : section === 'games' ? GAME_CATEGORY : fields.category,
                section === 'tools' || section === 'games' ? '通用' : fields.grade,
                imageUrl,
                fileUrl,
                routePath,
                'html',
              ]
            );

            reply.code(201);
            return normalizeResource(result.rows[0]);
          } catch (error) {
            await cleanupObjects(uploadedUrls, app.log);
            throw error;
          }
        }

        if (section === 'teaching') {
          const teachingFile = files.teachingFile;
          const fileExt = path.extname(teachingFile.filename).replace('.', '').toLowerCase() || 'file';
          const fileKey = `${fields.zone || 'misc'}/${sanitizeFilename(teachingFile.filename)}`;
          const fileUrl = await uploadFile({
            key: fileKey,
            filePath: teachingFile.filePath,
            contentType: inferContentType(teachingFile.filename, teachingFile.mimetype),
          });

          try {
            const result = await query(
              `INSERT INTO teaching_resources (title, description, zone, file_url, file_type)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING *`,
              [fields.title, fields.description || '', fields.zone, fileUrl, fileExt]
            );

            reply.code(201);
            return normalizeTeachingResource(result.rows[0]);
          } catch (error) {
            await cleanupObjects([fileUrl], app.log);
            throw error;
          }
        }

        return reply.code(400).send({ error: `Unsupported section: ${section}` });
      } finally {
        await removeTempDirectory(tempDir);
      }
    }
  );
}
