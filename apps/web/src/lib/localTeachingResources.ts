import type { TeachingResource } from './types';

export const LOCAL_TEXTBOOK_RESOURCES: TeachingResource[] = [
  {
    id: 'local-textbook-rj-math-g1-v1-2024-fall',
    title: '人教版一年级上册数学电子课本（2024秋版）',
    description: '一年级上册数学电子课本（2024秋版）',
    zone: 'textbook',
    file_url: '/files/textbooks/rj-math-grade-1-volume-1-2024-fall.pdf',
    file_type: 'pdf',
  },
  {
    id: 'local-textbook-rj-math-g1-v2-2025-spring',
    title: '人教版一年级下册数学电子课本（2025春版）',
    description: '一年级下册数学电子课本（2025春版）',
    zone: 'textbook',
    file_url: '/files/textbooks/rj-math-grade-1-volume-2-2025-spring.pdf',
    file_type: 'pdf',
  },
  {
    id: 'local-textbook-rj-math-g2-v1-2025-fall',
    title: '人教版二年级上册数学电子课本（2025秋版）',
    description: '二年级上册数学电子课本（2025秋版）',
    zone: 'textbook',
    file_url: '/files/textbooks/rj-math-grade-2-volume-1-2025-fall.pdf',
    file_type: 'pdf',
  },
  {
    id: 'local-textbook-rj-math-g2-v2-2026-spring',
    title: '人教版二年级下册数学电子课本（2026春版）',
    description: '二年级下册数学电子课本（2026春版）',
    zone: 'textbook',
    file_url: '/files/textbooks/rj-math-grade-2-volume-2-2026-spring.pdf',
    file_type: 'pdf',
  },
  {
    id: 'local-textbook-rj-math-g2-v2',
    title: '人教版二年级下册数学电子课本',
    description: '二年级下册数学电子课本',
    zone: 'textbook',
    file_url: '/files/textbooks/rj-math-grade-2-volume-2.pdf',
    file_type: 'pdf',
  },
  {
    id: 'local-textbook-rj-math-g3-v1-2025-fall',
    title: '人教版三年级上册数学电子课本（2025秋版）',
    description: '三年级上册数学电子课本（2025秋版）',
    zone: 'textbook',
    file_url: '/files/textbooks/rj-math-grade-3-volume-1-2025-fall.pdf',
    file_type: 'pdf',
  },
  {
    id: 'local-textbook-rj-math-g3-v2-2026-spring',
    title: '人教版三年级下册数学电子课本（2026春版）',
    description: '三年级下册数学电子课本（2026春版）',
    zone: 'textbook',
    file_url: '/files/textbooks/rj-math-grade-3-volume-2-2026-spring.pdf',
    file_type: 'pdf',
  },
  {
    id: 'local-textbook-rj-math-g3-v2',
    title: '人教版三年级下册数学电子课本',
    description: '三年级下册数学电子课本',
    zone: 'textbook',
    file_url: '/files/textbooks/rj-math-grade-3-volume-2.pdf',
    file_type: 'pdf',
  },
  {
    id: 'local-textbook-rj-math-g4-v1',
    title: '人教版四年级上册数学电子课本',
    description: '四年级上册数学电子课本',
    zone: 'textbook',
    file_url: '/files/textbooks/rj-math-grade-4-volume-1.pdf',
    file_type: 'pdf',
  },
  {
    id: 'local-textbook-rj-math-g4-v2',
    title: '人教版四年级下册数学电子课本',
    description: '四年级下册数学电子课本',
    zone: 'textbook',
    file_url: '/files/textbooks/rj-math-grade-4-volume-2.pdf',
    file_type: 'pdf',
  },
  {
    id: 'local-textbook-rj-math-g5-v1',
    title: '人教版五年级上册数学电子课本',
    description: '五年级上册数学电子课本',
    zone: 'textbook',
    file_url: '/files/textbooks/rj-math-grade-5-volume-1.pdf',
    file_type: 'pdf',
  },
  {
    id: 'local-textbook-rj-math-g5-v2',
    title: '人教版五年级下册数学电子课本',
    description: '五年级下册数学电子课本',
    zone: 'textbook',
    file_url: '/files/textbooks/rj-math-grade-5-volume-2.pdf',
    file_type: 'pdf',
  },
  {
    id: 'local-textbook-rj-math-g6-v1',
    title: '人教版六年级上册数学电子课本',
    description: '六年级上册数学电子课本',
    zone: 'textbook',
    file_url: '/files/textbooks/rj-math-grade-6-volume-1.pdf',
    file_type: 'pdf',
  },
  {
    id: 'local-textbook-rj-math-g6-v2',
    title: '人教版六年级下册数学电子课本',
    description: '六年级下册数学电子课本',
    zone: 'textbook',
    file_url: '/files/textbooks/rj-math-grade-6-volume-2.pdf',
    file_type: 'pdf',
  },
];

export function mergeLocalTextbooks(resources: TeachingResource[]) {
  const merged = [...resources];
  const seen = new Set(resources.map((resource) => `${resource.zone}|${resource.title}`));

  for (const resource of LOCAL_TEXTBOOK_RESOURCES) {
    const key = `${resource.zone}|${resource.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(resource);
  }

  return merged;
}
