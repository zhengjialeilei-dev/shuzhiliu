# COS Migration

Use this guide when the API has been switched from local uploads to Tencent COS.

## Required environment variables

Set these values in `deploy/.env`:

```env
STORAGE_DRIVER=s3
S3_ENDPOINT=https://cos.ap-guangzhou.myqcloud.com
S3_REGION=ap-guangzhou
S3_BUCKET=your-bucket-appid
S3_PUBLIC_BASE_URL=https://your-bucket-appid.cos.ap-guangzhou.myqcloud.com
S3_ACCESS_KEY_ID=your-secret-id
S3_SECRET_ACCESS_KEY=your-secret-key
S3_FORCE_PATH_STYLE=false
```

`S3_PUBLIC_BASE_URL` should be the public COS domain that browsers can open directly.

## What changes after the switch

- New uploads are stored in COS.
- Uploaded objects are written with `public-read`.
- The HTML proxy automatically trusts the COS public host when `S3_PUBLIC_BASE_URL` is configured.

## Migrate old `/uploads` records

The API package includes a migration script:

```bash
npm run migrate:local-to-s3 -w @mathflow/api
```

By default the script runs in dry-run mode and only reports what it would migrate.

To run the real migration:

```bash
DRY_RUN=false npm run migrate:local-to-s3 -w @mathflow/api
```

## Recommended verification

1. Check `https://your-domain/api/health` and confirm `storageDriver` is `s3`.
2. Upload a teaching file from the admin page.
3. Confirm the returned URL is under your COS public domain.
4. Open that file URL directly in the browser.
5. Delete the resource and confirm the COS object is removed.
