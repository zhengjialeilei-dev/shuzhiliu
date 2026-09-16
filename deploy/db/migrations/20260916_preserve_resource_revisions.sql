BEGIN;

-- No cascading FK: historical metadata must survive a resource being removed.
-- Files are retained on replacement; deletion of the current resource retains
-- its existing behaviour. No historical-file garbage collection runs yet.
CREATE TABLE IF NOT EXISTS resource_revisions (
  resource_id UUID NOT NULL,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (resource_id, version)
);

CREATE OR REPLACE FUNCTION archive_resource_revision()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO resource_revisions(resource_id, version, snapshot)
  VALUES (OLD.id, OLD.version, to_jsonb(OLD))
  ON CONFLICT (resource_id, version) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_resources_archive_revision ON resources;
CREATE TRIGGER trg_resources_archive_revision
BEFORE UPDATE ON resources
FOR EACH ROW EXECUTE FUNCTION archive_resource_revision();

COMMIT;
