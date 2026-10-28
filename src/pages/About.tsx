import { ArrowUpRight, Database, Github, Heart } from "lucide-react";
import { useAtlas } from "../atlas/context";
import { REPO_URL } from "../config";

const BASE = import.meta.env.BASE_URL;

export function About() {
  const atlas = useAtlas();
  return (
    <div className="page about">
      <header className="about-hero">
        <img src={`${BASE}brand/og.webp`} alt="" />
        <div>
          <p className="eyebrow">A Szó Atlaszről</p>
          <h1 className="display">Egy szó, egy kép.</h1>
          <p className="lede">
            A Szó Atlasz {atlas.count.toLocaleString()} angol szócikket kínál magyar nyelvtanulóknak. Minden szóhoz tartozik
            egy illusztráció, magyar jelentés, angol meghatározás, két példamondat magyar fordítással, szókapcsolatok és
            brit–amerikai kiejtés. Minden megtanult szó egy új csillag a térképeden.
          </p>
          <p className="lede">
            Ingyenes, nyílt forrású, regisztráció nélkül. A kód MIT, a szócikkek alapja CC BY 4.0 licencű.
          </p>
          <div className="about-actions">
            <a className="btn btn-primary" href={REPO_URL} target="_blank" rel="noreferrer">
              <Github size={18} /> Eredeti projekt a GitHubon
            </a>
            <a className="btn btn-ghost" href={`${BASE}atlas/index.json`} target="_blank" rel="noreferrer">
              <Database size={18} /> Szótár JSON
            </a>
          </div>
        </div>
      </header>

      <div className="about-grid">
        <section className="panel">
          <h3 className="eyebrow">Miért marad meg</h3>
          <ul className="feature-list">
            <li>
              <b>Először látod.</b> Minden szóhoz tartozik egy kép, amely az első példamondat jelenetét mutatja.
            </li>
            <li>
              <b>Aztán felidézed.</b> Jelentés, képkiegészítés, hallás utáni felismerés és helyesírás – az ismerőstől az
              írásig.
            </li>
            <li>
              <b>Pont akkor tér vissza, amikor kezdenéd elfelejteni.</b> Az FSRS nyílt memória-algoritmus; csak a hamarosan
              feledésbe merülő szavakat ütemezi.
            </li>
            <li>
              <b>Őszinte pontszám.</b> Csak az első válasz számít. A hibázott szó más feladattípusban visszatér, de nem
              javítja a pontosságot.
            </li>
            <li>
              <b>A haladás a tiéd.</b> Nincs fiók, nincs szerver; az adat a böngésződben él, és bármikor exportálható.
            </li>
          </ul>
        </section>

        <section className="panel">
          <h3 className="eyebrow">Gyorsbillentyűk</h3>
          <dl className="keys">
            <div>
              <dt>
                <kbd>⌘</kbd>
                <kbd>K</kbd> vagy <kbd>/</kbd>
              </dt>
              <dd>Bármely szó keresése</dd>
            </div>
            <div>
              <dt>
                <kbd>1</kbd>–<kbd>4</kbd>
              </dt>
              <dd>Válasz kiválasztása</dd>
            </div>
            <div>
              <dt>
                <kbd>Enter</kbd>
              </dt>
              <dd>Megerősítés / továbblépés</dd>
            </div>
            <div>
              <dt>
                <kbd>←</kbd> <kbd>→</kbd>
              </dt>
              <dd>Előző és következő szócikk</dd>
            </div>
            <div>
              <dt>
                <kbd>Esc</kbd>
              </dt>
              <dd>Ablak bezárása</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <h3 className="eyebrow">Honnan származik a tartalom</h3>
          <p className="muted">
            Az angol szócikkek, a meghatározások, a példamondatok, az illusztrációk és a kiejtési felvételek a Word Atlas
            nyílt (CC BY 4.0) adatkészletéből származnak – köszönet a Word Atlas közreműködőinek (词光). A magyar
            jelentések, használati tippek és szókapcsolat-jelentések ehhez a projekthez, gépi fordítással készültek.
          </p>
          <p className="muted">
            A magyar szöveg gépi fordítással készült, ezért lektorálás előtt áll; az angol szócikkek az eredeti adatkészletből származnak. Ha hibát látsz,
            jelezd a projekt oldalán.
          </p>
          <p className="muted">A Szó Atlasz nem hivatalos vizsgaszólista, és nem ígér pontszámemelést. Csak szebbé és
            tartósabbá szeretné tenni a szótanulást.</p>
        </section>

        <section className="panel">
          <h3 className="eyebrow">Fejlesztőknek</h3>
          <p className="muted">
            A <code>data/word-atlas.json</code> a teljes, szerkeszthető szótár; a <code>public/atlas</code> mappa a webes
            darabolt adatot, az illusztrációkat és a hangokat tartalmazza. A magyar fordítások a <code>data/hu</code>
            mappában, szócikkenként csoportosítva élnek.
          </p>
          <a className="link" href={`${REPO_URL}#readme`} target="_blank" rel="noreferrer">
            Dokumentáció <ArrowUpRight size={14} />
          </a>
        </section>
      </div>
      <p className="colophon">
        <Heart size={14} /> Mindenkinek, aki szavakat tanul.
      </p>
    </div>
  );
}
