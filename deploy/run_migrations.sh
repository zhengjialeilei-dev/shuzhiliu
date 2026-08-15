#!/bin/sh
set -eu

container="${POSTGRES_CONTAINER:-mathflow-postgres}"
migrations_dir="${1:-$(dirname "$0")/db/migrations}"
bootstrap="$migrations_dir/20260714_harden_resource_schema.sql"

test -d "$migrations_dir"
test -f "$bootstrap"

run_file() {
  docker exec -i "$container" sh -c \
    'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$1"
}

query_value() {
  docker exec "$container" sh -c \
    'psql -v ON_ERROR_STOP=1 -At -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "$1"' sh "$1"
}

# This idempotent migration creates schema_migrations for older installations.
if [ "$(query_value "SELECT to_regclass('public.schema_migrations') IS NOT NULL")" != "t" ]; then
  run_file "$bootstrap"
fi

# The hardening migration introduced migration tracking after the older files
# had already been applied manually. Treat every file before it as the baseline.
if [ "$(query_value "SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = '20260714_harden_resource_schema')")" = "t" ]; then
  for migration in "$migrations_dir"/*.sql; do
    if [ "$migration" = "$bootstrap" ]; then
      break
    fi
    version=$(basename "$migration" .sql)
    query_value "INSERT INTO schema_migrations(version) VALUES ('$version') ON CONFLICT DO NOTHING" >/dev/null
  done
fi

for migration in "$migrations_dir"/*.sql; do
  version=$(basename "$migration" .sql)
  case "$version" in
    *[!a-zA-Z0-9_-]*)
      echo "Invalid migration filename: $version" >&2
      exit 1
      ;;
  esac

  applied=$(query_value "SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = '$version')")
  if [ "$applied" = "t" ]; then
    echo "Skipping migration $version"
    continue
  fi

  echo "Applying migration $version"
  run_file "$migration"
  query_value "INSERT INTO schema_migrations(version) VALUES ('$version') ON CONFLICT DO NOTHING" >/dev/null
done
