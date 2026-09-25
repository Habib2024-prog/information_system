const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new ApiError("دریافت اطلاعات با مشکل روبه‌رو شد.", response.status);
  }

  return response.json() as Promise<T>;
}

export async function apiRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) {
    throw new ApiError("عملیات با مشکل روبه‌رو شد.", response.status);
  }
  return response.json() as Promise<T>;
}

export function getApiUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
}
