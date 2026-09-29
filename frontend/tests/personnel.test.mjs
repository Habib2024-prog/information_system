import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { beforeEach, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

// Follow the existing tests: compile real TS modules in memory without a new framework.
const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../src");
const cache = new Map();
function moduleUrl(path, overrides = {}) {
  const cacheKey = path + JSON.stringify(overrides);
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  let source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText.replaceAll("import.meta.env", "({})");
  source = source.replace(/from\s+(["'])([^"']+)\1/g, (_match, quote, specifier) => {
    if (overrides[specifier]) return `from ${quote}${overrides[specifier]}${quote}`;
    const local = resolve(dirname(path), specifier);
    const target = specifier.startsWith(".")
      ? moduleUrl(existsSync(local + ".ts") ? local + ".ts" : local + ".tsx", overrides)
      : pathToFileURL(require.resolve(specifier)).href;
    return `from ${quote}${target}${quote}`;
  });
  const url = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  cache.set(cacheKey, url);
  return url;
}

const storage = new Map();
globalThis.sessionStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
const session = await import(moduleUrl(resolve(root, "auth/session.ts")));
const api = await import(moduleUrl(resolve(root, "api/employees.ts")));
const labels = await import(moduleUrl(resolve(root, "lib/employeeLabels.ts")));
const statuses = {
  in_field: "مطابق رشته",
  out_of_field: "مخالف رشته",
  non_professional: "غیر مسلکی",
};
let requests;
beforeEach(() => {
  session.setAccessToken("personnel-test-session");
  requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url, init });
    return Response.json({ ok: true });
  };
});

// Expose portal content for server rendering; exercise the real forms/mappings.
const reactUrl = pathToFileURL(require.resolve("react")).href;
const uiStubs = `data:text/javascript;base64,${Buffer.from(`
  import { createElement as h } from ${JSON.stringify(reactUrl)};
  export const AppDialog = ({ open, title, children, footer }) => open ? h("section", null, h("h1", null, title), children, footer) : null;
  export const SearchableSelect = ({ value, options, placeholder }) => h("select", { value, onChange: () => {}, "aria-label": placeholder }, options.map(option => h("option", { key: option.value, value: option.value }, option.label)));
  export const MultiSelect = () => null;
  export const FilterToolbar = ({ children, advanced }) => h("div", null, children, advanced);
  export const ConfirmDialog = ({ trigger }) => trigger;
`).toString("base64")}`;
const overrides = {
  "../shared/AppDialog": uiStubs,
  "../shared/SearchableSelect": uiStubs,
  "../shared/FilterToolbar": uiStubs,
  "../shared/ConfirmDialog": uiStubs,
};
const { EmployeeFormDialog } = await import(moduleUrl(resolve(root, "components/employees/EmployeeFormDialog.tsx"), overrides));
const { EmployeeDetailsDialog } = await import(moduleUrl(resolve(root, "components/employees/EmployeeDetailsDialog.tsx"), overrides));
const { EmployeeFilters } = await import(moduleUrl(resolve(root, "components/employees/EmployeeFilters.tsx"), overrides));
const { EmployeeTable } = await import(moduleUrl(resolve(root, "components/employees/EmployeeTable.tsx"), overrides));
const noop = () => {};
const payload = {
  name: "احمد", father_name: "کریم", grandfather_name: "رحیم",
  phone_number: "0700000000", school_workplace: "مکتب مرکزی", city_district: "کابل",
  field_of_study: "ریاضی", education_level: "لیسانس", subjects_taught: "ریاضی",
  job_title_code: "teacher", teaching_experience: 2, grade_post: 3, step: 1,
  successful_evaluation: "بلی", field_match_code: "non_professional", notes: "ملاحظات", department_ids: [],
};
const employee = { ...payload, id: 7, departments: [], observation_count: 0 };

test("centralized personnel labels expose exactly the three approved statuses", () => {
  assert.deepEqual(labels.fieldMatchLabels, statuses);
  for (const [code, label] of Object.entries(statuses)) assert.equal(labels.getFieldMatchLabel(code), label);
  assert.equal(labels.addPersonnelLabel, "افزودن آمر/مدیر/سرمعلم/معلم");
  const page = readFileSync(resolve(root, "pages/EmployeesPage.tsx"), "utf8");
  assert.ok(page.includes("{addPersonnelLabel}"));
  assert.ok(!page.includes("افزودن کارمند"));
});

