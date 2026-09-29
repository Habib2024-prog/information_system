export const DEFAULT_PAGE_SIZE = 10;

// Keep the existing API contract: page count is derived from its filtered total.
export function getTotalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function getValidPage(page: number, total: number, pageSize: number): number {
  return Math.min(Math.max(1, page), getTotalPages(total, pageSize));
}
