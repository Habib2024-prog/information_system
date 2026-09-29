import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const sourcePath = resolve("src/lib/date.ts");
let source = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
source = source.replace(/from\s+(["'])jalaali-js\1/g, "from \"" + pathToFileURL(require.resolve("jalaali-js")).href + "\"");
const date = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));

test("Gregorian dates display as Persian-digit Jalali dates across a year boundary", () => {
  assert.equal(date.formatJalaliDate("2026-09-28"), "۱۴۰۵/۰۷/۰۶");
  assert.equal(date.formatJalaliDate("2026-03-21"), "۱۴۰۵/۰۱/۰۱");
  assert.equal(date.formatJalaliDate("2025-03-20"), "۱۴۰۳/۱۲/۳۰");
});

test("Jalali input becomes canonical ISO for API filtering and rejects invalid values", () => {
  assert.equal(date.jalaliInputToIsoDate("۱۴۰۵/۰۷/۰۶"), "2026-09-28");
  assert.equal(date.jalaliInputToIsoDate("1405/01/01"), "2026-03-21");
  assert.equal(date.jalaliInputToIsoDate("۱۴۰۳/۱۲/۳۰"), "2025-03-20");
  assert.equal(date.jalaliInputToIsoDate("۱۴۰۴/۱۲/۳۰"), null);
  assert.equal(date.jalaliInputToIsoDate("invalid"), null);
});

test("null, empty, invalid and audit timestamp values are safely localized", () => {
  assert.equal(date.formatJalaliDate(null), "—");
  assert.equal(date.formatJalaliDate("not-a-date"), "تاریخ نامشخص");
  assert.match(date.formatJalaliDateTime("2026-09-28T10:35:00Z"), /^۱۴۰۵\/۰۷\/۰۶ - [۰-۹]{2}:[۰-۹]{2}$/u);
});
