#!/usr/bin/env node
/**
 * Olvasósarok build: data/readings.json → public/atlas/readings sharded chunks.
 *
 * Bemenet: data/readings.json (egyetlen forrásfájl a repo-ban a 732 külön fájl helyett)
 * Kimenet: public/atlas/readings/index.json + 8 db chunk fájl (0.json ... 7.json)
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const srcFile = path.join(root, "data/readings.json");

if (!fs.existsSync(srcFile)) {
  console.error("Nem található a data/readings.json forrásfájl.");
  process.exit(1);
}

const readings = JSON.parse(fs.readFileSync(srcFile, "utf8"));
const outDir = path.join(root, "public/atlas/readings");
fs.mkdirSync(outDir, { recursive: true });

// Töröljük a régi egyedi r*.json fájlokat, ha még léteznek
for (const file of fs.readdirSync(outDir)) {
  fs.unlinkSync(path.join(outDir, file));
}

const items = [];
const chunks = {};

for (const doc of readings) {
  items.push({
    id: doc.id,
    ids: doc.ids,
    title: doc.title,
    titleHu: doc.titleHu,
    topic: doc.topic,
    cefr: doc.cefr,
  });

  const num = parseInt(doc.id.slice(1), 10);
  const chunkIdx = Math.floor(num / 100);
  if (!chunks[chunkIdx]) chunks[chunkIdx] = {};
  chunks[chunkIdx][doc.id] = doc;
}

fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify({ v: 1, items }));

for (const [chunkIdx, docs] of Object.entries(chunks)) {
  fs.writeFileSync(path.join(outDir, `${chunkIdx}.json`), JSON.stringify(docs));
}

console.log(`Kész: ${items.length} fejezet feldolgozva, ${Object.keys(chunks).length} chunk fájlba szervezve (${outDir}).`);
