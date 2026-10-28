import { Download, RotateCcw, Upload } from "lucide-react";
import { useMemo, useRef } from "react";
import { useAtlas } from "../atlas/context";
import { isMastered } from "../store/srs";
import { dayKey, exportBackup, importBackup, resetProgress, store, useStore, type Settings } from "../store/store";
import { toast } from "../ui/Toast";
import { streakOf } from "./Today";

export function Me() {
  const atlas = useAtlas();
  const progress = useStore((s) => s.progress);
  const settings = useStore((s) => s.settings);
  const saveError = useStore((s) => s.saveError);
  const file = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const cards = Object.values(progress.cards);
    const days = Object.values(progress.days);
    const r = days.reduce((n, d) => n + d.r, 0);
    const c = days.reduce((n, d) => n + d.c, 0);
    const t = days.reduce((n, d) => n + d.t, 0);
    const now = Date.now();
    const forecast = Array.from({ length: 7 }, (_, i) => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      end.setDate(end.getDate() + i);
      const start = new Date(end);
      start.setHours(0, 0, 0, 0);
      return cards.filter((x) => (i === 0 ? x.due <= end.getTime() : x.due >= start.getTime() && x.due <= end.getTime())).length;
    });
    void now;
    return { learned: cards.length, mastered: cards.filter(isMastered).length, reviews: r, accuracy: r ? Math.round((c / r) * 100) : 0, minutes: Math.round(t / 60), forecast };
  }, [progress]);

  const set = (patch: Partial<Settings>) => store.settings(patch);
  const download = () => {
    const blob = new Blob([exportBackup()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `word-atlas-backup-${dayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const restore = async (f: File) => {
    if (f.size > 30 * 1024 * 1024) return toast("A fájl túl nagy ahhoz, hogy tanulási mentés legyen.", "warn");
    const r = importBackup(await f.text());
    toast(r.ok ? `${r.cards} szó emlékezetét visszaállítottam.` : r.error, r.ok ? "ok" : "warn");
  };
  const maxF = Math.max(1, ...stats.forecast);

  return (
    <div className="page me">
      <header className="page-head">
        <p className="eyebrow">Haladás</p>
        <h1 className="display">A te égboltod</h1>
      </header>

      <section className="stat-strip">
        <div>
          <dt>Tanulósorozat</dt>
          <dd>
            {streakOf(progress.days)}
            <small>nap</small>
          </dd>
        </div>
        <div>
          <dt>Megtanult</dt>
          <dd>{stats.learned.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Hosszú távon megjegyzett</dt>
          <dd>{stats.mastered.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Elsőre helyes</dt>
          <dd>
            {stats.accuracy}
            <small>%</small>
          </dd>
        </div>
        <div>
          <dt>Tanulási idő</dt>
          <dd>
            {stats.minutes}
            <small>perc</small>
          </dd>
        </div>
      </section>

      <div className="me-grid">
        <section className="panel">
          <h3 className="eyebrow">Az elmúlt 20 hét</h3>
          <Heatmap days={progress.days} />
          <p className="muted">Egy négyzet egy nap; minél sötétebb, annál több válasz született. A „hosszú távon megjegyzett” 21 nap feletti memória-stabilitást jelent.</p>
        </section>

        <section className="panel">
          <h3 className="eyebrow">A következő 7 nap ismétlései</h3>
          <ol className="forecast">
            {stats.forecast.map((n, i) => (
              <li key={i}>
                <span style={{ height: `${(n / maxF) * 100}%` }} />
                <b>{n}</b>
                <small>{i === 0 ? "ma" : i === 1 ? "holnap" : `+${i}`}</small>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel settings">
          <h3 className="eyebrow">Tanulási beállítások</h3>
          <Field label="Napi új szó" hint="Az ismétlésnek nincs felső korlátja; az algoritmus csak a hamarosan feledésbe merülő szavakat hozza vissza.">
            <div className="segmented">
              {[5, 10, 15, 20, 30].map((n) => (
                <button key={n} className={settings.dailyNew === n ? "is-on" : ""} onClick={() => set({ dailyNew: n })}>
                  {n}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Kezdő szint" hint="A már ismert, alacsonyabb szintek kihagyása.">
            <div className="segmented">
              {atlas.cefr.map((l, i) => (
                <button key={l} className={settings.startLevel === i ? "is-on" : ""} onClick={() => set({ startLevel: i })}>
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Célzott felidézés" hint="Minél magasabb, annál sűrűbb az ismétlés. A 90% a legtöbb embernek megfelel.">
            <div className="segmented">
              {[0.85, 0.9, 0.95].map((n) => (
                <button key={n} className={settings.retention === n ? "is-on" : ""} onClick={() => set({ retention: n })}>
                  {Math.round(n * 100)}%
                </button>
              ))}
            </div>
          </Field>
          <Field label="Kiejtés">
            <div className="segmented">
              <button className={settings.accent === "uk" ? "is-on" : ""} onClick={() => set({ accent: "uk" })}>
                Brit
              </button>
              <button className={settings.accent === "us" ? "is-on" : ""} onClick={() => set({ accent: "us" })}>
                Amerikai
              </button>
            </div>
          </Field>
          <Field label="Megjelenés">
            <div className="segmented">
              {(
                [
                  ["system", "Rendszer"],
                  ["light", "Világos"],
                  ["dark", "Sötét"],
                ] as const
              ).map(([k, l]) => (
                <button key={k} className={settings.theme === k ? "is-on" : ""} onClick={() => set({ theme: k })}>
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <Toggle label="Automatikus kiejtés" on={settings.autoplay} set={(v) => set({ autoplay: v })} />
          <Toggle label="Felületi hangok" on={settings.sfx} set={(v) => set({ sfx: v })} />
          <Toggle label="Nyitóanimáció (naponta egyszer)" on={settings.splash} set={(v) => set({ splash: v })} />
          <Toggle label="Helyesírás az ismétlésben" on={settings.spell} set={(v) => set({ spell: v })} />
        </section>

        <section className="panel">
          <h3 className="eyebrow">Adatok</h3>
          <p className="muted">A haladás csak ebben a böngészőben él: nincs fiók, nincs szerver. Eszközváltáskor exportáld, majd importáld a mentést.</p>
          {saveError && <p className="warn-text">A böngésző nem tud menteni (privát mód vagy betelt tárhely). Exportálj mentést minél hamarabb.</p>}
          <div className="data-actions">
            <button className="btn btn-ghost" onClick={download}>
              <Download size={18} /> Mentés exportálása
            </button>
            <button className="btn btn-ghost" onClick={() => file.current?.click()}>
              <Upload size={18} /> Mentés importálása
            </button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && restore(e.target.files[0]).finally(() => (e.target.value = ""))} />
            <button
              className="btn btn-ghost btn-danger"
              onClick={() => {
                if (confirm("Biztosan törlöd a teljes tanulási előzményt? Ez nem visszavonható; előbb érdemes mentést exportálni.")) {
                  resetProgress();
                  toast("A tanulási előzmény törölve.");
                }
              }}
            >
              <RotateCcw size={18} /> Előzmények törlése
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <div>
        <b>{label}</b>
        {hint && <small>{hint}</small>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="field toggle">
      <b>{label}</b>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => set(e.target.checked)} />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}

function Heatmap({ days }: { days: Record<string, { r: number }> }) {
  const weeks = 20;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (weeks * 7 - 1) - end.getDay());
  const cells: { k: string; v: number; future: boolean }[] = [];
  const d = new Date(start);
  for (let i = 0; i < (weeks + 1) * 7; i++) {
    const k = dayKey(d);
    cells.push({ k, v: days[k]?.r ?? 0, future: d > end });
    d.setDate(d.getDate() + 1);
  }
  const lvl = (v: number) => (v === 0 ? 0 : v < 10 ? 1 : v < 25 ? 2 : v < 50 ? 3 : 4);
  return (
    <div className="heatmap" role="img" aria-label="Tanulási hőtérkép">
      {cells.map((c) => (
        <span key={c.k} className={`h${c.future ? "x" : lvl(c.v)}`} title={`${c.k} · ${c.v} válasz`} />
      ))}
    </div>
  );
}
