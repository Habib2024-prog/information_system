from pathlib import Path

from fastapi.testclient import TestClient


def _school_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "school_name": "لیسه استقلال",
        "school_head_phone": "0700000000",
        "school_type_code": "high_school",
        "gender_type_code": "mixed",
        "school_code": "SCH-001",
        "school_formation": "رسمی",
        "senior_teacher_count": 2,
        "male_teacher_count": 10,
        "female_teacher_count": 8,
        "incoming_service_teacher_count": 1,
        "outgoing_service_teacher_count": 0,
        "volunteer_teacher_count": 3,
        "active_class_section_count": 12,
        "school_needs": "نیاز به کتابخانه و صنف اضافی",
        "school_equipment": "کمپیوتر و میزهای آموزشی",
        "grade_statistics": [],
    }
    payload.update(overrides)
    return payload


def _section(name: str, **overrides: object) -> dict[str, object]:
    value: dict[str, object] = {
        "section_name": name,
        "enrolled_count": 30,
        "present_count": 28,
        "female_count": 15,
        "male_count": 15,
    }
    value.update(overrides)
    return value


def _grade(grade_number: int, *sections: dict[str, object]) -> dict[str, object]:
    return {"grade_number": grade_number, "sections": list(sections)}


def _create_school(client: TestClient, **overrides: object) -> dict[str, object]:
    response = client.post("/api/schools", json=_school_payload(**overrides))
    assert response.status_code == 201
    return response.json()


def test_create_school_and_preserve_long_text_fields(client: TestClient) -> None:
    school = _create_school(client)

    assert school["school_code"] == "SCH-001"
    assert school["school_type_display_name"] == "لیسه"
    assert school["gender_type_display_name"] == "مختلط"
    assert school["school_needs"] == "نیاز به کتابخانه و صنف اضافی"
    assert school["school_equipment"] == "کمپیوتر و میزهای آموزشی"


def test_school_code_is_unique_and_school_counts_cannot_be_negative(client: TestClient) -> None:
    _create_school(client)
    assert client.post("/api/schools", json=_school_payload()).status_code == 409
    assert client.post("/api/schools", json=_school_payload(school_code="SCH-002", male_teacher_count=-1)).status_code == 422


def test_one_grade_with_one_section_returns_nested_detail_and_totals(client: TestClient) -> None:
    school = _create_school(client, grade_statistics=[_grade(1, _section("الف", enrolled_count=25, present_count=23, male_count=12, female_count=13))])
    grade = school["grade_statistics"][0]

    assert grade["grade_number"] == 1
    assert grade["sections"][0]["section_name"] == "الف"
    assert grade["totals"] == {"enrolled_count": 25, "present_count": 23, "female_count": 13, "male_count": 12}
    assert client.get(f"/api/schools/{school['id']}").json()["grade_statistics"] == school["grade_statistics"]
    assert client.get(f"/api/schools/{school['id']}/grade-statistics").json() == school["grade_statistics"]


def test_one_grade_with_multiple_sections_and_totals(client: TestClient) -> None:
    school = _create_school(client, grade_statistics=[_grade(1, _section("الف", enrolled_count=25, present_count=23, male_count=12, female_count=13), _section("ب", enrolled_count=28, present_count=26, male_count=14, female_count=14))])
    grade = school["grade_statistics"][0]

    assert [section["section_name"] for section in grade["sections"]] == ["الف", "ب"]
    assert grade["totals"] == {"enrolled_count": 53, "present_count": 49, "female_count": 27, "male_count": 26}


def test_same_section_name_is_allowed_in_different_grades(client: TestClient) -> None:
    school = _create_school(client, grade_statistics=[_grade(1, _section("الف")), _grade(2, _section("الف"))])
    assert [grade["grade_number"] for grade in school["grade_statistics"]] == [1, 2]


