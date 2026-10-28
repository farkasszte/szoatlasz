import type { WordRef } from "../atlas/types";
import { dayKey, type Progress, type Settings } from "./store";

export const CEFR_NAMES = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const MIN_EXAM_DAILY = 5;
export const MAX_EXAM_DAILY = 60;
export const SPRINT_RESERVE_DAYS = 7;

/** IELTS Band sávszint átszámítása a legmagasabb CEFR szintre (0=A1 .. 5=C2). */
export function bandToCefrIndex(band: number): number {
  if (band >= 8.0) return 5; // C2
  if (band >= 7.0) return 4; // C1
  if (band >= 6.0) return 3; // B2
  return 2;                  // B1
}

export function parseIsoDate(s?: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysBetween(target: Date, base: Date): number {
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const b = new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime();
  return Math.round((t - b) / 86400000);
}

export interface ExamPlan {
  status: "none" | "passed" | "today" | "done" | "sprint" | "behind" | "ontrack";
  left: number | null;
  from: number;
  top: number;
  scope: number;
  seen: number;
  unseen: number;
  doneToday: number;
  daily: number;
  need: number;
  reserve: number;
  learnDays: number;
  todayComplete: boolean;
  message: string;
}

export function calculateExamPlan(params: {
  words: WordRef[];
  cards: Progress["cards"];
  days: Progress["days"];
  settings: Settings;
  today?: Date;
}): ExamPlan {
  const { words, cards, days, settings } = params;
  const today = params.today ?? new Date();
  const examDate = parseIsoDate(settings.examDate);
  const left = examDate ? daysBetween(examDate, today) : null;

  const from = Math.max(0, Math.min(settings.startLevel ?? 0, 5));
  const top = bandToCefrIndex(settings.targetBand ?? 7.0);

  // Céltartományba eső szavak és az eddig látottak száma
  let scope = 0;
  let seen = 0;
  for (const w of words) {
    if (w.cefr >= from && w.cefr <= top) {
      scope++;
      if (cards[w.id]) seen++;
    }
  }

  const unseen = Math.max(0, scope - seen);
  const doneToday = days[dayKey(today)]?.n ?? 0;

  const base: Omit<ExamPlan, "status" | "reserve" | "learnDays" | "daily" | "need" | "todayComplete" | "message"> = {
    left,
    from,
    top,
    scope,
    seen,
    unseen,
    doneToday,
  };

  if (left === null) {
    return {
      ...base,
      status: "none",
      reserve: 0,
      learnDays: 0,
      daily: settings.dailyNew,
      need: 0,
      todayComplete: doneToday >= settings.dailyNew,
      message: "Tűzz ki egy vizsgaidőpontot a napi tempó kiszámításához.",
    };
  }

  if (left < 0) {
    return {
      ...base,
      status: "passed",
      reserve: 0,
      learnDays: 0,
      daily: settings.dailyNew,
      need: 0,
      todayComplete: doneToday >= settings.dailyNew,
      message: "A kitűzött vizsgaidőpont elmúlt. Módosíthatod vagy törölheted a dátumot.",
    };
  }

  if (left === 0) {
    return {
      ...base,
      status: "today",
      reserve: 0,
      learnDays: 0,
      daily: 0,
      need: 0,
      todayComplete: true,
      message: "Ma van a vizsga napja! Végy egy mély levegőt, és bízz a felkészülésedben. Sok sikert!",
    };
  }

  // Utolsó napok tartaléka a finisre (csak ismétlés)
  const reserve = Math.min(SPRINT_RESERVE_DAYS, Math.max(0, left));
  const learnDays = Math.max(0, left - reserve);
  const toLearn = unseen + doneToday;
  const need = learnDays > 0 ? Math.ceil(toLearn / learnDays) : 0;

  let daily: number;
  if (unseen === 0 || learnDays === 0) {
    daily = 0;
  } else {
    daily = Math.min(MAX_EXAM_DAILY, Math.max(MIN_EXAM_DAILY, need));
  }

  let status: ExamPlan["status"];
  let message: string;

  if (unseen === 0) {
    status = "done";
    message = left <= SPRINT_RESERVE_DAYS
      ? "A célzott szókincset átvetted! A hátralévő napokban a megszilárdításra és az ismétlésre összpontosíts."
      : "A célszint összes szavát megismerted, mostantól az ismétlés tartja ébren a csillagaidat.";
  } else if (learnDays === 0) {
    status = "sprint";
    message = "Finis hét: most már csak ismétlés van tervben, hogy a meglévő szókincsed sziklaszilárd legyen a vizsgára.";
  } else if (need > MAX_EXAM_DAILY) {
    status = "behind";
    message = "Szoros a menetrend: tanulj a tempód szerint, és koncentrálj a leggyakoribb szavakra.";
  } else {
    status = "ontrack";
    message = doneToday >= daily
      ? "A mai adag kész, pontosan a kitűzött terv szerint haladsz!"
      : "A mai adaggal biztosan tartod a vizsgáig vezető tempót.";
  }

  return {
    ...base,
    status,
    reserve,
    learnDays,
    daily,
    need,
    todayComplete: doneToday >= daily,
    message,
  };
}

