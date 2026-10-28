# Adatforrások

- `word-atlas.json` – az eredeti Word Atlas teljes, strukturált adatkészlete (7 298 szócikk,
  13 733 jelentés, 14 596 példamondat). CC BY 4.0, „Word Atlas contributors（词光）”.
- `word-atlas.csv` – ugyanaz táblázatos formában, elemzéshez.
- `hu/senses.json` – magyar jelentések: `{ "szócikk-azonosító": "jelentés" }`.
- `hu/extras.json` – magyar használati tipp, megjegyzés és szókapcsolat-jelentések:
  `{ "id": { "tip": "...", "note": "...", "col": ["..."] } }`.
- `hu/examples.json` – a 14 596 példamondat magyar fordítása:
  `{ "id": ["első példa", "második példa"] }`.

A webes, darabolt adatot nem kézzel kell szerkeszteni: a `scripts/build-dataset.mjs`
állítja elő a `public/atlas/index.json` és a `public/atlas/entries/*.json` fájlokat.

```bash
npm run dataset
```

A magyar jelentések, tippek és példamondatok gépi fordítással készültek a kínai forrásjelentésekből; a 986 leggyakoribb
iskolai szó jelentése a Kincsesláda saját szókészletéből származik. Lektorálás előtt állnak.

## Olvasósarok

- `readings/index.raw.json` – a 732 fejezet katalógusa az eredeti forrásból.
- `readings/raw/*.json` – a fejezetek angol szövege és kérdései (CC BY 4.0).
- `readings/hu.json` – a címek, bekezdések és kérdés-magyarázatok magyar fordítása.

```bash
npm run readings:fetch
npm run readings:translate
npm run readings
```
