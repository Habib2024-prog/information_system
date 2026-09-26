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

export interface School {
  id: number;
}
