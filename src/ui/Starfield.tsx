import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  a: number;
  tw: number;
  ph: number;
  warm: boolean;
}

/** Determinisztikus álvéletlen-generátor a csillagok egyenletes és stabil elhelyezéséhez. */
function generateStars(w: number, h: number): Star[] {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const count = Math.round(Math.min(240, (w * h) / 5200));

  return Array.from({ length: count }, (_, i) => {
    const pow = Math.pow(rand(), 2.2);
    return {
      x: rand() * w,
      y: Math.pow(rand(), 1.35) * h, // A csillagok az ég felső részén sűrűbbek
      r: 0.35 + pow * 1.05,
      a: 0.18 + pow * 0.55,
      tw: i % 9 === 0 ? 0.6 + rand() * 1.2 : 0, // Minden 9. csillag pulzál/pislog
      ph: rand() * Math.PI * 2,
      warm: rand() < 0.14,
    };
  });
}

/** Napszakhoz igazodó dinamikus égbolt színek (óra, felső, középső, horizont, horizont-ragyogás). */
const SKY_PALETTE: [number, string, string, string, number][] = [
  [0, "#05070f", "#080b19", "#0d0c1a", 0.08],
  [4, "#070b18", "#0d1426", "#1c2740", 0.22],
  [6, "#080c1b", "#0c1224", "#141a30", 0.12],
  [17, "#0a0f22", "#121429", "#2a1a2c", 0.32],
  [19, "#070a16", "#0a0e1f", "#110f21", 0.2],
  [23, "#05070f", "#080b19", "#0d0c1a", 0.08],
];

export function updateSky(): void {
  const h = new Date().getHours();
  const [, top, mid, horizon, glow] = [...SKY_PALETTE].reverse().find(([m]) => h >= m) ?? SKY_PALETTE[0];
  const el = document.documentElement.style;
  el.setProperty("--sky-top", top);
  el.setProperty("--sky-mid", mid);
  el.setProperty("--sky-horizon", horizon);
  el.setProperty("--sky-glow", String(glow));
}

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stars: Star[] = [];
    let offscreen: HTMLCanvasElement | null = null;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let rafId = 0;
    let lastDraw = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      if (!w || !h) {
        offscreen = null;
        stars = [];
        return;
      }

      stars = generateStars(w, h);
      offscreen = document.createElement("canvas");
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const offCtx = offscreen.getContext("2d");
      if (offCtx) {
        offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        for (const s of stars) {
          if (!s.tw) {
            offCtx.globalAlpha = s.a;
            offCtx.fillStyle = s.warm ? "#ffe2b4" : "#f3ecdf";
            offCtx.beginPath();
            offCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            offCtx.fill();
          }
        }
      }
      draw(performance.now());
    };

    const draw = (now: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (offscreen && offscreen.width && offscreen.height) {
        ctx.drawImage(offscreen, 0, 0);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const t = now / 1000;
      for (const s of stars) {
        if (!s.tw) continue;
        const pulse = reducedMotion ? 0.8 : 0.55 + 0.45 * Math.sin(t * s.tw + s.ph);
        ctx.globalAlpha = s.a * pulse;
        ctx.fillStyle = s.warm ? "#ffe2b4" : "#f3ecdf";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * (0.9 + 0.2 * pulse), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      if (now - lastDraw > 80) {
        draw(now);
        lastDraw = now;
      }
      rafId = requestAnimationFrame(loop);
    };

    const start = () => {
      if (!reducedMotion && !rafId && !document.hidden) {
        rafId = requestAnimationFrame(loop);
      }
    };

    const stop = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 150);
    };

    const onVisibility = () => (document.hidden ? stop() : start());

    resize();
    start();
    updateSky();
    const skyInterval = window.setInterval(updateSky, 600000);

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      clearInterval(skyInterval);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />;
}

