INSERT INTO resources (title, category, grade, image_url, description, file_path, route_path, resource_type)
SELECT
  'SVG 扇形统计图',
  '统计与概率',
  '六年级',
  'https://api.dicebear.com/7.x/shapes/svg?seed=PieChart',
  '交互式扇形统计图教学资源',
  '/ai-apps/SVG%20%E6%89%87%E5%BD%A2%E7%BB%9F%E8%AE%A1%E5%9B%BE%E6%95%99%E5%AD%A6%E7%A8%8B%E5%BA%8F.html',
  NULL,
  'html'
WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = 'SVG 扇形统计图');

INSERT INTO resources (title, category, grade, image_url, description, file_path, route_path, resource_type)
SELECT
  '圆的面积推导',
  '图形与几何',
  '六年级',
  'https://api.dicebear.com/7.x/shapes/svg?seed=CircleArea',
  '圆的面积公式推导演示',
  '/ai-apps/ci.HTML',
  NULL,
  'html'
WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = '圆的面积推导');

INSERT INTO resources (title, category, grade, image_url, description, file_path, route_path, resource_type)
SELECT
  '随机点名神器',
  '赋能教学',
  '通用',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Picker',
  '课堂互动随机点名工具',
  NULL,
  '/tools/random-picker',
  'react'
WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = '随机点名神器');

INSERT INTO resources (title, category, grade, image_url, description, file_path, route_path, resource_type)
SELECT
  '沉浸式倒计时',
  '赋能教学',
  '通用',
  'https://api.dicebear.com/7.x/shapes/svg?seed=Timer',
  '大屏沉浸式课堂倒计时工具',
  NULL,
  '/tools/timer',
  'react'
WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = '沉浸式倒计时');

INSERT INTO resources (title, category, grade, image_url, description, file_path, route_path, resource_type)
SELECT
  '小组龙虎榜',
  '赋能教学',
  '通用',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Scoreboard',
  '小组积分榜与课堂竞赛工具',
  NULL,
  '/tools/scoreboard',
  'react'
WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = '小组龙虎榜');

INSERT INTO teaching_resources (title, description, zone, file_url, file_type)
SELECT
  '数学课程标准',
  '本地静态示例资源，可作为部署前占位内容。',
  'standard',
  '/files/%E6%95%B0%E5%AD%A6%E8%AF%BE%E6%A0%87.pdf',
  'pdf'
WHERE NOT EXISTS (SELECT 1 FROM teaching_resources WHERE title = '数学课程标准');

INSERT INTO teaching_resources (title, description, zone, file_url, file_type)
SELECT
  '课程实施方案',
  '本地静态示例资源，可作为部署前占位内容。',
  'standard',
  '/files/%E8%AF%BE%E6%A0%87%E6%96%B9%E6%A1%88.pdf',
  'pdf'
WHERE NOT EXISTS (SELECT 1 FROM teaching_resources WHERE title = '课程实施方案');
INSERT INTO teaching_resources (title, description, zone, file_url, file_type)
SELECT title, description, zone, file_url, file_type
FROM (
  VALUES
    ('人教版一年级上册数学电子课本（2024秋版）', '一年级上册数学电子课本（2024秋版）', 'textbook', '/files/textbooks/rj-math-grade-1-volume-1-2024-fall.pdf', 'pdf'),
    ('人教版一年级下册数学电子课本（2025春版）', '一年级下册数学电子课本（2025春版）', 'textbook', '/files/textbooks/rj-math-grade-1-volume-2-2025-spring.pdf', 'pdf'),
    ('人教版二年级上册数学电子课本（2025秋版）', '二年级上册数学电子课本（2025秋版）', 'textbook', '/files/textbooks/rj-math-grade-2-volume-1-2025-fall.pdf', 'pdf'),
    ('人教版二年级下册数学电子课本（2026春版）', '二年级下册数学电子课本（2026春版）', 'textbook', '/files/textbooks/rj-math-grade-2-volume-2-2026-spring.pdf', 'pdf'),
    ('人教版二年级下册数学电子课本', '二年级下册数学电子课本', 'textbook', '/files/textbooks/rj-math-grade-2-volume-2.pdf', 'pdf'),
    ('人教版三年级上册数学电子课本（2025秋版）', '三年级上册数学电子课本（2025秋版）', 'textbook', '/files/textbooks/rj-math-grade-3-volume-1-2025-fall.pdf', 'pdf'),
    ('人教版三年级下册数学电子课本（2026春版）', '三年级下册数学电子课本（2026春版）', 'textbook', '/files/textbooks/rj-math-grade-3-volume-2-2026-spring.pdf', 'pdf'),
    ('人教版三年级下册数学电子课本', '三年级下册数学电子课本', 'textbook', '/files/textbooks/rj-math-grade-3-volume-2.pdf', 'pdf'),
    ('人教版四年级上册数学电子课本', '四年级上册数学电子课本', 'textbook', '/files/textbooks/rj-math-grade-4-volume-1.pdf', 'pdf'),
    ('人教版四年级下册数学电子课本', '四年级下册数学电子课本', 'textbook', '/files/textbooks/rj-math-grade-4-volume-2.pdf', 'pdf'),
    ('人教版五年级上册数学电子课本', '五年级上册数学电子课本', 'textbook', '/files/textbooks/rj-math-grade-5-volume-1.pdf', 'pdf'),
    ('人教版五年级下册数学电子课本', '五年级下册数学电子课本', 'textbook', '/files/textbooks/rj-math-grade-5-volume-2.pdf', 'pdf'),
    ('人教版六年级上册数学电子课本', '六年级上册数学电子课本', 'textbook', '/files/textbooks/rj-math-grade-6-volume-1.pdf', 'pdf'),
    ('人教版六年级下册数学电子课本', '六年级下册数学电子课本', 'textbook', '/files/textbooks/rj-math-grade-6-volume-2.pdf', 'pdf')
) AS textbook_data(title, description, zone, file_url, file_type)
WHERE NOT EXISTS (
  SELECT 1 FROM teaching_resources WHERE teaching_resources.title = textbook_data.title
);
