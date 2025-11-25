export interface Secretaria {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SecretariaFormData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface SecretariaFilters {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
}
