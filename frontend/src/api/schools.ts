import { apiGet } from "./client";
import type { PaginatedResponse, School } from "../types/api";

export const getSchools = () => apiGet<PaginatedResponse<School>>("/api/schools?page_size=1");
