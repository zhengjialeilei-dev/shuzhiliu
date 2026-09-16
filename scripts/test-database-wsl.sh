#!/usr/bin/env bash
# Ubuntu 24.04 WSL fallback: unpack packages into /tmp without installing a
# system service, changing Docker settings, or reading application credentials.
set -euo pipefail
command -v node >/dev/null || { echo 'Node.js 20+ is required inside WSL.' >&2; exit 1; }
cd "$(dirname "$0")/.."
project_root="$PWD"
task_dir=$(mktemp -d /tmp/mathflow-pg.XXXXXXXX)
pg_bin="$task_dir/runtime/usr/lib/postgresql/16/bin"
started=false
cleanup() {
  if [ "$started" = true ]; then
    "$pg_bin/pg_ctl" -D "$task_dir/data" -m immediate -w stop || return 1
  fi
  case "$task_dir" in
    /tmp/mathflow-pg.*)
      if [ "$(realpath "$task_dir")" = "$task_dir" ]; then
        rm -rf -- "$task_dir"
        echo 'Removed this run’s temporary PostgreSQL files.'
      fi ;;
    *) echo 'Unexpected temporary path; refusing cleanup.' >&2; return 1 ;;
  esac
}
trap cleanup EXIT
trap 'exit 130' INT TERM
echo 'Downloading Ubuntu PostgreSQL 16 packages into an isolated temporary directory.'
cd "$task_dir"
mkdir -p "$task_dir/lists/partial" "$task_dir/cache/archives/partial"
apt_options=(-o "Dir::State::lists=$task_dir/lists" -o "Dir::Cache=$task_dir/cache" -o Debug::NoLocking=1 -o Acquire::http::Timeout=20 -o Acquire::Retries=2)
# Refresh only temporary package indexes; the host's stale indexes may name
# versions already removed from mirrors. apt still verifies repository signatures.
apt-get "${apt_options[@]}" update
apt-get "${apt_options[@]}" download postgresql-16 postgresql-client-16 libpq5 libllvm17t64 libldap2 libxslt1.1
for package in ./*.deb; do dpkg-deb -x "$package" "$task_dir/runtime"; done
export LD_LIBRARY_PATH="$task_dir/runtime/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
task_password=$(openssl rand -hex 24)
printf '%s\n' "$task_password" | "$pg_bin/initdb" -D "$task_dir/data" -L "$task_dir/runtime/usr/share/postgresql/16" \
  --username=integration_test --pwfile=/dev/stdin --auth-host=scram-sha-256 --auth-local=trust --no-locale --encoding=UTF8 >/dev/null
task_port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')
started=true
"$pg_bin/pg_ctl" -D "$task_dir/data" -l "$task_dir/server.log" -o "-h 127.0.0.1 -p $task_port -k $task_dir -c dynamic_library_path=$task_dir/runtime/usr/lib/postgresql/16/lib" -w start
"$pg_bin/createdb" -h "$task_dir" -p "$task_port" -U integration_test mathflow_integration_test
export REVISION_TEST_DATABASE_URL="postgresql://integration_test:$task_password@127.0.0.1:$task_port/mathflow_integration_test"
cd "$project_root"
echo 'Running real database tests inside WSL (no Windows port forwarding required).'
node --test --test-concurrency=1 scripts/resource-revisions.test.mjs scripts/catalog-postgres.test.mjs scripts/catalog-api-postgres.test.mjs
