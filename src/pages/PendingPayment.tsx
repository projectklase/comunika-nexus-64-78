import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, LogOut, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const PendingPayment: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleFinalizePayment = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Buscar o plano da assinatura pendente
      const { data: subscription, error: subError } = await supabase
        .from('admin_subscriptions')
        .select('plan_id, subscription_plans(slug)')
        .eq('admin_id', user.id)
        .eq('status', 'pending_payment')
        .single();

      if (subError || !subscription) {
        toast.error('Erro ao buscar dados da assinatura');
        setIsLoading(false);
        return;
      }

      const planSlug = (subscription.subscription_plans as any)?.slug || 'challenger';

      // Criar checkout session para o plano
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          priceType: planSlug,
          returnUrl: `${window.location.origin}/admin/assinatura`
        }
      });

      if (error || !data?.url) {
        toast.error('Erro ao criar sessão de pagamento');
        setIsLoading(false);
        return;
      }

      // Redirecionar para o Stripe
      window.location.href = data.url;
    } catch (error) {
      console.error('Erro ao finalizar pagamento:', error);
      toast.error('Erro ao processar pagamento');
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md glass-card border-border/50">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-warning" />
          </div>
          <CardTitle className="text-2xl">Pagamento Pendente</CardTitle>
          <CardDescription className="text-base">
            Sua conta foi criada, mas o pagamento ainda não foi concluído. 
            Finalize o pagamento para acessar a plataforma.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Button
            onClick={handleFinalizePayment}
            disabled={isLoading}
            className="w-full h-12 text-base font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Redirecionando...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Finalizar Pagamento
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full h-12 text-base"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Sair
          </Button>
          
          <p className="text-xs text-muted-foreground text-center pt-2">
            Precisa de ajuda? Entre em contato: lucas@klasetech.com
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingPayment;
