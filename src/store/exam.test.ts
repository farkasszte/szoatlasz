import assert from "node:assert/strict";
import { test } from "node:test";
import type { WordRef } from "../atlas/types";
import { bandToCefrIndex, calculateExamPlan, daysBetween, formatIsoDate, parseIsoDate } from "./exam";
import { defaultSettings } from "./store";

const mockWords: WordRef[] = [
  { id: "w1", word: "word1", hu: "szó1", ipa: "/w1/", topic: 0, cefr: 0, order: 1, media: 0 },
  { id: "w2", word: "word2", hu: "szó2", ipa: "/w2/", topic: 0, cefr: 1, order: 2, media: 0 },
  { id: "w3", word: "word3", hu: "szó3", ipa: "/w3/", topic: 0, cefr: 2, order: 3, media: 0 },
  { id: "w4", word: "word4", hu: "szó4", ipa: "/w4/", topic: 0, cefr: 3, order: 4, media: 0 },
  { id: "w5", word: "word5", hu: "szó5", ipa: "/w5/", topic: 0, cefr: 4, order: 5, media: 0 },
];

test("exam date parsing and day difference", () => {
  const d1 = parseIsoDate("2026-11-20");
  assert.ok(d1);
  assert.equal(formatIsoDate(d1), "2026-11-20");

  const today = new Date(2026, 9, 28); // 2026-10-28
  const exam = new Date(2026, 10, 20); // 2026-11-20
  assert.equal(daysBetween(exam, today), 23);
});

test("band to CEFR index mapping", () => {
  assert.equal(bandToCefrIndex(5.5), 2); // B1
  assert.equal(bandToCefrIndex(6.5), 3); // B2
  assert.equal(bandToCefrIndex(7.5), 4); // C1
  assert.equal(bandToCefrIndex(8.5), 5); // C2
});

test("calculateExamPlan returns none when no exam date is set", () => {
  const plan = calculateExamPlan({
    words: mockWords,
    cards: {},
    days: {},
    settings: { ...defaultSettings, examDate: "" },
  });
  assert.equal(plan.status, "none");
  assert.equal(plan.left, null);
});

test("calculateExamPlan calculates pacing and sprint correctly", () => {
  const today = new Date(2026, 9, 28); // 2026-10-28
  // 17 days left -> 7 reserve sprint days -> 10 learning days
  const plan = calculateExamPlan({
    words: mockWords,
    cards: {},
    days: {},
    settings: {
      ...defaultSettings,
      examDate: "2026-11-14",
      targetBand: 7.0, // top=4 (C1), words w1..w5 all in scope (5 words)
      startLevel: 0,
    },
    today,
  });

  assert.equal(plan.status, "ontrack");
  assert.equal(plan.left, 17);
  assert.equal(plan.reserve, 7);
  assert.equal(plan.learnDays, 10);
  assert.equal(plan.scope, 5);
  assert.equal(plan.seen, 0);
  assert.equal(plan.daily, 5); // clamped to min daily 5
});

