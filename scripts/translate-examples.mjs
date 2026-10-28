#!/usr/bin/env node
/**
 * Példamondatok magyar fordítása.
 * Bemenet: data/word-atlas.json (angol példák), kimenet: data/hu/examples.json
 *
 *   DEEPSEEK_API_KEY=... node scripts/translate-examples.mjs [--limit N] [--concurrency 4]
 *
 * Újraindítható: a már lefordított szócikkeket kihagyja.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const key = process.env.DEEPSEEK_API_KEY;
if (!key) {
  console.error("Hiányzik a DEEPSEEK_API_KEY.");
  process.exit(1);
}
const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? Number(args[i + 1]) : d;
};
const limit = arg("limit", Infinity);
const concurrency = arg("concurrency", 4);
const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const BATCH = 20;

const source = JSON.parse(fs.readFileSync(path.join(root, "data/word-atlas.json"), "utf8"));
const outFile = path.join(root, "data/hu/examples.json");
const done = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, "utf8")) : {};

const todo = source
  .filter((e) => e.ex.length && !(Array.isArray(done[e.id]) && done[e.id].length === e.ex.length))
  .slice(0, limit);
console.log(`Fordításra vár: ${todo.length} szócikk (kész: ${Object.keys(done).length})`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function translate(batch) {
  const payload = batch.map((e) => ({ id: e.id, word: e.w, sentences: e.ex.map((x) => x.en) }));
  const body = {
    model,
    temperature: 0.25,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a professional English-to-Hungarian translator for a vocabulary learning app. Translate every English example sentence into natural, idiomatic Hungarian. Keep the meaning, tone and register: the first sentence is everyday, the second is an exam-style academic sentence. Preserve names, numbers and technical terms; do not add explanations or notes; do not translate the headword literally if the sentence requires a different form. Keep the sentence count and order. Return strict JSON: {\"items\":[{\"id\":\"...\",\"hu\":[\"...\"]}]} with the same ids and the same number of sentences as the input.",
      },
      { role: "user", content: JSON.stringify(payload) },
    ],
  };
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 160)}`);
      const data = await res.json();
      const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
      const map = new Map((parsed.items ?? []).map((i) => [i.id, i.hu]));
      return batch.map((e) => {
        const hu = map.get(e.id);
        const ok = Array.isArray(hu) && hu.length === e.ex.length && hu.every((s) => typeof s === "string" && s.trim());
        return [e.id, ok ? hu.map((s) => String(s).trim()) : null];
      });
    } catch (err) {
      if (attempt === 4) {
        console.error("Batch hiba:", err.message);
        return [];
      }
      await sleep(1500 * attempt);
    }
  }
  return [];
}

let cursor = 0;
function save() {
  const tmp = `${outFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(done));
  fs.renameSync(tmp, outFile);
}
async function worker() {
  while (cursor < todo.length) {
    const batch = todo.slice(cursor, cursor + BATCH);
    cursor += BATCH;
    for (const [id, hu] of await translate(batch)) if (hu) done[id] = hu;
    save();
    console.log(`  ${Object.keys(done).length}/${source.length}`);
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));
save();
console.log(`Kész: ${Object.keys(done).length} szócikk példamondatai.`);
