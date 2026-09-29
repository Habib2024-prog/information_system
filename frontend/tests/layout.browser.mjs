// Local Chromium layout regression check, using CDP and isolated API fixtures.
// Run Vite on localhost:5178 and an isolated headless browser on port 9228, then:
// node tests/layout.browser.mjs
// No browser/testing packages or production services are required.
import assert from "node:assert/strict";

const origin = "http://127.0.0.1:5178";
const browser = await (await fetch("http://127.0.0.1:9228/json/version")).json();
const socket = new WebSocket(browser.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const pending = new Map();
const consoleErrors = [];
const interceptionErrors = [];
function send(method, params = {}, sessionId) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve: (value) => { clearTimeout(timeout); resolve(value); }, reject: (cause) => { clearTimeout(timeout); reject(cause); } });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
socket.onmessage = async ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const job = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) job?.reject(new Error(message.error.message));
    else job?.resolve(message.result);
    return;
  }
  if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params.exceptionDetails.text);
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") consoleErrors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(" "));
  if (message.method !== "Fetch.requestPaused") return;
  const { requestId, request } = message.params;
  const url = new URL(request.url);
  try {
    if (url.pathname.startsWith("/api/")) {
      await send("Fetch.fulfillRequest", { requestId, responseCode: 200,
        responseHeaders: [
          { name: "Content-Type", value: "application/json" },
          { name: "Access-Control-Allow-Origin", value: origin },
          { name: "Access-Control-Allow-Headers", value: "Authorization,Content-Type,Accept" },
          { name: "Access-Control-Allow-Methods", value: "GET,OPTIONS" },
        ], body: Buffer.from(JSON.stringify(request.method === "OPTIONS" ? {} : fixture(url))).toString("base64") }, message.sessionId);
    } else if (url.origin === origin) await send("Fetch.continueRequest", { requestId }, message.sessionId);
    else await send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" }, message.sessionId);
  } catch (cause) { interceptionErrors.push(cause.message); }
};

const longText = "اطلاعات طولانی برای بررسی نمایش و خوانایی رابط کاربری ".repeat(120);
const departments = ["تعلیم و تربیه", "زبان و ادبیات دری", "زبان و ادبیات پشتو", "زبان و ادبیات عربی", "ساینس", "ریاضی", "زبان و ادبیات انگلیسی", "علوم اجتماعی", "علوم دینی", "کمپیوتر"].map((display_name, index) => ({ id: index + 1, code: ["education_training", "dari_language_literature", "pashto_language_literature", "arabic_language", "science", "mathematics", "english_language_literature", "social_sciences", "religious_sciences", "computer"][index], display_name }));
const actor = { id: 999, username: "layout-test-admin", full_name: "مدیر آزمایشی رابط کاربری", role_code: "admin", is_active: true, profile_image_url: null };
const employees = Array.from({ length: 31 }, (_, index) => ({ id: index + 1, name: "احمد " + "نام طولانی ".repeat(8), father_name: "محمد " + "نام پدر ".repeat(6), grandfather_name: "کریم", school_workplace: "لیسه " + "نام طولانی محل وظیفه ".repeat(8), city_district: "کابل", phone_number: "0700000000", field_of_study: "ریاضی", education_level: "لیسانس", subjects_taught: "ریاضی", job_title_code: "teacher", teaching_experience: 5, grade_post: 3, step: 2, successful_evaluation: "بلی", field_match_code: "in_field", notes: longText, observation_count: 12, departments }));
const members = employees.map((employee) => ({ id: employee.id, name: employee.name, surname: "احمدی " + "تخلص ".repeat(6), father_name: employee.father_name, academic_rank: "عضو علمی ارشد " + "رتبه ".repeat(10), phone_number: employee.phone_number, department_id: 1, department: departments[0], notes: longText, observation_count: 12 }));
const schools = employees.map((employee) => ({ id: employee.id, school_name: "لیسه " + "نام مکتب ".repeat(10), school_code: "SCH-" + employee.id + "-LONG-CODE", school_head_phone: employee.phone_number, school_type_code: "high_school", school_type_display_name: "لیسه", gender_type_code: "mixed", gender_type_display_name: "مختلط", school_formation: "رسمی", senior_teacher_count: 2, male_teacher_count: 10, female_teacher_count: 8, incoming_service_teacher_count: 0, outgoing_service_teacher_count: 0, volunteer_teacher_count: 0, active_class_section_count: 12, school_needs: longText, school_equipment: longText, grade_statistics: [] }));
const users = employees.map((employee) => ({ id: employee.id, username: "long-user-name-".repeat(8) + employee.id, full_name: employee.name, role_code: "user", is_active: true, profile_image_url: null }));
const logs = employees.map((employee) => ({ id: employee.id, user: actor, action: "UPDATE", entity_type: "employee", entity_id: employee.id, description: longText, before_data: null, after_data: null, metadata: { changes: { notes: { old: longText, new: longText.repeat(2) } } }, changes: { notes: { old: longText, new: longText.repeat(2) } }, ip_address: "127.0.0.1", created_at: "2026-09-28T10:00:00Z" }));
function fixture(url) {
  const path = url.pathname;
  if (path === "/api/auth/me") return actor;
  if (path === "/api/departments") return departments;
  if (path === "/api/dashboard/summary") return { totals: { employees: 31, scientific_members: 31, schools: 31, observations: 30 }, observation_overview: [
    { observation_type: "teacher", total: 20, results: [{ final_result_code: "has_capability", count: 20 }] },
    { observation_type: "amir_senior_teacher", total: 10, results: [{ final_result_code: "mastery", count: 10 }] },
  ] };
  if (/^\/api\/audit-logs\/\d+$/.test(path)) return logs[0];
  const source = { "/api/employees": employees, "/api/scientific-members": members, "/api/schools": schools, "/api/users": users, "/api/audit-logs": logs }[path];
  assert.ok(source, `Unexpected API request: ${path}`);
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Number(url.searchParams.get("page_size") ?? 10);
  // Deliberately return five long dashboard rows to check the defensive UI cap.
  const items = path === "/api/audit-logs" && pageSize === 3 ? logs.slice(0, 5) : source.slice((page - 1) * pageSize, page * pageSize);
  return { items, total: source.length, page, page_size: pageSize };
}

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const command = (method, params = {}) => send(method, params, sessionId);
const evaluate = async (expression) => {
  const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};
