import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Mail, Smartphone, Clock, MessageSquare, BookOpen, Calendar, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BlockedSetting } from '@/components/ui/blocked-setting';
import { isFeatureEnabled, trackBlockedFeatureView } from '@/lib/feature-flags';

export function NotificationsTab() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState(user?.preferences.notifications || {
    email: true,
    push: true,
    dailySummary: true,
    posts: true,
    activities: true,
    reminders: true,
  });

  const handleToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateUser({
        preferences: {
          ...user?.preferences,
          notifications,
        },
      });

      toast({
        title: 'Sucesso',
        description: 'Configurações de notificação salvas com sucesso!',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configurações. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 overflow-hidden">
      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Canais de Notificação
          </CardTitle>
          <CardDescription>
            Escolha como você quer receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isFeatureEnabled('NOTIF_EMAIL_ENABLED') ? (
            <BlockedSetting
              title="E-mail"
              description="Receba notificações por e-mail"
              icon={<Mail className="h-4 w-4 text-muted-foreground" />}
              type="switch"
              learnMoreContent={
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    As notificações por e-mail estarão disponíveis em breve e incluirão:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Resumos diários de atividades</li>
                    <li>• Lembretes de prazos importantes</li>
                    <li>• Comunicados da secretaria</li>
                    <li>• Configuração de frequência personalizada</li>
                  </ul>
                </div>
              }
              onClick={() => trackBlockedFeatureView('email_notifications')}
            />
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="email-notifications">E-mail</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Receba notificações por e-mail
                </p>
              </div>
              <div className="self-end sm:self-center">
                <Switch
                  id="email-notifications"
                  checked={notifications.email}
                  onCheckedChange={() => handleToggle('email')}
                />
              </div>
            </div>
          )}

          <Separator />

          {!isFeatureEnabled('NOTIF_PUSH_ENABLED') ? (
            <BlockedSetting
              title="Push (Navegador)"
              description="Receba notificações push no navegador"
              icon={<Smartphone className="h-4 w-4 text-muted-foreground" />}
              type="switch"
              learnMoreContent={
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    As notificações push estarão disponíveis em breve e permitirão:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Alertas instantâneos no navegador</li>
                    <li>• Notificações mesmo com a aba fechada</li>
                    <li>• Controle granular por tipo de conteúdo</li>
                    <li>• Sincronização entre dispositivos</li>
                  </ul>
                </div>
              }
              onClick={() => trackBlockedFeatureView('push_notifications')}
            />
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="push-notifications">Push (Navegador)</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Receba notificações push no navegador
                </p>
              </div>
              <div className="self-end sm:self-center">
                <Switch
                  id="push-notifications"
                  checked={notifications.push}
                  onCheckedChange={() => handleToggle('push')}
                />
              </div>
            </div>
          )}

          <Separator />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="daily-summary">Resumo Diário</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Receba um resumo das atividades do dia
              </p>
            </div>
            <div className="self-end sm:self-center">
              <Switch
                id="daily-summary"
                checked={notifications.dailySummary}
                onCheckedChange={() => handleToggle('dailySummary')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Tipos de Notificação
          </CardTitle>
          <CardDescription>
            Configure que tipos de atividades você quer ser notificado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="posts-notifications">Posts da Secretaria</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Novos posts e comunicados importantes
              </p>
            </div>
            <div className="self-end sm:self-center">
              <Switch
                id="posts-notifications"
                checked={notifications.posts}
                onCheckedChange={() => handleToggle('posts')}
              />
            </div>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="activities-notifications">Atividades e Entregas</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Notificações sobre atividades e prazos de entrega
              </p>
            </div>
            <div className="self-end sm:self-center">
              <Switch
                id="activities-notifications"
                checked={notifications.activities}
                onCheckedChange={() => handleToggle('activities')}
              />
            </div>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="reminders-notifications">Lembretes</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Lembretes de vencimentos e agendamentos
              </p>
            </div>
            <div className="self-end sm:self-center">
              <Switch
                id="reminders-notifications"
                checked={notifications.reminders}
                onCheckedChange={() => handleToggle('reminders')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t">
        <Button onClick={handleSave} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}