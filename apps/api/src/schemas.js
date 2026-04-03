export const successResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['success'],
  properties: {
    success: { type: 'boolean' },
  },
};

export const errorResponseSchema = {
  type: 'object',
  additionalProperties: true,
  required: ['error'],
  properties: {
    error: { type: 'string' },
    retryAfter: { type: 'integer' },
  },
};

export const adminSessionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['authenticated'],
  properties: {
    authenticated: { type: 'boolean' },
  },
};

export const resourceSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'title',
    'category',
    'grade',
    'image_url',
    'description',
    'resource_type',
    'created_at',
  ],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    category: { type: 'string' },
    grade: { type: 'string' },
    image_url: { type: 'string' },
    description: { type: 'string' },
    file_path: { type: ['string', 'null'] },
    route_path: { type: ['string', 'null'] },
    resource_type: { type: 'string' },
    created_at: { type: ['string', 'object'] },
  },
};

export const teachingResourceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'title', 'description', 'zone', 'file_url', 'file_type'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    zone: { type: 'string' },
    file_url: { type: 'string' },
    file_type: { type: 'string' },
    created_at: { type: ['string', 'object', 'null'] },
  },
};

export const healthCheckSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['api', 'auth', 'database', 'storage'],
  properties: {
    api: {
      type: 'object',
      additionalProperties: false,
      required: ['status', 'message', 'storageDriver'],
      properties: {
        status: { type: 'string' },
        message: { type: 'string' },
        storageDriver: { type: 'string' },
      },
    },
    auth: {
      type: 'object',
      additionalProperties: false,
      required: ['status', 'message'],
      properties: {
        status: { type: 'string' },
        message: { type: 'string' },
      },
    },
    database: {
      type: 'object',
      additionalProperties: false,
      required: ['status', 'message'],
      properties: {
        status: { type: 'string' },
        message: { type: 'string' },
        resourcesCount: { type: 'integer' },
        teachingCount: { type: 'integer' },
      },
    },
    storage: {
      type: 'object',
      additionalProperties: false,
      required: ['status', 'message'],
      properties: {
        status: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};
