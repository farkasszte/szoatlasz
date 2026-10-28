# Szó Atlasz

Magyar–angol szótanuló atlasz a nyílt [Word Atlas](https://github.com/designfuchen/word-atlas) alapján:
**7 298 angol szócikk**, szócikkenként illusztráció, magyar jelentés, angol meghatározás, két példamondat magyar fordítással,
szókapcsolatok, brit–amerikai kiejtés és FSRS ismétlés.

A kód és a látványvilág a Word Atlasból származik (MIT kód, CC BY 4.0 tartalom). A magyar felület,
a magyar jelentések és a magyarázatok ehhez a projekthez készültek.

## Mit tud

- **Ma** – napi terv (esedékes ismétlések + új szavak), sorozat, heti aktivitás, napi szó, tanulási útvonal A1–C2, 19 téma.
- **Atlasz** – rács-, lista- és WebGL csillagtérkép nézet; keresés angolul és magyarul (ékezet nélkül is), szint- és témaszűrők.
- **Szócikk** – illusztráció, IPA, magyar jelentés, angol meghatározás, két példamondat magyar fordítással, szókapcsolatok, szócsalád, szinonimák, ellentétek, használati tipp.
- **Tanulás** – szócikk-bemutató, majd jelentés, képkiegészítés, hallás utáni felismerés és helyesírás; FSRS ütemezés, csak az első válasz számít.
- **Gépelő stúdió** – szó-, mondat- és diktálásmód, WPM- és pontosságmérés.
- **Haladás** – hőtérkép, 7 napos előrejelzés, beállítások, JSON-mentés és -visszaállítás.

Minden adat a böngészőben marad: nincs fiók, nincs szerver, nincs hálózati mentés.

## Futtatás

Bun (vagy Node 20+):

```bash
bun install
bun dev            # http://localhost:3000
bun run build      # dist/
bun run preview
bun test
```

## Adatok és fordítás

- `data/word-atlas.json` – az eredeti Word Atlas 7 298 szócikke (angol + kínai forrás).
- `data/hu/senses.json` – magyar jelentések (szócikk-azonosító → jelentés).
- `data/hu/extras.json` – magyar használati tippek, szókapcsolat-jelentések, megjegyzések.
- `data/hu/examples.json` – a 14 596 példamondat magyar fordítása.
- `scripts/build-dataset.mjs` – a fenti forrásokból építi a `public/atlas/index.json` és `entries/*.json` fájlokat.
- `scripts/translate-senses.mjs`, `scripts/translate-senses-extra.mjs`, `scripts/translate-extras.mjs`, `scripts/translate-examples.mjs` – újraindítható fordító pipeline (DeepSeek).

```bash
DEEPSEEK_API_KEY=... bun scripts/translate-senses.mjs --concurrency 4
DEEPSEEK_API_KEY=... bun scripts/translate-extras.mjs --concurrency 4
DEEPSEEK_API_KEY=... bun scripts/translate-examples.mjs --concurrency 4
bun run dataset
```

A magyar jelentések, tippek és példamondatok gépi fordítással készültek, és még nem estek át teljes szakmai lektoráláson.
A 986 leggyakoribb iskolai szó jelentése a Kincsesláda saját szókészletéből származik.

## Felépítés

```
src/
  atlas/        adatbetöltés, index, típusok
  pages/        Ma, Atlasz, Tanulás, Gépelés, Haladás, Névjegy, onboarding
  store/        FSRS ütemező, menetépítés, localStorage-tár
  galaxy/       WebGL csillagtérkép
  styles/       a teljes vizuális rendszer
public/atlas/   index, szócikk-darabok, illusztrációk, hangok
data/           forrásadatok és magyar fordítások
scripts/        szótárépítő és fordító pipeline
```

## Vercel + Cloudflare R2

A kép- és hanganyag (≈700 MB, 30 000 fájl) nem a repóban, hanem Cloudflare R2-n él; a Vercel
csak a kódot, az indexet és a szócikk-darabokat szolgálja ki. A build ezt automatikusan kezeli:
ha a `VITE_MEDIA_BASE` be van állítva, a `dist/atlas/img|thumb|audio` mappák kimaradnak a buildből.

### 1. Média feltöltése

AWS CLI-vel (ha telepítve van):

```bash
aws s3 sync public/atlas/ s3://szoatlasz-media/atlas/ \
  --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com \
  --exclude "*" --include "img/*" --include "thumb/*" --include "audio/*"
```

Vagy a mellékelt, újraindítható feltöltővel (boto3, a meglévő fájlokat kihagyja):

```bash
export R2_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
export R2_BUCKET="szoatlasz-media"
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
python scripts/upload_media.py --dry-run
python scripts/upload_media.py
```

A script a projekt gyökerében lévő `.env.r2` fájlt is beolvassa (a `.gitignore` kizárja), így nem kell
környezeti változókat exportálni.

### 2. Média kivétele a Gitből

A feltöltés **után** (a fájlok a lemezen megmaradnak):

```bash
git rm -r --cached public/atlas/img public/atlas/thumb public/atlas/audio
git status
```

A `.gitignore` már kizárja ezeket a mappákat, így nem kerülnek vissza a következő commitba.

### 3. Vercel

Add New → Project → Import Git Repository; Framework: Vite, Build: `bun run build`,
Output: `dist`. Environment Variables:

```
VITE_MEDIA_BASE = https://pub-<hash>.r2.dev
```

Az érték a bucket **gyökere** (a kód maga fűzi hozzá az `/atlas/...` útvonalat), záró perjel nélkül.
Helyi fejlesztésnél a média a `public/atlas` alól megy; ha a mappák hiányoznak, állítsd be
ugyanezt a változót a `.env.local`-ban egy elérhető CDN-re.

> [!NOTE]
> Az R2 bucket legyen nyilvános (`r2.dev` vagy egyedi domain), különben a böngésző 403-at kap.
> A `scripts/upload_media.py` `Cache-Control: immutable` fejlécet állít a képekre és hangokra.

## Licenc és forrásmegjelölés

| Rész | Licenc |
|---|---|
| Kód | MIT (lásd `LICENSE`) |
| Angol szócikkek, illusztrációk, hangok | CC BY 4.0 – Word Atlas contributors (词光) |
| Magyar fordítások, magyar felület | a projekt saját munkája |

Részletek: [`ATTRIBUTION.md`](ATTRIBUTION.md).

## Ismert korlátok

- A magyar jelentések/tippek gépi fordításúak, lektorálás előtt állnak.
- A kiejtés a bőngésző hangkészletétől is függ; a szóhangok a repóban vannak.
- A szótár nem hivatalos vizsgaszólista, és nem ígér pontszámemelést.
