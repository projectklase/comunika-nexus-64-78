import React, { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, Clock, Star, LogOut, Sparkles, RefreshCw } from 'lucide-react';

const StudentWaitingRoom: React.FC = () => {
  const { user, logout, isLoading: authLoading } = useAuth();
  const { currentSchool, isLoading: schoolLoading, refetchSchools } = useSchool();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);

  // Auto-refresh: Verificar periodicamente se o acesso foi liberado
  useEffect(() => {
    if (!currentSchool?.id) return;

    const checkAccess = async () => {
      try {
        const { data } = await supabase
          .from('schools')
          .select('is_student_access_active')
          .eq('id', currentSchool.id)
          .single();
        
        if (data?.is_student_access_active === true) {
          await refetchSchools();
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('[WaitingRoom] Erro ao verificar acesso:', error);
      }
    };

    // Verificar a cada 15 segundos
    const interval = setInterval(checkAccess, 15000);
    
    return () => clearInterval(interval);
  }, [currentSchool?.id, navigate, refetchSchools]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      await refetchSchools();
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Loading state
  if (authLoading || schoolLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="glass-card p-8 rounded-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Carregando...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect if not a student
  if (user.role !== 'aluno') {
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect if school already enabled access
  if (currentSchool?.is_student_access_active === true) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg glass-card border-purple-500/30">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center animate-pulse">
            <Rocket className="w-12 h-12 text-purple-400" />
          </div>
          
          <CardTitle className="text-3xl gradient-text">
            Quase Lá! 🚀
          </CardTitle>
          
          <CardDescription className="text-lg">
            Seu login está funcionando perfeitamente!
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-3 p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
            <div className="flex items-center justify-center gap-2 text-purple-400">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">Preparando sua experiência...</span>
            </div>
            <p className="text-muted-foreground">
              A escola <span className="text-foreground font-medium">{currentSchool?.name || 'sua escola'}</span> ainda 
              está preparando tudo para você. Em breve você terá acesso a todas as funcionalidades!
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              O que te espera:
            </h3>
          <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 text-center">
                <Star className="w-6 h-6 text-green-400 mx-auto mb-1" />
                <span className="text-xs text-muted-foreground">Missões</span>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 text-center">
                <Star className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                <span className="text-xs text-muted-foreground">Recompensas</span>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-center">
                <Star className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                <span className="text-xs text-muted-foreground">Klasemons</span>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-center">
                <Star className="w-6 h-6 text-amber-400 mx-auto mb-1" />
                <span className="text-xs text-muted-foreground">Ranking</span>
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground border-t border-border pt-4">
            <p>Logado como: <span className="text-foreground">{user?.name}</span></p>
            <p className="text-xs mt-1">{user?.email}</p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Button
              variant="secondary"
              onClick={handleManualCheck}
              disabled={isChecking}
              className="h-10 px-4"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Verificar
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleLogout}
              className="h-10 px-4"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            Precisa de ajuda? Fale com sua escola.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentWaitingRoom;
