export type UserRole = 'secretaria' | 'professor' | 'aluno' | 'administrador';

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    dailySummary: boolean;
    posts: boolean;
    activities: boolean;
    reminders: boolean;
  };
  ui: {
    theme: 'dark-neon' | 'dark-serene' | 'light' | 'high-contrast';
    language: string;
    timezone: string;
    dateFormat: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  classId?: string;        // ID da turma principal para exibir nos insights
  currentSchoolId?: string; // UUID da escola ativa atual
  preferences: UserPreferences;
  mustChangePassword?: boolean;
  passwordHash?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  updatePassword: (userId: string, newPasswordHash: string, mustChange?: boolean) => Promise<boolean>;
  isLoading: boolean;
  createDemoUser?: (email: string, password: string, name: string, role: string) => Promise<any>;
}