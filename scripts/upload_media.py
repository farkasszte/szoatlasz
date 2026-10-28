#!/usr/bin/env python3
"""Média feltöltése Cloudflare R2-re (S3-kompatibilis, boto3).

Környezeti változók:
  R2_ENDPOINT          https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  R2_BUCKET            alapértelmezés: szoatlasz-media
  AWS_ACCESS_KEY_ID    R2 API token Access Key ID
  AWS_SECRET_ACCESS_KEY  R2 API token Secret Access Key
  R2_PREFIX            alapértelmezés: atlas

Használat:
  python scripts/upload_media.py --dry-run
  python scripts/upload_media.py
  python scripts/upload_media.py --force        # mindent újratölt

A meglévő, azonos méretű objektumokat kihagyja, így újraindítható.
"""
from __future__ import annotations

import argparse
import os
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

ROOT = Path(__file__).resolve().parent.parent
DIRS = ["img", "thumb", "audio"]


def load_env_file(path: Path) -> None:
    """Egyszerű KEY=VALUE betöltés (a .env.r2 nem kerül a repóba)."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file(ROOT / ".env.r2")
CONTENT_TYPES = {".webp": "image/webp", ".mp3": "audio/mpeg"}


def env(name: str, default: str | None = None) -> str:
    value = os.environ.get(name, default)
    if not value:
        sys.exit(f"Hiányzik a(z) {name} környezeti változó.")
    return value


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="csak listázás, feltöltés nélkül")
    ap.add_argument("--force", action="store_true", help="meglévő objektumok felülírása")
    ap.add_argument("--workers", type=int, default=16)
    args = ap.parse_args()

    endpoint = env("R2_ENDPOINT").rstrip("/")
    bucket = os.environ.get("R2_BUCKET", "szoatlasz-media")
    prefix = os.environ.get("R2_PREFIX", "atlas").strip("/")
    env("AWS_ACCESS_KEY_ID")
    env("AWS_SECRET_ACCESS_KEY")

    files: list[tuple[Path, str]] = []
    for name in DIRS:
        base = ROOT / "public" / "atlas" / name
        if not base.is_dir():
            sys.exit(f"Hiányzik a mappa: {base}")
        for path in base.rglob("*"):
            if path.is_file():
                files.append((path, f"{prefix}/{name}/{path.relative_to(base).as_posix()}"))

    print(f"{len(files)} fájl → s3://{bucket}/{prefix}/")
    print(f"Endpoint: {endpoint}")
    if args.dry_run:
        for _, key in files[:10]:
            print("  ", key)
        print("  …" if len(files) > 10 else "")
        print("Próbaüzem – semmi nem töltődött fel.")
        return 0

    s3 = boto3.client(
        "s3",
        endpoint_url=endpoint,
        region_name="auto",
        config=Config(max_pool_connections=args.workers * 2, retries={"max_attempts": 5, "mode": "standard"}),
    )

    done = 0
    skipped = 0
    failed: list[tuple[str, str]] = []
    lock = threading.Lock()

    def upload(path: Path, key: str) -> str:
        size = path.stat().st_size
        if not args.force:
            try:
                head = s3.head_object(Bucket=bucket, Key=key)
                if int(head.get("ContentLength", -1)) == size:
                    return "skip"
            except ClientError as err:
                if err.response.get("Error", {}).get("Code") not in {"404", "NoSuchKey", "NotFound"}:
                    raise
        s3.upload_file(
            str(path),
            bucket,
            key,
            ExtraArgs={
                "ContentType": CONTENT_TYPES.get(path.suffix.lower(), "application/octet-stream"),
                "CacheControl": "public, max-age=31536000, immutable",
            },
        )
        return "done"

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(upload, p, k): (p, k) for p, k in files}
        for future in as_completed(futures):
            path, key = futures[future]
            try:
                result = future.result()
            except (BotoCoreError, ClientError, OSError) as err:
                with lock:
                    failed.append((key, str(err)))
                continue
            with lock:
                if result == "skip":
                    skipped += 1
                else:
                    done += 1
                total = done + skipped + len(failed)
                if total % 500 == 0 or total == len(files):
                    print(f"  {total}/{len(files)} (feltöltve {done}, kihagyva {skipped}, hiba {len(failed)})")

    print(f"Kész: {done} feltöltve, {skipped} kihagyva, {len(failed)} hiba.")
    for key, err in failed[:10]:
        print("  HIBA", key, err[:200])
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
