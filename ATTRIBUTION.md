# Forrásmegjelölés

## Word Atlas (词光)

A Szó Atlasz a [Word Atlas](https://github.com/designfuchen/word-atlas) nyílt projekt teljes
adatkészletére és kódjára épülő magyar adaptáció.

- **Kód:** MIT – Copyright (c) 2026 Word Atlas contributors
- **Tartalom:** CC BY 4.0 – „Word Atlas contributors（词光）”
- A CC BY 4.0 licenc szövege: https://creativecommons.org/licenses/by/4.0/

### Mit vettünk át

- a teljes alkalmazáskázt (MIT): nézetek, FSRS ütemezés, WebGL csillagtérkép, hangok, PWA;
- mind a **7 298 angol szócikket**: angol meghatározások, két példamondat, szókapcsolatok,
  szócsaládok, szinonimák, ellentétek, CEFR-szint és téma;
- a **732 olvasmányt** (angol szöveg, IELTS-stílusú Igaz/Hamis/Nincs megadva kérdések) és a hozzájuk tartozó szóhivatkozásokat;
- a hozzájuk tartozó **7 298 illusztrációt** (512 px és 256 px WebP), a **22 905 hangfelvételt**
  (brit/amerikai szóhang, példamondat-hang) és a 24 felületi hangeffektet, valamint a hangulatokat.

### Mit változtattunk

- a felület nyelve magyar, a témakörök, szintek és állapotok magyar feliratozást kaptak;
- a kínai jelentések helyére magyar jelentések kerültek (gépi fordítás a DeepSeek modellel,
  a 986 leggyakoribb iskolai szó esetében a Kincsesláda saját szókészletéből);
- a használati tippek és a szókapcsolatok jelentése magyarul olvasható;
- a kínai nyelvű mezők nem jelennek meg a felületen és a webes adatban;
- a 14 596 példamondat és a 732 olvasmány magyar fordítása, valamint a kérdések magyar magyarázata is elkészült (gépi fordítás, lektorálás előtt);
- a márka- és felületi szövegek, a Névjegy oldal és a dokumentáció ehhez a projekthez készültek.

A módosítások nem sugallják azt, hogy az eredeti szerzők jóváhagyták ezt a változatot.
A magyar szövegek gépi fordítással készültek, és lektorálás előtt állnak.

## Betűtípus

Fraunces – SIL Open Font License 1.1, a `@fontsource-variable/fraunces` csomagon keresztül.

## Hangok

A `public/sfx` hangeffektek és a hangulati hurok az eredeti Word Atlas repóból származnak
(CC BY 4.0, a fenti szerzők munkája).

A felületi hangbemondásokat (nyitóképernyő, csillagtérkép) eltávolítottuk: a felület csak
hangeffekteket és hangulatokat használ, beszédet nem játszik le.
