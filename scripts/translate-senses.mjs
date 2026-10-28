#!/usr/bin/env node
/**
 * Magyar jelentések gépi fordítása a teljes Word Atlas szótárhoz.
 *
 * Használat:
 *   DEEPSEEK_API_KEY=... node scripts/translate-senses.mjs [--limit 200] [--concurrency 4]
 *
 * A kész jelentések a data/hu/senses.json fájlba íródnak (újraindítható, a meglévőket kihagyja).
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const key = process.env.DEEPSEEK_API_KEY;
if (!key) {
  console.error("Hiányzik a DEEPSEEK_API_KEY környezeti változó.");
  process.exit(1);
}
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : fallback;
};
const limit = arg("limit", Infinity);
const concurrency = arg("concurrency", 4);
const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const BATCH = 40;

const source = JSON.parse(fs.readFileSync(path.join(root, "data/word-atlas.json"), "utf8"));
const outFile = path.join(root, "data/hu/senses.json");
const senses = JSON.parse(fs.readFileSync(outFile, "utf8"));

const todo = source.filter((e) => !senses[e.id]).slice(0, limit);
console.log(`Fordításra vár: ${todo.length} / ${source.length} (kész: ${Object.keys(senses).length})`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function translate(batch) {
  const payload = batch.map((e) => ({
    id: e.id,
    word: e.w,
    gloss: e.senses[0].zh,
    definition: e.senses[0].en,
  }));
  const body = {
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a Hungarian lexicographer writing for learners. For each English headword, translate the Chinese dictionary gloss into one concise Hungarian meaning (1–5 words, lowercase, no trailing period). Use the English definition to pick the right sense. Prefer the natural dictionary form: nouns in nominative singular, verbs in 3rd person singular, adjectives in nominative. For function words (prepositions, conjunctions, particles, pronouns) give the standard Hungarian equivalent, including suffix pairs where relevant (e.g. from → -tól/-től; of → -nak/-nek; with → -val/-vel; even → még). Never output a bare suffix fragment without its pair, and never include explanations. Return strict JSON: {\"items\":[{\"id\":\"...\",\"hu\":\"...\"}]} with the same ids.",
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
      if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? "";
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed.items) ? parsed.items : [];
      const map = new Map(items.map((i) => [i.id, String(i.hu ?? "").trim()]));
      return batch.map((e) => [e.id, map.get(e.id) || ""]);
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

let done = 0;
let cursor = 0;
let writing = false;

function save() {
  if (writing) return;
  writing = true;
  const tmp = `${outFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(senses, null, 0));
  fs.renameSync(tmp, outFile);
  writing = false;
}

async function worker() {
  while (cursor < todo.length) {
    const batch = todo.slice(cursor, cursor + BATCH);
    cursor += BATCH;
    const rows = await translate(batch);
    for (const [id, hu] of rows) {
      if (hu) senses[id] = hu;
      done++;
    }
    save();
    const total = Object.keys(senses).length;
    console.log(`  ${total}/${source.length} kész (${Math.round((total / source.length) * 100)}%)`);
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));
save();
console.log(`Kész. Magyar jelentés: ${Object.keys(senses).length} szó.`);
