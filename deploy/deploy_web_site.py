from __future__ import annotations

import argparse
import json
import posixpath
import re
import urllib.parse
import urllib.request
import ssl
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
    "apps/api",
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
    "packages/shared",
    "README.md",
    "deploy/1panel.md",
    "deploy/docker-compose.yml",
    "deploy/db",
    "deploy/nginx",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build the web app and deploy it to the 1Panel site directory."
    )
    add_target_args(parser)
    parser.add_argument("--skip-build", action="store_true")
    parser.add_argument("--skip-repo-sync", action="store_true")
    parser.add_argument("--skip-api-deploy", action="store_true")
    parser.add_argument("--skip-html-prewarm", action="store_true")
    parser.add_argument("--html-prewarm-limit", type=int, default=0)
    parser.add_argument("--check-route", default="/")
    return parser.parse_args()


def extract_asset_name(index_html: str, pattern: str) -> str:
    match = re.search(pattern, index_html)
    if not match:
        raise RuntimeError(f"Could not find asset entry with pattern: {pattern}")
    return match.group(1)


def fetch_text(url: str, timeout: int = 20) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "mathflow-deploy-prewarm/1.0"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="replace")


def verify_public_file(url: str, expected_content_type: str | None = None) -> None:
    request = urllib.request.Request(
        url,
        method="HEAD",
        headers={"User-Agent": "mathflow-deploy-check/1.0"},
    )
    with urllib.request.urlopen(request, timeout=30, context=ssl.create_default_context()) as response:
        if response.status != 200:
            raise RuntimeError(f"Public file check failed ({response.status}): {url}")
        content_type = response.headers.get("Content-Type", "").lower()
        if expected_content_type and expected_content_type not in content_type:
            raise RuntimeError(
                f"Unexpected Content-Type for {url}: {content_type or 'missing'}"
            )


def verify_textbooks(site_url: str, dist_dir: Path) -> None:
    textbook_dir = dist_dir / "files" / "textbooks"
    textbooks = sorted(textbook_dir.glob("*.pdf")) if textbook_dir.exists() else []
    if not textbooks:
        raise RuntimeError("No textbook PDFs were included in the production build")

    print(f"==> Verifying textbook PDFs ({len(textbooks)} files)")
    for textbook in textbooks:
        url = urllib.parse.urljoin(
            site_url.rstrip("/") + "/",
            f"files/textbooks/{urllib.parse.quote(textbook.name)}",
        )
        verify_public_file(url, "application/pdf")


def prewarm_html_proxy(site_url: str, limit: int = 0) -> None:
    resources_url = urllib.parse.urljoin(site_url.rstrip("/") + "/", "api/resources")

    try:
        resources = json.loads(fetch_text(resources_url, timeout=30))
    except Exception as error:
        print(f"==> HTML proxy prewarm skipped: failed to read resources ({error})")
        return

    html_routes = [
        item.get("route_path")
        for item in resources
        if item.get("resource_type") == "html" and item.get("route_path")
    ]
    html_routes = [route for route in html_routes if isinstance(route, str) and route.startswith("/")]

    if limit > 0:
        html_routes = html_routes[:limit]

    if not html_routes:
        print("==> HTML proxy prewarm skipped: no HTML routes found")
        return

    print(f"==> Prewarming HTML proxy cache ({len(html_routes)} routes)")
    ok_count = 0
    failed_routes: list[str] = []

    for route in html_routes:
        query = urllib.parse.urlencode({"iframe": "1", "path": route})
        url = urllib.parse.urljoin(site_url.rstrip("/") + "/", f"api/html-proxy?{query}")

        try:
            fetch_text(url, timeout=45)
            ok_count += 1
        except Exception:
            failed_routes.append(route)

    print(f"==> HTML proxy prewarm complete: {ok_count}/{len(html_routes)} OK")
    if failed_routes:
        sample = ", ".join(failed_routes[:8])
        suffix = " ..." if len(failed_routes) > 8 else ""
        print(f"==> HTML proxy prewarm warnings: {sample}{suffix}")


def main() -> None:
    args = parse_args()
    target = resolve_target(args)
    repo_root = Path(__file__).resolve().parents[1]
    dist_dir = repo_root / "apps" / "web" / "dist"
    dist_index_path = dist_dir / "index.html"

    print("==> Checking HTTPS before deployment")
    verify_public_file(target.site_url)

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
        # Upload all immutable resources before switching index.html to the new bundle.
        upload_directory(sftp, dist_dir, target.remote_site_root, skip_names={"index.html"})
        upload_file(sftp, dist_index_path, posixpath.join(target.remote_site_root, "index.html"))

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

        if not args.skip_api_deploy:
            print("==> Rebuilding API service")
            deploy_dir = posixpath.join(target.remote_repo_root, "deploy")
            api_command = (
                f"cd {deploy_dir} && test -f .env && "
                "docker compose --env-file .env up -d --build api"
            )
            print(run_remote_command(client, api_command, timeout=900))

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

        verify_textbooks(target.site_url, dist_dir)

        health_url = urllib.parse.urljoin(target.site_url.rstrip("/") + "/", "api/health")
        verify_public_file(health_url, "application/json")

        print(
            run_remote_command(
                client,
                f"curl -I -k {target.site_url}/assets/{expected_entry_js}",
                timeout=300,
            )
        )

        if not args.skip_html_prewarm:
            prewarm_html_proxy(target.site_url, args.html_prewarm_limit)

        print("==> Deployment OK")
        print(f"Live route check: {target.site_url}{route}")
        print(f"Entry JS: {expected_entry_js}")
        print(f"Entry CSS: {expected_entry_css}")
        print(f"Remote site root: {target.remote_site_root}")
    finally:
        client.close()


if __name__ == "__main__":
    main()
