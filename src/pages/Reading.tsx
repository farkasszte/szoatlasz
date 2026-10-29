import { ArrowLeft, ArrowRight, BookOpenCheck, Check, Eye, EyeOff, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAtlas } from "../atlas/context";
import { loadReading, loadReadingIndex } from "../atlas/readings";
import type { ReadingDoc, ReadingMeta } from "../atlas/types";
import { openWord } from "../lib/router";
import { parseReadingMarkup, readingWordCount } from "../lib/readingText";
import { saveReadingResult, useStore } from "../store/store";
import { Illustration } from "../ui/Illustration";

const ANSWERS: { key: "T" | "F" | "NG"; label: string }[] = [
  { key: "T", label: "Igaz" },
  { key: "F", label: "Hamis" },
  { key: "NG", label: "Nincs megadva" },
];

export function ReadingPage({ id }: { id?: string }) {
  const [items, setItems] = useState<ReadingMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [id]);

  useEffect(() => {
    let alive = true;
    loadReadingIndex().then(
      (list) => alive && setItems(list),
      (err: Error) => alive && setError(err.message),
    );
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <ReadingError message={error} />;
  if (!items) return <ReadingLoading />;
  return id ? <Reader id={id} items={items} /> : <Catalog items={items} />;
}

function ReadingLoading() {
  return (
    <div className="page reading-page" aria-busy="true">
      <p className="eyebrow">Olvasósarok</p>
      <span className="spinner" />
    </div>
  );
}

function ReadingError({ message }: { message: string }) {
  return (
    <div className="page reading-page">
      <p className="eyebrow">Olvasósarok</p>
      <h1 className="display">Nem sikerült betölteni.</h1>
      <p className="muted">{message}</p>
      <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={() => location.reload()}>
          Újratöltés
        </button>
        <a className="btn btn-ghost" href="#/reading">
          Vissza a katalógushoz
        </a>
      </div>
    </div>
  );
}

function levelName(cefr: string[] | undefined, index: number) {
  return cefr?.[index] ?? "A1";
}

function Catalog({ items }: { items: ReadingMeta[] }) {
  const atlas = useAtlas();
  const readings = useStore((s) => s.progress.readings) ?? {};
  const [level, setLevel] = useState("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<"all" | "new" | "read">("all");

  const topics = useMemo(() => {
    const seen = new Set(items.map((i) => i.topic));
    return atlas.topics.filter(([key]) => seen.has(key));
  }, [atlas.topics, items]);

  const list = useMemo(
    () =>
      items.filter((item) => {
        if (level && levelName(atlas.cefr, item.cefr) !== level) return false;
        if (topic && item.topic !== topic) return false;
        const done = !!readings[item.id];
        if (status === "read" && !done) return false;
        if (status === "new" && done) return false;
        return true;
      }),
    [items, level, topic, status, readings, atlas.cefr],
  );

  const readCount = items.filter((i) => readings[i.id]).length;

  return (
    <div className="page reading-page">
      <header className="atlas-head reading-head">
        <div>
          <p className="eyebrow">Olvasósarok · {items.length} olvasmány</p>
          <h1 className="display">
            Olvass egy történetet,
            <br className="br-sm" /> és közben szavakat tanulsz.
          </h1>
          <p className="lede">
            Rövid angol történetek és esszék tíz szócikkel a szótáradból · IELTS-stílusú szövegértés · magyar fordítás
          </p>
        </div>
        <div className="reading-progress" aria-label={`Elolvasva ${readCount} olvasmány`}>
          <b>{readCount}</b>
          <span>/ {items.length} elolvasva</span>
        </div>
      </header>

      <div className="filters reading-filters">
        <div className="chips chips-scroll" role="group" aria-label="Szint">
          <button className={`chip-btn ${!level ? "is-on" : ""}`} onClick={() => setLevel("")}>
            Minden szint
          </button>
          {atlas.cefr.map((code) => (
            <button key={code} className={`chip-btn lv lv-${code} ${level === code ? "is-on" : ""}`} onClick={() => setLevel(code)}>
              {code}
            </button>
          ))}
        </div>
        <div className="chips chips-scroll" role="group" aria-label="Téma">
          <button className={`chip-btn ${!topic ? "is-on" : ""}`} onClick={() => setTopic("")}>
            Minden téma
          </button>
          {topics.map(([key, label]) => (
            <button key={key} className={`chip-btn ${topic === key ? "is-on" : ""}`} onClick={() => setTopic(key)}>
              {label}
            </button>
          ))}
        </div>
        <div className="filters-row">
          <div className="segmented" role="group" aria-label="Olvasási állapot">
            {(["all", "new", "read"] as const).map((key) => (
              <button key={key} className={status === key ? "is-on" : ""} onClick={() => setStatus(key)} aria-pressed={status === key}>
                {key === "all" ? "Mind" : key === "new" ? "Új" : "Elolvasva"}
              </button>
            ))}
          </div>
          <span className="result-count" aria-live="polite">
            {list.length} olvasmány
          </span>
        </div>
      </div>

      {list.length ? (
        <ul className="reading-grid">
          {list.map((item) => {
            const done = readings[item.id];
            const topicLabel = atlas.topics.find(([key]) => key === item.topic)?.[1] ?? item.topic;
            return (
              <li key={item.id}>
                <a className="reading-card" href={`#/reading?id=${item.id}`}>
                  <div className="reading-card-top">
                    <span className={`chip chip-level lv-${levelName(atlas.cefr, item.cefr)}`}>{levelName(atlas.cefr, item.cefr)}</span>
                    <span className="reading-topic">{topicLabel}</span>
                    {done && (
                      <span className="reading-done" title={`Elolvasva · ${done.correct}/${done.total}`}>
                        <Check size={13} /> {done.correct}/{done.total}
                      </span>
                    )}
                  </div>
                  <h3 lang="hu">{item.titleHu}</h3>
                  <p className="reading-card-en" lang="en">
                    {item.title}
                  </p>
                  <div className="reading-card-words">
                    {item.ids.slice(0, 4).map((wordId) => {
                      const ref = atlas.byId.get(wordId);
                      return ref ? <span key={wordId}>{ref.word}</span> : null;
                    })}
                    {item.ids.length > 4 && <span className="more">+{item.ids.length - 4} szó</span>}
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="empty">Ezzel a szűrővel nincs olvasmány. Próbálj másik szintet vagy témát.</p>
      )}
    </div>
  );
}

function Reader({ id, items }: { id: string; items: ReadingMeta[] }) {
  const atlas = useAtlas();
  const readings = useStore((s) => s.progress.readings) ?? {};
  const [doc, setDoc] = useState<ReadingDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bilingual, setBilingual] = useState(true);
  const [answers, setAnswers] = useState<Record<number, "T" | "F" | "NG">>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [id]);

  useEffect(() => {
    let alive = true;
    setDoc(null);
    setError(null);
    setAnswers({});
    setSaved(false);
    loadReading(id).then(
      (d) => alive && setDoc(d),
      (err: Error) => alive && setError(err.message),
    );
    return () => {
      alive = false;
    };
  }, [id]);

  const parsedParas = useMemo(() => (doc ? doc.paras.map(parseReadingMarkup) : []), [doc]);

  const order = items.findIndex((i) => i.id === id);
  const prev = order > 0 ? items[order - 1] : null;
  const next = order >= 0 && order < items.length - 1 ? items[order + 1] : null;

  if (error) return <ReadingError message={error} />;
  if (!doc) return <ReadingLoading />;

  const level = levelName(atlas.cefr, doc.cefr);
  const topicLabel = atlas.topics.find(([key]) => key === doc.topic)?.[1] ?? doc.topic;
  const answered = Object.keys(answers).length;
  const correct = doc.q.reduce((n, q, i) => n + (answers[i] === q.a ? 1 : 0), 0);
  const previous = readings[id];

  const finish = () => {
    if (answered < doc.q.length || saved) return;
    saveReadingResult(id, correct, doc.q.length);
    setSaved(true);
  };

  return (
    <div className="page reading-page reading-reader">
      <a className="reading-back" href="#/reading">
        <ArrowLeft size={16} /> Olvasósarok
      </a>

      <header className="reading-hero">
        <div className="reading-hero-meta">
          <span className={`chip chip-level lv-${level}`}>{level}</span>
          <span>{topicLabel}</span>
          <span>{doc.ids.length} szó</span>
          <span>{readingWordCount(doc.paras)} szó a szövegben</span>
        </div>
        <h1 className="display" lang="hu">
          {doc.titleHu}
        </h1>
        <p className="reading-title-en" lang="en">
          {doc.title}
        </p>
        <div className="reading-hero-tools">
          <button className={`reading-toggle ${bilingual ? "is-on" : ""}`} onClick={() => setBilingual((v) => !v)} aria-pressed={bilingual}>
            {bilingual ? <EyeOff size={16} /> : <Eye size={16} />}
            {bilingual ? "Magyar fordítás elrejtése" : "Magyar fordítás mutatása"}
          </button>
          {previous && (
            <span className="reading-last">
              Legutóbb: {previous.correct}/{previous.total}
            </span>
          )}
        </div>
      </header>

      <div className="reading-layout">
        <article className="reading-article">
          {doc.paras.map((_, i) => (
            <section className="reading-para" key={i}>
              <p lang="en">
                {parsedParas[i].map((part, k) =>
                  part.wordId ? (
                    <button key={k} type="button" className="reading-word" onClick={() => openWord(part.wordId!)} title={`${part.text} – szócikk`}>
                      {part.text}
                    </button>
                  ) : (
                    <span key={k}>{part.text}</span>
                  ),
                )}
              </p>
              {bilingual && doc.hu[i] && (
                <p className="reading-hu" lang="hu">
                  {doc.hu[i]}
                </p>
              )}
            </section>
          ))}
        </article>

        <aside className="reading-vocab" aria-label="A fejezet szavai">
          <h2 className="eyebrow">A fejezet szavai</h2>
          <ul>
            {doc.ids.map((wordId) => {
              const ref = atlas.byId.get(wordId);
              if (!ref) return null;
              return (
                <li key={wordId}>
                  <button type="button" onClick={() => openWord(wordId)}>
                    <Illustration src={atlas.img(ref, "thumb")} word={ref.word} topic={ref.topic} eager />
                    <span>
                      <b lang="en">{ref.word}</b>
                      <small>{ref.hu}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      <section className="panel reading-quiz" aria-labelledby="quiz-title">
        <div className="panel-head">
          <h2 className="eyebrow" id="quiz-title">
            Szövegértés · Igaz / Hamis / Nincs megadva
          </h2>
          <span className="reading-quiz-score">
            {answered}/{doc.q.length} megválaszolva
            {answered > 0 && ` · ${correct} helyes`}
          </span>
        </div>
        <ol>
          {doc.q.map((q, i) => {
            const picked = answers[i];
            const isCorrect = picked === q.a;
            return (
              <li key={i} className={picked ? (isCorrect ? "is-correct" : "is-wrong") : ""}>
                <p className="reading-q" lang="en">
                  {q.s}
                </p>
                <div className="reading-answers" role="group" aria-label={`${i + 1}. kérdés`}>
                  {ANSWERS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={`reading-answer ${picked === key ? "is-picked" : ""} ${picked && key === q.a ? "is-answer" : ""}`}
                      disabled={!!picked}
                      onClick={() => setAnswers((a) => ({ ...a, [i]: key }))}
                      aria-pressed={picked === key}
                    >
                      {picked === key ? isCorrect ? <Check size={15} /> : <X size={15} /> : null}
                      {label}
                    </button>
                  ))}
                </div>
                {picked && (
                  <p className="reading-why" lang="hu">
                    <b>{isCorrect ? "Helyes." : `Nem talált. A helyes válasz: ${ANSWERS.find((a) => a.key === q.a)?.label}.`}</b> {q.why}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
        <div className="reading-quiz-foot">
          <span>{saved ? `Elmentve · ${correct}/${doc.q.length}` : answered === doc.q.length ? "Minden kérdés megválaszolva." : "Válaszolj mindhárom kérdésre."}</span>
          <button className="btn btn-primary" onClick={finish} disabled={answered < doc.q.length || saved}>
            <BookOpenCheck size={17} /> {saved ? "Elmentve" : "Befejezés"}
          </button>
        </div>
      </section>

      <nav className="reading-pager" aria-label="Olvasmányok között">
        {prev ? (
          <a className="reading-pager-link" href={`#/reading?id=${prev.id}`}>
            <ArrowLeft size={17} />
            <span>
              <small>Előző</small>
              <b lang="hu">{prev.titleHu}</b>
            </span>
          </a>
        ) : (
          <span />
        )}
        <a className="btn btn-ghost" href="#/reading">
          Katalógus
        </a>
        {next ? (
          <a className="reading-pager-link is-next" href={`#/reading?id=${next.id}`}>
            <span>
              <small>Következő</small>
              <b lang="hu">{next.titleHu}</b>
            </span>
            <ArrowRight size={17} />
          </a>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
