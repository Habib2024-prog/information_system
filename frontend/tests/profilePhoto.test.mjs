import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../src");
const read = (path) => readFileSync(resolve(root, path), "utf8");

test("profile photo UI uses safe image types, preview, fallback avatars, and authenticated multipart requests", () => {
  const dialog = read("components/shared/ProfilePhotoDialog.tsx");
  const avatar = read("components/shared/UserAvatar.tsx");
  const usersApi = read("api/users.ts");
  const usersPage = read("pages/admin/UsersPage.tsx");
  const header = read("components/layout/AppHeader.tsx");
  for (const type of ["image/jpeg", "image/png", "image/webp"]) assert.ok(dialog.includes(type));
  assert.ok(dialog.includes("maximumBytes") && dialog.includes("URL.createObjectURL") && dialog.includes("URL.revokeObjectURL"));
  assert.ok(dialog.includes("removeUserProfileImage") && dialog.includes("uploadUserProfileImage"));
  assert.ok(avatar.includes("rounded-full") && avatar.includes("object-cover") && avatar.includes("onError"));
  assert.ok(usersApi.includes("FormData") && usersApi.includes("apiFetch") && !usersApi.includes('Content-Type", "multipart'));
  assert.ok(usersPage.includes("<UserAvatar") && usersPage.includes("<ProfilePhotoDialog"));
  assert.ok(header.includes("<UserAvatar") && header.includes("<ProfilePhotoDialog"));
});
