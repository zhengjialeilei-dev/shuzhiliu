from __future__ import annotations

import argparse
import posixpath
import re
from pathlib import Path

from deploy_shared import (
    add_target_args,
    create_ssh_client,
    resolve_target,
    run_local_command,
    run_remote_command,
    upload_directory,
    upload_file,
)


REPO_SYNC_PATHS = [
    "apps/web/src",
    "apps/web/public",
    "apps/web/package.json",
    "apps/web/vite.config.ts",
    "apps/web/tsconfig.json",
    "apps/web/vitest.config.ts",
    "apps/web/eslint.config.js",
    "apps/web/postcss.config.js",
    "apps/web/tailwind.config.js",
    "package.json",
    "package-lock.json",
    "README.md",
    "deploy/1panel.md",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build the web app and deploy it to the 1Panel site directory."
    )
    add_target_args(parser)
    parser.add_argument("--skip-build", action="store_true")
    parser.add_argument("--skip-repo-sync", action="store_true")
    parser.add_argument("--check-route", default="/")
    return parser.parse_args()


def extract_asset_name(index_html: str, pattern: str) -> str:
    match = re.search(pattern, index_html)
    if not match:
        raise RuntimeError(f"Could not find asset entry with pattern: {pattern}")
    return match.group(1)


def main() -> None:
    args = parse_args()
    target = resolve_target(args)
    repo_root = Path(__file__).resolve().parents[1]
    dist_dir = repo_root / "apps" / "web" / "dist"
    dist_index_path = dist_dir / "index.html"

    if not args.skip_build:
        print("==> Building @mathflow/web")
        run_local_command(["npm", "run", "build", "-w", "@mathflow/web"], cwd=repo_root)

    if not dist_index_path.exists():
        raise SystemExit(f"Missing build output: {dist_index_path}")

    dist_index = dist_index_path.read_text(encoding="utf-8")
    expected_entry_js = extract_asset_name(dist_index, r'src="/assets/([^"]+)"')
    expected_entry_css = extract_asset_name(dist_index, r'href="/assets/([^"]+)"')

    print("==> Uploading built files to the live 1Panel site directory")
    client = create_ssh_client(target)
    try:
        sftp = client.open_sftp()
        upload_directory(sftp, dist_dir, target.remote_site_root)

        if not args.skip_repo_sync:
            print("==> Syncing source snapshot into the remote workspace")
            for relative_path in REPO_SYNC_PATHS:
                local_path = repo_root / relative_path
                remote_path = posixpath.join(
                    target.remote_repo_root,
                    relative_path.replace("\\", "/"),
                )
                if local_path.is_dir():
                    upload_directory(sftp, local_path, remote_path, skip_names={"node_modules", "dist"})
                else:
                    upload_file(sftp, local_path, remote_path)

        sftp.close()

        print("==> Reloading 1Panel OpenResty")
        reload_command = (
            f"docker exec {target.openresty_container} openresty -s reload "
            f"|| docker exec {target.openresty_container} nginx -s reload"
        )
        print(run_remote_command(client, reload_command, timeout=300, check=False))

        print("==> Verifying the public site is serving the new bundle")
        route = args.check_route if args.check_route.startswith("/") else f"/{args.check_route}"
        public_html = run_remote_command(client, f"curl -k -s {target.site_url}{route}", timeout=300)

        if expected_entry_js not in public_html or expected_entry_css not in public_html:
            raise RuntimeError(
                "Live site is not serving the latest build. "
                f"Expected {expected_entry_js} and {expected_entry_css} in {route}."
            )

        print(
            run_remote_command(
                client,
                f"curl -I -k {target.site_url}/assets/{expected_entry_js}",
                timeout=300,
            )
        )
        print("==> Deployment OK")
        print(f"Live route check: {target.site_url}{route}")
        print(f"Entry JS: {expected_entry_js}")
        print(f"Entry CSS: {expected_entry_css}")
        print(f"Remote site root: {target.remote_site_root}")
    finally:
        client.close()


if __name__ == "__main__":
    main()
