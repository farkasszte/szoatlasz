#!/usr/bin/env bun
/**
 * Szó Atlasz – Cloudflare R2 Média Feltöltő Script
 *
 * Használat:
 *   bun scripts/upload-r2.mjs
 *
 * A szükséges adatokat olvashatja a .env.local fájlból vagy közvetlen paraméterekből:
 *   R2_ACCOUNT_ID=...
 *   R2_ACCESS_KEY_ID=...
 *   R2_SECRET_ACCESS_KEY=...
 *   R2_BUCKET=...
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publicAtlas = path.join(root, "public", "atlas");

// Olvassuk be a .env.local vagy .env fájlt ha létezik
function loadEnv() {
  for (const envFile of [".env.local", ".env"]) {
    const full = path.join(root, envFile);
    if (fs.existsSync(full)) {
      const lines = fs.readFileSync(full, "utf8").split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq > 0) {
          const k = trimmed.slice(0, eq).trim();
          const v = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
          if (!process.env[k]) process.env[k] = v;
        }
      }
    }
  }
}

loadEnv();

const accountId = process.env.R2_ACCOUNT_ID || process.argv.find((a) => a.startsWith("--account-id="))?.split("=")[1];
const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.argv.find((a) => a.startsWith("--access-key-id="))?.split("=")[1];
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.argv.find((a) => a.startsWith("--secret-access-key="))?.split("=")[1];
const bucket = process.env.R2_BUCKET || process.argv.find((a) => a.startsWith("--bucket="))?.split("=")[1];
const concurrency = Number(process.env.CONCURRENCY || 30);

if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  console.log(`
\x1b[33mHasználat:\x1b[0m
Hozz létre egy \x1b[36m.env.local\x1b[0m fájlt a projekt gyökerében az alábbi tartalommal (ez a Git által ignorálva van):

R2_ACCOUNT_ID=a_te_cloudflare_account_id-d
R2_ACCESS_KEY_ID=a_te_access_key_id-d
R2_SECRET_ACCESS_KEY=a_te_secret_access_key-d
R2_BUCKET=a_bucket_neve

Majd futtasd újra:
\x1b[32mbun scripts/upload-r2.mjs\x1b[0m
`);
  process.exit(1);
}

const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
const s3 = new Bun.S3Client({
  accessKeyId,
  secretAccessKey,
  bucket,
  endpoint,
});

function getFiles(dir, prefix = "") {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const full = path.join(dir, item.name);
    const rel = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) {
      results = results.concat(getFiles(full, rel));
    } else {
      results.push({ full, rel });
    }
  }
  return results;
}

console.log("Fájlok feltérképezése...");
const targets = ["img", "thumb", "audio"];
const allFiles = [];

for (const sub of targets) {
  const dir = path.join(publicAtlas, sub);
  const found = getFiles(dir, `atlas/${sub}`);
  allFiles.push(...found);
}

const total = allFiles.length;
console.log(`Összesen feltöltendő médiafájl: ${total.toLocaleString("hu-HU")} db`);

if (total === 0) {
  console.log("Nem található feltöltendő fájl a public/atlas/ könyvtárban.");
  process.exit(0);
}

let done = 0;
let errors = 0;
const startTime = Date.now();

async function worker(queue) {
  while (queue.length > 0) {
    const file = queue.pop();
    if (!file) break;

    const mimeType = file.rel.endsWith(".webp")
      ? "image/webp"
      : file.rel.endsWith(".mp3")
      ? "audio/mpeg"
      : "application/octet-stream";

    let retries = 3;
    let ok = false;
    while (retries-- > 0 && !ok) {
      try {
        const data = Bun.file(file.full);
        const s3File = s3.file(file.rel, {
          type: mimeType,
          acl: "public-read",
          headers: {
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
        await Bun.write(s3File, data);
        ok = true;
      } catch (err) {
        if (retries === 0) {
          errors++;
          console.error(`\nHiba (${file.rel}): ${err.message}`);
        } else {
          await Bun.sleep(500);
        }
      }
    }

    done++;
    if (done % 50 === 0 || done === total) {
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = Math.round(done / elapsed);
      const percent = ((done / total) * 100).toFixed(1);
      process.stdout.write(
        `\rFeltöltve: ${done.toLocaleString()} / ${total.toLocaleString()} (${percent}%) | Sebesség: ${speed} db/mp | Hibák: ${errors}`
      );
    }
  }
}

console.log(`Feltöltés indítása (${concurrency} párhuzamos szálon)...`);
const queue = [...allFiles];
const workers = Array.from({ length: concurrency }, () => worker(queue));

await Promise.all(workers);

const elapsedTotal = Math.round((Date.now() - startTime) / 1000);
console.log(`\n\n\x1b[32mKész! ${done.toLocaleString()} fájl feltöltve ${elapsedTotal} mp alatt. Hibák: ${errors}\x1b[0m`);

