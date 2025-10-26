import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { passwordResetStore } from '@/stores/password-reset-store';
import { notificationStore } from '@/stores/notification-store';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { TestTube, Bell, Zap } from 'lucide-react';

export const PasswordResetTester = () => {
  const [testEmail, setTestEmail] = useState('teste@klase.app');
  const { user } = useAuth();
  const { toast } = useToast();

  const createTestRequest = () => {
    try {
      const email = testEmail || `teste-${Date.now()}@klase.app`;
      const request = passwordResetStore.createRequest(email);
      
      console.log('🧪 Test password reset created:', {
        id: request.id,
        email: request.email,
        time: new Date().toLocaleTimeString()
      });

      toast({
        title: "Teste executado",
        description: `Solicitação criada para ${email}`,
      });
      
      // Log notification stats
      const stats = notificationStore.getStats('SECRETARIA');
      console.log('🔔 Notification stats after test:', stats);
      
    } catch (error: any) {
      toast({
        title: "Erro no teste",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getNotificationStats = () => {
    return notificationStore.getStats('SECRETARIA');
  };

  // Only show for secretaria users or in development
  if (!user || (user.role !== 'secretaria' && process.env.NODE_ENV !== 'development')) {
    return null;
  }

  const stats = getNotificationStats();

  return (
    <Card className="border-dashed border-orange-200 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
          <TestTube className="w-5 h-5" />
          Teste de Reset de Senha
        </CardTitle>
        <CardDescription>
          Ferramenta para testar o fluxo completo de notificações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Email para teste"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="flex-1"
          />
          <Button onClick={createTestRequest} variant="outline">
            <Zap className="w-4 h-4 mr-2" />
            Criar Teste
          </Button>
        </div>

        <div className="flex items-center gap-4 p-3 bg-background/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="text-sm font-medium">Notificações:</span>
          </div>
          
          <Badge variant="secondary">
            Total: {stats.total}
          </Badge>
          
          <Badge variant="destructive">
            Não lidas: {stats.unread}
          </Badge>
          
          <Badge variant="default">
            Lidas: {stats.read}
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground">
          <strong>Fluxo esperado:</strong>
          <ol className="list-decimal list-inside mt-1 space-y-1">
            <li>Criar solicitação → Badge no sino aparece</li>
            <li>Toast de notificação é exibido</li>
            <li>Clicar no sino → Lista a notificação</li>
            <li>Clicar em "Abrir" → Navega para Resets focando a solicitação</li>
            <li>Notificação é marcada como lida</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};