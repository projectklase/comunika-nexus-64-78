import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield, User, GraduationCap, Users } from 'lucide-react';

/**
 * 🚨 DEVELOPMENT ONLY COMPONENT 🚨
 * 
 * This component provides quick login functionality for testing.
 * It is ONLY available in development mode and should NEVER be deployed to production.
 * 
 * Security Notes:
 * - This component is route-guarded in App.tsx with process.env.NODE_ENV check
 * - Credentials are still hardcoded here but page is not accessible in production
 * - These are TEST ACCOUNTS ONLY - production accounts must use normal login flow
 */

const QuickLoginDev = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // 🚨 DEV ONLY: Test account credentials
  const testAccounts = {
    secretaria: { 
      email: 'secretaria@comunika.com', 
      password: '123456', 
      name: 'Maria Silva',
      icon: Users,
      color: 'bg-blue-500'
    },
    professor: { 
      email: 'julianegrini@gmail.com', 
      password: 'Prof9105!', 
      name: 'Juliane Grini',
      icon: GraduationCap,
      color: 'bg-green-500'
    },
    aluno: { 
      email: 'alinemenezes@gmail.com', 
      password: 'Praia-Chuva-Lua-814$', 
      name: 'Aline Menezes',
      icon: User,
      color: 'bg-purple-500'
    },
    administrador: { 
      email: 'admin.klase@comunika.com', 
      password: 'NexusAdmin#2025!', 
      name: 'Admin Klase',
      icon: Shield,
      color: 'bg-red-500'
    }
  };

  const handleQuickLogin = async (role: keyof typeof testAccounts) => {
    setIsLoading(role);
    
    try {
      const { email, password, name } = testAccounts[role];
      console.log(`[DEV] QuickLogin attempt: ${role} (${email})`);
      
      const result = await login(email, password);
      
      if (result.success) {
        toast({
          title: "✅ Login de Desenvolvimento",
          description: `Bem-vindo(a), ${name}!`,
        });
        navigate('/dashboard');
      } else {
        toast({
          variant: "destructive",
          title: "Erro no Login",
          description: result.error || 'Falha na autenticação',
        });
      }
    } catch (error) {
      console.error('[DEV] QuickLogin error:', error);
      toast({
        variant: "destructive",
        title: "Erro Interno",
        description: "Erro ao processar login de desenvolvimento",
      });
    } finally {
      setIsLoading(null);
    }
  };

  // Production safety check (double guard)
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="text-destructive">Acesso Negado</CardTitle>
            <CardDescription>
              Esta página não está disponível em produção.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/10" />
      
      <Card className="w-full max-w-2xl relative z-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-yellow-500" />
            Quick Login - Desenvolvimento
          </CardTitle>
          <CardDescription>
            🚨 ATENÇÃO: Esta página é apenas para desenvolvimento e testes.
            Não deve estar acessível em produção.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(testAccounts).map(([role, account]) => {
              const Icon = account.icon;
              return (
                <Button
                  key={role}
                  variant="outline"
                  size="lg"
                  className="h-auto flex-col items-start p-4 space-y-2"
                  onClick={() => handleQuickLogin(role as keyof typeof testAccounts)}
                  disabled={isLoading !== null}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className={`p-2 rounded ${account.color} text-white`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-semibold capitalize">{role}</span>
                  </div>
                  <div className="text-xs text-muted-foreground text-left w-full">
                    {account.name}
                  </div>
                  <div className="text-xs text-muted-foreground text-left w-full opacity-70">
                    {account.email}
                  </div>
                </Button>
              );
            })}
          </div>

          <div className="pt-4 border-t">
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => navigate('/login')}
            >
              ← Voltar para Login Normal
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center pt-2">
            <p>⚠️ Estas são contas de teste para desenvolvimento.</p>
            <p>Em produção, use apenas o fluxo de login normal.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickLoginDev;
