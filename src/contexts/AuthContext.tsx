import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthContextType, UserPreferences } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default preferences
const defaultPreferences: UserPreferences = {
  notifications: {
    email: true,
    push: true,
    dailySummary: true,
    posts: true,
    activities: true,
    reminders: true,
  },
  ui: {
    theme: 'dark',
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    dateFormat: 'DD/MM/YYYY',
  },
};

// Mock users data
const mockUsers: Array<User & { password: string }> = [
  {
    id: '1',
    name: 'Maria Silva',
    email: 'secretaria@comunika.com',
    role: 'secretaria',
    password: '123456',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
    preferences: defaultPreferences
  },
  {
    id: 'prof-joao',
    name: 'João Santos',
    email: 'professor@comunika.com',
    role: 'professor',
    password: '123456',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    preferences: defaultPreferences
  },
  {
    id: '3',
    name: 'Ana Costa',
    email: 'aluno@comunika.com',
    role: 'aluno',
    password: '123456',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    preferences: defaultPreferences
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user on mount
    const storedUser = localStorage.getItem('comunika_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const foundUser = mockUsers.find(u => u.email === email && u.password === password);
    
    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('comunika_user', JSON.stringify(userWithoutPassword));
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('comunika_user');
    localStorage.removeItem('comunika_user_preferences');
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('comunika_user', JSON.stringify(updatedUser));
  };

  const updatePassword = async (userId: string, newPasswordHash: string, mustChange = false): Promise<boolean> => {
    try {
      // Update in mockUsers array
      const userIndex = mockUsers.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        mockUsers[userIndex].password = newPasswordHash;
        mockUsers[userIndex].mustChangePassword = mustChange;
      }

      // Update in people store if exists
      const peopleData = localStorage.getItem('comunika_people_v2');
      if (peopleData) {
        const people = JSON.parse(peopleData);
        const updatedPeople = people.map(p => 
          p.id === userId ? { ...p, passwordHash: newPasswordHash, mustChangePassword: mustChange } : p
        );
        localStorage.setItem('comunika_people_v2', JSON.stringify(updatedPeople));
      }

      // Update current user if it's the same
      if (user && user.id === userId) {
        updateUser({ passwordHash: newPasswordHash, mustChangePassword: mustChange });
      }

      return true;
    } catch (error) {
      console.error('Failed to update password:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, updatePassword, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};