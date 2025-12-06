import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield } from 'lucide-react';

interface SuperAdminGuardProps {
  children: React.ReactNode;
}

export function SuperAdminGuard({ children }: SuperAdminGuardProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkSuperAdmin() {
      if (!user) {
        setIsSuperAdmin(false);
        setIsChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .rpc('is_superadmin', { _user_id: user.id });

        if (error) {
          console.error('Error checking superadmin status:', error);
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(data === true);
        }
      } catch (err) {
        console.error('Error checking superadmin:', err);
        setIsSuperAdmin(false);
      } finally {
        setIsChecking(false);
      }
    }

    if (!authLoading) {
      checkSuperAdmin();
    }
  }, [user, authLoading]);

  // Loading state
  if (authLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Shield className="w-16 h-16 text-primary animate-pulse" />
            <Loader2 className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
          </div>
          <p className="text-muted-foreground">Verificando credenciais...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Not a superadmin
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="glass-card p-8 max-w-md text-center space-y-4">
          <Shield className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Acesso Restrito</h1>
          <p className="text-muted-foreground">
            Esta área é exclusiva para administradores da plataforma Klase.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
