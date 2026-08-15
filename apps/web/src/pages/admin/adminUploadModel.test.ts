import { describe, expect, it } from 'vitest';
import {
  buildExternalTeachingPayload,
  buildUploadFormData,
  createEmptyDraft,
  createEmptyFiles,
} from './adminUploadModel';

describe('admin upload model', () => {
  it('builds an AI work upload with an optional cover', () => {
    const workFile = new File(['<html></html>'], 'demo.html', { type: 'text/html' });
    const coverFile = new File(['cover'], 'cover.png', { type: 'image/png' });
    const draft = {
      ...createEmptyDraft('ai'),
      title: '分数实验室',
      description: '交互式分数练习',
      category: '数与代数',
      grade: '三年级',
      routeSlug: 'fraction-lab',
    };

    const result = buildUploadFormData('ai', draft, { workFile, coverFile, teachingFile: null });

    expect(result.get('section')).toBe('ai');
    expect(result.get('category')).toBe('数与代数');
    expect(result.get('grade')).toBe('三年级');
    expect(result.get('routeSlug')).toBe('fraction-lab');
    expect(result.get('htmlFile')).toBe(workFile);
    expect(result.get('coverFile')).toBe(coverFile);
  });

  it('builds a teaching upload without work-only fields', () => {
    const teachingFile = new File(['pdf'], 'book.pdf', { type: 'application/pdf' });
    const draft = {
      ...createEmptyDraft('teaching'),
      title: '二年级数学课本',
      description: '电子课本',
      zone: 'textbook',
    };

    const result = buildUploadFormData('teaching', draft, {
      ...createEmptyFiles(),
      teachingFile,
    });

    expect(result.get('zone')).toBe('textbook');
    expect(result.get('teachingFile')).toBe(teachingFile);
    expect(result.has('htmlFile')).toBe(false);
  });

  it('rejects a work upload without a file', () => {
    expect(() => buildUploadFormData('tools', createEmptyDraft('tools'), createEmptyFiles())).toThrow(
      '请上传 HTML 或 ZIP 作品文件'
    );
  });

  it('builds a normalized official teaching link payload', () => {
    const result = buildExternalTeachingPayload({
      ...createEmptyDraft('teaching'),
      title: '义务教育数学课程标准',
      description: '教育部正式发布版本',
      zone: 'standard',
      teachingSource: 'link',
      externalUrl: ' https://www.moe.gov.cn/math-standard.pdf ',
    });

    expect(result.file_url).toBe('https://www.moe.gov.cn/math-standard.pdf');
    expect(result.zone).toBe('standard');
  });

  it('rejects an insecure teaching resource link', () => {
    expect(() =>
      buildExternalTeachingPayload({
        ...createEmptyDraft('teaching'),
        teachingSource: 'link',
        externalUrl: 'http://example.com/lesson',
      })
    ).toThrow('必须使用 HTTPS');
  });
});
