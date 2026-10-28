import { BookOpen, ChevronLeft, ChevronRight, Compass, Github, Keyboard, Moon, Search, Sun, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AtlasContext, useAtlas, useEntry } from "./atlas/context";
import { loadOpenAtlas } from "./atlas/data";
import type { Atlas } from "./atlas/types";
import { REPO_URL } from "./config";
import { closeWord, currentLocation, go, openWord, useLocation, type Route } from "./lib/router";
import { AtlasPage } from "./pages/Atlas";
import { About } from "./pages/About";
import { Learn } from "./pages/Learn";
import { Me } from "./pages/Me";
import { Onboarding } from "./pages/Onboarding";
import { Practice } from "./pages/Practice";
import { Today } from "./pages/Today";
import { cue } from "./lib/sound";
import { store, useStore } from "./store/store";
import { EntryView } from "./ui/EntryView";
import { AmbienceController, AmbiencePicker } from "./ui/Ambience";
import { Logo } from "./ui/Logo";
import { Palette } from "./ui/Palette";
import { Sheet } from "./ui/Sheet";
import { shouldShowSplash, Splash } from "./ui/Splash";
import { Toasts } from "./ui/Toast";

const NAV: { page: Route["page"]; label: string; icon: typeof Compass }[] = [
  { page: "today", label: "Ma", icon: Compass },
  { page: "atlas", label: "Atlasz", icon: BookOpen },
  { page: "practice", label: "Gépelés", icon: Keyboard },
  { page: "me", label: "Haladás", icon: User },
];

function useTheme() {
  const theme = useStore((s) => s.settings.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0D1120" : "#F6F1E7");
  }, [theme]);
  return theme;
}

export default function App() {
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [error, setError] = useState<string | null>(null);
  useTheme();

  useEffect(() => {
    loadOpenAtlas().then(
      (a) => {
        store.useDataset(a.id);
        setAtlas(a);
      },
      (e: Error) => setError(e.message),
    );
  }, []);

  if (error)
    return (
      <div className="boot">
        <Logo />
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => location.reload()}>
          Újratöltés
        </button>
      </div>
    );
  if (!atlas)
    return (
      <div className="boot" aria-busy="true">
        <Logo />
        <span className="spinner" />
      </div>
    );
  return (
    <AtlasContext.Provider value={atlas}>
      <Shell />
    </AtlasContext.Provider>
  );
}

function Shell() {
  const { route, word } = useLocation();
  const onboarded = useStore((s) => s.settings.onboarded);
  const theme = useStore((s) => s.settings.theme);
  const [palette, setPalette] = useState(false);
  const [splash, setSplash] = useState(shouldShowSplash);
  const focus = route.page === "learn";

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.tagName === "INPUT" || t.tagName === "TEXTAREA";
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      } else if (e.key === "/" && !typing && !focus) {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [focus]);

  useEffect(() => {
    if (!word) window.scrollTo({ top: 0 });
  }, [route.page]); // eslint-disable-line react-hooks/exhaustive-deps

  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className={`app ${focus ? "is-focus" : ""}`}>
      {!focus && (
        <header className="topbar">
          <a className="topbar-logo" href="#/" aria-label="Szó Atlasz – főoldal">
            <Logo />
          </a>
          <nav className="topnav" aria-label="Főmenü">
            {NAV.map(({ page, label }) => (
              <a key={page} href={page === "today" ? "#/" : `#/${page}`} className={route.page === page ? "is-on" : ""} aria-current={route.page === page ? "page" : undefined}>
                {label}
              </a>
            ))}
          </nav>
          <div className="topbar-tools">
            <button className="search-pill" onClick={() => setPalette(true)} aria-label="Szó keresése">
              <Search size={17} />
              <span>Keresés</span>
              <kbd>⌘K</kbd>
            </button>
            <AmbiencePicker />
            <button className="icon-btn" onClick={() => store.settings({ theme: dark ? "light" : "dark" })} aria-label={dark ? "Világos téma" : "Sötét téma"}>
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <a className="icon-btn hide-sm" href="#/about" aria-label="Névjegy és nyílt forrás" title="Névjegy és nyílt forrás">
              <Github size={19} />
            </a>
          </div>
        </header>
      )}

      <main className="main" id="main">
        {route.page === "today" && <Today />}
        {route.page === "atlas" && <AtlasPage route={route} />}
        {route.page === "learn" && <Learn />}
        {route.page === "practice" && <Practice />}
        {route.page === "me" && <Me />}
        {route.page === "about" && <About />}
      </main>

      {!focus && (
        <footer className="footer">
          <Logo compact />
          <p>
            Egy szó, egy kép · ingyenes és nyílt forrású ·{" "}
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>{" "}
            · <a href="#/about">Névjegy</a>
          </p>
        </footer>
      )}

      {!focus && (
        <nav className="tabbar" aria-label="Főmenü">
          {NAV.map(({ page, label, icon: Icon }) => (
            <a key={page} href={page === "today" ? "#/" : `#/${page}`} className={route.page === page ? "is-on" : ""} aria-current={route.page === page ? "page" : undefined}>
              <Icon size={22} strokeWidth={route.page === page ? 2.1 : 1.7} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
      )}

      <WordSheet id={word} />
      <Palette open={palette} onClose={() => setPalette(false)} />
      {!onboarded && route.page !== "about" && !splash && <Onboarding />}
      {splash && <Splash onDone={() => setSplash(false)} />}
      <Toasts />
      <AmbienceController />
    </div>
  );
}

function WordSheet({ id }: { id: string | null }) {
  const atlas = useAtlas();
  const opened = id !== null;
  useEffect(() => {
    if (opened && store.get().settings.sfx) void cue("page");
  }, [opened]);
  const { entry, error } = useEntry(id);
  const ref = id ? atlas.byId.get(id) : undefined;
  const neighbor = useCallback(
    (d: number) => {
      if (!ref) return;
      const n = atlas.words[ref.order + d];
      if (n) go(currentLocation().route, n.id, true);
    },
    [atlas, ref],
  );
  useEffect(() => {
    if (!id) return;
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "ArrowLeft") neighbor(-1);
      if (e.key === "ArrowRight") neighbor(1);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [id, neighbor]);
  return (
    <Sheet open={!!id} onClose={closeWord} label={ref ? `${ref.word} szócikk` : "Szócikk"} wide>
      {entry ? (
        <EntryView key={entry.id} entry={entry} />
      ) : error ? (
        <p className="sheet-error">{error}</p>
      ) : (
        <span className="spinner" />
      )}
      {ref && (
        <nav className="sheet-nav" aria-label="Szócikkek között">
          <button className="icon-btn" onClick={() => neighbor(-1)} disabled={ref.order === 0} aria-label="Előző">
            <ChevronLeft size={20} />
          </button>
          <span>
            {(ref.order + 1).toLocaleString()} / {atlas.count.toLocaleString()}
          </span>
          <button className="icon-btn" onClick={() => neighbor(1)} disabled={ref.order >= atlas.count - 1} aria-label="Következő">
            <ChevronRight size={20} />
          </button>
        </nav>
      )}
    </Sheet>
  );
}

export { openWord };
