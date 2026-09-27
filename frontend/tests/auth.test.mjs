import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { beforeEach, test } from "node:test";
import ts from "typescript";

// Compile the real TypeScript modules in memory. No new test framework or build files.
const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../src");
const cache = new Map();
function moduleUrl(path, overrides = {}) {
  const cacheKey = path + JSON.stringify(overrides);
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  let source = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  source = source.replaceAll("import.meta.env", overrides["import.meta.env"] ?? "({})");
  source = source.replace(/from\s+(["'])([^"']+)\1/g, (match, quote, specifier) => {
    if (overrides[specifier]) return `from ${quote}${overrides[specifier]}${quote}`;
    const local = resolve(dirname(path), specifier);
    const target = specifier.startsWith(".") ? moduleUrl(existsSync(local + ".ts") ? local + ".ts" : local + ".tsx", overrides)
      : pathToFileURL(require.resolve(specifier)).href;
    return `from ${quote}${target}${quote}`;
  });
  const url = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  cache.set(cacheKey, url);
  return url;
}

const values = new Map();
globalThis.sessionStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
const session = await import(moduleUrl(resolve(root, "auth/session.ts")));
const client = await import(moduleUrl(resolve(root, "api/client.ts")));
const users = await import(moduleUrl(resolve(root, "api/users.ts")));
const auth = await import(moduleUrl(resolve(root, "api/auth.ts")));
const audit = await import(moduleUrl(resolve(root, "lib/auditLabels.ts")));
const logs = await import(moduleUrl(resolve(root, "api/auditLogs.ts")));
const labels = await import(moduleUrl(resolve(root, "lib/authLabels.ts")));
let requests;
beforeEach(() => {
  session.setAccessToken(null);
  requests = [];
  globalThis.fetch = async (url, init) => { requests.push({ url, init }); return Response.json({ ok: true }); };
});

test("protected requests need a token and do not hit the server without one", async () => {
  await assert.rejects(client.apiGet("/api/employees"), { status: 401 });
  assert.equal(requests.length, 0);
});
test("JSON and DELETE requests use the centralized bearer header", async () => {
  session.setAccessToken("test-session");
  await client.apiGet("/api/employees");
  globalThis.fetch = async (url, init) => { requests.push({ url, init }); return new Response(null, { status: 204 }); };
  await users.deleteUser(7);
  assert.equal(requests.length, 2);
  assert.ok(requests.every(({ init }) => init.headers.get("Authorization") === "Bearer test-session"));
  assert.equal(requests[1].init.method, "DELETE");
});
test("login is public and sends username/password JSON only", async () => {
  await auth.loginRequest("test-user", "test-password");
  assert.equal(requests[0].init.headers.has("Authorization"), false);
  assert.deepEqual(JSON.parse(requests[0].init.body), { username: "test-user", password: "test-password" });
});
test("a protected 401 clears memory and tab storage and notifies subscribers", async () => {
  session.setAccessToken("test-session");
  let notified = 0;
  const stop = session.subscribeSession(() => notified++);
  globalThis.fetch = async () => Response.json({ detail: "اطلاعات ورود معتبر نیست." }, { status: 401 });
  await assert.rejects(client.apiGet("/api/auth/me"), { status: 401 });
  assert.equal(session.getAccessToken(), null);
  assert.equal(values.size, 0);
  assert.equal(notified, 1);
  stop();
});
test("403 does not log out the user", async () => {
  session.setAccessToken("test-session");
  globalThis.fetch = async () => new Response(null, { status: 403 });
  await assert.rejects(client.apiGet("/api/users"), { status: 403 });
  assert.equal(session.getAccessToken(), "test-session");
});
test("a late 401 from an old login cannot invalidate a new login", async () => {
  session.setAccessToken("old-test-session");
  let finish;
  globalThis.fetch = () => new Promise((resolve) => { finish = resolve; });
  const request = client.apiGet("/api/employees");
  session.setAccessToken("new-test-session");
  finish(new Response(null, { status: 401 }));
  await assert.rejects(request, { status: 401 });
  assert.equal(session.getAccessToken(), "new-test-session");
});
test("old successful responses are discarded after logout", async () => {
  session.setAccessToken("test-session");
  let finish;
  globalThis.fetch = () => new Promise((resolve) => { finish = resolve; });
  const request = client.apiGet("/api/employees");
  session.setAccessToken(null);
  finish(Response.json({ private: "old record" }));
  await assert.rejects(request, { status: 401 });
});
test("password changes use only the dedicated new_password payload and handle 204", async () => {
  session.setAccessToken("test-session");
  globalThis.fetch = async (url, init) => { requests.push({ url, init }); return new Response(null, { status: 204 }); };
  await users.changeUserPassword(8, "new-test-password");
  assert.ok(requests[0].url.endsWith("/api/users/8/password"));
  assert.deepEqual(JSON.parse(requests[0].init.body), { new_password: "new-test-password" });
});
test("audit query uses only supported filters with pagination and newest-first sorting", async () => {
  session.setAccessToken("test-session");
  await logs.getAuditLogs({ ...logs.emptyAuditFilters, action: "EXPORT", user_id: "8", date_from: "2026-09-01" }, 2, 20);
  const query = new URL(requests[0].url).searchParams;
  assert.equal(query.get("user_id"), "8"); assert.equal(query.get("action"), "EXPORT");
  assert.equal(query.get("date_from"), "2026-09-01"); assert.equal(query.get("page"), "2");
  assert.equal(query.get("sort_order"), "desc"); assert.equal(query.has("search"), false);
});
test("role/action/entity mappings are Persian and final results use codes without recalculation", () => {
  assert.equal(labels.getRoleLabel("admin"), "مدیر سیستم");
  assert.equal(labels.getRoleLabel("user"), "کاربر");
  assert.equal(audit.getAuditActionLabel("LOGIN"), "ورود");
  assert.equal(audit.getAuditActionLabel("PASSWORD_CHANGE"), "تغییر رمز");
  assert.equal(audit.getAuditEntityLabel("teacher_observation"), "مشاهده معلم");
  assert.equal(audit.formatAuditValue("job_title_code", "senior_teacher", "employee"), "سرمعلم");
  assert.equal(audit.formatAuditValue("final_result_code", null, "teacher_observation"), "تعیین نشده");
  assert.equal(audit.formatAuditValue("final_result_code", "applied_capability", "amir_observation"), "قابلیت بکارگیری");
});
test("audit JSON removes sensitive keys recursively, including arrays", () => {
  const data = { name: "احمد", password_hash: "hidden", nested: { Authorization: "hidden", secret_key: "hidden", notes: "معلومات" }, items: [{ password: "hidden", token: "hidden", full_name: "علی" }] };
  assert.deepEqual(audit.sanitizeAuditJson(data), { name: "احمد", nested: { notes: "معلومات" }, items: [{ full_name: "علی" }] });
  assert.equal(audit.getAuditFieldLabel("deleted_at"), "تاریخ حذف");
});
test("workbook download sends authorization and preserves the server filename", async () => {
  session.setAccessToken("test-session");
  let downloaded;
  globalThis.document = { createElement: () => ({ click() { downloaded = this.download; }, remove() {} }), body: { appendChild() {} } };
  globalThis.window = { setTimeout: (fn) => fn() };
  globalThis.fetch = async (url, init) => { requests.push({ url, init }); return new Response("workbook", { headers: { "content-disposition": "attachment; filename*=UTF-8''%D9%85%DA%A9%D8%A7%D8%AA%D8%A8.xlsx" } }); };
  await client.apiDownload("/api/schools/export?school_type_code=high_school", "schools.xlsx");
  assert.equal(downloaded, "مکاتب.xlsx");
  assert.equal(requests[0].init.headers.get("Authorization"), "Bearer test-session");
});

test("user create and update send only approved public fields, never hashes", async () => {
  session.setAccessToken("test-session");
  const fields = { username: "test-user", full_name: "کاربر آزمایشی", role_code: "user", is_active: true };
  await users.createUser({ ...fields, password: "test-password" });
  await users.updateUser(9, fields);
  assert.deepEqual(JSON.parse(requests[0].init.body), { ...fields, password: "test-password" });
  assert.deepEqual(JSON.parse(requests[1].init.body), fields);
  assert.ok(!requests.some(({ init }) => init.body.includes("password_hash")));
});

test("workbook 401 clears the session just like JSON requests", async () => {
  session.setAccessToken("test-session");
  globalThis.fetch = async () => new Response(null, { status: 401 });
  await assert.rejects(client.apiDownload("/api/schools/export", "schools.xlsx"), { status: 401 });
  assert.equal(session.getAccessToken(), null);
});

test("late workbook bodies cannot trigger a download after logout", async () => {
  session.setAccessToken("test-session");
  let finish;
  globalThis.fetch = async () => ({ ok: true, headers: new Headers(), blob: () => new Promise((resolve) => { finish = resolve; }) });
  const request = client.apiDownload("/api/employees/export", "employees.xlsx");
  await new Promise((resolve) => setImmediate(resolve));
  session.setAccessToken(null);
  finish(new Blob(["old private records"]));
  await assert.rejects(request, { status: 401 });
});

test("route guard redirects guests, admits users, and restricts admin pages", async () => {
  const stub = "data:text/javascript," + encodeURIComponent("export const useAuth = () => globalThis.authFixture;");
  const guards = await import(moduleUrl(resolve(root, "routes/ProtectedRoute.tsx"), { "../auth/AuthContext": stub }));
  globalThis.authFixture = { loading: false, error: "", isAuthenticated: false, isAdmin: false };
  assert.equal(guards.ProtectedRoute().props.to, "/login");
  globalThis.authFixture = { ...globalThis.authFixture, isAuthenticated: true };
  assert.notEqual(guards.ProtectedRoute().props.to, "/login");
  assert.equal(guards.AdminRoute().props.title, "دسترسی محدود");
  globalThis.authFixture = { ...globalThis.authFixture, isAdmin: true };
  assert.equal(guards.AdminRoute().props.title, undefined);
});

test("only admins get users and audit navigation items", async () => {
  const navigation = await import(moduleUrl(resolve(root, "components/layout/navigation.ts")));
  assert.equal(navigation.getNavigationItems(false).length, 6);
  assert.ok(!navigation.getNavigationItems(false).some((item) => item.path.startsWith("/admin")));
  assert.equal(navigation.getNavigationItems(true).length, 8);
  assert.ok(navigation.getNavigationItems(true).some((item) => item.path === "/admin/audit-logs"));
});

test("departments load from the production API origin with bearer authentication and server IDs", async () => {
  const departments = await import(moduleUrl(resolve(root, "api/departments.ts"), {
    "import.meta.env": '({ VITE_API_BASE_URL: " https://information-system-989w.onrender.com/ " })',
    "../auth/session": moduleUrl(resolve(root, "auth/session.ts")),
  }));
  session.setAccessToken("test-session");
  const codes = ["education_training", "dari_language_literature", "pashto_language_literature", "arabic_language", "science", "mathematics", "english_language_literature", "social_sciences", "religious_sciences", "computer"];
  const rows = codes.map((code, index) => ({ id: 107 + index * 3, code, display_name: "دیپارتمنت" }));
  globalThis.fetch = async (url, init) => { requests.push({ url, init }); return Response.json(rows); };
  assert.deepEqual(await departments.getDepartments(), rows);
  assert.equal(requests[0].url, "https://information-system-989w.onrender.com/api/departments");
  assert.equal(requests[0].init.headers.get("Authorization"), "Bearer test-session");
});

test("departments do not invent local rows for an empty catalogue or hide an authentication failure", async () => {
  const departments = await import(moduleUrl(resolve(root, "api/departments.ts")));
  session.setAccessToken("test-session");
  globalThis.fetch = async () => Response.json([]);
  assert.deepEqual(await departments.getDepartments(), []);
  globalThis.fetch = async () => Response.json({ detail: "اطلاعات ورود معتبر نیست." }, { status: 401 });
  await assert.rejects(departments.getDepartments(), { status: 401 });
  assert.equal(session.getAccessToken(), null);
});
