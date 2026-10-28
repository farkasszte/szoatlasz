#!/usr/bin/env node
/**
 * Szó Atlasz – teljes szótárépítő.
 *
 * Bemenet:
 *  - data/word-atlas.json        az eredeti Word Atlas 7 298 szócikke (CC BY 4.0)
 *  - data/hu/senses.json         magyar jelentések (id → rövid jelentés)
 *  - data/hu/examples.json       magyar példamondat-fordítások (opcionális)
 *  - data/hu/extras.json         magyar tipp / szókapcsolat-jelentés / megjegyzés (opcionális)
 *
 * Kimenet:
 *  - public/atlas/index.json     a webes index (a felület ezt tölti)
 *  - public/atlas/entries/N.json 100 szócikkes darabok
 *
 * A média (img, thumb, audio) érintetlenül a helyén marad.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (p, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
  } catch {
    return fallback;
  }
};

const source = read("data/word-atlas.json", []);
if (!source.length) {
  console.error("Hiányzik a data/word-atlas.json.");
  process.exit(1);
}
const sensesHu = read("data/hu/senses.json", {});
const examplesHu = read("data/hu/examples.json", {});
const extrasHu = read("data/hu/extras.json", {});
const sensesExtra = read("data/hu/senses-extra.json", {});

const has = (rel) => fs.existsSync(path.join(root, "public/atlas", rel));
const mediaMask = (id) =>
  (has(`img/${id}.webp`) ? 1 : 0) |
  (has(`audio/uk/${id}.mp3`) ? 2 : 0) |
  (has(`audio/us/${id}.mp3`) ? 4 : 0) |
  (has(`audio/ex/${id}.mp3`) ? 8 : 0) |
  (has(`audio/ex2/${id}.mp3`) ? 16 : 0);

const entries = source.map((e) => {
  const hu = sensesHu[e.id];
  const extra = extrasHu[e.id] ?? {};
  const senses = e.senses
    .map((s, i) => ({
      pos: s.pos,
      hu: i === 0 ? hu ?? s.en : sensesExtra[`${e.id}#${i}`] ?? "",
      en: s.en,
    }))
    .filter((s) => s.hu);
  const exHu = examplesHu[e.id] ?? [];
  const ex = e.ex.map((x, i) => ({
    en: x.en,
    hu: exHu[i] ?? "",
  }));
  // A kínai részt a szókapcsolatokból kivesszük; magyar jelentés csak akkor kerül mellé, ha van.
  const col = e.col.map((c, i) => {
    const en = c.split("｜")[0].trim();
    const h = extra.col?.[i];
    return h ? `${en}｜${h}` : en;
  });
  return {
    id: e.id,
    w: e.w,
    uk: e.uk,
    us: e.us,
    senses,
    ex,
    col,
    fam: e.fam ?? [],
    syn: (e.syn ?? []).filter((s) => !/[\u4e00-\u9fff]/.test(s)),
    ant: (e.ant ?? []).filter((s) => !/[\u4e00-\u9fff]/.test(s)),
    tip: extra.tip ?? "",
    cefr: e.cefr,
    topic: e.topic,
    note: extra.note ?? "",
    m: mediaMask(e.id),
  };
});

const TOPIC_LABELS = {
  education: "Oktatás", work: "Munka", technology: "Technológia", science: "Tudomány",
  environment: "Környezet", health: "Egészség", society: "Társadalom", government: "Közélet",
  economy: "Gazdaság", media: "Média", arts: "Kultúra", travel: "Utazás", city: "Város",
  nature: "Természet", daily: "Mindennapok", emotion: "Érzelmek", thinking: "Gondolkodás",
  sport: "Sport", history: "Történelem",
};
const TOPIC_ORDER = ["daily","city","education","work","technology","health","environment","travel","society","economy","science","nature","government","media","arts","emotion","thinking","sport","history"];
const present = [...new Set(entries.map((e) => e.topic))];
const ordered = [...TOPIC_ORDER.filter((t) => present.includes(t)), ...present.filter((t) => !TOPIC_ORDER.includes(t))];
const cefr = [...new Set(entries.map((e) => e.cefr))].sort();
const topics = ordered.map((t) => [t, TOPIC_LABELS[t] ?? t]);

const index = {
  id: "szoatlasz-open",
  version: 1,
  name: "Szó Atlasz",
  license: "CC BY 4.0 (eredeti Word Atlas tartalom) + magyar fordítás",
  count: entries.length,
  examples: entries.reduce((n, e) => n + e.ex.length, 0),
  illustrated: entries.filter((e) => e.m & 1).length,
  voiced: entries.filter((e) => e.m & 6).length,
  chunk: 100,
  topics,
  cefr,
  words: entries.map((e) => [
    e.id,
    e.w,
    e.senses[0].hu || e.senses[0].en,
    e.uk,
    cefr.indexOf(e.cefr),
    topics.findIndex(([k]) => k === e.topic),
    e.m,
  ]),
};

const outDir = path.join(root, "public/atlas/entries");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(root, "public/atlas/index.json"), JSON.stringify(index));
for (let i = 0; i < entries.length; i += 100) {
  fs.writeFileSync(path.join(outDir, `${Math.floor(i / 100)}.json`), JSON.stringify(entries.slice(i, i + 100)));
}
const translated = entries.filter((e) => e.senses[0].hu).length;
console.log(`Kész: ${entries.length} szócikk, ebből magyar jelentéssel ${translated}. Téma: ${topics.length}, szint: ${cefr.join("/")}.`);
