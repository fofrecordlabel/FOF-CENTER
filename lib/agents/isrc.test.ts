import assert from "node:assert/strict";
import test from "node:test";
import { findDuplicateIsrcs, normalizeIsrc, validateIsrcFormat, validateUpc } from "./isrc";

test("normalizeIsrc strips dashes and uppercases", () => {
  assert.equal(normalizeIsrc("us-fof-26-00001"), "USFOF2600001");
});

test("validateIsrcFormat accepts a well-formed code", () => {
  assert.equal(validateIsrcFormat("USFOF2600001"), null);
  assert.equal(validateIsrcFormat("US-FOF-26-00001"), null);
});

test("validateIsrcFormat flags missing and bad length", () => {
  assert.equal(validateIsrcFormat(null)?.code, "missing");
  assert.equal(validateIsrcFormat("USFOF26")?.code, "length");
  assert.equal(validateIsrcFormat("123456789012")?.code, "charset");
});

test("findDuplicateIsrcs groups collisions", () => {
  const dups = findDuplicateIsrcs([
    { id: "1", title: "A", isrc: "US-FOF-26-00001" },
    { id: "2", title: "B", isrc: "USFOF2600001" },
    { id: "3", title: "C", isrc: "USFOF2600002" },
  ]);
  assert.equal(dups.length, 1);
  assert.equal(dups[0].tracks.length, 2);
});

test("validateUpc accepts 12–14 digit codes", () => {
  assert.equal(validateUpc("123456789012").ok, true);
  assert.equal(validateUpc("12").ok, false);
  assert.equal(validateUpc(null).ok, false);
});
