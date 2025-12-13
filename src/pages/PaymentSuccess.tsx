import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, Mail, ArrowRight } from 'lucide-react';
import klaseLogo from '@/assets/logo-klase-chromado.png';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const confirmPayment = async () => {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        setStatus('error');
        setErrorMessage('ID da sessão não encontrado');
        return;
      }

      try {
        // Call confirm-payment to update subscription and send welcome email
        const { data, error } = await supabase.functions.invoke('confirm-payment', {
          body: { session_id: sessionId }
        });

        if (error) {
          console.error('Error confirming payment:', error);
          throw new Error(error.message || 'Erro ao confirmar pagamento');
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Erro ao confirmar pagamento');
        }

        // Sign out so user starts fresh
        await logout();
        
        setStatus('success');
      } catch (error: any) {
        console.error('Payment confirmation error:', error);
        setErrorMessage(error.message || 'Erro ao processar pagamento');
        setStatus('error');
      }
    };

    confirmPayment();
  }, [searchParams, logout]);

  const handleGoToLogin = () => {
    navigate('/login');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-lg font-medium">Confirmando pagamento...</p>
          <p className="text-sm text-muted-foreground">Aguarde enquanto processamos sua assinatura</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-destructive/30">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold">Erro no Processamento</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-lg bg-card/80 backdrop-blur-sm border-primary/20 shadow-2xl overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-8 text-center border-b border-primary/10">
          <img 
            src={klaseLogo} 
            alt="Klase" 
            className="h-16 mx-auto mb-4 drop-shadow-lg"
          />
          <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-4 ring-4 ring-green-500/30 animate-in zoom-in-50 duration-500">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground animate-in fade-in slide-in-from-bottom-2 duration-500">
            Pagamento Confirmado!
          </h1>
        </div>

        <CardContent className="p-8 space-y-6">
          {/* Welcome message */}
          <div className="text-center space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-700 delay-100">
            <h2 className="text-xl font-semibold">
              Bem-vindo(a) ao Klase! 🎉
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Sua conta foi ativada com sucesso e você já pode começar a utilizar 
              a plataforma educacional gamificada mais completa do mercado.
            </p>
          </div>

          {/* Email notification box */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Verifique seu email</h3>
                <p className="text-sm text-muted-foreground">
                  Enviamos os dados de acesso e um guia completo de primeiros passos 
                  para o email cadastrado. Confira sua caixa de entrada.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <Button 
            onClick={handleGoToLogin} 
            size="lg"
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-300"
          >
            Realizar Login
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          {/* Support info */}
          <p className="text-center text-xs text-muted-foreground animate-in fade-in duration-700 delay-500">
            Dúvidas? Entre em contato: lucas@klasetech.com
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
