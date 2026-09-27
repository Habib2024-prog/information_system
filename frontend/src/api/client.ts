import { getAccessToken, getSessionRevision, setAccessToken } from "../auth/session";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL?.trim() || "http://127.0.0.1:8000").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

/** JSON, deletion and workbook requests share authentication and error handling. */
export async function apiFetch(path: string, init: RequestInit = {}, options: { public?: boolean } = {}): Promise<Response> {
  const token = getAccessToken();
  const revision = getSessionRevision();
  const headers = new Headers(init.headers);
  headers.set("Accept", headers.get("Accept") ?? "application/json");
  if (!options.public) {
    if (!token) throw new ApiError("برای ادامه وارد سیستم شوید.", 401);
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  // A late response from an old session must not clear or expose a new session.
  if (!options.public && revision !== getSessionRevision()) throw new ApiError("نشست کاربری تغییر کرده است.", 401);
  if (!response.ok) {
    if (response.status === 401 && !options.public) setAccessToken(null);
    let message = response.status === 401 ? "اطلاعات ورود معتبر نیست یا نشست شما پایان یافته است."
      : response.status === 403 ? "اجازهٔ دسترسی به این بخش را ندارید." : "عملیات با مشکل روبه‌رو شد. دوباره تلاش کنید.";
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "detail" in body && typeof body.detail === "string" && /[\u0600-\u06ff]/.test(body.detail)) message = body.detail;
    } catch { /* Use a safe Persian fallback for non-JSON errors. */ }
    throw new ApiError(message, response.status);
  }
  return response;
}

export async function apiGet<T>(path: string): Promise<T> {
  const revision = getSessionRevision();
  const value = await (await apiFetch(path)).json() as T;
  assertCurrentSession(revision);
  return value;
}

export async function apiRequest<T>(path: string, init: RequestInit, options: { public?: boolean } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const revision = getSessionRevision();
  const response = await apiFetch(path, { ...init, headers }, options);
  if (response.status === 204) return undefined as T;
  const value = await response.json() as T;
  if (!options.public) assertCurrentSession(revision);
  return value;
}

function assertCurrentSession(revision: number) {
  if (revision !== getSessionRevision()) throw new ApiError("نشست کاربری تغییر کرده است.", 401);
}

/** Preserve the server filename and never download data from an ended session. */
export async function apiDownload(path: string, fallbackFilename: string): Promise<string> {
  const revision = getSessionRevision();
  const response = await apiFetch(path);
  const blob = await response.blob();
  assertCurrentSession(revision);
  const disposition = response.headers.get("content-disposition") ?? "";
  const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  let filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? fallbackFilename;
  if (encodedName) { try { filename = decodeURIComponent(encodedName); } catch { /* Use fallback name. */ } }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  try {
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click();
  } finally { link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
  return filename;
}
