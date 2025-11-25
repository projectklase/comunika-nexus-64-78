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

export interface SecretariaPermission {
  id: string;
  secretaria_id: string;
  permission_key: 'manage_all_schools' | string;
  permission_value: {
    schools?: string[]; // ["*"] para todas, ou ["uuid1", "uuid2"] para específicas
  };
  granted_by?: string;
  granted_at: string;
  school_id?: string;
}
