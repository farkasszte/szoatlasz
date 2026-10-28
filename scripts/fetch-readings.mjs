#!/usr/bin/env node
/**
 * A Word Atlas olvasmányainak letöltése (732 fejezet).
 *
 * Bemenet:  https://0xlei.tech/words/atlas/extras/readings/index.json
 * Kimenet:  data/readings/index.raw.json, data/readings/raw/r0001.json …
 *
 * Újraindítható: a már letöltött, érvényes fejezeteket kihagyja.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = "https://0xlei.tech/words/atlas/extras/readings";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36";
const root = path.resolve(import.meta.dirname, "..");
const rawDir = path.join(root, "data/readings/raw");
const indexPath = path.join(root, "data/readings/index.raw.json");
fs.mkdirSync(rawDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    if (attempt >= 4) throw err;
    await sleep(700 * attempt);
    return fetchJson(url, attempt + 1);
  }
}

const index = fs.existsSync(indexPath)
  ? JSON.parse(fs.readFileSync(indexPath, "utf8"))
  : await fetchJson(`${BASE}/index.json`);
fs.writeFileSync(indexPath, JSON.stringify(index));

const items = index.items ?? [];
console.log(`Katalógus: ${items.length} fejezet.`);

let done = 0;
let skipped = 0;
const failed = [];

async function worker(queue) {
  while (queue.length) {
    const item = queue.shift();
    const file = path.join(rawDir, `${item.id}.json`);
    if (fs.existsSync(file)) {
      try {
        const cached = JSON.parse(fs.readFileSync(file, "utf8"));
        if (cached.id === item.id && Array.isArray(cached.paras) && cached.paras.length) {
          skipped++;
          continue;
        }
      } catch {
        /* újratöltés */
      }
    }
    try {
      const doc = await fetchJson(`${BASE}/${item.id}.json`);
      if (!doc?.id || !Array.isArray(doc.paras) || !doc.paras.length) throw new Error("üres vagy hibás fejezet");
      fs.writeFileSync(file, JSON.stringify(doc));
      done++;
    } catch (err) {
      failed.push([item.id, err.message]);
    }
  }
}

const queue = [...items];
await Promise.all(Array.from({ length: 8 }, () => worker(queue)));
console.log(`Letöltve: ${done}, kihagyva: ${skipped}, hiba: ${failed.length}.`);
for (const [id, msg] of failed.slice(0, 10)) console.error("  HIBA", id, msg);
if (failed.length) process.exitCode = 1;
