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
