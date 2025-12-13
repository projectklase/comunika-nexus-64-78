import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthContextType, UserPreferences } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';

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
    theme: 'dark-neon',
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    dateFormat: 'DD/MM/YYYY',
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

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
      
      // Para administradores, verificar status da assinatura
      let subscriptionStatus: string | undefined;
      if (userRole.role === 'administrador') {
        const { data: subscription } = await supabase
          .from('admin_subscriptions')
          .select('status')
          .eq('admin_id', userId)
          .single();
        
        if (subscription?.status) {
          subscriptionStatus = subscription.status;
          console.log(`[getUserProfile] Admin subscription status: ${subscriptionStatus}`);
        }
      }
      
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
        koins: profile.koins || 0,
        total_xp: profile.total_xp || 0,
        level_xp: (profile as any).level_xp || 0,
        subscriptionStatus,
      };
    } catch (error) {
      console.error('[getUserProfile] Erro crítico:', error);
      return null;
    }
  };

  // Function to create demo users if they don't exist
  // SECURITY: Bloqueado em produção para prevenir criação não autorizada de contas
  const createDemoUser = async (email: string, password: string, name: string, role: string) => {
    // Bloquear em produção
    if (import.meta.env.PROD) {
      console.error('[createDemoUser] Bloqueado em produção');
      return null;
    }
    
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

  // Helper to load gamification data for students
  const loadGamificationData = async (userId: string, role: string) => {
    if (role === 'aluno') {
      try {
        const { useStudentGamification } = await import('@/stores/studentGamification');
        await useStudentGamification.getState().loadFromDatabase(userId);
        console.log('[AuthContext] ✅ Gamification data loaded for student');
      } catch (err) {
        console.warn('[AuthContext] Failed to load gamification data:', err);
      }
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
              // Load gamification data for students
              await loadGamificationData(session.user.id, profile.role);
            } else {
              console.error('No profile found for user:', session.user.id);
              // Try once more after additional delay
              setTimeout(async () => {
                const retryProfile = await getUserProfile(session.user.id);
                if (retryProfile) {
                  setUser(retryProfile);
                  // Load gamification data for students
                  await loadGamificationData(session.user.id, retryProfile.role);
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await getUserProfile(session.user.id);
        if (profile) {
          setUser(profile);
          setSession(session);
          // Load gamification data for students
          await loadGamificationData(session.user.id, profile.role);
        }
        setIsLoading(false);
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
      // Reset theme to default before logout to prevent theme leakage
      const root = document.documentElement;
      root.removeAttribute('data-theme');
      root.classList.remove('dark');
      root.classList.add('dark'); // Default theme is dark-neon
      
      // Reset theme in zustand store to default so next login doesn't see stale premium theme identifier
      // Also clear lastEmail/rememberEmail to prevent email leakage between users
      import('@/stores/user-settings-store').then(({ useUserSettingsStore }) => {
        const store = useUserSettingsStore.getState();
        store.updateSetting('currentTheme', 'dark-neon');
        store.updateSetting('lastEmail', '');
        store.updateSetting('rememberEmail', false);
      });
      
      // CRÍTICO: Limpar dados de gamificação do localStorage para evitar vazamento entre usuários
      localStorage.removeItem('student-gamification');
      
      // Resetar Zustand store de gamificação para valores iniciais
      import('@/stores/studentGamification').then(({ useStudentGamification }) => {
        useStudentGamification.setState({
          lastCheckIn: '',
          streak: 0,
          xp: 0,
          forgiveness: { available: true, lastReset: '' },
          week: {},
          activityXP: {}
        });
      });
      
      // CRÍTICO: Limpar stores de posts para evitar vazamento de leitura/salvos/visualizações
      localStorage.removeItem('comunika_reads');
      localStorage.removeItem('comunika_saved');
      localStorage.removeItem('comunika:postReads:v1');
      localStorage.removeItem('comunika:postViews:v1');
      localStorage.removeItem('comunika_last_seen');
      
      // FASE 6: Limpar localStorage adicional para evitar vazamento
      localStorage.removeItem('comunika_read_rate_limit');
      localStorage.removeItem('aluno_feed_preferences');
      localStorage.removeItem('aluno_feed_filters');
      
      // CORREÇÃO: Limpar stores adicionais identificados na auditoria
      localStorage.removeItem('password_reset_requests');
      localStorage.removeItem('school_settings');
      localStorage.removeItem('comunika_subjects');
      
      // Limpar caches de dados que são recarregados do banco no próximo login
      localStorage.removeItem('comunika_people_v2');
      localStorage.removeItem('comunika_posts');
      localStorage.removeItem('comunika_classes');
      localStorage.removeItem('comunika_class_subjects');
      localStorage.removeItem('hygiene_report');
      
      // Limpar drafts de posts
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('draft:post:') || 
            key.startsWith('cal:professor:') || 
            key.startsWith('cal:secretaria:')) {
          localStorage.removeItem(key);
        }
      });
      
      // Resetar stores Zustand de posts para estado vazio
      import('@/stores/read-store').then(({ readStore }) => {
        readStore.clear();
      });
      import('@/stores/saved-store').then(({ savedStore }) => {
        savedStore.clear();
      });
      import('@/stores/post-reads.store').then(({ usePostReads }) => {
        usePostReads.setState({ reads: [] });
      });
      import('@/stores/post-views.store').then(({ usePostViews }) => {
        usePostViews.setState({ views: [] });
      });
      
      // Limpar dados do widget 3-2-1 do usuário atual
      if (user?.id) {
        const today = new Date().toISOString().split('T')[0];
        const prefixes = ['mood', 'intent', 'completed'];
        prefixes.forEach(prefix => {
          localStorage.removeItem(`communika.${prefix}.${user.id}.${today}`);
        });
        localStorage.removeItem(`communika.microSessions.${user.id}`);
      }
      
      // Limpar TODO o cache do React Query para evitar vazamento de dados
      queryClient.clear();
      
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

  // Função para atualizar dados do usuário do banco (sincronização de XP, koins, etc)
  const refetchUser = async (): Promise<User | null> => {
    if (!user?.id) return null;
    
    console.log('[refetchUser] Atualizando dados do usuário...');
    const freshProfile = await getUserProfile(user.id);
    if (freshProfile) {
      setUser(freshProfile);
      console.log('[refetchUser] ✅ Dados atualizados - XP:', freshProfile.total_xp, 'Koins:', freshProfile.koins);
      return freshProfile;
    }
    return null;
  };

  // Export createDemoUser function so it can be used in Login component
  const contextValue = {
    user,
    login,
    logout,
    updateUser,
    updatePassword,
    isLoading,
    createDemoUser,
    refetchUser,
  };

  return (
    <AuthContext.Provider value={contextValue as AuthContextType}>
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