BEGIN;

ALTER TABLE teaching_resources
  DROP CONSTRAINT IF EXISTS chk_teaching_resources_file_type;

ALTER TABLE teaching_resources
  ADD CONSTRAINT chk_teaching_resources_file_type CHECK (
    file_type IN ('pdf', 'doc', 'docx', 'ppt', 'pptx', 'link')
  ) NOT VALID;

COMMIT;
