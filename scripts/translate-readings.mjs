#!/usr/bin/env node
/**
 * A 732 olvasmány magyarítása (cím, bekezdések, kérdés-magyarázatok).
 *
 * Bemenet:  data/readings/index.raw.json, data/readings/raw/*.json
 * Kimenet:  data/readings/hu.json  { id: { titleHu, hu: [...], why: [...] } }
 *
 *   DEEPSEEK_API_KEY=... node scripts/translate-readings.mjs [--concurrency 8] [--limit N]
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
const concurrency = arg("concurrency", 8);
const limit = arg("limit", Infinity);
const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const BATCH = 2;

const index = JSON.parse(fs.readFileSync(path.join(root, "data/readings/index.raw.json"), "utf8"));
const outFile = path.join(root, "data/readings/hu.json");
const done = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, "utf8")) : {};

const strip = (text) => text.replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, "$1");
const docs = [];
for (const item of index.items) {
  const file = path.join(root, "data/readings/raw", `${item.id}.json`);
  if (!fs.existsSync(file)) continue;
  const doc = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!done[item.id]) docs.push({ meta: item, doc });
}
const todo = docs.slice(0, limit);
console.log(`Fordításra vár: ${todo.length} fejezet (kész: ${Object.keys(done).length}).`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function translate(batch) {
  const payload = batch.map(({ meta, doc }) => ({
    id: meta.id,
    title: meta.title,
    paragraphs: doc.paras.map(strip),
    questions: doc.q.map((q) => ({ s: q.s, a: q.a, note: q.why })),
  }));
  const body = {
    model,
    temperature: 0.25,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a Hungarian literary translator preparing bilingual reading material for language learners. For each chapter: (1) translate the English title into natural, idiomatic Hungarian (titleHu); (2) translate every English paragraph into fluent, literary but clear Hungarian, keeping the paragraph count and order exactly, and keeping names, places, numbers and dates unchanged; (3) for each IELTS True/False/Not Given question, write a concise Hungarian explanation (1–2 sentences) that justifies the given answer from the chapter text – do not merely translate the Chinese note if it is vague, but you may use it as a hint. The English question sentence stays untranslated in the output. Never leave Chinese characters in the output. Return strict JSON: {\"items\":[{\"id\":\"...\",\"titleHu\":\"...\",\"hu\":[\"...\"],\"why\":[\"...\"]}]} with the same ids, the same number of paragraphs and the same number of explanations as the input.",
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
      return batch.map(({ meta, doc }) => {
        const item = map.get(meta.id);
        const ok =
          item &&
          typeof item.titleHu === "string" &&
          item.titleHu.trim() &&
          Array.isArray(item.hu) &&
          item.hu.length === doc.paras.length &&
          item.hu.every((s) => typeof s === "string" && s.trim()) &&
          Array.isArray(item.why) &&
          item.why.length === doc.q.length &&
          item.why.every((s) => typeof s === "string" && s.trim());
        return [
          meta.id,
          ok
            ? {
                titleHu: item.titleHu.trim(),
                hu: item.hu.map((s) => String(s).trim()),
                why: item.why.map((s) => String(s).trim()),
              }
            : null,
        ];
      });
    } catch (err) {
      if (attempt === 4) {
        console.error("Batch hiba:", err.message);
        return [];
      }
      await sleep(1800 * attempt);
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
    for (const [id, value] of await translate(batch)) if (value) done[id] = value;
    save();
    console.log(`  ${Object.keys(done).length}/${index.items.length}`);
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));
save();
console.log(`Kész: ${Object.keys(done).length} fejezet magyar változata.`);
