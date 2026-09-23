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


def _create_school(client: TestClient, **overrides: object) -> dict[str, object]:
    response = client.post("/api/schools", json=_school_payload(**overrides))
    assert response.status_code == 201
    return response.json()


def _grade(grade_number: int, **overrides: object) -> dict[str, object]:
    value: dict[str, object] = {
        "grade_number": grade_number,
        "enrolled_count": 30,
        "present_count": 28,
        "female_count": 15,
        "male_count": 15,
    }
    value.update(overrides)
    return value


def test_create_school_and_preserve_long_text_fields(client: TestClient) -> None:
    school = _create_school(client)

    assert school["school_code"] == "SCH-001"
    assert school["school_type_display_name"] == "لیسه"
    assert school["gender_type_display_name"] == "مختلط"
    assert school["school_needs"] == "نیاز به کتابخانه و صنف اضافی"
    assert school["school_equipment"] == "کمپیوتر و میزهای آموزشی"


def test_school_code_is_unique_and_school_counts_cannot_be_negative(client: TestClient) -> None:
    _create_school(client)

    duplicate_response = client.post("/api/schools", json=_school_payload())
    negative_response = client.post(
        "/api/schools",
        json=_school_payload(school_code="SCH-002", male_teacher_count=-1),
    )

    assert duplicate_response.status_code == 409
    assert negative_response.status_code == 422


def test_create_school_with_multiple_grade_statistics_and_detail(client: TestClient) -> None:
    school = _create_school(
        client,
        grade_statistics=[_grade(1), _grade(2, enrolled_count=25, present_count=23)],
    )

    assert [item["grade_number"] for item in school["grade_statistics"]] == [1, 2]
    detail_response = client.get(f"/api/schools/{school['id']}")
    statistics_response = client.get(f"/api/schools/{school['id']}/grade-statistics")

    assert detail_response.status_code == 200
    assert detail_response.json()["school_head_phone"] == "0700000000"
    assert len(detail_response.json()["grade_statistics"]) == 2
    assert statistics_response.status_code == 200
    assert [item["grade_number"] for item in statistics_response.json()] == [1, 2]


def test_rejects_invalid_or_duplicate_grade_statistics(client: TestClient) -> None:
    below_response = client.post(
        "/api/schools",
        json=_school_payload(school_code="SCH-002", grade_statistics=[_grade(0)]),
    )
    above_response = client.post(
        "/api/schools",
        json=_school_payload(school_code="SCH-003", grade_statistics=[_grade(13)]),
    )
    duplicate_response = client.post(
        "/api/schools",
        json=_school_payload(school_code="SCH-004", grade_statistics=[_grade(1), _grade(1)]),
    )
    negative_response = client.post(
        "/api/schools",
        json=_school_payload(
            school_code="SCH-005",
            grade_statistics=[_grade(1, enrolled_count=-1)],
        ),
    )
    present_exceeds_enrolled_response = client.post(
        "/api/schools",
        json=_school_payload(
            school_code="SCH-006",
            grade_statistics=[_grade(1, enrolled_count=20, present_count=21)],
        ),
    )

    assert below_response.status_code == 422
    assert above_response.status_code == 422
    assert duplicate_response.status_code == 422
    assert negative_response.status_code == 422
    assert present_exceeds_enrolled_response.status_code == 422


def test_update_school_and_existing_grade_statistic_without_duplicates(client: TestClient) -> None:
    school = _create_school(client, grade_statistics=[_grade(1, enrolled_count=30)])

    response = client.put(
        f"/api/schools/{school['id']}",
        json=_school_payload(
            school_name="لیسه استقلال نو",
            grade_statistics=[
                _grade(1, enrolled_count=42),
                _grade(2, enrolled_count=20, present_count=18),
            ],
        ),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["school_name"] == "لیسه استقلال نو"
    assert [item["grade_number"] for item in body["grade_statistics"]] == [1, 2]
    first_grade = next(item for item in body["grade_statistics"] if item["grade_number"] == 1)
    assert first_grade["enrolled_count"] == 42


def test_soft_deleted_school_is_not_returned_normally(client: TestClient) -> None:
    school = _create_school(client)

    assert client.delete(f"/api/schools/{school['id']}").status_code == 204
    assert client.get(f"/api/schools/{school['id']}").status_code == 404
    list_response = client.get("/api/schools")

    assert list_response.status_code == 200
    assert list_response.json()["items"] == []


def test_school_filters_and_combined_and_logic(client: TestClient) -> None:
    _create_school(
        client,
        school_code="SCH-001",
        school_type_code="high_school",
        gender_type_code="mixed",
        school_formation="رسمی",
    )
    _create_school(
        client,
        school_name="مکتب دخترانه",
        school_code="SCH-002",
        school_type_code="middle_school",
        gender_type_code="girls",
        school_formation="رسمی",
    )
    _create_school(
        client,
        school_name="مکتب پسرانه",
        school_code="SCH-003",
        school_type_code="middle_school",
        gender_type_code="boys",
        school_formation="غیررسمی",
    )

    type_response = client.get("/api/schools", params={"school_type_code": "middle_school"})
    gender_response = client.get("/api/schools", params={"gender_type_code": "girls"})
    code_response = client.get("/api/schools", params={"school_code": "SCH-003"})
    combined_response = client.get(
        "/api/schools",
        params={"school_type_code": "middle_school", "gender_type_code": "girls"},
    )

    assert type_response.json()["total"] == 2
    assert gender_response.json()["total"] == 1
    assert gender_response.json()["items"][0]["school_code"] == "SCH-002"
    assert code_response.json()["total"] == 1
    assert combined_response.json()["total"] == 1
    assert combined_response.json()["items"][0]["school_code"] == "SCH-002"


def test_search_supports_school_name_and_code(client: TestClient) -> None:
    _create_school(client, school_name="لیسه استقلال", school_code="SCH-001")

    by_name = client.get("/api/schools", params={"search": "استقلال"})
    by_code = client.get("/api/schools", params={"search": "SCH-001"})

    assert by_name.json()["total"] == 1
    assert by_code.json()["total"] == 1
