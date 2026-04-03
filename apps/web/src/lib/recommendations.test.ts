import { describe, expect, it } from 'vitest';
import { recommendationConfig } from './recommendationConfig';
import { buildRecommendationPageModel } from './recommendations';
import type { Resource } from './types';

const resources: Resource[] = [
  {
    id: '1',
    title: '魔法药水浓度模拟器',
    category: '数与代数',
    grade: '六年级',
    image_url: 'https://example.com/nd.png',
    description: '浓度变化资源',
    route_path: '/nd',
    file_path: 'https://example.com/nd.html',
    resource_type: 'html',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: '利率课件',
    category: '数与代数',
    grade: '六年级',
    image_url: 'https://example.com/llkj.png',
    description: '利率课件',
    route_path: '/llkj',
    file_path: 'https://example.com/llkj.html',
    resource_type: 'html',
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    title: '利率',
    category: '数与代数',
    grade: '六年级',
    image_url: 'https://example.com/ll.png',
    description: '利率资源',
    route_path: '/ll',
    file_path: 'https://example.com/ll.html',
    resource_type: 'html',
    created_at: new Date().toISOString(),
  },
  {
    id: '4',
    title: '圆柱体积推导',
    category: '图形与几何',
    grade: '六年级',
    image_url: 'https://example.com/yztj.png',
    description: '圆柱体积资源',
    route_path: '/yztj',
    file_path: 'https://example.com/yztj.html',
    resource_type: 'html',
    created_at: new Date().toISOString(),
  },
  {
    id: '5',
    title: '圆柱表面积推导',
    category: '图形与几何',
    grade: '六年级',
    image_url: 'https://example.com/yzbm.png',
    description: '圆柱表面积资源',
    route_path: '/yzbm',
    file_path: 'https://example.com/yzbm.html',
    resource_type: 'html',
    created_at: new Date().toISOString(),
  },
  {
    id: '6',
    title: '趣味数独',
    category: '综合实践',
    grade: '通用',
    image_url: 'https://example.com/sd.png',
    description: '数独资源',
    route_path: '/sd',
    file_path: 'https://example.com/sd.html',
    resource_type: 'html',
    created_at: new Date().toISOString(),
  },
  {
    id: '7',
    title: '欢乐五子棋',
    category: '综合实践',
    grade: '通用',
    image_url: 'https://example.com/wzq.png',
    description: '五子棋资源',
    route_path: '/wzq',
    file_path: 'https://example.com/wzq.html',
    resource_type: 'html',
    created_at: new Date().toISOString(),
  },
  {
    id: '8',
    title: '百分数的意义',
    category: '数与代数',
    grade: '六年级',
    image_url: 'https://example.com/bfs.png',
    description: '百分数意义',
    route_path: '/bfs',
    file_path: 'https://example.com/bfs.html',
    resource_type: 'html',
    created_at: new Date().toISOString(),
  },
  {
    id: '9',
    title: '扇形统计图实验室',
    category: '统计与概率',
    grade: '六年级',
    image_url: 'https://example.com/sxt.png',
    description: '扇形统计图',
    route_path: '/sxt',
    file_path: 'https://example.com/sxt.html',
    resource_type: 'html',
    created_at: new Date().toISOString(),
  },
  {
    id: '10',
    title: '百分数折扣成数',
    category: '数与代数',
    grade: '六年级',
    image_url: 'https://example.com/zk.png',
    description: '折扣资源',
    route_path: '/zk',
    file_path: 'https://example.com/zk.html',
    resource_type: 'html',
    created_at: new Date().toISOString(),
  },
  {
    id: '11',
    title: '三视图教学',
    category: '图形与几何',
    grade: '六年级',
    image_url: 'https://example.com/sst.png',
    description: '三视图资源',
    route_path: '/sst',
    file_path: 'https://example.com/sst.html',
    resource_type: 'html',
    created_at: new Date().toISOString(),
  },
  {
    id: '12',
    title: '旋转体可视化',
    category: '图形与几何',
    grade: '六年级',
    image_url: 'https://example.com/xzt.png',
    description: '旋转体资源',
    route_path: '/xzt',
    file_path: 'https://example.com/xzt.html',
    resource_type: 'html',
    created_at: new Date().toISOString(),
  },
  {
    id: '13',
    title: '位置探索',
    category: '图形与几何',
    grade: '四年级',
    image_url: 'https://example.com/wz.png',
    description: '位置探索资源',
    route_path: '/wz',
    file_path: 'https://example.com/wz.html',
    resource_type: 'html',
    created_at: new Date().toISOString(),
  },
  {
    id: '14',
    title: '比的意义',
    category: '数与代数',
    grade: '六年级',
    image_url: 'https://example.com/bd.png',
    description: '比的意义资源',
    route_path: '/bd',
    file_path: 'https://example.com/bd.html',
    resource_type: 'html',
    created_at: new Date().toISOString(),
  },
  {
    id: '15',
    title: '圆的周长推导',
    category: '图形与几何',
    grade: '六年级',
    image_url: 'https://example.com/yzc.png',
    description: '圆的周长推导资源',
    route_path: '/yzc',
    file_path: 'https://example.com/yzc.html',
    resource_type: 'html',
    created_at: new Date().toISOString(),
  },
  {
    id: '16',
    title: '平移与旋转工坊',
    category: '图形与几何',
    grade: '三年级',
    image_url: 'https://example.com/pyxz.png',
    description: '平移与旋转资源',
    route_path: '/pyxz',
    file_path: 'https://example.com/pyxz.html',
    resource_type: 'html',
    created_at: new Date().toISOString(),
  },
];

describe('buildRecommendationPageModel', () => {
  it('builds the mixed recommendation page model from configured resources', () => {
    const model = buildRecommendationPageModel(resources, recommendationConfig);

    expect(model.featuredTheme?.resource.resource.route_path).toBe('/llkj');
    expect(model.teachingActions).toHaveLength(3);
    expect(model.promptTemplates).toHaveLength(6);
    expect(model.aiTools.length).toBeGreaterThan(0);
    expect(model.teacherWebsites.length).toBeGreaterThan(0);
    expect(model.collections).toHaveLength(4);
  });

  it('falls back to secondary resources when the primary hero item is missing', () => {
    const model = buildRecommendationPageModel(
      resources.filter((resource) => resource.route_path !== '/llkj'),
      recommendationConfig
    );

    expect(model.featuredTheme?.resource.resource.route_path).toBe('/ll');
  });
});
