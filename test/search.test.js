import test from "node:test";
import assert from "node:assert/strict";
import { instructions } from "../server/knowledge.js";
import { searchInstructions } from "../server/search.js";
import { answerQuestion } from "../server/question.js";

test("contains a small, curated sample of official procurement instructions", () => {
  assert.deepEqual(
    instructions.map((instruction) => instruction.id),
    ["7.0.1", "7.1.1", "7.4.1", "7.6.1", "7.7.1", "7.9.1"],
  );
  assert.ok(
    instructions.every(
      (instruction) =>
        instruction.sourceUrl.startsWith("https://takam.mof.gov.il/document/") &&
        instruction.chapter === "התקשרויות ורכישות" &&
        instruction.keywords.length > 0,
    ),
  );
});

test("finds an official procurement instruction by its number", () => {
  const results = searchInstructions("מה ידוע על הוראה 7.6.1?");

  assert.equal(results[0]?.id, "7.6.1");
  assert.equal(results[0]?.title, "פטור מחובת המכרז");
});

test("finds the shortened procurement route using Hebrew prefix matching", () => {
  const results = searchInstructions("בהליך מקוצר");

  assert.equal(results[0]?.id, "7.7.1");
});

test("finds the tender committee instruction by its catalog keywords", () => {
  const results = searchInstructions("הרכב ועדת המכרזים");

  assert.equal(results[0]?.id, "7.1.1");
});

test("returns no more than three ranked sources", () => {
  const results = searchInstructions("התקשרות בפטור ממכרז");

  assert.ok(results.length > 0);
  assert.ok(results.length <= 3);
  assert.equal(results[0]?.id, "7.6.1");
});

test("does not answer from a source that was not retrieved", async () => {
  const result = await answerQuestion("איך מגישים בקשה לאישור חופשה?", {
    enableModel: false,
  });

  assert.deepEqual(result.citations, []);
  assert.equal(result.mode, "retrieval-demo");
  assert.match(result.answer, /לא מצאתי התאמה/);
});

test("returns official source metadata and describes the catalog limitation", async () => {
  const result = await answerQuestion("מה ידוע על הוראה 7.6.1?", {
    enableModel: false,
  });

  assert.equal(
    result.citations[0].sourceUrl,
    "https://takam.mof.gov.il/document/H.7.6.1",
  );
  assert.equal(result.citations[0].edition, "12");
  assert.ok(result.citations[0].keywords.includes("התקשרות ללא מכרז"));
  assert.equal(result.catalogCheckedAt, "2026-10-25");
  assert.match(result.answer, /לא את נוסח ההוראה המלא/);
});
