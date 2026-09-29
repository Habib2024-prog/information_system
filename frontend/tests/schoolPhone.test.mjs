import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { beforeEach, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../src");
const dataUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const reactUrl = pathToFileURL(require.resolve("react")).href;
const hooks = dataUrl(`
  export * from ${JSON.stringify(reactUrl)};
  export const useState = value => globalThis.schoolHarness.state(value);
  export const useEffect = (effect, deps) => globalThis.schoolHarness.effect(effect, deps);
`);
const ui = dataUrl(`
  import { createElement as h } from ${JSON.stringify(reactUrl)};
  export const AppDialog = ({open, title, children, footer}) => open ? h("section", null, h("h1", null, title), children, footer) : null;
  export const SearchableSelect = ({value, options}) => h("select", {value, onChange: () => {}}, options.map(option => h("option", {key: option.value, value: option.value}, option.label)));
`);
const api = dataUrl(`
  export const createSchool = async payload => { globalThis.schoolRequests.push({method: "POST", payload}); return payload; };
  export const updateSchool = async (id, payload) => { globalThis.schoolRequests.push({method: "PUT", id, payload}); return payload; };
`);
const cache = new Map();
function moduleUrl(path, interactive = false) {
  const key = `${interactive}:${path}`;
  if (cache.has(key)) return cache.get(key);
  let compiled = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX},
  }).outputText;
  compiled = compiled.replace(/from\s+(["'])([^"']+)\1/g, (_match, quote, specifier) => {
    let url;
    if (specifier === "react" && interactive) url = hooks;
    else if (specifier === "../shared/AppDialog" || specifier === "../shared/SearchableSelect") url = ui;
    else if (specifier === "../../api/schools") url = api;
    else if (specifier.startsWith(".")) {
      const local = resolve(dirname(path), specifier);
      url = moduleUrl(existsSync(local + ".ts") ? local + ".ts" : local + ".tsx", interactive);
    } else url = pathToFileURL(require.resolve(specifier)).href;
    return `from ${quote}${url}${quote}`;
  });
  const url = dataUrl(compiled);
  cache.set(key, url);
  return url;
}

class Harness {
  slots = [];
  cursor = 0;
  pending = [];
  state(initial) {
    const index = this.cursor++;
    this.slots[index] ??= {value: typeof initial === "function" ? initial() : initial};
    const slot = this.slots[index];
    return [slot.value, value => { slot.value = typeof value === "function" ? value(slot.value) : value; }];
  }
  effect(effect, deps) {
    const index = this.cursor++;
    const previous = this.slots[index];
    if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
      this.slots[index] = {deps};
      this.pending.push(effect);
    }
  }
  render(props) {
    globalThis.schoolHarness = this;
    this.cursor = 0;
    const tree = SchoolFormDialog(props);
    for (const effect of this.pending.splice(0)) effect();
    return tree;
  }
}
function find(node, predicate) {
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  if (!node || typeof node !== "object") return undefined;
  return predicate(node) ? node : find(node.props?.children, predicate);
}
const field = (tree, label) => find(tree, node => node.type?.name === "Field" && node.props.label === label);
const input = (tree) => field(tree, "شماره تماس مسئول مکتب").props.children;
const {getSchoolPhoneError, normalizeSchoolPhone} = await import(moduleUrl(resolve(root, "lib/schoolPhone.ts")));
const {SchoolFormDialog} = await import(moduleUrl(resolve(root, "components/schools/SchoolFormDialog.tsx"), true));
const {SchoolDetailsDialog} = await import(moduleUrl(resolve(root, "components/schools/SchoolDetailsDialog.tsx")));
const {schoolServiceCountLabels} = await import(moduleUrl(resolve(root, "lib/schoolLabels.ts")));
const school = {
  id: 7, school_name: "لیسه استقلال", school_head_phone: "(070) 123-4567",
  school_code: "SCH001", school_type_code: "high_school", gender_type_code: "mixed",
  school_type_display_name: "لیسه", gender_type_display_name: "مختلط", school_formation: "رسمی",
  senior_teacher_count: 1, male_teacher_count: 1, female_teacher_count: 1,
  incoming_service_teacher_count: 1, outgoing_service_teacher_count: 1,
  volunteer_teacher_count: 0, active_class_section_count: 0,
  school_needs: null, school_equipment: null, grade_statistics: [],
};
beforeEach(() => { globalThis.schoolRequests = []; });

