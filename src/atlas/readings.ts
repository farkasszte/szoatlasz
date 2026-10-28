import type { ReadingDoc, ReadingMeta, ReadingQuestion } from "./types";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const url = (file: string) => `${BASE}/atlas/readings/${file}`;

let indexPromise: Promise<ReadingMeta[]> | null = null;
const chunkPromises = new Map<number, Promise<Record<string, ReadingDoc>>>();
const cachedDocs = new Map<string, ReadingDoc>();

function validMeta(v: unknown): v is ReadingMeta {
  if (!v || typeof v !== "object") return false;
  const r = v as Partial<ReadingMeta>;
  return typeof r.id === "string" && typeof r.title === "string" && Array.isArray(r.ids);
}

function normalizeQuestion(v: unknown): ReadingQuestion | null {
  if (!v || typeof v !== "object") return null;
  const q = v as Partial<ReadingQuestion>;
  if (typeof q.s !== "string" || (q.a !== "T" && q.a !== "F" && q.a !== "NG")) return null;
  return { s: q.s, a: q.a, why: typeof q.why === "string" ? q.why : "" };
}

export function loadReadingIndex(): Promise<ReadingMeta[]> {
  if (!indexPromise) {
    indexPromise = fetch(url("index.json"))
      .then((r) => {
        if (!r.ok) throw new Error(`Az olvasmányok betöltése nem sikerült (${r.status}).`);
        return r.json() as Promise<{ items?: unknown[] }>;
      })
      .then((data) => (Array.isArray(data.items) ? data.items.filter(validMeta) : []))
      .catch((err) => {
        indexPromise = null;
        throw err;
      });
  }
  return indexPromise;
}

export async function loadReading(id: string): Promise<ReadingDoc> {
  const cached = cachedDocs.get(id);
  if (cached) return cached;

  const num = parseInt(id.slice(1), 10);
  const chunkIdx = Number.isNaN(num) ? 0 : Math.floor(num / 100);

  let chunkP = chunkPromises.get(chunkIdx);
  if (!chunkP) {
    chunkP = fetch(url(`${chunkIdx}.json`))
      .then((r) => {
        if (!r.ok) throw new Error(`A fejezetcsoport betöltése nem sikerült (${r.status}).`);
        return r.json() as Promise<Record<string, ReadingDoc>>;
      })
      .then((chunk) => {
        for (const [docId, doc] of Object.entries(chunk)) {
          cachedDocs.set(docId, {
            ...doc,
            paras: Array.isArray(doc.paras) ? doc.paras : [],
            hu: Array.isArray(doc.hu) ? doc.hu : [],
            q: Array.isArray(doc.q) ? doc.q.map(normalizeQuestion).filter((q): q is ReadingQuestion => !!q) : [],
          });
        }
        return chunk;
      })
      .catch((err) => {
        chunkPromises.delete(chunkIdx);
        throw err;
      });
    chunkPromises.set(chunkIdx, chunkP);
  }

  await chunkP;
  const doc = cachedDocs.get(id);
  if (!doc) throw new Error(`A(z) ${id} azonosítójú olvasmány nem található.`);
  return doc;
}
