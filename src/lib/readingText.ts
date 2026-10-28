export interface ReadingPart {
  text: string;
  /** Ha be van jelölve, erre a szócikkre kattintva nyílik meg. */
  wordId?: string;
}

const MARKUP = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;

/**
 * A Word Atlas olvasmányainak beágyazott szóhivatkozásait bontja fel:
 *   "She was [[born|born]] in 1920." → ["She was ", {born}, " in 1920."]
 * A hibás, lezáratlan jelölés sima szövegként marad.
 */
export function parseReadingMarkup(text: string): ReadingPart[] {
  const parts: ReadingPart[] = [];
  let last = 0;
  for (const match of text.matchAll(MARKUP)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ text: text.slice(last, index) });
    parts.push({ wordId: match[1], text: match[2] });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** A jelölések nélküli szöveg (szószámláláshoz, előnézethez). */
export function plainReading(text: string): string {
  return text.replace(MARKUP, "$2");
}

export function readingWordCount(paras: string[]): number {
  return paras.reduce((n, p) => n + (plainReading(p).match(/[\p{L}][\p{L}'-]*/gu)?.length ?? 0), 0);
}
