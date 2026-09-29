import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

// The project's existing in-memory TypeScript test convention needs no new dependencies.
const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../src");
const cache = new Map();
function moduleUrl(path) {
  if (cache.has(path)) return cache.get(path);
  let source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  source = source.replace(/from\s+(["'])([^"']+)\1/g, (_match, quote, specifier) => {
    const local = resolve(dirname(path), specifier);
    const target = specifier.startsWith(".")
      ? moduleUrl(existsSync(local + ".ts") ? local + ".ts" : local + ".tsx")
      : pathToFileURL(require.resolve(specifier)).href;
    return `from ${quote}${target}${quote}`;
  });
  const url = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  cache.set(path, url);
  return url;
}
const helpers = await import(moduleUrl(resolve(root, "lib/auditDetails.ts")));
const labels = await import(moduleUrl(resolve(root, "lib/auditLabels.ts")));
const { AuditDetailContent } = await import(moduleUrl(resolve(root, "components/admin/AuditDetailContent.tsx")));
const base = {
  id: 1, user: { id: 2, username: "admin", full_name: "مدیر سیستم" },
  action: "UPDATE", entity_type: "employee", entity_id: 15, description: "ویرایش کارمند",
  before_data: null, after_data: null, metadata: null, ip_address: "127.0.0.1",
  created_at: "2026-09-28T10:00:00Z",
};
const render = (overrides) => renderToStaticMarkup(createElement(AuditDetailContent, { record: { ...base, ...overrides } }));

test("compact UPDATE renders only changed fields with old/new Dari values", () => {
  const changes = { job_title_code: { old: "teacher", new: "senior_teacher" }, phone_number: { old: "0700000000", new: "0790000000" } };
  const html = render({ changes, metadata: { changes } });
  for (const text of ["جزئیات تغییرات", "نام فیلد", "مقدار قبلی", "مقدار جدید", "عنوان وظیفه", "معلم", "سرمعلم", "شماره تماس", "0700000000", "0790000000"]) assert.ok(html.includes(text), text);
  for (const hidden of ["job_title_code", "phone_number", "senior_teacher", "[object Object]", "قبل از تغییر", "بعد از تغییر"]) assert.ok(!html.includes(hidden), hidden);
  assert.ok(html.includes('dir="rtl"'));
  assert.ok(html.includes("sm:hidden"));
});

test("compact UPDATE metadata is supported even without the additive API changes field", () => {
  const record = { ...base, metadata: { changes: { grade_post: { old: 3, new: 4 } } } };
  assert.deepEqual(helpers.getAuditChanges(record), [{ field: "grade_post", old: 3, new: 4 }]);
  assert.ok(render(record).includes("بست"));
});

test("legacy full snapshots derive only real changes without rewriting the original", () => {
  const before = { name: "احمد", phone_number: "070", notes: "UNCHANGED_NOTES", updated_at: "old", password_hash: "HIDDEN_SECRET" };
  const after = { ...before, phone_number: "079", updated_at: "new" };
  const record = { ...base, before_data: before, after_data: after };
  assert.deepEqual(helpers.getAuditChanges(record), [{ field: "phone_number", old: "070", new: "079" }]);
  const html = render(record);
  assert.ok(html.includes("شماره تماس"));
  assert.ok(!html.includes("UNCHANGED_NOTES"));
  assert.ok(!html.includes("HIDDEN_SECRET"));
  assert.equal(before.password_hash, "HIDDEN_SECRET");
});

test("earlier before/after field deltas remain readable", () => {
  const record = { ...base, changes: { name: { before: "احمد", after: "علی" } } };
  assert.deepEqual(helpers.getAuditChanges(record), [{ field: "name", old: "احمد", new: "علی" }]);
  assert.ok(render(record).includes("علی"));
});

for (const [action, heading] of [["CREATE", "اطلاعات رکورد ایجادشده"], ["DELETE", "اطلاعات رکورد حذف‌شده"]]) {
  test(`${action} renders compact identifying information and activity summary`, () => {
    const html = render({ action, metadata: { record: { name: "احمد", father_name: "کریم", job_title_code: "teacher" } } });
    for (const text of [heading, "احمد", "کریم", "معلم", "نوع عملیات", "بخش / نوع رکورد", "انجام‌دهنده", "تاریخ و زمان", "شناسه رکورد"]) assert.ok(html.includes(text), text);
    assert.ok(!html.includes("جزئیات تغییرات"));
    assert.ok(!html.includes("job_title_code"));
  });
  test(`legacy ${action} hides unnecessary snapshot fields and large text`, () => {
    const snapshot = { id: 15, name: "احمد", father_name: "کریم", notes: "LARGE_NOTES", subjects_taught: "LARGE_SUBJECTS", created_at: "old" };
    const html = render({ action, before_data: action === "DELETE" ? snapshot : null, after_data: action === "CREATE" ? snapshot : null });
    assert.ok(html.includes(heading));
    assert.ok(html.includes("احمد"));
    assert.ok(!html.includes("LARGE_NOTES"));
    assert.ok(!html.includes("LARGE_SUBJECTS"));
  });
}

test("null/empty values use readable placeholders instead of null/undefined/object text", () => {
  const html = render({ changes: { phone_number: { old: null, new: "" }, notes: { old: "value", new: null }, department_ids: { old: [1], new: [] } } });
  assert.ok(html.includes("—"));
  for (const bad of ["null", "undefined", "[object Object]"]) assert.ok(!html.includes(bad));
});

test("nested arrays/objects render labeled values and remove credentials recursively", () => {
  const html = render({ changes: { departments: { old: [], new: [{ code: "science", display_name: "ساینس", PASSWORD_HASH: "HIDDEN", nested: { DATABASE_URL: "HIDDEN", phone_number: "079" } }] } } });
  assert.ok(html.includes("ساینس"));
  assert.ok(html.includes("شماره تماس"));
  for (const bad of ["HIDDEN", "DATABASE_URL", "PASSWORD_HASH", "[object Object]", "{\"", "science"]) assert.ok(!html.includes(bad), bad);
});

test("unknown field keys are not exposed and known labels match the forms", () => {
  assert.equal(labels.getAuditFieldLabel("father_name"), "ولد");
  assert.equal(labels.getAuditFieldLabel("phone_number"), "شماره تماس");
  assert.equal(labels.getAuditFieldLabel("department_id"), "شماره دیپارتمنت");
  const html = render({ changes: { unapproved_internal_field: { old: "previous", new: "next" } } });
  assert.ok(!html.includes("unapproved_internal_field"));
  assert.ok(html.includes("اطلاعات دیگر"));
});

test("no-op historical updates have a useful empty state and no timestamp-only changes", () => {
  const html = render({ before_data: { name: "احمد", updated_at: "before" }, after_data: { name: "احمد", updated_at: "after" } });
  assert.ok(html.includes("تغییری در اطلاعات ثبت نشده است."));
  assert.ok(!html.includes("مقدار قبلی"));
});

test("numerically identical scores and reordered department IDs are not false changes", () => {
  assert.deepEqual(helpers.getAuditChanges({ ...base,
    before_data: { total_score: "2.00", department_ids: [1, 2] },
    after_data: { total_score: "2", department_ids: [2, 1] },
  }), []);
});

test("export details show filters and no workbook data or security credentials", () => {
  const html = render({ action: "EXPORT", entity_type: "employee_export", metadata: { filters: { job_title_code: "senior_teacher", SECRET_KEY: "HIDDEN", db_url: "HIDDEN", jwt: "HIDDEN", database: { username: "HIDDEN" } }, sort_order: "desc" } });
  assert.ok(html.includes("فیلترها"));
  assert.ok(html.includes("سرمعلم"));
  assert.ok(html.includes("نزولی"));
  assert.ok(!html.includes("HIDDEN"));
});

test("long values wrap and the dialog reuses viewport-bounded body scrolling", () => {
  const html = render({ changes: { notes: { old: "", new: "متن طولانی ".repeat(100) } } });
  assert.ok(html.includes("whitespace-pre-wrap"));
  assert.ok(html.includes("overflow-wrap:anywhere"));
  assert.ok(html.includes("table-fixed"));
  const dialog = readFileSync(resolve(root, "components/admin/AuditDetailDialog.tsx"), "utf8");
  const shell = readFileSync(resolve(root, "components/shared/AppDialog.tsx"), "utf8");
  assert.ok(dialog.includes("sm:max-h-[85vh]"));
  assert.ok(dialog.includes("<AppDialog"));
  assert.ok(shell.includes("min-h-0") && shell.includes("flex-1") && shell.includes("overflow-y-auto"));
  assert.ok(shell.includes("app-scrollbar"));
  assert.ok(shell.includes("shrink-0 items-center justify-end"));
});
