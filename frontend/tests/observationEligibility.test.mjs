import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

const path = resolve(import.meta.dirname, "../src/lib/observationEligibility.ts");
const source = ts.transpileModule(readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const eligibility = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

test("manager uses the same observation form as amir and senior teacher", () => {
  assert.equal(eligibility.getObservationFormKind("teacher"), "teacher");
  assert.equal(eligibility.getObservationFormKind("amir"), "amir");
  assert.equal(eligibility.getObservationFormKind("manager"), "amir");
  assert.equal(eligibility.getObservationFormKind("senior_teacher"), "amir");
  assert.equal(eligibility.getObservationFormKind("other"), null);
});
