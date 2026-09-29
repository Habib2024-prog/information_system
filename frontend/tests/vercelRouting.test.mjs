import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("Vercel preserves files before falling back to the React SPA", () => {
  const config = JSON.parse(readFileSync(resolve(frontendRoot, "vercel.json"), "utf8"));
  assert.deepEqual(config.routes, [
    { handle: "filesystem" },
    { src: "/(.*)", dest: "/index.html" },
  ]);
});

test("BrowserRouter and representative protected routes support direct URLs", () => {
  const app = readFileSync(resolve(frontendRoot, "src/App.tsx"), "utf8");
  const routes = readFileSync(resolve(frontendRoot, "src/routes/AppRoutes.tsx"), "utf8");
  const apiClient = readFileSync(resolve(frontendRoot, "src/api/client.ts"), "utf8");
  assert.match(app, /<BrowserRouter>/);
  assert.match(routes, /<ProtectedRoute/);
  for (const path of ["/", "/employees", "/scientific-members", "/schools", "/observations", "/admin/users", "/admin/audit-logs"]) {
    assert.ok(routes.includes(`path=\"${path}\"`), `expected route ${path}`);
  }
  assert.ok(apiClient.includes("fetch(`${apiBaseUrl}${path}`"), "API calls must keep using the configured backend origin");
});
