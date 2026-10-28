#!/usr/bin/env node
/**
 * A második és harmadik jelentés magyar fordítása.
 * Kimenet: data/hu/senses-extra.json, kulcs: "id#jelentésindex".
 *
 *   DEEPSEEK_API_KEY=... node scripts/translate-senses-extra.mjs [--concurrency 4]
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
const conc = args.includes("--concurrency") ? Number(args[args.indexOf("--concurrency") + 1]) : 4;
const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const BATCH = 40;

const source = JSON.parse(fs.readFileSync(path.join(root, "data/word-atlas.json"), "utf8"));
const outFile = path.join(root, "data/hu/senses-extra.json");
const done = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, "utf8")) : {};

const todo = [];
for (const e of source) {
  for (let i = 1; i < e.senses.length; i++) {
    const k = `${e.id}#${i}`;
    if (!done[k]) todo.push({ key: k, word: e.w, index: i, sense: e.senses[i] });
  }
}
console.log(`Fordításra vár: ${todo.length} másodlagos jelentés (kész: ${Object.keys(done).length})`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function translate(batch) {
  const payload = batch.map((x) => ({
    key: x.key,
    word: x.word,
    sense: x.index + 1,
    gloss: x.sense.zh,
    definition: x.sense.en,
    pos: x.sense.pos,
  }));
  const body = {
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a Hungarian lexicographer writing for learners. Each item gives an English headword, the sense number, its Chinese gloss, its English definition and part of speech. Translate the gloss into one concise Hungarian meaning (1–5 words, lowercase, no trailing period), matching that specific sense. Keep the part of speech in mind: verbs in 3rd person singular, nouns in nominative singular, adjectives in nominative. Function words get their standard Hungarian equivalent, including suffix pairs (e.g. -tól/-től). No explanations. Return strict JSON: {\"items\":[{\"key\":\"...\",\"hu\":\"...\"}]} with the same keys.",
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
      const map = new Map((parsed.items ?? []).map((i) => [i.key, String(i.hu ?? "").trim()]));
      return batch.map((x) => [x.key, map.get(x.key) || ""]);
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
    for (const [k, hu] of await translate(batch)) if (hu) done[k] = hu;
    save();
    console.log(`  ${Object.keys(done).length}`);
  }
}
await Promise.all(Array.from({ length: conc }, worker));
save();
console.log(`Kész: ${Object.keys(done).length} másodlagos jelentés.`);