for (const phone of ["0701234567", "0791234567", " 0701234567 ", "+93701234567", "+93 70 123 4567", "0093 70 123 4567", "(070) 123-4567", "+93 (0) 701-234-567", "070.123.4567", "۰۷۰۱۲۳۴۵۶۷", "٠٧٠١٢٣٤٥٦٧"]) {
  test(`school phone accepts and preserves ${phone}`, () => {
    assert.equal(getSchoolPhoneError(phone), undefined);
    assert.equal(normalizeSchoolPhone(phone), phone.trim());
  });
}
for (const phone of [null, "", "   "]) {
  test(`optional school phone accepts ${JSON.stringify(phone)}`, () => {
    assert.equal(getSchoolPhoneError(phone), undefined);
    assert.equal(normalizeSchoolPhone(phone), null);
  });
}
for (const phone of ["abc", "070abc4567", "شماره", "123", "1234567890123456", "++93701234567", "070--1234567", "070...1234567", "070/1234567", "(0701234567", "0701234567)", "070()1234567", "0701234567-", "070\n1234567"]) {
  test(`school phone rejects ${JSON.stringify(phone)} with Dari feedback`, () => {
    assert.equal(getSchoolPhoneError(phone), "شماره تماس معتبر نیست.");
  });
}

test("create/edit form and details share the new service count terminology", () => {
  assert.deepEqual(schoolServiceCountLabels, {incoming_service_teacher_count: "خدمتی ورودی", outgoing_service_teacher_count: "خدمتی خروجی"});
  for (const record of [undefined, school]) {
    const harness = new Harness();
    const tree = harness.render({open: true, school: record, onOpenChange: () => {}, onSaved: () => {}});
    const html = renderToStaticMarkup(tree);
    assert.ok(html.includes("خدمتی ورودی") && html.includes("خدمتی خروجی"));
    assert.ok(!html.includes("معلم خدماتی"));
    const control = input(tree);
    assert.equal(control.props.type, "tel");
    assert.equal(control.props.inputMode, "tel");
    assert.equal(control.props.autoComplete, "tel");
    assert.equal(control.props.dir, "ltr");
    assert.equal(control.props.value, record?.school_head_phone ?? "");
  }
  const details = renderToStaticMarkup(createElement(SchoolDetailsDialog, {school, onOpenChange: () => {}}));
  assert.ok(details.includes("خدمتی ورودی") && details.includes("خدمتی خروجی"));
  assert.ok(details.includes(school.school_head_phone));
  assert.ok(!details.includes("معلم خدماتی"));
});

test("school edit validates phone without clearing other values or submitting invalid text", async () => {
  const harness = new Harness();
  const saved = [], closed = [];
  const props = {open: true, school, onOpenChange: value => closed.push(value), onSaved: value => saved.push(value)};
  let tree = harness.render(props);
  input(tree).props.onChange({target: {value: "invalid letters"}});
  tree = harness.render(props);
  input(tree).props.onBlur();
  tree = harness.render(props);
  assert.equal(field(tree, "شماره تماس مسئول مکتب").props.error, "شماره تماس معتبر نیست.");
  assert.equal(input(tree).props["aria-invalid"], true);
  await find(tree, node => node.type === "form").props.onSubmit({preventDefault() {}});
  assert.equal(globalThis.schoolRequests.length, 0);
  assert.equal(field(tree, "نام مکتب").props.children.props.value, school.school_name);
  input(tree).props.onChange({target: {value: " 0791234567 "}});
  tree = harness.render(props);
  input(tree).props.onBlur();
  tree = harness.render(props);
  assert.equal(input(tree).props.value, "0791234567");
  await find(tree, node => node.type === "form").props.onSubmit({preventDefault() {}});
  assert.deepEqual(globalThis.schoolRequests.map(({method, id, payload}) => [method, id, payload.school_head_phone]), [["PUT", 7, "0791234567"]]);
  assert.equal(saved.length, 1);
  assert.deepEqual(closed, [false]);
});

test("school create submits optional phone as null and local phone as a string", async () => {
  for (const phone of ["", "0701234567"]) {
    const harness = new Harness();
    const props = {open: true, onOpenChange: () => {}, onSaved: () => {}};
    let tree = harness.render(props);
    for (const [label, value] of [["نام مکتب", "لیسه"], ["کد مکتب", "SCH001"], ["تشکیل مکتب", "رسمی"], ["نوع مکتب", "high_school"], ["نوع جنسیت", "mixed"]]) {
      const control = field(tree, label).props.children;
      control.props.onChange(control.type === "input" ? {target: {value}} : value);
      tree = harness.render(props);
    }
    input(tree).props.onChange({target: {value: phone}});
    tree = harness.render(props);
    await find(tree, node => node.type === "form").props.onSubmit({preventDefault() {}});
    assert.equal(globalThis.schoolRequests.at(-1).method, "POST");
    assert.equal(globalThis.schoolRequests.at(-1).payload.school_head_phone, phone || null);
  }
});