async function waitFor(expression) {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}
const viewport = async (width) => {
  await command("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
  await evaluate("new Promise(resolve => setTimeout(resolve, 250))");
};
let checks = 0;
try {
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
  await command("Page.addScriptToEvaluateOnNewDocument", { source: "if (location.origin === 'http://127.0.0.1:5178') sessionStorage.setItem('government-system.access-token', 'local-layout-test-token');" });
  for (const route of ["/departments", "/employees", "/scientific-members", "/schools", "/admin/users", "/admin/audit-logs"]) {
    await viewport(1440);
    await command("Page.navigate", { url: origin + route });
    if (route === "/departments") {
      await waitFor("Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'تعلیم و تربیه')");
      await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'تعلیم و تربیه').click()");
    }
    await waitFor("document.querySelector('.app-data-table tbody tr') !== null");
    await evaluate("document.fonts.ready.then(() => true)");
    for (const collapsed of [false, true]) {
      if (collapsed) {
        await viewport(1440);
        await evaluate("document.querySelector('button[aria-label=\"تغییر اندازه فهرست\"]').click()");
      }
      for (const width of [1920, 1440, 1366, 1280, 1024, 768, 390]) {
        await viewport(width);
        const layout = await evaluate(`(() => {
          const shell = document.querySelector('.app-data-table');
          const cards = document.querySelector('.app-data-cards');
          const desktop = getComputedStyle(shell).display !== 'none';
          const active = desktop ? shell : cards;
          return { viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, desktop,
            width: active.clientWidth, scrollWidth: active.scrollWidth, scrollbar: getComputedStyle(active).scrollbarWidth, overscroll: getComputedStyle(active).overscrollBehaviorY,
            tableWidth: shell.querySelector('table').getBoundingClientRect().width,
            clippedActions: desktop && Array.from(shell.querySelectorAll('tbody td:last-child button')).some(button => {
              const cell = button.closest('td').getBoundingClientRect(); const rect = button.getBoundingClientRect();
              return rect.left < cell.left - 1 || rect.right > cell.right + 1;
            }) };
        })()`);
        assert.ok(layout.pageWidth <= width + 1, `${route}, ${width}px, collapsed=${collapsed}: page overflow ${JSON.stringify(layout)}`);
        assert.ok(layout.scrollWidth <= layout.width + 1, `${route}, ${width}px, collapsed=${collapsed}: internal horizontal overflow ${JSON.stringify(layout)}`);
        assert.ok(!layout.clippedActions, `${route}: action buttons escape their cell`);
        assert.equal(layout.scrollbar, "thin");
        assert.notEqual(layout.overscroll, "contain", `${route}: table must chain scrolling to the page`);
        if (width >= 1280) assert.ok(layout.desktop, `${route}: laptop/desktop should show table`);
        if (width <= 768) assert.ok(!layout.desktop, `${route}: tablet/mobile should use cards`);
        checks++;
      }
    }
    if (route === "/admin/audit-logs") {
      await viewport(1440);
      await evaluate("document.querySelector('.app-data-table button[aria-label=\"مشاهده جزئیات\"]').click()");
      await waitFor("document.querySelector('[role=dialog] #audit-changes-title') !== null");
      for (const width of [1440, 768, 390]) {
        await viewport(width);
        const modal = await evaluate(`(() => {
          const dialog = document.querySelector('[role=dialog]');
          const body = dialog.querySelector('.app-scrollbar');
          const header = dialog.querySelector('h2').getBoundingClientRect();
          const footer = Array.from(dialog.querySelectorAll('button')).at(-1).getBoundingClientRect();
          return { height: dialog.getBoundingClientRect().height, viewportHeight: innerHeight,
            clientWidth: body.clientWidth, scrollWidth: body.scrollWidth,
            clientHeight: body.clientHeight, scrollHeight: body.scrollHeight,
            scrollbar: getComputedStyle(body).scrollbarWidth, headerTop: header.top, footerBottom: footer.bottom };
        })()`);
        assert.ok(modal.height < modal.viewportHeight && modal.scrollHeight > modal.clientHeight);
        assert.ok(modal.scrollWidth <= modal.clientWidth + 1, `audit detail overflow at ${width}: ${JSON.stringify(modal)}`);
        assert.ok(modal.headerTop >= 0 && modal.footerBottom <= modal.viewportHeight);
        assert.equal(modal.scrollbar, "thin");
        checks++;
      }
    }
    console.log(`PASS: ${route} with sidebar expanded/collapsed and responsive reflow.`);
  }
  await viewport(1440);
  await command("Page.navigate", { url: origin + "/" });
  await waitFor("document.querySelector('ol[aria-label=\"آخرین فعالیت‌ها\"]') !== null");
  for (const width of [1440, 1280, 768, 390]) {
    await viewport(width);
    const recent = await evaluate(`(() => {
      const list = document.querySelector('ol[aria-label="آخرین فعالیت‌ها"]');
      const section = list.closest('section');
      const before = section.querySelector('h2').getBoundingClientRect().top;
      list.scrollTop = list.scrollHeight;
      return { count: list.children.length, height: list.getBoundingClientRect().height,
        sectionHeight: section.getBoundingClientRect().height, pageWidth: document.documentElement.scrollWidth,
        scrollWidth: list.scrollWidth, width: list.clientWidth, scrollbar: getComputedStyle(list).scrollbarWidth,
        headingStayed: section.querySelector('h2').getBoundingClientRect().top === before };
    })()`);
    assert.equal(recent.count, 5);
    assert.ok(recent.height <= 256 && recent.sectionHeight <= 420);
    assert.ok(recent.headingStayed && recent.pageWidth <= width + 1 && recent.scrollWidth <= recent.width + 1);
    assert.equal(recent.scrollbar, "thin");
    checks++;
  }
  assert.deepEqual(consoleErrors, [], "browser console/runtime errors");
  assert.deepEqual(interceptionErrors, [], "fixture request errors");
  console.log(`PASS: ${checks} Chromium layout checks; sidebar expanded/collapsed, 390–1920px, dashboard and audit details. No runtime errors.`);
} finally {
  await send("Target.closeTarget", { targetId });
  socket.close();
}
