// Optional real-browser smoke check: local Vite on 5179 and an isolated Chrome
// debugging session on 9339. API fixtures are test-only; no live data is changed.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const base = "http://127.0.0.1:5179";
const target = await (await fetch("http://127.0.0.1:9339/json/new?about:blank", { method: "PUT" })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const pending = new Map();
const errors = [];
const requests = [];
let role = "admin";
let expire = false;
const timestamp = "2026-09-27T08:00:00Z";
const admin = { id: 1, username: "test-admin", full_name: "مدیر آزمایشی", role_code: "admin", is_active: true, created_at: timestamp, updated_at: timestamp };
let users = [admin];
const record = { id: 1, user: { id: 1, username: admin.username, full_name: admin.full_name }, action: "CREATE_OBSERVATION", entity_type: "teacher_observation", entity_id: 2, description: "ثبت مشاهدهٔ معلم", before_data: null, after_data: { job_title_code: "senior_teacher", final_result_code: null, notes: "یادداشت آزمایشی", password_hash: "TEST_SECRET_MUST_NOT_RENDER", nested: { token: "TEST_TOKEN_MUST_NOT_RENDER" } }, metadata: { filters: { employee_id: 2 } }, ip_address: "127.0.0.1", created_at: timestamp };
function send(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
}
socket.onmessage = async ({ data }) => {
  const event = JSON.parse(data);
  if (event.id) { const waiter = pending.get(event.id); pending.delete(event.id); event.error ? waiter?.reject(new Error(event.error.message)) : waiter?.resolve(event.result); return; }
  if (event.method === "Runtime.exceptionThrown") errors.push(event.params.exceptionDetails.text);
  if (event.method !== "Fetch.requestPaused") return;
  const { request, requestId } = event.params;
  const url = new URL(request.url);
  const path = url.pathname;
  requests.push({ path, query: url.searchParams, method: request.method, headers: request.headers, body: request.postData ? JSON.parse(request.postData) : null });
  let status = 200;
  let result = { items: [], total: 0, page: 1, page_size: 20 };
  if (request.method === "OPTIONS") result = {};
  else if (path === "/api/auth/login") {
    const input = JSON.parse(request.postData);
    if (input.password !== "test-password") { status = 401; result = { detail: "اطلاعات ورود معتبر نیست." }; }
    else { expire = false; result = { access_token: "browser-test-session", token_type: "bearer", user: { ...admin, role_code: role } }; }
  } else if (expire || !Object.entries(request.headers).some(([key, value]) => key.toLowerCase() === "authorization" && value === "Bearer browser-test-session")) { status = 401; result = { detail: "اطلاعات ورود معتبر نیست." }; }
  else if (path === "/api/auth/me") result = { ...admin, role_code: role };
  else if (path === "/api/departments") result = [];
  else if (path === "/api/users" && request.method === "GET") result = { items: users, total: users.length, page: 1, page_size: 20 };
  else if (path === "/api/users" && request.method === "POST") { const { password, ...fields } = JSON.parse(request.postData); result = { ...fields, id: 2, created_at: timestamp, updated_at: timestamp }; users.push(result); status = 201; }
  else if (path.endsWith("/password")) { status = 204; result = null; }
  else if (/^\/api\/users\/\d+$/.test(path) && request.method === "PUT") { const id = Number(path.split("/").at(-1)); result = { ...users.find((user) => user.id === id), ...JSON.parse(request.postData) }; users = users.map((user) => user.id === id ? result : user); }
  else if (/^\/api\/users\/\d+$/.test(path) && request.method === "DELETE") { users = users.filter((user) => user.id !== Number(path.split("/").at(-1))); status = 204; result = null; }
  else if (path === "/api/audit-logs") result = { items: [record], total: 1, page: 1, page_size: 20 };
  else if (path === "/api/audit-logs/1") result = record;
  await send("Fetch.fulfillRequest", { requestId, responseCode: status, responseHeaders: [{ name: "Content-Type", value: "application/json" }, { name: "Access-Control-Allow-Origin", value: base }, { name: "Access-Control-Allow-Headers", value: "Authorization, Content-Type" }, { name: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" }], body: status === 204 ? "" : Buffer.from(JSON.stringify(result)).toString("base64") });
};
await send("Page.enable");
await send("Runtime.enable");
await send("Fetch.enable", { patterns: [{ urlPattern: "http://127.0.0.1:8000/*" }] });
await send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
async function wait(expression) {
  for (let count = 0; count < 80; count++) { if (await evaluate(expression)) return; await new Promise((resolve) => setTimeout(resolve, 100)); }
  throw new Error("Browser condition did not become true: " + expression.slice(0, 120));
}
async function navigate(path) { await send("Page.navigate", { url: base + path }); }
async function fill(selector, value) {
  await evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); if (!input) throw new Error('Missing input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', {bubbles:true})); })()`);
}
async function clickText(text, scope = "document") {
  await evaluate(`(() => { const button = Array.from(${scope}.querySelectorAll('button')).find((node) => node.textContent.trim() === ${JSON.stringify(text)}); if (!button) throw new Error('Missing button'); button.click(); })()`);
}
async function action(title) { await evaluate(`document.querySelector('tbody tr:last-child button[aria-label="${title}"]').click()`); }
async function screenshot(name) { const { data } = await send("Page.captureScreenshot", { format: "png" }); await writeFile(`node_modules/.tmp/${name}.png`, Buffer.from(data, "base64")); }
async function login() {
  await wait("Boolean(document.querySelector('input[name=username]'))");
  await fill("input[name=username]", "test-admin"); await fill("input[name=password]", "test-password");
  await clickText("ورود"); await wait("location.pathname === '/' && document.body.innerText.includes('مدیر آزمایشی')");
}
try {
  await navigate("/employees"); await wait("location.pathname === '/login' && Boolean(document.querySelector('input[name=username]'))");
  assert.equal(requests.filter((request) => request.path === "/api/employees").length, 0);
  await screenshot("auth-login");
  await login();
  await navigate("/admin/users"); await wait("Boolean(document.querySelector('tbody tr'))");
  await clickText("افزودن کاربر"); await wait("Boolean(document.querySelector('#user-form'))");
  await fill("#user-form input[name=username]", "new-test-user");
  await fill("#user-form input:not([name])", "کاربر جدید");
  await fill("#user-form input[type=password]", "test-password");
  await clickText("ثبت کاربر"); await wait("document.body.innerText.includes('کاربر جدید') && !document.querySelector('#user-form')");
  await action("ویرایش"); await wait("Boolean(document.querySelector('#user-form'))");
  await fill("#user-form input:not([name])", "کاربر ویرایش‌شده");
  await evaluate("document.querySelector('#user-form button[aria-label=نقش]').click()");
  await wait("Boolean(document.querySelector('[data-anchored-select-menu]'))");
  await clickText("مدیر سیستم", "document.querySelector('[data-anchored-select-menu]')");
  await screenshot("auth-user-form");
  await clickText("ذخیره تغییرات"); await wait("document.body.innerText.includes('کاربر ویرایش‌شده') && !document.querySelector('#user-form')");
  assert.equal(users[1].role_code, "admin");
  await action("غیرفعال‌کردن"); await wait("Boolean(document.querySelector('[role=dialog]'))"); await clickText("تأیید", "document.querySelector('[role=dialog]')");
  await wait("document.querySelector('tbody tr:last-child').innerText.includes('غیرفعال')");
  await action("تغییر رمز"); await wait("Boolean(document.querySelector('#password-form'))");
  await fill("#password-form input:first-of-type", "new-test-password");
  await evaluate("(() => { const inputs = document.querySelectorAll('#password-form input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(inputs[1], 'different-password'); inputs[1].dispatchEvent(new Event('input',{bubbles:true})); })()");
  await clickText("ذخیره رمز جدید"); await wait("document.body.innerText.includes('یکسان نیستند')");
  await evaluate("(() => { const input = document.querySelectorAll('#password-form input')[1]; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'new-test-password'); input.dispatchEvent(new Event('input',{bubbles:true})); })()");
  await clickText("ذخیره رمز جدید"); await wait("!document.querySelector('#password-form')");
  await action("حذف"); await wait("Boolean(document.querySelector('[role=dialog]'))"); await clickText("حذف", "document.querySelector('[role=dialog]')"); await wait("document.querySelectorAll('tbody tr').length === 1");
  await navigate("/admin/audit-logs"); await wait("Boolean(document.querySelector('tbody tr'))");
  await clickText("فیلترها");
  await fill("input[aria-label='از تاریخ']", "2026-09-01");
  await wait("document.querySelector('tbody tr') && document.querySelector('input[aria-label=\"از تاریخ\"]').value === '2026-09-01'");
  assert.ok(requests.some((request) => request.path === "/api/audit-logs" && request.query.get("date_from") === "2026-09-01"));
  await fill("input[aria-label='تا تاریخ']", "2026-08-01");
  await wait("document.body.innerText.includes('تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.')");
  assert.equal(requests.some((request) => request.query.get("date_from") === "2026-09-01" && request.query.get("date_to") === "2026-08-01"), false);
  await fill("input[aria-label='تا تاریخ']", "2026-09-30");
  await wait("Boolean(document.querySelector('tbody tr'))");
  await screenshot("auth-audit-desktop");
  await evaluate("document.querySelector('tbody button[aria-label=\"مشاهده جزئیات\"]').click()");
  await wait("Boolean(document.querySelector('[role=dialog]')) && document.querySelector('[role=dialog]').innerText.includes('سرمعلم')");
  assert.ok((await evaluate("document.querySelector('[role=dialog]').innerText")).includes("تعیین نشده"));
  assert.equal(await evaluate("document.querySelector('[role=dialog]').innerText.includes('TEST_SECRET') || document.querySelector('[role=dialog]').innerText.includes('TEST_TOKEN')"), false);
  await screenshot("auth-audit-detail"); await clickText("بستن", "document.querySelector('[role=dialog]')");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await navigate("/admin/users"); await wait("document.body.innerText.includes('مدیر آزمایشی') && Boolean(document.querySelector('article'))");
  assert.equal(await evaluate("document.documentElement.scrollWidth > window.innerWidth + 1"), false);
  await screenshot("auth-users-mobile");
  await clickText("افزودن کاربر"); await wait("Boolean(document.querySelector('#user-form'))");
  assert.equal(await evaluate("document.querySelector('button[form=\"user-form\"]').getBoundingClientRect().bottom <= innerHeight"), true);
  assert.equal(await evaluate("document.querySelector('[role=dialog]').scrollWidth > document.querySelector('[role=dialog]').clientWidth + 1"), false);
  await screenshot("auth-user-form-mobile"); await clickText("انصراف", "document.querySelector('[role=dialog]')");
  await evaluate("document.querySelector('button[aria-label=خروج]').click()"); await wait("location.pathname === '/login'");
  assert.equal(await evaluate("sessionStorage.length"), 0);
  role = "user";
  await login(); await navigate("/admin/users"); await wait("document.body.innerText.includes('دسترسی محدود')");
  assert.equal(await evaluate("Boolean(document.querySelector('a[href=\"/admin/users\"]'))"), false);
  expire = true;
  await navigate("/schools"); await wait("location.pathname === '/login' && Boolean(document.querySelector('input[name=username]'))");
  assert.equal(await evaluate("sessionStorage.length"), 0);
  assert.equal(errors.length, 0, "Unexpected browser runtime exception");
  console.log("Browser smoke passed: guest/login, CRUD/status/password, audit filters/details, mobile, role guard, logout and 401.");
} finally {
  await send("Page.close"); socket.close();
}
