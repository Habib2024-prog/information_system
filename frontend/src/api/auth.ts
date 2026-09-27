import { apiGet, apiRequest } from "./client";
import type { CurrentUser, LoginResponse } from "../types/auth";

export const loginRequest = (username: string, password: string) => apiRequest<LoginResponse>(
  "/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }, { public: true },
);
export const getCurrentUser = () => apiGet<CurrentUser>("/api/auth/me");
