#!/usr/bin/env node
/**
 * Külső média (R2/CDN) esetén kiveszi a képeket és hangokat a buildből.
 *
 * Csak akkor tesz bármit, ha a VITE_MEDIA_BASE be van állítva – így a helyi,
 * teljes (offline) build változatlan marad.
 */
import fs from "node:fs";
import path from "node:path";

const base = String(
  process.env.VITE_MEDIA_BASE ||
  "https://pub-d41b94eda1234be9a37f362422025457.r2.dev"
).trim();

const dist = path.resolve(import.meta.dirname, "..", "dist", "atlas");
let removed = 0;
for (const dir of ["img", "thumb", "audio"]) {
  const target = path.join(dist, dir);
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
    removed++;
    console.log(`Kihagyva a buildből: atlas/${dir}`);
  }
}
console.log(
  removed
    ? `Kész: a média a külső címen érhető el (${base}).`
    : "Nem volt mit kihagyni a dist/atlas alatt.",
);