test("create form offers all three statuses and uses the new add-personnel title", () => {
  const html = renderToStaticMarkup(createElement(EmployeeFormDialog, {
    open: true, onOpenChange: noop, departments: [], onSaved: noop,
  }));
  assert.ok(html.includes(labels.addPersonnelLabel));
  for (const [code, label] of Object.entries(statuses)) {
    assert.ok(html.includes(`<option value="${code}">${label}</option>`));
  }
});

test("employee form reuses the shared strict phone-number control", () => {
  const source = readFileSync(resolve(root, "components/employees/EmployeeFormDialog.tsx"), "utf8");
  assert.match(source, /from "\.\.\/\.\.\/lib\/phone"/);
  assert.match(source, /getPhoneNumberError\(values\.phone_number\)/);
  assert.match(source, /normalizePhoneDigits\(event\.target\.value\)/);
  assert.match(source, /type="tel"/);
  assert.match(source, /maxLength=\{10\}/);
  const html = renderToStaticMarkup(createElement(EmployeeFormDialog, {
    open: true, onOpenChange: noop, departments: [], onSaved: noop,
  }));
  assert.ok(html.includes('type="tel"'));
});

for (const [code, label] of Object.entries(statuses)) {
  test(`edit, details, and desktop/mobile rows display ${code} consistently`, () => {
    const record = { ...employee, field_match_code: code };
    const form = renderToStaticMarkup(createElement(EmployeeFormDialog, {
      open: true, onOpenChange: noop, departments: [], onSaved: noop, employee: record,
    }));
    assert.ok(form.includes("ویرایش کارمند"));
    assert.ok(form.includes(`<option value="${code}" selected="">${label}</option>`));
    const details = renderToStaticMarkup(createElement(EmployeeDetailsDialog, { employee: record, onOpenChange: noop }));
    assert.ok(details.includes(label));
    const table = renderToStaticMarkup(createElement(EmployeeTable, {
      employees: [record], sortBy: "id", sortOrder: "asc", onSort: noop, onView: noop, onEdit: noop, onDelete: noop,
    }));
    assert.ok(table.split(label).length >= 3, "status is visible in both desktop table and mobile card");
    assert.ok(!table.includes(code));
  });
}

test("employee status filter offers all statuses and preserves its selection", () => {
  const html = renderToStaticMarkup(createElement(EmployeeFilters, {
    filters: { ...api.emptyEmployeeFilters, field_match_code: "non_professional" },
    departments: [], onChange: noop, onClear: noop,
  }));
  for (const label of Object.values(statuses)) assert.ok(html.includes(label));
  assert.ok(html.includes('<option value="non_professional" selected="">غیر مسلکی</option>'));
});

test("create and update submit stable codes and preserve existing out_of_field values", async () => {
  await api.createEmployee(payload);
  await api.updateEmployee(employee.id, { ...payload, field_match_code: "out_of_field" });
  assert.equal(JSON.parse(requests[0].init.body).field_match_code, "non_professional");
  assert.equal(JSON.parse(requests[1].init.body).field_match_code, "out_of_field");
  assert.equal(requests[0].init.method, "POST");
  assert.equal(requests[1].init.method, "PUT");
  assert.ok(requests.every(({ init }) => init.headers.get("Authorization") === "Bearer personnel-test-session"));
});

test("list and Excel export use the selected status code and existing download helper", async () => {
  await api.getEmployees({ page: 1, page_size: 20, sort_by: "id", sort_order: "asc", field_match_code: "non_professional" });
  assert.equal(new URL(requests[0].url).searchParams.get("field_match_code"), "non_professional");
  globalThis.document = {
    createElement: () => ({ click: noop, remove: noop }), body: { appendChild: noop },
  };
  globalThis.window = { setTimeout: (callback) => callback() };
  const filename = await api.exportEmployees({ field_match_code: "non_professional" });
  assert.equal(filename, "employees.xlsx");
  assert.equal(new URL(requests[1].url).pathname, "/api/employees/export");
  assert.equal(new URL(requests[1].url).searchParams.get("field_match_code"), "non_professional");
  assert.equal(new URL(requests[1].url).searchParams.has("page_size"), false);
});
