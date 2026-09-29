from datetime import date, datetime, timezone

from app.common.excel import build_workbook, format_jalali_excel_date


def test_excel_date_formatter_uses_jalali_persian_digits_and_keeps_empty_cells_empty() -> None:
    assert format_jalali_excel_date(date(2026, 9, 28)) == "۱۴۰۵/۰۷/۰۶"
    assert format_jalali_excel_date(datetime(2026, 9, 28, 10, 35, tzinfo=timezone.utc)) == "۱۴۰۵/۰۷/۰۶ - ۱۰:۳۵"
    assert format_jalali_excel_date(date(2026, 3, 21)) == "۱۴۰۵/۰۱/۰۱"
    assert format_jalali_excel_date(date(2025, 3, 20)) == "۱۴۰۳/۱۲/۳۰"

    workbook = build_workbook(
        worksheet_title="آزمایش",
        headers=["تاریخ"],
        rows=[(date(2026, 9, 28),), (None,)],
    )
    assert workbook.active["A2"].value == "۱۴۰۵/۰۷/۰۶"
    assert workbook.active["A3"].value is None
