#!/usr/bin/env node
/**
 * Használati tippek, szókapcsolat-jelentések és megjegyzések fordítása.
 * Bemenet: data/word-atlas.json (eredeti), kimenet: data/hu/extras.json
 *
 *   DEEPSEEK_API_KEY=... node scripts/translate-extras.mjs [--limit N] [--concurrency 4]
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
const outFile = path.join(root, "data/hu/extras.json");
const extras = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, "utf8")) : {};
const todo = source.filter((e) => !extras[e.id] && (e.tip || e.col.length || e.note)).slice(0, limit);
console.log(`Fordításra vár: ${todo.length} (kész: ${Object.keys(extras).length})`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function translate(batch) {
  const payload = batch.map((e) => ({
    id: e.id,
    word: e.w,
    tip: e.tip,
    note: e.note || "",
    collocations: e.col.map((c) => c.split("｜")[1] || "").filter(Boolean),
  }));
  const body = {
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a Hungarian lexicographer. Translate the Chinese usage tip, usage note and collocation glosses into natural, concise Hungarian for learners. Keep the tip to one short sentence (max 25 words), and keep each collocation gloss to 1–4 words. If a field is empty, return an empty string or empty array. The output must never contain Chinese characters; translate every Chinese gloss. Return strict JSON: {\"items\":[{\"id\":\"...\",\"tip\":\"...\",\"note\":\"...\",\"col\":[\"...\"]}]} with the same ids and the same number of collocation glosses as the input.",
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
      const map = new Map((parsed.items ?? []).map((i) => [i.id, i]));
      return batch.map((e) => {
        const i = map.get(e.id) ?? {};
        const col = Array.isArray(i.col) ? i.col.map((x) => String(x ?? "").trim()) : [];
        return [
          e.id,
          {
            tip: String(i.tip ?? "").trim(),
            note: String(i.note ?? "").trim(),
            col: e.col.map((_, idx) => col[idx] ?? ""),
          },
        ];
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
  fs.writeFileSync(tmp, JSON.stringify(extras));
  fs.renameSync(tmp, outFile);
}
async function worker() {
  while (cursor < todo.length) {
    const batch = todo.slice(cursor, cursor + BATCH);
    cursor += BATCH;
    for (const [id, val] of await translate(batch)) extras[id] = val;
    save();
    console.log(`  ${Object.keys(extras).length}/${source.length}`);
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));
save();
console.log(`Kész: ${Object.keys(extras).length} szócikk kiegészítéssel.`);
