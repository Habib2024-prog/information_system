import { Button } from "../ui/button";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  loading?: boolean;
}

export function PaginationControls({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange, loading = false }: PaginationControlsProps) {
  const pages = Math.max(1, totalPages);
  const previousDisabled = loading || total === 0 || page <= 1;
  const nextDisabled = loading || total === 0 || page >= pages;
  return <nav aria-label="صفحه‌بندی" className="surface-card flex flex-col gap-3 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
    <div role="status" className="flex flex-wrap gap-x-4 gap-y-1 text-muted"><span>صفحه {page.toLocaleString("fa-AF")} از {pages.toLocaleString("fa-AF")}</span><span>مجموع: {total.toLocaleString("fa-AF")} مورد</span></div>
    <div className="flex flex-wrap items-center gap-2">{pageSize && onPageSizeChange ? <label className="flex items-center gap-2 text-muted">تعداد در هر صفحه<select disabled={loading} className="input h-9 w-auto py-0" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>{[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size.toLocaleString("fa-AF")}</option>)}</select></label> : null}
      <Button className="h-9" disabled={previousDisabled} onClick={() => { if (!previousDisabled) onPageChange(page - 1); }}>صفحه قبلی</Button>
      <Button className="h-9" disabled={nextDisabled} onClick={() => { if (!nextDisabled) onPageChange(page + 1); }}>صفحه بعدی</Button>
    </div>
  </nav>;
}
