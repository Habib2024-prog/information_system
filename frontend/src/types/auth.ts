export type RoleCode = "admin" | "user";
export interface CurrentUser { id: number; username: string; full_name: string; role_code: RoleCode; is_active: boolean; profile_image_url: string | null; }
export interface ManagedUser extends CurrentUser { created_at: string; updated_at: string; }
export interface LoginResponse { access_token: string; token_type: string; user: CurrentUser; }
export interface UserPayload { username: string; full_name: string; role_code: RoleCode; is_active: boolean; }
export interface UserCreatePayload extends UserPayload { password: string; }
