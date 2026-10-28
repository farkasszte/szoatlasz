import assert from "node:assert/strict";
import { test } from "node:test";
import { parseReadingMarkup, plainReading, readingWordCount } from "./readingText";

test("felbontja a beágyazott szóhivatkozásokat", () => {
  const parts = parseReadingMarkup("She was [[born|born]] in the village in 1920.");
  assert.deepEqual(parts, [
    { text: "She was " },
    { wordId: "born", text: "born" },
    { text: " in the village in 1920." },
  ]);
});

test("több hivatkozás és írásjel is helyesen jön vissza", () => {
  const parts = parseReadingMarkup("A [[library|library]], a [[bedroom|bedroom]].");
  assert.equal(parts.length, 5);
  assert.equal(parts[1].wordId, "library");
  assert.equal(parts[3].wordId, "bedroom");
  assert.equal(parts[4].text, ".");
});

test("a hibás jelölést nem nyeli el", () => {
  assert.deepEqual(parseReadingMarkup("Text [[broken here."), [{ text: "Text [[broken here." }]);
  assert.deepEqual(parseReadingMarkup(""), []);
});

test("a jelölés nélküli szöveg és a szószám", () => {
  assert.equal(plainReading("She was [[born|born]] here."), "She was born here.");
  assert.equal(readingWordCount(["One [[two|two]] three.", "Four five."]), 5);
});
