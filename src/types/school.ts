export interface School {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  is_active: boolean;
  is_student_access_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SchoolMembership {
  id: string;
  school_id: string;
  user_id: string;
  role: 'administrador' | 'secretaria' | 'professor' | 'aluno';
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}
