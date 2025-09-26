import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthContextType, UserPreferences } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

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

  // Helper function to get user profile from Supabase
  const getUserProfile = async (userId: string): Promise<User | null> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role as 'secretaria' | 'professor' | 'aluno',
        avatar: profile.avatar,
        phone: profile.phone,
        classId: profile.class_id,
        defaultSchoolSlug: profile.default_school_slug,
        preferences: (profile.preferences as unknown as UserPreferences) || defaultPreferences,
        mustChangePassword: profile.must_change_password,
      };
    } catch (error) {
      console.error('Error in getUserProfile:', error);
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

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log(`Attempting login for: ${email}`);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error.message, error);
        setIsLoading(false);
        return false;
      }

      if (data.user) {
        console.log('Login successful for:', data.user.email);
        // The auth state change listener will handle setting the user
        return true;
      }

      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      return false;
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
      const { error } = await supabase
        .from('profiles')
        .update({
          name: updates.name,
          avatar: updates.avatar,
          phone: updates.phone,
          class_id: updates.classId,
          default_school_slug: updates.defaultSchoolSlug,
          preferences: updates.preferences as any,
          must_change_password: updates.mustChangePassword,
        })
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