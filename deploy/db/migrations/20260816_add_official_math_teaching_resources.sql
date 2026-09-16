BEGIN;

UPDATE teaching_resources
SET title = '义务教育数学课程标准（2022年版）',
    description = '教育部制定的正式版本，已核对教育部修订附件，可在线阅读或下载。',
    zone = 'standard'
WHERE title = '数学课程标准';

UPDATE teaching_resources
SET title = '义务教育课程方案（2022年版）',
    description = '教育部制定的正式课程方案，已核对教育部官方附件，可在线阅读或下载。',
    zone = 'standard'
WHERE title = '课程实施方案';

INSERT INTO teaching_resources (title, description, zone, file_url, file_type)
SELECT title, description, zone, file_url, file_type
FROM (
  VALUES
    (
      '教育部义务教育课程方案和课程标准（2022年版）通知',
      '教育部发布页面，包含课程方案及数学等学科课程标准的官方附件。',
      'standard',
      'https://www.moe.gov.cn/srcsite/A26/s8001/202204/t20220420_619921.html',
      'link'
    ),
    (
      '国家中小学智慧教育平台',
      '国家级基础教育资源平台，提供课程教学、专题教育和课后服务等内容。',
      'courseware',
      'https://basic.smartedu.cn/',
      'link'
    ),
    (
      '国家中小学智慧教育平台·同步课堂',
      '按学段、年级和学科查找同步课程与教学资源。',
      'courseware',
      'https://basic.smartedu.cn/syncClassroom',
      'link'
    ),
    (
      '人教版小学数学教材解读视频',
      '人民教育出版社人教视频栏目中的小学数学教材解读内容。',
      'courseware',
      'https://www.pep.com.cn/rjyx/',
      'link'
    ),
    (
      '人教版小学数学配套教学资源',
      '人民教育出版社小学配套教学资源入口，覆盖一至六年级数学。',
      'courseware',
      'https://www.pep.com.cn/jxzy/tbjl/nlpyycs/xx/',
      'link'
    ),
    (
      '网络画板·小学数学动态实验资源',
      '动态几何与数学实验资源平台，提供小学数学知识点与互动课件。',
      'courseware',
      'https://www.netpad.net.cn/',
      'link'
    )
) AS official_resource_data(title, description, zone, file_url, file_type)
WHERE NOT EXISTS (
  SELECT 1
  FROM teaching_resources
  WHERE teaching_resources.title = official_resource_data.title
     OR teaching_resources.file_url = official_resource_data.file_url
);

COMMIT;
