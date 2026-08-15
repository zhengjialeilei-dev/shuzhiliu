import path from 'node:path';

export const AI_CATEGORIES = ['数与代数', '图形与几何', '统计与概率', '综合实践', '微课', '习题', '其他'];
export const GAME_CATEGORY = '互动游戏';
export const TOOL_CATEGORY = '互动工具';
export const ALL_RESOURCE_CATEGORIES = [...AI_CATEGORIES, GAME_CATEGORY, TOOL_CATEGORY];
export const GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '通用', '拓展'];
export const TEACHING_ZONES = ['standard', 'textbook', 'plan', 'courseware'];

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const WORK_EXTENSIONS = new Set(['.html', '.htm', '.zip']);
const TEACHING_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.ppt', '.pptx']);

function createValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

export function getFileExtension(filename) {
  return path.extname(filename || '').toLowerCase();
}

export function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw createValidationError(`${fieldName} is required`);
  }
}

export function assertAllowedValue(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    throw createValidationError(`${fieldName} is invalid`);
  }
}

export function normalizeExternalTeachingUrl(value) {
  assertNonEmptyString(value, 'file_url');

  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw createValidationError('官方资源链接格式不正确');
  }

  if (url.protocol !== 'https:' || url.username || url.password) {
    throw createValidationError('官方资源链接必须使用 HTTPS，且不能包含账号密码');
  }

  return url.toString();
}

function assertFile(file, allowedExtensions, fieldName) {
  if (!file?.filename) {
    throw new Error(`${fieldName} is required`);
  }
  if (!allowedExtensions.has(getFileExtension(file.filename))) {
    throw new Error(`${fieldName} has an unsupported file type`);
  }
}

export function validateResourceReplacement(fields, files) {
  assertNonEmptyString(fields.title, 'title');
  assertNonEmptyString(fields.description, 'description');
  assertAllowedValue(fields.category, ALL_RESOURCE_CATEGORIES, 'category');
  assertAllowedValue(fields.grade, GRADES, 'grade');
  if (files.htmlFile) assertFile(files.htmlFile, WORK_EXTENSIONS, 'htmlFile');
  if (files.coverFile) assertFile(files.coverFile, IMAGE_EXTENSIONS, 'coverFile');
}

export function validateUpload(fields, files) {
  const section = fields.section;
  if (!['ai', 'games', 'tools', 'teaching'].includes(section)) {
    throw new Error('section is invalid');
  }

  assertNonEmptyString(fields.title, 'title');

  if (section === 'ai') {
    assertNonEmptyString(fields.description, 'description');
    assertAllowedValue(fields.category, AI_CATEGORIES, 'category');
    assertAllowedValue(fields.grade, GRADES, 'grade');
    assertFile(files.htmlFile, WORK_EXTENSIONS, 'htmlFile');
    if (files.coverFile) assertFile(files.coverFile, IMAGE_EXTENSIONS, 'coverFile');
  }

  if (section === 'tools' || section === 'games') {
    assertNonEmptyString(fields.description, 'description');
    assertFile(files.htmlFile, WORK_EXTENSIONS, 'htmlFile');
    if (files.coverFile) assertFile(files.coverFile, IMAGE_EXTENSIONS, 'coverFile');
  }

  if (section === 'teaching') {
    assertNonEmptyString(fields.description, 'description');
    assertAllowedValue(fields.zone, TEACHING_ZONES, 'zone');
    assertFile(files.teachingFile, TEACHING_EXTENSIONS, 'teachingFile');
  }
}

export function normalizeRoutePath(value) {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const slug = value.trim().toLowerCase().replace(/^\/+(?:works\/)?/, '').replace(/\/+$/, '');
  if (!/^[a-z0-9][a-z0-9-]{1,49}$/.test(slug)) {
    throw new Error('作品短链接只能包含 2-50 个小写字母、数字或连字符');
  }
  return `/works/${slug}`;
}
