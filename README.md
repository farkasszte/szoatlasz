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
public/atlas/   index, szócikk-darabok
data/           forrásadatok és magyar fordítások
scripts/        szótárépítő és fordító pipeline
```

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
- A média tartlmak az eredeti projectben elérhetők, ez a változat GIT-ben nem tárolja.
