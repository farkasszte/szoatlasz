import type { Atlas, Entry, IndexRow, WordRef } from "./types";
import { MEDIA } from "./types";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const EXTERNAL = String(import.meta.env.VITE_MEDIA_BASE ?? "").replace(/\/$/, "");
const url = (p: string) => `${BASE}/atlas/${p}`;
const media = (p: string) => (EXTERNAL ? `${EXTERNAL}/atlas/${p}` : url(p));

interface IndexFile {
  id: string;
  name: string;
  count: number;
  examples: number;
  illustrated: number;
  chunk: number;
  topics: [string, string][];
  cefr: string[];
  words: IndexRow[];
}

export async function loadOpenAtlas(): Promise<Atlas> {
  const res = await fetch(url("index.json"));
  if (!res.ok) throw new Error(`A szótárindex betöltése nem sikerült (${res.status}).`);
  const idx = (await res.json()) as IndexFile;
  const words: WordRef[] = idx.words.map((r, order) => ({
    id: r[0],
    word: r[1],
    hu: r[2],
    ipa: r[3],
    cefr: r[4],
    topic: r[5],
    media: r[6],
    order,
  }));
  const byId = new Map(words.map((w) => [w.id, w]));
  const cache = new Map<string, Entry>();
  const pending = new Map<number, Promise<void>>();

  const loadChunk = (n: number) => {
    let p = pending.get(n);
    if (!p) {
      p = fetch(url(`entries/${n}.json`))
        .then((r) => {
          if (!r.ok) throw new Error(`A szócikkek betöltése nem sikerült (${r.status}).`);
          return r.json() as Promise<Entry[]>;
        })
        .then((list) => list.forEach((e) => cache.set(e.id, e)))
        .catch((e) => {
          pending.delete(n);
          throw e;
        });
      pending.set(n, p);
    }
    return p;
  };

  return {
    id: idx.id,
    name: idx.name,
    kind: "open",
    count: idx.count,
    examples: idx.examples,
    illustrated: idx.illustrated,
    topics: idx.topics,
    cefr: idx.cefr,
    words,
    byId,
    peek: (id) => cache.get(id),
    async entry(id) {
      const hit = cache.get(id);
      if (hit) return hit;
      const ref = byId.get(id);
      if (!ref) throw new Error(`Nincs ilyen szócikk: ${id}`);
      await loadChunk(Math.floor(ref.order / idx.chunk));
      const e = cache.get(id);
      if (!e) throw new Error(`Nincs ilyen szócikk: ${id}`);
      return e;
    },
    img: (ref, size = "full") =>
      ("media" in ref && typeof ref.media === "number" ? ref.media : (ref as Entry).m) & MEDIA.img
        ? media(`${size === "thumb" ? "thumb" : "img"}/${ref.id}.webp`)
        : null,
    audio(ref, kind) {
      const m = "media" in ref && typeof ref.media === "number" ? ref.media : (ref as Entry).m;
      const bit = MEDIA[kind];
      return m & bit ? media(`audio/${kind}/${ref.id}.mp3`) : null;
    },
  };
}
