import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../src");
const read = (path) => readFileSync(resolve(root, path), "utf8");

test("dashboard keeps its compact identity without repeating the global institution header", () => {
  const dashboardHeader = read("components/dashboard/DashboardHeader.tsx");
  const globalHeader = read("components/layout/AppHeader.tsx");
  assert.ok(dashboardHeader.includes("داشبورد") && dashboardHeader.includes("نمای کلی اطلاعات و فعالیت‌های سیستم"));
  for (const duplicatedText of ["ریاست معارف ولایت بامیان", "آمریت زون تربیه معلم و انکشاف مسلکی معلمان بامیان"]) {
    assert.ok(!dashboardHeader.includes(duplicatedText));
    assert.ok(globalHeader.includes(duplicatedText));
  }
  assert.ok(dashboardHeader.includes("CalendarDays") && dashboardHeader.includes("py-4"));
});

test("login and startup authentication use a single professional loading lifecycle", () => {
  const login = read("pages/LoginPage.tsx");
  const auth = read("auth/AuthContext.tsx");
  const protectedRoute = read("routes/ProtectedRoute.tsx");
  const loader = read("components/shared/ApplicationLoadingScreen.tsx");
  assert.ok(login.includes("LoaderCircle") && login.includes("در حال ورود...") && login.includes("aria-busy={submitting}"));
  assert.ok(login.includes("disabled={submitting}") && login.includes("if (loading || sessionError) return <SessionGate />"));
  assert.ok(auth.includes("setAccessToken(response.access_token)") && auth.includes("await getCurrentUser()"));
  assert.ok(protectedRoute.includes("ApplicationLoadingScreen") && protectedRoute.includes("if (loading) return <ApplicationLoadingScreen />"));
  assert.ok(loader.includes("در حال آماده‌سازی سیستم...") && loader.includes("motion-reduce:animate-none"));
});

test("observation page uses the shared ten-record pagination and clamps a deleted final page", () => {
  const page = read("pages/ObservationsPage.tsx");
  const routes = read("../../backend/app/api/routes/observation_lists.py");
  assert.ok(page.includes("const pageSize = DEFAULT_PAGE_SIZE") && page.includes("getValidPage(page, response.total, response.page_size)"));
  assert.equal((routes.match(/page_size: int = Query\(default=10/g) ?? []).length, 2);
});
