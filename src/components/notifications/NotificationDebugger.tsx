import { useState } from 'react';
import { Bug, Play, AlertTriangle, CheckCircle, Info, Database, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { notificationStore } from '@/stores/notification-store';
import { passwordResetStore } from '@/stores/password-reset-store';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedNotifications } from '@/hooks/useEnhancedNotifications';

export const NotificationDebugger = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOnline, lastCheck, preferences } = useEnhancedNotifications();
  const [isDebugging, setIsDebugging] = useState(false);

  const createTestNotification = () => {
    const testEmail = `test-${Date.now()}@example.com`;
    
    try {
      // Create a test password reset request
      const request = passwordResetStore.createRequest(testEmail);
      
      toast({
        title: "Notificação de teste criada",
        description: `Solicitação de reset criada para ${testEmail}`,
      });
      
      return request;
    } catch (error) {
      toast({
        title: "Erro ao criar notificação de teste",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
      return null;
    }
  };

  const createDirectNotification = () => {
    try {
      const notification = notificationStore.add({
        type: 'RESET_REQUESTED',
        title: 'Teste de Notificação Direta',
        message: `Notificação de teste criada em ${new Date().toLocaleTimeString()}`,
        roleTarget: 'SECRETARIA',
        link: '/secretaria/notificacoes',
        meta: { test: true, timestamp: Date.now() }
      });

      toast({
        title: "Notificação direta criada",
        description: "Verifique o sino de notificações",
      });

      return notification;
    } catch (error) {
      toast({
        title: "Erro ao criar notificação direta",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
      return null;
    }
  };

  const runSystemDiagnostic = () => {
    setIsDebugging(true);
    
    const diagnostics = {
      user: !!user,
      userRole: user?.role,
      isSecretaria: user?.role === 'secretaria',
      localStorage: {
        notifications: !!localStorage.getItem('komunika.notifications.v1'),
        passwordResets: !!localStorage.getItem('comunika.password_resets.v1'),
        user: !!localStorage.getItem('comunika_user')
      },
      permissions: {
        notification: Notification.permission,
        storage: typeof(Storage) !== "undefined"
      },
      counts: {
        notifications: notificationStore.list({ roleTarget: 'SECRETARIA' }).length,
        unreadNotifications: notificationStore.list({ roleTarget: 'SECRETARIA', status: 'UNREAD' }).length,
        passwordResets: passwordResetStore.list().length
      },
      browser: {
        online: navigator.onLine,
        notificationSupport: 'Notification' in window,
        localStorageSupport: typeof(Storage) !== "undefined"
      }
    };

    console.log('🔍 Sistema de Notificações - Diagnóstico:', diagnostics);
    
    toast({
      title: "Diagnóstico executado",
      description: "Verifique o console do navegador para detalhes completos",
    });

    setTimeout(() => setIsDebugging(false), 2000);
  };

  const clearAllData = () => {
    try {
      notificationStore.clear();
      localStorage.removeItem('komunika.notifications.v1');
      localStorage.removeItem('komunika.password_resets.v1');
      
      toast({
        title: "Dados limpos",
        description: "Todas as notificações e resets foram removidos",
      });
    } catch (error) {
      toast({
        title: "Erro ao limpar dados",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    }
  };

  if (!user || user.role !== 'secretaria') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
            <p>Debugger disponível apenas para usuários da Secretaria</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = notificationStore.getStats('SECRETARIA');
  const resets = passwordResetStore.getStats();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="w-5 h-5" />
          Debug do Sistema de Notificações
        </CardTitle>
        <CardDescription>
          Ferramenta para diagnosticar e testar o sistema de notificações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status do Sistema */}
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <Info className="w-4 h-4" />
            Status do Sistema
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm">Conexão</span>
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <>
                    <Wifi className="w-4 h-4 text-success" />
                    <Badge variant="secondary">Online</Badge>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-destructive" />
                    <Badge variant="destructive">Offline</Badge>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm">Última Verificação</span>
              <span className="text-xs text-muted-foreground">
                {lastCheck.toLocaleTimeString()}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm">Auto-refresh</span>
              <Badge variant={preferences.autoRefresh ? "secondary" : "destructive"}>
                {preferences.autoRefresh ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm">Push Notifications</span>
              <Badge variant={Notification.permission === 'granted' ? "secondary" : "destructive"}>
                {Notification.permission}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Estatísticas */}
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <Database className="w-4 h-4" />
            Estatísticas
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Notificações</div>
              <div className="text-lg font-medium">{stats.total}</div>
              <div className="text-xs text-muted-foreground">
                {stats.unread} não lidas
              </div>
            </div>
            
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Resets de Senha</div>
              <div className="text-lg font-medium">{resets.total}</div>
              <div className="text-xs text-muted-foreground">
                {resets.newRequests} novos
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Ações de Teste */}
        <div className="space-y-4">
          <h3 className="font-medium">Ferramentas de Teste</h3>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={createTestNotification}
            >
              <Play className="w-4 h-4 mr-2" />
              Criar Reset Teste
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={createDirectNotification}
            >
              <Play className="w-4 h-4 mr-2" />
              Notificação Direta
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={runSystemDiagnostic}
              disabled={isDebugging}
            >
              <Bug className="w-4 h-4 mr-2" />
              {isDebugging ? 'Executando...' : 'Diagnóstico'}
            </Button>
            
            <Button 
              variant="destructive" 
              size="sm"
              onClick={clearAllData}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Limpar Dados
            </Button>
          </div>
        </div>

        {/* Informações de Debug */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Usuário: {user.name} ({user.role})</div>
          <div>ID: {user.id}</div>
          <div>Intervalo: {preferences.refreshInterval}s</div>
        </div>
      </CardContent>
    </Card>
  );
};