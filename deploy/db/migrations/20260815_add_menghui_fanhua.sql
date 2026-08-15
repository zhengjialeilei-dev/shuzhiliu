BEGIN;

INSERT INTO resources (
  title,
  category,
  grade,
  image_url,
  description,
  file_path,
  route_path,
  resource_type
)
SELECT
  '《梦回繁华》沉浸式长卷课堂',
  '其他',
  '拓展',
  'https://sparkaiedu.com/ai-apps/menghui-fanhua/cover.jpg',
  '从《清明上河图》走进北宋汴京，通过沉浸式长卷、场景热点与全景观察学习课文《梦回繁华》。',
  'https://sparkaiedu.com/ai-apps/menghui-fanhua/index.html',
  '/works/menghui-fanhua',
  'html'
WHERE NOT EXISTS (
  SELECT 1
  FROM resources
  WHERE route_path = '/works/menghui-fanhua'
);

COMMIT;
