export interface RecommendedLink {
  id: string;
  name: string;
  description: string;
  url: string;
}

export const teachingWebsites: RecommendedLink[] = [
  {
    id: 'smart-education',
    name: '国家中小学智慧教育平台',
    description: '查找国家级课程教学资源、专题教育和课后服务内容。',
    url: 'https://basic.smartedu.cn/',
  },
  {
    id: 'people-education-press',
    name: '人民教育出版社',
    description: '查看人教版教材信息、教学资源和教材解读内容。',
    url: 'https://www.pep.com.cn/',
  },
  {
    id: 'ministry-curriculum-standards',
    name: '教育部课程标准',
    description: '查看义务教育课程方案和各学科课程标准官方文件。',
    url: 'https://www.moe.gov.cn/srcsite/A26/s8001/202204/t20220420_619921.html',
  },
];

export const teachingTools: RecommendedLink[] = [
  {
    id: 'doubao',
    name: '豆包',
    description: '辅助编写教案、课堂练习、活动说明和家校沟通文案。',
    url: 'https://www.doubao.com/',
  },
  {
    id: 'kimi',
    name: 'Kimi',
    description: '阅读长文档、整理教学资料并快速提炼重点内容。',
    url: 'https://www.kimi.com/',
  },
  {
    id: 'canva',
    name: 'Canva 可画',
    description: '使用模板制作课件、教学图片、海报和课堂展示材料。',
    url: 'https://www.canva.cn/',
  },
  {
    id: 'netpad',
    name: '网络画板',
    description: '制作和使用动态几何、函数与数学实验演示资源。',
    url: 'https://www.netpad.net.cn/',
  },
];
