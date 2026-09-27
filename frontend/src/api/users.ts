import { apiGet, apiRequest } from "./client";
import type { PaginatedResponse } from "../types/api";
import type { ManagedUser, UserCreatePayload, UserPayload } from "../types/auth";

export const getUsers = (page = 1, pageSize = 20) => apiGet<PaginatedResponse<ManagedUser>>(`/api/users?page=${page}&page_size=${pageSize}`);
export const getUser = (id: number) => apiGet<ManagedUser>(`/api/users/${id}`);
export const createUser = (payload: UserCreatePayload) => apiRequest<ManagedUser>("/api/users", { method: "POST", body: JSON.stringify(payload) });
export const updateUser = (id: number, payload: UserPayload) => apiRequest<ManagedUser>(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteUser = (id: number) => apiRequest<void>(`/api/users/${id}`, { method: "DELETE" });
export const changeUserPassword = (id: number, newPassword: string) => apiRequest<void>(`/api/users/${id}/password`, { method: "PUT", body: JSON.stringify({ new_password: newPassword }) });
