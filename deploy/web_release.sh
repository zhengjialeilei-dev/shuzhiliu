#!/usr/bin/env bash
# Sourced by the deployment runner. No destructive asset cleanup: an open
# classroom may still request an older lazy-loaded JS chunk hours later.

prepare_web_release() {
  local staged="$1" site="$2" backup="$3"
  test -s "$staged/index.html" || return 1
  test -d "$site" || return 1
  # Never overwrite the recovery point for an earlier deployment attempt.
  mkdir "$backup" || return 1
  if [ -f "$site/index.html" ]; then
    cp "$site/index.html" "$backup/index.html" || return 1
  fi
  # Keep the new entry alongside the backup, outside the public site.
  cp "$staged/index.html" "$backup/next-index.html" || return 1
  while IFS= read -r -d '' item; do
    cp -a "$item" "$site/" || return 1
  done < <(find "$staged" -mindepth 1 -maxdepth 1 ! -name index.html -print0)
}

activate_web_release() {
  local site="$1" backup="$2" pending
  test -s "$backup/next-index.html" || return 1
  pending=$(mktemp "$site/.index-release.XXXXXX") || return 1
  cp "$backup/next-index.html" "$pending" || return 1
  chmod 644 "$pending" || return 1
  # The temporary entry is on the same filesystem, so rename is atomic.
  mv -f "$pending" "$site/index.html"
}

rollback_web_release() {
  local site="$1" backup="$2" pending
  test -s "$backup/index.html" || return 1
  pending=$(mktemp "$site/.index-rollback.XXXXXX") || return 1
  cp "$backup/index.html" "$pending" || return 1
  chmod 644 "$pending" || return 1
  mv -f "$pending" "$site/index.html"
}
