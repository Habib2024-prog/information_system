export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface Department {
  id: number;
  code: string;
  display_name: string;
}

export interface ScientificMember {
  id: number;
  name: string;
  surname: string;
  father_name: string;
  phone_number: string;
  academic_rank: string;
  department_id: number;
  department: Department;
  notes: string | null;
  observation_count: number;
}

export interface EmployeeDepartment {
  id: number;
  code: string;
  display_name: string;
}

export interface Employee {
  id: number;
  name: string;
  father_name: string;
  grandfather_name: string;
  school_workplace: string;
  city_district: string;
  phone_number: string;
  field_of_study: string;
  education_level: string;
  subjects_taught: string;
  job_title_code: string;
  teaching_experience: number;
  grade_post: number;
  step: number;
  successful_evaluation: string;
  field_match_code: string;
  notes: string | null;
  observation_count: number;
  departments: EmployeeDepartment[];
}

export interface SchoolGradeSection {
  id: number;
  school_id: number;
  section_name: string;
  enrolled_count: number;
  present_count: number;
  female_count: number;
  male_count: number;
  created_at: string;
  updated_at: string;
}

export interface SchoolGradeTotals {
  enrolled_count: number;
  present_count: number;
  female_count: number;
  male_count: number;
}

export interface SchoolGradeStatistic {
  grade_number: number;
  sections: SchoolGradeSection[];
  totals: SchoolGradeTotals;
}

export interface School {
  id: number;
  school_name: string;
  school_head_phone: string | null;
  school_type_code: string;
  school_type_display_name: string;
  gender_type_code: string;
  gender_type_display_name: string;
  school_code: string;
  school_formation: string;
  senior_teacher_count: number;
  male_teacher_count: number;
  female_teacher_count: number;
  incoming_service_teacher_count: number;
  outgoing_service_teacher_count: number;
  volunteer_teacher_count: number;
  active_class_section_count: number;
  school_needs: string | null;
  school_equipment: string | null;
  grade_statistics: SchoolGradeStatistic[];
  created_at: string;
  updated_at: string;
}
