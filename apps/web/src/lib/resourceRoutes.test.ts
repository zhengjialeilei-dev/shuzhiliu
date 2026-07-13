import { describe, expect, it } from 'vitest';
import {
  buildHtmlResourceSlug,
  findHtmlResourceByPath,
  getHtmlResourcePath,
} from './resourceRoutes';

describe('resourceRoutes', () => {
  it('derives a clean slug from the html file name when there is no route alias', () => {
    const resource = {
      id: 'abc12345-0000-0000-0000-000000000000',
      title: '魔法药水浓度模拟器',
      file_path:
        'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/legacy/ai-apps/potion-percentages.html',
      route_path: null,
    };

    expect(buildHtmlResourceSlug(resource)).toBe('potion-percentages');
    expect(getHtmlResourcePath(resource)).toBe('/zhijing/potion-percentages');
  });

  it('prefers an existing short route alias', () => {
    const resource = {
      id: 'abc12345-0000-0000-0000-000000000000',
      title: '利率',
      file_path: 'https://example.com/demo.html',
      route_path: '/ll',
    };

    expect(buildHtmlResourceSlug(resource)).toBe('ll');
    expect(getHtmlResourcePath(resource)).toBe('/ll');
  });

  it('finds a resource by the resolved browser path', () => {
    const resource = {
      id: 'abc12345-0000-0000-0000-000000000000',
      title: '趣味数独',
      category: '综合实践',
      grade: '通用',
      image_url: 'https://example.com/sudoku.png',
      description: '数独练习',
      file_path: 'https://example.com/sudoku.html',
      route_path: '/sd',
      resource_type: 'html' as const,
      created_at: new Date().toISOString(),
    };

    expect(findHtmlResourceByPath([resource], '/sd')).toEqual(resource);
    expect(findHtmlResourceByPath([resource], '/zhijing/sudoku-fun')).toBeNull();
  });

  it('preserves a managed works route', () => {
    const resource = {
      id: 'managed-route-1',
      title: '分数实验室',
      category: '数与代数',
      grade: '五年级',
      image_url: 'https://example.com/fraction.png',
      description: '分数互动实验',
      file_path: 'https://example.com/apps/bundles/demo/index.html',
      route_path: '/works/fraction-lab',
      resource_type: 'html' as const,
      created_at: new Date().toISOString(),
    };

    expect(getHtmlResourcePath(resource)).toBe('/works/fraction-lab');
    expect(findHtmlResourceByPath([resource], '/works/fraction-lab')).toEqual(resource);
  });
});
