import assert from "node:assert/strict";
import { test } from "node:test";
import { assertPatchedVersion } from "./browser-policy.cjs";

const VULNERABLE_ERROR = /vulnerable/;

test("rejects vulnerable bundled Chromium and the patch boundary below the fix", () => {
  for (const version of ["156.0.8078.4", "156.0.8078.72", "155.99.9999.999"]) {
    assert.throws(() => assertPatchedVersion(version), VULNERABLE_ERROR);
  }
});

test("accepts the exact fixed boundary, reviewed stable pin and newer numeric versions", () => {
  for (const version of [
    "156.0.8078.73",
    "156.0.8078.80",
    "156.0.8079.0",
    "157.0.0.0",
  ]) {
    assert.doesNotThrow(() => assertPatchedVersion(version));
  }
});

test("fails closed on missing, malformed, prefixed and oversized versions", () => {
  for (const version of [
    undefined,
    null,
    "",
    "156.0.8078",
    "Chrome/156.0.8078.80",
    "156.0.8078.80-beta",
    "99999999999999999999.0.0.0",
  ]) {
    assert.throws(() => assertPatchedVersion(version));
  }
});