def test_duplicate_section_name_in_same_grade_and_invalid_counts_are_rejected(client: TestClient) -> None:
    duplicate = client.post("/api/schools", json=_school_payload(school_code="SCH-002", grade_statistics=[_grade(1, _section("الف"), _section("الف"))]))
    negative = client.post("/api/schools", json=_school_payload(school_code="SCH-003", grade_statistics=[_grade(1, _section("الف", enrolled_count=-1))]))
    present_exceeds = client.post("/api/schools", json=_school_payload(school_code="SCH-004", grade_statistics=[_grade(1, _section("الف", enrolled_count=20, present_count=21))]))
    male_exceeds = client.post("/api/schools", json=_school_payload(school_code="SCH-005", grade_statistics=[_grade(1, _section("الف", enrolled_count=20, male_count=21))]))
    female_exceeds = client.post("/api/schools", json=_school_payload(school_code="SCH-006", grade_statistics=[_grade(1, _section("الف", enrolled_count=20, female_count=21))]))
    gender_total_exceeds = client.post("/api/schools", json=_school_payload(school_code="SCH-007", grade_statistics=[_grade(1, _section("الف", enrolled_count=20, male_count=10, female_count=11))]))

    assert duplicate.status_code == 422
    assert negative.status_code == 422
    assert present_exceeds.status_code == 422
    assert male_exceeds.status_code == 422
    assert female_exceeds.status_code == 422
    assert gender_total_exceeds.status_code == 422


def test_update_deletes_removed_section_and_keeps_remaining_section(client: TestClient) -> None:
    school = _create_school(client, grade_statistics=[_grade(1, _section("الف"), _section("ب"))])
    section = school["grade_statistics"][0]["sections"][0]
    response = client.put(f"/api/schools/{school['id']}", json=_school_payload(school_name="لیسه استقلال نو", grade_statistics=[_grade(1, {"id": section["id"], "section_name": "الف", "enrolled_count": 42, "present_count": 40, "male_count": 20, "female_count": 22})]))

    assert response.status_code == 200
    grade = response.json()["grade_statistics"][0]
    assert response.json()["school_name"] == "لیسه استقلال نو"
    assert [item["section_name"] for item in grade["sections"]] == ["الف"]
    assert grade["sections"][0]["enrolled_count"] == 42


def test_soft_deleted_school_is_not_returned_normally(client: TestClient) -> None:
    school = _create_school(client)
    assert client.delete(f"/api/schools/{school['id']}").status_code == 204
    assert client.get(f"/api/schools/{school['id']}").status_code == 404
    assert client.get("/api/schools").json()["items"] == []


def test_school_filters_and_search_use_and_logic(client: TestClient) -> None:
    _create_school(client, school_code="SCH-001", school_type_code="high_school", gender_type_code="mixed", school_formation="رسمی")
    _create_school(client, school_name="مکتب دخترانه", school_code="SCH-002", school_type_code="middle_school", gender_type_code="girls", school_formation="رسمی")
    _create_school(client, school_name="مکتب پسرانه", school_code="SCH-003", school_type_code="middle_school", gender_type_code="boys", school_formation="غیررسمی")

    combined = client.get("/api/schools", params={"school_type_code": "middle_school", "gender_type_code": "girls"})
    by_code = client.get("/api/schools", params={"search": "SCH-001"})
    assert combined.json()["total"] == 1
    assert combined.json()["items"][0]["school_code"] == "SCH-002"
    assert by_code.json()["items"][0]["school_name"] == "لیسه استقلال"


def test_grade_section_migration_copies_legacy_grade_counts() -> None:
    """Existing grade rows become one ``عمومی`` section without losing counts."""
    migration = (Path(__file__).parents[1] / "alembic" / "versions" / "20260926_0008_replace_grade_statistics_with_sections.py").read_text(encoding="utf-8")
    assert "INSERT INTO school_grade_sections" in migration
    assert "FROM school_grade_statistics" in migration
    assert "convert_from(decode('D8B9D985D988D985DB8C', 'hex'), 'UTF8')" in migration
    for column in ("enrolled_count", "present_count", "female_count", "male_count", "created_at", "updated_at", "deleted_at"):
        assert column in migration
