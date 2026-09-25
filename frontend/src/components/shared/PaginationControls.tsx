import { Button } from "../ui/button";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function PaginationControls({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange }: PaginationControlsProps) {
  if (!total) return null;
  return <div className="flex flex-col gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm shadow-soft sm:flex-row sm:items-center sm:justify-between"><div className="text-muted">صفحهٔ {page.toLocaleString("fa-AF")} از {totalPages.toLocaleString("fa-AF")}</div><div className="flex flex-wrap items-center gap-2">{pageSize && onPageSizeChange ? <label className="flex items-center gap-2 text-muted">تعداد در هر صفحه<select className="input h-9 w-auto py-0" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>{[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size.toLocaleString("fa-AF")}</option>)}</select></label> : null}<Button className="h-9" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>قبلی</Button><Button className="h-9" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>بعدی</Button></div></div>;
}
