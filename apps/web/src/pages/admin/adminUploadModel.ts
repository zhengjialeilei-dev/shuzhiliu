import { AI_CATEGORIES, GAME_CATEGORY, TOOL_CATEGORY } from '../../lib/resourceCategories';

export const GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '通用', '拓展'] as const;
export const TEACHING_ZONES = [
  { id: 'standard', label: '课标' },
  { id: 'textbook', label: '课本' },
  { id: 'plan', label: '教案' },
  { id: 'courseware', label: '课件' },
] as const;

export type Section = 'ai' | 'games' | 'tools' | 'teaching';
export type TeachingSource = 'file' | 'link';
export type UploadDraft = {
  title: string;
  description: string;
  category: string;
  grade: string;
  routeSlug: string;
  zone: string;
  teachingSource: TeachingSource;
  externalUrl: string;
};
export type UploadFiles = {
  workFile: File | null;
  coverFile: File | null;
  teachingFile: File | null;
};

export const SECTION_LABELS: Record<Section, string> = {
  ai: 'AI 应用',
  games: '互动游戏',
  tools: '实用工具',
  teaching: '教学资源',
};

export function createEmptyDraft(section: Section): UploadDraft {
  return {
    title: '',
    description: '',
    category: section === 'games' ? GAME_CATEGORY : section === 'tools' ? TOOL_CATEGORY : AI_CATEGORIES[0],
    grade: section === 'ai' ? GRADES[0] : '通用',
    routeSlug: '',
    zone: TEACHING_ZONES[0].id,
    teachingSource: 'file',
    externalUrl: '',
  };
}

export function createEmptyFiles(): UploadFiles {
  return { workFile: null, coverFile: null, teachingFile: null };
}

export function createDrafts(): Record<Section, UploadDraft> {
  return {
    ai: createEmptyDraft('ai'),
    games: createEmptyDraft('games'),
    tools: createEmptyDraft('tools'),
    teaching: createEmptyDraft('teaching'),
  };
}

export function createUploadFiles(): Record<Section, UploadFiles> {
  return {
    ai: createEmptyFiles(),
    games: createEmptyFiles(),
    tools: createEmptyFiles(),
    teaching: createEmptyFiles(),
  };
}

export function buildUploadFormData(section: Section, draft: UploadDraft, files: UploadFiles) {
  const formData = new FormData();
  formData.set('section', section);
  formData.set('title', draft.title);
  formData.set('description', draft.description);

  if (section === 'teaching') {
    if (draft.teachingSource === 'link') throw new Error('官方外链无需上传文件');
    if (!files.teachingFile) throw new Error('请上传教学资源文件');
    formData.set('zone', draft.zone);
    formData.set('teachingFile', files.teachingFile);
    return formData;
  }

  if (!files.workFile) throw new Error('请上传 HTML 或 ZIP 作品文件');
  formData.set('routeSlug', draft.routeSlug);
  formData.set('htmlFile', files.workFile);
  if (files.coverFile) formData.set('coverFile', files.coverFile);
  if (section === 'ai') {
    formData.set('category', draft.category);
    formData.set('grade', draft.grade);
  }
  return formData;
}

export function buildExternalTeachingPayload(draft: UploadDraft) {
  let url;
  try {
    url = new URL(draft.externalUrl.trim());
  } catch {
    throw new Error('请输入完整的官方资源链接');
  }

  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('官方资源链接必须使用 HTTPS，且不能包含账号密码');
  }

  return {
    title: draft.title,
    description: draft.description,
    zone: draft.zone,
    file_url: url.toString(),
  };
}
