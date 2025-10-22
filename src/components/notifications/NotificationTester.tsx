import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNotificationContext } from '@/contexts/NotificationContext';
import { notificationStore } from '@/stores/notification-store';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, TestTube, Sparkles, AlertTriangle, Calendar, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateCalendarLink } from '@/utils/deep-links';

export function NotificationTester() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOpen, toggle, panelData } = useNotificationContext();
  const [testCount, setTestCount] = useState(0);

  if (!user) return null;

  const roleTarget = user.role.toUpperCase() as 'SECRETARIA' | 'PROFESSOR' | 'ALUNO';

  const addTestNotification = (type: 'normal' | 'important' | 'holiday') => {
    const count = testCount + 1;
    setTestCount(count);

    switch (type) {
      case 'normal':
        notificationStore.add({
          type: 'POST_NEW',
          title: `Nova atividade de Matemática #${count}`,
          message: 'Foi publicada uma nova atividade: "Exercícios de álgebra linear" para a turma 3º A.',
          roleTarget,
          userId: user.id,
          link: '/professor/atividades',
          meta: {
            postType: 'ATIVIDADE',
            authorName: 'Prof. Silva',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        });
        break;

      case 'important':
        notificationStore.add({
          type: 'POST_NEW',
          title: `🔥 PROVA IMPORTANTE - Física #${count}`,
          message: 'Prova de física marcada para próxima sexta-feira às 14h. Revisar cap. 1-5.',
          roleTarget,
          userId: user.id,
          link: '/professor/atividades',
          meta: {
            postType: 'PROVA',
            authorName: 'Prof. Santos',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
          }
        });
        break;

      case 'holiday':
        notificationStore.add({
          type: 'HOLIDAY',
          title: `🎉 Feriado Nacional #${count}`,
          message: 'Dia da Independência - Não haverá aulas.',
          roleTarget,
          userId: user.id,
          link: generateCalendarLink('2024-09-07'), // Adicionar link para o calendário
          meta: {
            holidayDate: '2024-09-07'
          }
        });
        break;
    }

    toast({
      title: 'Notificação de teste criada',
      description: `Tipo: ${type} | Total: ${panelData.state.unreadCount + 1}`,
    });
  };

  const clearAllNotifications = () => {
    notificationStore.clear();
    setTestCount(0);
    toast({
      title: 'Todas as notificações removidas',
      description: 'Dados de teste limpos.',
    });
  };

  const { state } = panelData;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          Testador de Notificações
        </CardTitle>
        <CardDescription>
          Teste o sistema de notificações
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="text-sm">Painel:</span>
          </div>
          <Badge variant={isOpen ? 'default' : 'secondary'}>
            {isOpen ? 'Aberto' : 'Fechado'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-lg font-bold text-primary">{state.unreadCount}</div>
            <div className="text-xs text-muted-foreground">Não lidas</div>
          </div>
        </div>

        {/* Test Actions */}
        <div className="space-y-2">
          <Button
            onClick={() => addTestNotification('normal')}
            className="w-full"
            variant="outline"
            size="sm"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Criar Novidade
          </Button>

          <Button
            onClick={() => addTestNotification('important')}
            className="w-full"
            variant="outline"
            size="sm"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Criar Importante
          </Button>

          <Button
            onClick={() => addTestNotification('holiday')}
            className="w-full"
            variant="outline"
            size="sm"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Criar Feriado
          </Button>
        </div>

        {/* Control Actions */}
        <div className="flex gap-2">
          <Button
            onClick={toggle}
            variant={isOpen ? 'default' : 'secondary'}
            size="sm"
            className="flex-1"
          >
            {isOpen ? 'Fechar' : 'Abrir'} Painel
          </Button>

          <Button
            onClick={clearAllNotifications}
            variant="destructive"
            size="sm"
            className="flex-1"
          >
            Limpar Tudo
          </Button>
        </div>

        {/* User Info */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Role: <span className="font-medium">{user.role}</span> | 
          Target: <span className="font-medium">{roleTarget}</span>
        </div>
      </CardContent>
    </Card>
  );
}