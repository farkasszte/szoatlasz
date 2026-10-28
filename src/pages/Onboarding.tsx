import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useAtlas } from "../atlas/context";
import { store } from "../store/store";

const LEVEL_INFO: Record<string, [string, string]> = {
  A1: ["Kezdő", "Az alapoktól indulsz"],
  A2: ["Alap", "A mindennapi szavak még nem stabilak"],
  B1: ["Haladó", "Az önálló nyelvhasználat felé"],
  B2: ["Középhaladó", "Nyelvvizsga-szintű szókincs"],
  C1: ["Emelt", "C1-es szintű szókincs"],
  C2: ["Mester", "A legritkább, árnyalt szavak"],
};

export function Onboarding() {
  const atlas = useAtlas();
  const levels = useMemo(
    () => atlas.cefr.map((code) => ({ code, name: LEVEL_INFO[code]?.[0] ?? code, desc: LEVEL_INFO[code]?.[1] ?? "" })),
    [atlas.cefr],
  );
  const [level, setLevel] = useState(() => Math.min(1, Math.max(0, levels.length - 1)));
  const [goal, setGoal] = useState(10);
  const finish = () => store.settings({ onboarded: true, startLevel: level, dailyNew: goal });
  return (
    <div className="onboard" role="dialog" aria-modal="true" aria-label="Üdvözlés">
      <div className="onboard-card">
        <img className="onboard-art" src={`${import.meta.env.BASE_URL}brand/hero.webp`} alt="" />
        <div className="onboard-body">
          <p className="eyebrow">Üdv a Szó Atlaszben</p>
          <h1 className="display">
            {atlas.count.toLocaleString()} csillag
            <br />
            vár rád, hogy felfényljen.
          </h1>
          <fieldset>
            <legend>Honnan indulsz?</legend>
            <div className="choice-grid">
              {levels.map((item, i) => (
                <button key={item.code} className={`choice ${level === i ? "is-on" : ""}`} onClick={() => setLevel(i)} aria-pressed={level === i}>
                  <span className={`chip chip-level lv-${item.code}`}>{item.code}</span>
                  <b>{item.name}</b>
                  <small>{item.desc}</small>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Hány új szó fér bele egy napba?</legend>
            <div className="segmented segmented-wide">
              {[5, 10, 15, 20].map((n) => (
                <button key={n} className={goal === n ? "is-on" : ""} onClick={() => setGoal(n)} aria-pressed={goal === n}>
                  {n} szó{n === 10 ? " · ajánlott" : ""}
                </button>
              ))}
            </div>
          </fieldset>
          <button className="btn btn-primary btn-xl" onClick={finish}>
            Indulás <ArrowRight size={20} />
          </button>
          <p className="muted">Nincs regisztráció. A haladás ezen az eszközön marad, és a Haladás fülön bármikor módosítható.</p>
        </div>
      </div>
    </div>
  );
}
