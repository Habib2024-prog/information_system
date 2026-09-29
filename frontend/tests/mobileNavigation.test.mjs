import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../src");
const read = (path) => readFileSync(resolve(root, path), "utf8");

test("mobile navigation uses one unified RTL row, fixed icon slots, and a separate scrolling area", () => {
  const mobile = read("components/layout/MobileNavigation.tsx");
  const styles = read("styles/index.css");

  assert.ok(mobile.includes('w-[min(85vw,21.25rem)]'));
  assert.ok(mobile.includes('min-h-12 w-full min-w-0 items-center gap-3 rounded-lg'));
  assert.ok(mobile.includes('size-6 shrink-0 items-center justify-center'));
  assert.ok(mobile.includes('min-w-0 flex-1 truncate'));
  assert.ok(mobile.includes('min-h-0 flex-1 space-y-2 overflow-y-auto'));
  assert.ok(mobile.includes('shrink-0 border-t'));
  assert.ok(!mobile.includes('shadow-[inset_'));
  assert.ok(!mobile.includes('rounded-full'));
  assert.ok(styles.includes('.mobile-nav-scrollbar::-webkit-scrollbar { width: 4px; }'));
});
