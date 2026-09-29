import { useEffect, useState } from "react";

import { ApiError } from "../api/client";
import { getValidPage } from "../lib/pagination";
import type { PaginatedResponse } from "../types/api";

interface PaginatedListOptions<T> {
  fetchPage: () => Promise<PaginatedResponse<T>>;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  errorMessage: string;
  enabled?: boolean;
}

export function usePaginatedList<T>({ fetchPage, page, pageSize, onPageChange, errorMessage, enabled = true }: PaginatedListOptions<T>) {
  const [data, setData] = useState<PaginatedResponse<T> | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setError("");
    if (!enabled) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchPage().then((result) => {
      if (!active) return;
      const validPage = getValidPage(page, result.total, result.page_size);
      if (validPage !== page) {
        // A deletion (or concurrent change) can invalidate several pages, even
        // when total becomes zero. Refetch the last valid page, not stale rows.
        onPageChange(validPage);
        return;
      }
      setData(result);
      setLoading(false);
    }).catch((cause: unknown) => {
      if (!active) return;
      setError(cause instanceof ApiError ? cause.message : errorMessage);
      setLoading(false);
    });
    // Search/filter/page changes must not be overwritten by a slower old request.
    return () => { active = false; };
  }, [fetchPage, page, pageSize, onPageChange, errorMessage, enabled, attempt]);

  return { data, loading, error, retry: () => setAttempt((value) => value + 1) };
}
