export type UserRole = 'secretaria' | 'professor' | 'aluno';

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
    theme: 'light' | 'dark';
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
  defaultSchoolSlug?: string;
  preferences: UserPreferences;
  mustChangePassword?: boolean;
  passwordHash?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  updatePassword: (userId: string, newPasswordHash: string, mustChange?: boolean) => Promise<boolean>;
  isLoading: boolean;
  createDemoUser?: (email: string, password: string, name: string, role: string) => Promise<any>;
}