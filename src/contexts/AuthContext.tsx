import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthContextType, UserPreferences } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { SchoolSelectionModal } from '@/components/auth/SchoolSelectionModal';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

// Default preferences for new users
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSchoolSelector, setShowSchoolSelector] = useState(false);
  const [userSchools, setUserSchools] = useState<any[]>([]);

  // CORREÇÃO 2 e 5: Helper function com retry e validação completa
  const getUserProfile = async (userId: string, retryCount = 0): Promise<User | null> => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 500;

    try {
      console.log(`[getUserProfile] Tentativa ${retryCount + 1}/${MAX_RETRIES + 1} para usuário ${userId}`);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[getUserProfile] Erro ao buscar perfil:', error);
        return null;
      }

      if (!profile) {
        console.error('[getUserProfile] Perfil não encontrado');
        return null;
      }

      // SEGURANÇA: Buscar role APENAS da tabela user_roles
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleError || !userRole) {
        console.warn(`[getUserProfile] Role não encontrada (tentativa ${retryCount + 1}):`, roleError);
        
        // CORREÇÃO 2: Retry automático se role não for encontrada
        if (retryCount < MAX_RETRIES) {
          console.log(`[getUserProfile] Aguardando ${RETRY_DELAY}ms antes do retry...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return getUserProfile(userId, retryCount + 1);
        }
        
        console.error('[getUserProfile] Role não encontrada após todas as tentativas');
        return null; // Sem role = sem acesso
      }

      // CORREÇÃO 5: Validar perfil completo
      if (!profile.name || !profile.email || !userRole.role) {
        console.error('[getUserProfile] Perfil incompleto:', { 
          hasName: !!profile.name, 
          hasEmail: !!profile.email, 
          hasRole: !!userRole.role 
        });
        return null;
      }

      console.log(`[getUserProfile] ✅ Perfil completo encontrado para ${profile.email} com role ${userRole.role}`);
      
      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: userRole.role as 'secretaria' | 'professor' | 'aluno' | 'administrador',
        avatar: profile.avatar,
        phone: profile.phone,
        classId: profile.class_id,
        currentSchoolId: (profile as any).current_school_id,
        preferences: (profile.preferences as unknown as UserPreferences) || defaultPreferences,
        mustChangePassword: profile.must_change_password,
      };
    } catch (error) {
      console.error('[getUserProfile] Erro crítico:', error);
      return null;
    }
  };

  // Function to create demo users if they don't exist
  const createDemoUser = async (email: string, password: string, name: string, role: string) => {
    try {
      console.log(`Attempting to create demo user: ${email} with role: ${role}`);
      
      // Check if user already exists first
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .maybeSingle();
      
      if (existingProfile) {
        console.log('User already exists in profiles, proceeding with login');
        return { user: { email } };
      }
      
      // Use edge function to create demo user with admin privileges
      const { data, error } = await supabase.functions.invoke('create-demo-user', {
        body: {
          email,
          password,
          name,
          role,
        }
      });

      if (error) {
        console.error('Error creating demo user via edge function:', error);
        return null;
      }

      if (data && !data.success) {
        console.error('Demo user creation failed:', data.error);
        return null;
      }

      console.log('Demo user created successfully via edge function');
      return { user: { email } };
    } catch (error) {
      console.error('Error in createDemoUser:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        
        if (session?.user) {
          // Add delay to ensure profile is created
          setTimeout(async () => {
            const profile = await getUserProfile(session.user.id);
            if (profile) {
              setUser(profile);
              
              // ✅ Verificar se usuário tem múltiplas escolas (apenas professores)
              if (profile.role === 'professor') {
                const { data: memberships } = await supabase
                  .from('school_memberships')
                  .select('school_id, schools(id, name, slug, logo_url)')
                  .eq('user_id', profile.id);
                
                if (memberships && memberships.length > 1) {
                  setUserSchools(memberships.map(m => (m as any).schools));
                  
                  // Mostrar modal apenas na primeira vez
                  const hasSeenSelector = localStorage.getItem('has_seen_school_selector');
                  if (!hasSeenSelector) {
                    setShowSchoolSelector(true);
                  }
                }
              }
            } else {
              console.error('No profile found for user:', session.user.id);
              // Try once more after additional delay
              setTimeout(async () => {
                const retryProfile = await getUserProfile(session.user.id);
                if (retryProfile) {
                  setUser(retryProfile);
                } else {
                  console.error('Profile still not found after retry');
                  setUser(null);
                }
                setIsLoading(false);
              }, 1000);
              return;
            }
            setIsLoading(false);
          }, 500);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        getUserProfile(session.user.id).then(profile => {
          if (profile) {
            setUser(profile);
            setSession(session);
          }
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // CORREÇÃO 1: Fallback para resetar isLoading se ficar travado
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('[AuthContext] ⚠️ isLoading travado em true após 3s, forçando reset');
        setIsLoading(false);
      }
    }, 3000);
    
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      console.log(`[login] Attempting login for: ${email}`);
      
      // CORREÇÃO 6: Criar timeout de 15s para prevenir travamento
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('LOGIN_TIMEOUT')), 15000);
      });
      
      // Race entre login e timeout
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeoutPromise
      ]);
      
      const { data, error } = result as any;

      if (error) {
        console.error('Login error:', error.message, error);
        setIsLoading(false);
        
        // Mapear erros específicos para mensagens amigáveis
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Email ou senha incorretos.' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { success: false, error: 'Email não confirmado. Verifique sua caixa de entrada.' };
        }
        if (error.message.includes('Too many requests')) {
          return { success: false, error: 'Muitas tentativas. Aguarde alguns minutos.' };
        }
        
        return { success: false, error: 'Erro ao fazer login. Tente novamente.' };
      }

      if (data.user) {
        console.log('[login] ✅ Login successful for:', data.user.email);
        
        // Registrar login no histórico para analytics
        supabase.functions.invoke('track-login').catch(err => {
          console.warn('[login] ⚠️ Falha ao registrar login no histórico:', err);
          // Não bloqueia o login se falhar
        });
        
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: 'Erro desconhecido ao fazer login.' };
    } catch (error: any) {
      console.error('[login] ❌ Login error:', error);
      setIsLoading(false);
      
      // CORREÇÃO 6: Tratar timeout especificamente
      if (error.message === 'LOGIN_TIMEOUT') {
        return { success: false, error: 'Tempo esgotado. Verifique sua conexão.' };
      }
      
      return { success: false, error: 'Erro de conexão. Verifique sua internet.' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    
    try {
      // Update in Supabase profiles table
      const updateData: any = {
        name: updates.name,
        avatar: updates.avatar,
        phone: updates.phone,
        class_id: updates.classId,
        preferences: updates.preferences as any,
        must_change_password: updates.mustChangePassword,
      };
      
      // Add current_school_id if present
      if (updates.currentSchoolId) {
        updateData.current_school_id = updates.currentSchoolId;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating user profile:', error);
        return;
      }

      // Update local state
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
    } catch (error) {
      console.error('Error in updateUser:', error);
    }
  };

  const updatePassword = async (userId: string, newPassword: string, mustChange = false): Promise<boolean> => {
    try {
      // Update password in auth.users table
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Error updating password:', error);
        return false;
      }

      // Update must_change_password flag in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ must_change_password: mustChange })
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating password flag:', profileError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to update password:', error);
      return false;
    }
  };

  // Export createDemoUser function so it can be used in Login component
  const contextValue = {
    user,
    login,
    logout,
    updateUser,
    updatePassword,
    isLoading,
    createDemoUser, // Add this to the context
  };

  return (
    <AuthContext.Provider value={contextValue as AuthContextType}>
      {children}
      <SchoolSelectionModal
        open={showSchoolSelector}
        onOpenChange={setShowSchoolSelector}
      />
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