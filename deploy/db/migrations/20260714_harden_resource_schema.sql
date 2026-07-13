BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM resources
    WHERE route_path IS NOT NULL
    GROUP BY route_path
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add unique route_path index: duplicate route paths exist';
  END IF;
END;
$$;

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE teaching_resources
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

UPDATE teaching_resources SET description = '' WHERE description IS NULL;
ALTER TABLE teaching_resources ALTER COLUMN description SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_resources_grade') THEN
    ALTER TABLE resources ADD CONSTRAINT chk_resources_grade CHECK (
      grade IN ('一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '通用', '拓展')
    ) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_resources_type') THEN
    ALTER TABLE resources ADD CONSTRAINT chk_resources_type
      CHECK (resource_type IN ('html', 'react')) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_resources_route_path') THEN
    ALTER TABLE resources ADD CONSTRAINT chk_resources_route_path CHECK (
      route_path IS NULL
      OR (
        route_path ~ '^/[a-z0-9][a-z0-9/_-]{0,99}$'
        AND route_path !~ '//|/$'
      )
    ) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_resources_location') THEN
    ALTER TABLE resources ADD CONSTRAINT chk_resources_location CHECK (
      (resource_type = 'html' AND file_path IS NOT NULL)
      OR (resource_type = 'react' AND route_path IS NOT NULL)
    ) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_resources_version') THEN
    ALTER TABLE resources ADD CONSTRAINT chk_resources_version CHECK (version > 0) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_teaching_resources_zone') THEN
    ALTER TABLE teaching_resources ADD CONSTRAINT chk_teaching_resources_zone CHECK (
      zone IN ('standard', 'textbook', 'plan', 'courseware')
    ) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_teaching_resources_file_type') THEN
    ALTER TABLE teaching_resources ADD CONSTRAINT chk_teaching_resources_file_type CHECK (
      file_type IN ('pdf', 'doc', 'docx', 'ppt', 'pptx')
    ) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_teaching_resources_version') THEN
    ALTER TABLE teaching_resources ADD CONSTRAINT chk_teaching_resources_version
      CHECK (version > 0) NOT VALID;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_resources_route_path
  ON resources(route_path) WHERE route_path IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resources_gallery
  ON resources(category, grade, created_at DESC, id DESC);
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

INSERT INTO schema_migrations(version)
VALUES ('20260714_harden_resource_schema')
ON CONFLICT (version) DO NOTHING;

COMMIT;
