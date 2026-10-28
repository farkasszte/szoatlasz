import { ArrowRight, Calendar, Edit2, Minus, Plus, Sparkles } from "lucide-react";
import { useId, useState } from "react";
import { useAtlas } from "../atlas/context";
import { calculateExamPlan, CEFR_NAMES, formatIsoDate, parseIsoDate } from "../store/exam";
import { store, useStore } from "../store/store";
import { Sheet } from "./Sheet";

export function ExamBanner() {
  const atlas = useAtlas();
  const progress = useStore((s) => s.progress);
  const settings = useStore((s) => s.settings);
  const [open, setOpen] = useState(false);

  const plan = calculateExamPlan({
    words: atlas.words,
    cards: progress.cards,
    days: progress.days,
    settings,
  });

  const parsedDate = parseIsoDate(settings.examDate);
  const formattedDate = parsedDate
    ? parsedDate.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })
    : "";

  const rangeLabel = `${CEFR_NAMES[plan.from]}–${CEFR_NAMES[plan.top]}`;
  const percent = plan.scope ? Math.round((plan.seen / plan.scope) * 100) : 0;

  // Ha még nincs kitűzve vizsgaidőpont
  if (plan.status === "none") {
    return (
      <>
        <button type="button" className="exam-invite" onClick={() => setOpen(true)}>
          <Calendar size={18} aria-hidden="true" />
          <span>
            <b>Tűzz ki egy vizsgaidőpontot</b>, és kiszámolom a napi tanulási tempót.
          </span>
          <ArrowRight size={16} aria-hidden="true" className="exam-invite-go" />
        </button>
        <ExamSheet open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  // Ha a vizsganap már elmúlt
  if (plan.status === "passed") {
    const passedDays = Math.abs(plan.left ?? 0);
    return (
      <>
        <section className="exam-banner is-passed" aria-label="A vizsganap elmúlt">
          <div className="exam-passed-text">
            <p className="eyebrow">A vizsga {passedDays} napja volt</p>
            <p className="exam-status">{plan.message}</p>
          </div>
          <div className="exam-passed-actions">
            <button type="button" className="btn btn-ghost exam-btn-sm" onClick={() => setOpen(true)}>
              Új időpont
            </button>
            <button type="button" className="btn exam-btn-sm exam-btn-quiet" onClick={() => store.settings({ examDate: "" })}>
              Törlés
            </button>
          </div>
        </section>
        <ExamSheet open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  // Ha pont MA van a vizsga napja
  if (plan.status === "today") {
    return (
      <>
        <section className="exam-banner is-today" aria-label="A vizsga napja">
          <div className="exam-count" aria-hidden="true">
            <Sparkles size={32} />
          </div>
          <div className="exam-body">
            <p className="eyebrow">Ma vizsgázol · {formattedDate} · Cél: Band {settings.targetBand.toFixed(1)}</p>
            <p className="exam-today-title">Sok sikert!</p>
            <p className="exam-status">{plan.message}</p>
          </div>
          <button type="button" className="icon-btn exam-edit" onClick={() => setOpen(true)} aria-label="Vizsgaterv módosítása">
            <Edit2 size={17} />
          </button>
        </section>
        <ExamSheet open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  // Visszaszámláló állapot (ontrack, sprint, behind, done)
  const isSprint = plan.status === "sprint";
  const bannerClass = isSprint ? "is-sprint" : plan.status === "behind" ? "is-behind" : "";

  return (
    <>
      <section className={`exam-banner ${bannerClass}`} aria-label={`Még ${plan.left} nap a vizsgáig`}>
        <div className="exam-count">
          <span className="exam-count-label">{isSprint ? "Finis hét" : "Vizsgáig"}</span>
          <b className="exam-days">{plan.left}</b>
          <span className="exam-count-unit">nap</span>
        </div>
        <div className="exam-body">
          <div className="exam-meta">
            <span>{formattedDate}</span>
            <span className="exam-band">
              Cél: <b>Band {settings.targetBand.toFixed(1)}</b>
            </span>
          </div>
          <p className="exam-status">{plan.message}</p>
          <div className="exam-progress">
            <div
              className="exam-bar"
              role="progressbar"
              aria-label={`${rangeLabel} szintű szókincs: ${plan.seen} / ${plan.scope} megtanulva`}
              aria-valuenow={plan.seen}
              aria-valuemin={0}
              aria-valuemax={plan.scope}
            >
              <span style={{ width: `${percent}%` }} />
            </div>
            <small>
              <span>
                {rangeLabel} · {plan.seen.toLocaleString("hu-HU")} / {plan.scope.toLocaleString("hu-HU")} szó ({percent}%)
              </span>
              {settings.planAuto && plan.daily > 0 && <span>Napi {plan.daily} új szó</span>}
            </small>
          </div>
        </div>
        <button type="button" className="icon-btn exam-edit" onClick={() => setOpen(true)} aria-label="Vizsgaterv módosítása">
          <Edit2 size={17} />
        </button>
      </section>
      <ExamSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function ExamSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const atlas = useAtlas();
  const progress = useStore((s) => s.progress);
  const settings = useStore((s) => s.settings);

  const [draft, setDraft] = useState(() => ({
    examDate: settings.examDate || "",
    targetBand: settings.targetBand || 7.0,
    planAuto: settings.examDate ? settings.planAuto : true,
  }));

  const save = () => {
    store.settings(draft);
    onClose();
  };

  const previewPlan = calculateExamPlan({
    words: atlas.words,
    cards: progress.cards,
    days: progress.days,
    settings: {
      ...settings,
      ...draft,
    },
  });

  const rangeLabel = `${CEFR_NAMES[previewPlan.from]}–${CEFR_NAMES[previewPlan.top]}`;
  const dateId = useId();
  const minDate = formatIsoDate(new Date());

  return (
    <Sheet open={open} onClose={onClose} label="Vizsgaterv beállítása" className="exam-sheet">
      <div className="exam-sheet-body">
        <p className="eyebrow">Vizsgaterv</p>
        <h2 className="exam-sheet-title">Vizsgaterv beállítása</h2>
        <p className="muted">
          Add meg a vizsgád dátumát és a célzott sávszintet; a rendszer automatikusan ütemezi a napi új szavakat és a vizsga előtti finis időszakot.
        </p>

        <div className="exam-fields">
          <div className="field exam-field">
            <div>
              <b>
                <label htmlFor={dateId}>Vizsga időpontja</label>
              </b>
              <small>Ha még nincs pontos dátum, üresen hagyható.</small>
            </div>
            <div className="exam-date">
              <label className={`exam-date-input ${draft.examDate ? "has-value" : ""}`}>
                <Calendar size={18} aria-hidden="true" />
                <input
                  id={dateId}
                  type="date"
                  min={minDate}
                  value={draft.examDate}
                  onChange={(e) => setDraft((d) => ({ ...d, examDate: e.target.value }))}
                  aria-label="Vizsga időpontja"
                />
              </label>
              <button
                type="button"
                className={`exam-undecided ${draft.examDate ? "" : "is-on"}`}
                onClick={() => setDraft((d) => ({ ...d, examDate: "" }))}
              >
                Még nincs kitűzve
              </button>
            </div>
          </div>

          <div className="field exam-field">
            <div>
              <b>Célzott sávszint (IELTS Band)</b>
              <small>A szükséges szókincstartomány ajánlásához; bármikor módosítható.</small>
            </div>
            <div className="band-stepper" role="group" aria-label="Célzott pontszám">
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, targetBand: Math.max(5.0, d.targetBand - 0.5) }))}
                disabled={draft.targetBand <= 5.0}
                aria-label="Célzott szint csökkentése 0.5-tel"
              >
                <Minus size={16} />
              </button>
              <b>Band {draft.targetBand.toFixed(1)}</b>
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, targetBand: Math.min(8.5, d.targetBand + 0.5) }))}
                disabled={draft.targetBand >= 8.5}
                aria-label="Célzott szint növelése 0.5-tel"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <label className="field toggle exam-field">
            <div>
              <b>Napi új szavak automatikus ütemezése</b>
              <small>
                {draft.planAuto
                  ? "A rendszer a vizsga napjáig dinamikusan elosztja a szavakat, hogy időben végezz."
                  : "Kikapcsolva a beállításokban megadott fix szószám marad érvényben."}
              </small>
            </div>
            <input
              type="checkbox"
              role="switch"
              checked={draft.planAuto}
              onChange={(e) => setDraft((d) => ({ ...d, planAuto: e.target.checked }))}
            />
            <span className="switch" aria-hidden="true" />
          </label>

          <div className={`exam-preview ${draft.planAuto && draft.examDate ? "is-live" : ""}`}>
            {previewPlan.status === "none" ? (
              <p className="exam-explain">A vizsga dátumának megadása után azonnal megjelenik a javasolt napi adag.</p>
            ) : previewPlan.status === "passed" ? (
              <p className="exam-explain">A megadott dátum a múltban van. Válassz egy jövőbeli időpontot.</p>
            ) : previewPlan.status === "today" ? (
              <p className="exam-explain">Ma van a vizsga napja! Nyugodt felkészülést és sok sikert kívánunk!</p>
            ) : (
              <div className="exam-explain">
                A <b>Band {draft.targetBand.toFixed(1)}</b> célhoz tartozó szókincs a(z) <b>{rangeLabel}</b> szintű <b>{previewPlan.scope.toLocaleString("hu-HU")}</b> szó
                {previewPlan.seen > 0 && <> (ebből már átvettél <b>{previewPlan.seen.toLocaleString("hu-HU")}</b> szót)</>}.
                <br />
                Még <b>{previewPlan.left}</b> nap van hátra
                {previewPlan.reserve > 0 && <>, az utolsó {previewPlan.reserve} nap a finis (csak ismétlés)</>}
                . Ehhez napi kb. <b className="exam-num">{previewPlan.daily}</b> új szó szükséges.
                <span className="exam-note">
                  Ez az alkalmazás ajánlott ütemterve a szókincs elsajátításához, nem hivatalos vizsgakövetelmény.
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="exam-sheet-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Mégse
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            Terv mentése
          </button>
        </div>
      </div>
    </Sheet>
  );
}
