from enum import StrEnum


class AuditAction(StrEnum):
    LOGIN = "LOGIN"
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    EXPORT = "EXPORT"
    CREATE_OBSERVATION = "CREATE_OBSERVATION"
    UPDATE_OBSERVATION = "UPDATE_OBSERVATION"
    DELETE_OBSERVATION = "DELETE_OBSERVATION"
    PASSWORD_CHANGE = "PASSWORD_CHANGE"


class AuditEntity(StrEnum):
    EMPLOYEE = "employee"
    DEPARTMENT = "department"
    SCIENTIFIC_MEMBER = "scientific_member"
    SCHOOL = "school"
    SCHOOL_GRADE_SECTION = "school_grade_section"
    TEACHER_OBSERVATION = "teacher_observation"
    AMIR_OBSERVATION = "amir_observation"
    USER = "user"
    EMPLOYEE_EXPORT = "employee_export"
    DEPARTMENT_EXPORT = "department_export"
    SCIENTIFIC_MEMBER_EXPORT = "scientific_member_export"
    TEACHER_OBSERVATION_EXPORT = "teacher_observation_export"
    AMIR_OBSERVATION_EXPORT = "amir_observation_export"
    SCHOOL_EXPORT = "school_export"
    SCIENTIFIC_MEMBER_OBSERVATION_EXPORT = "scientific_member_observation_export"


ACTION_LABELS = {
    AuditAction.LOGIN: "ورود موفق",
    AuditAction.CREATE: "ثبت",
    AuditAction.UPDATE: "ویرایش",
    AuditAction.DELETE: "حذف",
    AuditAction.EXPORT: "دانلود اکسل",
    AuditAction.CREATE_OBSERVATION: "ثبت مشاهده",
    AuditAction.UPDATE_OBSERVATION: "ویرایش مشاهده",
    AuditAction.DELETE_OBSERVATION: "حذف مشاهده",
    AuditAction.PASSWORD_CHANGE: "تغییر رمز عبور",
}
ENTITY_LABELS = {
    AuditEntity.EMPLOYEE: "کارمند", AuditEntity.DEPARTMENT: "دیپارتمنت",
    AuditEntity.SCIENTIFIC_MEMBER: "عضو علمی", AuditEntity.SCHOOL: "مکتب",
    AuditEntity.SCHOOL_GRADE_SECTION: "شعبهٔ صنف", AuditEntity.USER: "کاربر",
    AuditEntity.TEACHER_OBSERVATION: "مشاهدهٔ معلم",
    AuditEntity.AMIR_OBSERVATION: "مشاهدهٔ آمر / سرمعلم",
    AuditEntity.EMPLOYEE_EXPORT: "کارمندان", AuditEntity.DEPARTMENT_EXPORT: "کارمندان دیپارتمنت",
    AuditEntity.SCIENTIFIC_MEMBER_EXPORT: "اعضای علمی", AuditEntity.SCHOOL_EXPORT: "مکاتب",
    AuditEntity.TEACHER_OBSERVATION_EXPORT: "مشاهدات معلمین",
    AuditEntity.AMIR_OBSERVATION_EXPORT: "مشاهدات آمر و سرمعلم",
    AuditEntity.SCIENTIFIC_MEMBER_OBSERVATION_EXPORT: "سوابق مشاهدات عضو علمی",
}
