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
const reactUrl = pathToFileURL(require.resolve("react")).href;
const dataUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
// Exercise the actual hook and page event handlers without installing another
// test framework. This deterministic hook scheduler runs effects/cleanup and
// explicitly rerenders; it is not a substitute for browser layout testing.
const hooksUrl = dataUrl(`
  export * from ${JSON.stringify(reactUrl)};
  export const useState = value => globalThis.paginationHarness.state(value);
  export const useEffect = (effect, deps) => globalThis.paginationHarness.effect(effect, deps);
  export const useCallback = (value, deps) => globalThis.paginationHarness.memo(() => value, deps);
  export const useMemo = (factory, deps) => globalThis.paginationHarness.memo(factory, deps);
`);
const contextsUrl = dataUrl(`
  export const useToast = () => globalThis.paginationContexts.toast;
  export const useAuth = () => globalThis.paginationContexts.auth;
`);
const cache = new Map();
function moduleUrl(path, mode = "normal") {
  const key = `${mode}:${path}`;
  if (cache.has(key)) return cache.get(key);
  const source = readFileSync(path, "utf8");
  if (mode === "pages" && path.includes(`${resolve(root, "components")}`) && !path.endsWith("PaginationControls.tsx") && !path.endsWith("DateRangeFilter.tsx")) {
    if (path.endsWith("toast.tsx")) return contextsUrl;
    const names = [...source.matchAll(/export (?:function|const) (\w+)/g)].map((match) => match[1]);
    const url = dataUrl(names.map((name) => `export const ${name} = () => null;`).join("\n"));
    cache.set(key, url);
    return url;
  }
  let compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText.replaceAll("import.meta.env", "({})");
  compiled = compiled.replace(/from\s+(["'])([^"']+)\1/g, (_match, quote, specifier) => {
    let url;
    if (specifier === "react" && mode !== "normal") url = hooksUrl;
    else if (specifier.startsWith(".")) {
      const base = resolve(dirname(path), specifier);
      const local = existsSync(`${base}.ts`) ? `${base}.ts` : `${base}.tsx`;
      url = mode === "pages" && local.endsWith("AuthContext.tsx") ? contextsUrl : moduleUrl(local, mode);
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
    if (!this.slots[index]) {
      const slot = { value: typeof initial === "function" ? initial() : initial };
      slot.set = (next) => { slot.value = typeof next === "function" ? next(slot.value) : next; };
      this.slots[index] = slot;
    }
    return [this.slots[index].value, this.slots[index].set];
  }
  memo(factory, deps) {
    const index = this.cursor++;
    const previous = this.slots[index];
    if (!previous || !sameDeps(previous.deps, deps)) this.slots[index] = { value: factory(), deps };
    return this.slots[index].value;
  }
  effect(effect, deps) {
    const index = this.cursor++;
    const previous = this.slots[index];
    if (!previous || !sameDeps(previous.deps, deps)) {
      previous?.cleanup?.();
      const slot = { deps };
      this.slots[index] = slot;
      this.pending.push(() => { slot.cleanup = effect(); });
    }
  }
  render(fn, props) {
    globalThis.paginationHarness = this;
    this.cursor = 0;
    const result = fn(props);
    for (const effect of this.pending.splice(0)) effect();
    return result;
  }
  unmount() { for (const slot of this.slots) slot.cleanup?.(); }
}
const sameDeps = (a, b) => a?.length === b.length && a.every((value, index) => Object.is(value, b[index]));
const tick = () => new Promise((resolveTick) => setImmediate(resolveTick));
const walk = (node, predicate) => {
  if (!node) return null;
  if (Array.isArray(node)) return node.map((child) => walk(child, predicate)).find(Boolean) ?? null;
  if (typeof node !== "object") return null;
  if (predicate(node)) return node;
  return walk(node.props?.children, predicate);
};
const byName = (tree, name) => walk(tree, (node) => node.type?.name === name);
const buttonByText = (tree, text) => walk(tree, (node) => node.props?.children === text);

const { DEFAULT_PAGE_SIZE, getTotalPages, getValidPage } = await import(moduleUrl(resolve(root, "lib/pagination.ts")));
const { PaginationControls } = await import(moduleUrl(resolve(root, "components/shared/PaginationControls.tsx")));
const { DataTableShell, DataTableCards } = await import(moduleUrl(resolve(root, "components/shared/DataTableShell.tsx")));
const { usePaginatedList } = await import(moduleUrl(resolve(root, "hooks/usePaginatedList.ts"), "hooks"));

for (const total of [0, 1, 9, 10, 11, 23]) {
  test(`pagination metadata and boundaries for ${total} records`, () => {
    assert.equal(DEFAULT_PAGE_SIZE, 10);
    const totalPages = getTotalPages(total, 10);
    assert.equal(totalPages, total <= 10 ? 1 : total === 11 ? 2 : 3);
    const changes = [];
    const props = { page: 1, total, totalPages, onPageChange: (page) => changes.push(page) };
    let tree = PaginationControls(props);
    const previous = buttonByText(tree, "صفحه قبلی");
    const next = buttonByText(tree, "صفحه بعدی");
    assert.equal(previous.props.disabled, true);
    assert.equal(next.props.disabled, total <= 10);
    previous.props.onClick();
    next.props.onClick();
    assert.deepEqual(changes, total > 10 ? [2] : []);
    tree = PaginationControls({ ...props, page: totalPages });
    assert.equal(buttonByText(tree, "صفحه بعدی").props.disabled, true);
    assert.equal(buttonByText(tree, "صفحه قبلی").props.disabled, totalPages === 1);
    const html = renderToStaticMarkup(createElement(PaginationControls, props));
    assert.ok(html.includes("مجموع:") && html.includes(total.toLocaleString("fa-AF")));
  });
}

test("middle-page navigation and loading controls", () => {
  const changes = [];
  const props = { page: 2, total: 23, totalPages: 3, onPageChange: (page) => changes.push(page) };
  const tree = PaginationControls(props);
  buttonByText(tree, "صفحه قبلی").props.onClick();
  buttonByText(tree, "صفحه بعدی").props.onClick();
  assert.deepEqual(changes, [1, 3]);
  const busy = PaginationControls({ ...props, loading: true });
  assert.equal(buttonByText(busy, "صفحه قبلی").props.disabled, true);
  assert.equal(buttonByText(busy, "صفحه بعدی").props.disabled, true);
});

test("desktop and mobile have one bounded accessible scroll area with native page scroll chaining", () => {
  const table = renderToStaticMarkup(createElement(DataTableShell, { bounded: true }, createElement("table")));
  assert.ok(table.includes("max-h-[min(60dvh,36rem)]") && table.includes("overflow-x-auto") && table.includes("overflow-y-auto"));
  assert.ok(!table.includes("overscroll-contain"), "table edges must continue scrolling the application");
  assert.ok(table.includes("[&amp;_thead_th]:sticky") && table.includes('tabindex="0"'));
  const cards = renderToStaticMarkup(createElement(DataTableCards, null, createElement("article")));
  assert.ok(cards.includes("max-h-[min(60dvh,36rem)]") && cards.includes('role="region"'));
  assert.ok(cards.includes("overflow-y-auto") && !cards.includes("overscroll-contain"));
  const unbounded = renderToStaticMarkup(createElement(DataTableShell, null, createElement("table")));
  assert.ok(!unbounded.includes("max-h-"), "unrelated dialog tables remain unchanged");
});

test("responsive table layout uses content-container queries and a centralized scrollbar", () => {
  const html = renderToStaticMarkup(createElement(DataTableShell, { bounded: true, responsive: true }, createElement("table")));
  for (const className of ["app-data-table", "app-scrollbar", "w-full", "min-w-0", "max-w-full"]) assert.ok(html.includes(className));
  const cards = renderToStaticMarkup(createElement(DataTableCards, null, createElement("article")));
  assert.ok(cards.includes("app-data-cards") && cards.includes("app-scrollbar"));
  const css = readFileSync(resolve(root, "styles/index.css"), "utf8");
  assert.ok(css.includes("@container app-content (min-width: 48rem)"));
  assert.ok(css.includes("table-layout: fixed") && css.includes("overflow-wrap: anywhere"));
  assert.ok(css.includes("scrollbar-width: thin") && css.includes("scrollbar-color:"));
  assert.ok(css.includes(".app-scrollbar::-webkit-scrollbar-thumb") && css.includes("border-radius: 999px"));
  const shell = readFileSync(resolve(root, "components/layout/AppShell.tsx"), "utf8");
  assert.ok(shell.includes("[container-name:app-content]") && shell.includes("[container-type:inline-size]"));
});

test("deleted final row clamps directly to last valid page, including an empty dataset", async () => {
  for (const total of [20, 10, 0]) {
    const h = new Harness();
    const pages = [];
    const options = { page: 3, pageSize: 10, onPageChange: (page) => pages.push(page), errorMessage: "خطا",
      fetchPage: async () => ({ items: [], total, page: 3, page_size: 10 }) };
    h.render(usePaginatedList, options);
    await tick();
    assert.deepEqual(pages, [getValidPage(3, total, 10)]);
    const validPage = pages[0];
    const response = { items: total ? [{ id: 10 }] : [], total, page: validPage, page_size: 10 };
    const validOptions = { ...options, page: validPage, fetchPage: async () => response };
    h.render(usePaginatedList, validOptions);
    await tick();
    const state = h.render(usePaginatedList, validOptions);
    assert.equal(state.loading, false);
    assert.deepEqual(state.data, response);
    h.unmount();
  }
});

test("slower old filter responses cannot overwrite the latest records", async () => {
  const h = new Harness();
  let finishOld;
  const options = { page: 1, pageSize: 10, onPageChange: () => {}, errorMessage: "خطا",
    fetchPage: () => new Promise((resolveOld) => { finishOld = resolveOld; }) };
  assert.equal(h.render(usePaginatedList, options).loading, true);
  const latest = { items: [{ id: 2 }], total: 1, page: 1, page_size: 10 };
  const next = { ...options, fetchPage: async () => latest };
  h.render(usePaginatedList, next);
  await tick();
  finishOld({ items: [{ id: 1 }], total: 1, page: 1, page_size: 10 });
  await tick();
  assert.deepEqual(h.render(usePaginatedList, next).data, latest);
  h.unmount();
});

test("loading/error/retry and disabled query behavior", async () => {
  const h = new Harness();
  let calls = 0;
  const response = { items: [], total: 0, page: 1, page_size: 10 };
  const options = { page: 1, pageSize: 10, onPageChange: () => {}, errorMessage: "دریافت ممکن نشد",
    fetchPage: async () => { if (++calls === 1) throw new Error("network"); return response; } };
  h.render(usePaginatedList, options);
  await tick();
  let state = h.render(usePaginatedList, options);
  assert.equal(state.loading, false);
  assert.equal(state.error, "دریافت ممکن نشد");
  state.retry();
  h.render(usePaginatedList, options);
  await tick();
  state = h.render(usePaginatedList, options);
  assert.equal(state.error, "");
  assert.deepEqual(state.data, response);
  const disabled = { ...options, enabled: false };
  h.render(usePaginatedList, disabled);
  assert.equal(h.render(usePaginatedList, disabled).data, null);
  assert.equal(calls, 2);
  h.unmount();
});

const storage = new Map();
globalThis.sessionStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
const session = await import(moduleUrl(resolve(root, "auth/session.ts"), "pages"));
let requests;
beforeEach(() => {
  session.setAccessToken("pagination-test-session");
  requests = [];
  globalThis.paginationContexts = {
    toast: { showToast: () => {} }, auth: { user: { id: 1, role_code: "admin" }, refreshUser: async () => {} },
  };
  globalThis.fetch = async (url, init) => {
    requests.push({ url, init });
    const query = new URL(url);
    if (query.pathname === "/api/departments") return Response.json([{ id: 6, code: "science", display_name: "ساینس" }]);
    const page = Number(query.searchParams.get("page") ?? 1);
    const pageSize = Number(query.searchParams.get("page_size") ?? 10);
    const total = 23;
    const items = Array.from({ length: Math.min(pageSize, Math.max(0, total - (page - 1) * pageSize)) }, (_value, index) => ({
      id: (page - 1) * pageSize + index + 1, name: "احمد", full_name: "احمد", username: "ahmad", role_code: "user", is_active: true,
      user: { full_name: "احمد", username: "ahmad" }, created_at: "2026-09-28T10:00:00Z", entity_type: "employee", action: "CREATE",
    }));
    return Response.json({ items, total, page, page_size: pageSize });
  };
});

for (const [name, path, endpoint] of [
  ["EmployeesPage", "pages/EmployeesPage.tsx", "/api/employees"],
  ["DepartmentsPage", "pages/DepartmentsPage.tsx", "/api/employees"],
  ["ScientificMembersPage", "pages/ScientificMembersPage.tsx", "/api/scientific-members"],
  ["SchoolsPage", "pages/SchoolsPage.tsx", "/api/schools"],
  ["UsersPage", "pages/admin/UsersPage.tsx", "/api/users"],
  ["AuditLogsPage", "pages/admin/AuditLogsPage.tsx", "/api/audit-logs"],
]) {
  const { [name]: Page } = await import(moduleUrl(resolve(root, path), "pages"));
  test(`${name}: real page handlers request next/previous pages of 10 and reset filters`, async () => {
    const h = new Harness();
    let tree = h.render(Page);
    await tick();
    tree = h.render(Page);
    if (name === "DepartmentsPage") {
      byName(tree, "DepartmentSelector").props.onSelect({ id: 6, code: "science", display_name: "ساینس" });
      h.render(Page);
      await tick();
      tree = h.render(Page);
    }
    let pagination = byName(tree, "PaginationControls");
    assert.ok(pagination, "successful list exposes pagination outside its table");
    assert.equal(pagination.props.page, 1);
    assert.equal(pagination.props.totalPages, 3);
    assert.equal(pagination.props.total, 23);
    pagination.props.onPageChange(2);
    h.render(Page);
    await tick();
    tree = h.render(Page);
    pagination = byName(tree, "PaginationControls");
    assert.equal(pagination.props.page, 2);
    let listRequests = requests.filter(({ url }) => new URL(url).pathname === endpoint);
    assert.equal(new URL(listRequests.at(-1).url).searchParams.get("page"), "2");
    assert.equal(new URL(listRequests.at(-1).url).searchParams.get("page_size"), "10");
    const filter = byName(tree, "EmployeeFilters") ?? byName(tree, "Filters") ?? byName(tree, "SchoolFiltersBar") ?? byName(tree, "FilterToolbar");
    if (name === "AuditLogsPage") byName(tree, "SearchableSelect").props.onChange("UPDATE");
    else if (name === "EmployeesPage" || name === "DepartmentsPage") filter.props.onChange({ search: "احمد", job_title_code: "teacher", department_id: "", field_match_code: "", education_level: "", school_workplace: "", city_district: "" });
    else if (name !== "UsersPage") filter.props.onChange("search", "احمد");
    else pagination.props.onPageChange(1);
    h.render(Page);
    await tick();
    tree = h.render(Page);
    assert.equal(byName(tree, "PaginationControls").props.page, 1);
    listRequests = requests.filter(({ url }) => new URL(url).pathname === endpoint);
    assert.equal(new URL(listRequests.at(-1).url).searchParams.get("page"), "1");
    if (name === "DepartmentsPage") assert.equal(new URL(listRequests.at(-1).url).searchParams.get("department_id"), "6");
    assert.ok(listRequests.every(({ init }) => init.headers.get("Authorization") === "Bearer pagination-test-session"));
    h.unmount();
  });
  test(`${name}: page loading, empty data, API errors and retry remain usable`, async () => {
    const h = new Harness();
    let calls = 0;
    globalThis.fetch = async (url, init) => {
      requests.push({ url, init });
      if (new URL(url).pathname === "/api/departments") return Response.json([{ id: 6, code: "science", display_name: "ساینس" }]);
      if (++calls === 1) return Response.json({ detail: "دریافت اطلاعات ممکن نشد." }, { status: 500 });
      return Response.json({ items: [], total: 0, page: 1, page_size: 10 });
    };
    let tree = h.render(Page);
    if (name === "DepartmentsPage") {
      await tick();
      tree = h.render(Page);
      byName(tree, "DepartmentSelector").props.onSelect({ id: 6, code: "science", display_name: "ساینس" });
      h.render(Page);
    } else assert.ok(byName(tree, "LoadingState"));
    await tick();
    tree = h.render(Page);
    const error = byName(tree, "ErrorState") ?? byName(tree, "RetryPanel");
    assert.ok(error?.props.onRetry);
    error.props.onRetry();
    h.render(Page);
    await tick();
    tree = h.render(Page);
    assert.ok(byName(tree, "EmptyState"));
    const pagination = byName(tree, "PaginationControls");
    assert.equal(pagination.props.total, 0);
    assert.equal(pagination.props.page, 1);
    assert.equal(pagination.props.totalPages, 1);
    h.unmount();
  });
}

test("all list API helpers default to 10 while exports omit pagination", async () => {
  const employees = await import(moduleUrl(resolve(root, "api/employees.ts"), "pages"));
  const members = await import(moduleUrl(resolve(root, "api/scientificMembers.ts"), "pages"));
  const schools = await import(moduleUrl(resolve(root, "api/schools.ts"), "pages"));
  const users = await import(moduleUrl(resolve(root, "api/users.ts"), "pages"));
  const audit = await import(moduleUrl(resolve(root, "api/auditLogs.ts"), "pages"));
  const departments = await import(moduleUrl(resolve(root, "api/departments.ts"), "pages"));
  await employees.getEmployees(); await members.getScientificMembers(); await schools.getSchools(); await users.getUsers(); await audit.getAuditLogs(audit.emptyAuditFilters);
  assert.ok(requests.every(({ url }) => new URL(url).searchParams.get("page_size") === "10"));
  requests = [];
  globalThis.document = { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } };
  globalThis.window = { setTimeout: (callback) => callback() };
  await employees.exportEmployees({ search: "احمد" });
  await members.exportScientificMembers({ search: "احمد" });
  await schools.exportSchools({ search: "احمد" });
  await departments.exportDepartmentEmployees(6, { search: "احمد" });
  for (const { url } of requests) {
    const query = new URL(url).searchParams;
    assert.equal(query.get("search"), "احمد");
    assert.ok(!query.has("page") && !query.has("page_size"));
  }
});
