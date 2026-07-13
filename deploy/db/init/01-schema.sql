CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL,
  grade VARCHAR(20) NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT NOT NULL,
  file_path TEXT,
  route_path TEXT,
  resource_type VARCHAR(20) NOT NULL DEFAULT 'html',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT chk_resources_grade CHECK (
    grade IN ('一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '通用', '拓展')
  ),
  CONSTRAINT chk_resources_type CHECK (resource_type IN ('html', 'react')),
  CONSTRAINT chk_resources_route_path CHECK (
    route_path IS NULL
    OR (
      route_path ~ '^/[a-z0-9][a-z0-9/_-]{0,99}$'
      AND route_path !~ '//|/$'
    )
  ),
  CONSTRAINT chk_resources_location CHECK (
    (resource_type = 'html' AND file_path IS NOT NULL)
    OR (resource_type = 'react' AND route_path IS NOT NULL)
  ),
  CONSTRAINT chk_resources_version CHECK (version > 0)
);

CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_grade ON resources(grade);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON resources(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_resources_route_path
  ON resources(route_path) WHERE route_path IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resources_gallery
  ON resources(category, grade, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS teaching_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  zone TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT chk_teaching_resources_zone CHECK (
    zone IN ('standard', 'textbook', 'plan', 'courseware')
  ),
  CONSTRAINT chk_teaching_resources_file_type CHECK (
    file_type IN ('pdf', 'doc', 'docx', 'ppt', 'pptx')
  ),
  CONSTRAINT chk_teaching_resources_version CHECK (version > 0)
);

CREATE INDEX IF NOT EXISTS idx_teaching_resources_zone ON teaching_resources(zone);
CREATE INDEX IF NOT EXISTS idx_teaching_resources_created_at ON teaching_resources(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teaching_resources_gallery
  ON teaching_resources(zone, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION set_row_update_metadata()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_resources_update_metadata ON resources;
CREATE TRIGGER trg_resources_update_metadata
BEFORE UPDATE ON resources
FOR EACH ROW EXECUTE FUNCTION set_row_update_metadata();

DROP TRIGGER IF EXISTS trg_teaching_resources_update_metadata ON teaching_resources;
CREATE TRIGGER trg_teaching_resources_update_metadata
BEFORE UPDATE ON teaching_resources
FOR EACH ROW EXECUTE FUNCTION set_row_update_metadata();

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
