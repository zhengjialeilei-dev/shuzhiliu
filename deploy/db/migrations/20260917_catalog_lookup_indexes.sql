-- Additive only: do not reinsert deleted resources or rewrite curated metadata.
CREATE INDEX IF NOT EXISTS resources_html_file_lookup_idx
  ON resources (file_path, created_at DESC, id DESC)
  WHERE resource_type = 'html';

CREATE INDEX IF NOT EXISTS resources_public_order_idx
  ON resources (created_at DESC, id DESC)
  WHERE route_path IS NOT NULL OR file_path IS NOT NULL;
