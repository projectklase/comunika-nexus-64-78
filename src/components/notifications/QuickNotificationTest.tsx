import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotificationContext } from '@/contexts/NotificationContext';
import { Bell, CheckCircle, AlertTriangle } from 'lucide-react';

export function QuickNotificationTest() {
  const { isOpen, toggle, panelData } = useNotificationContext();
  const { state } = panelData;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bell className="w-4 h-4" />
          Status do Sistema
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm">Painel:</span>
          <div className="flex items-center gap-1">
            {isOpen ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-muted" />
            )}
            <span className="text-xs">{isOpen ? 'Aberto' : 'Fechado'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Notificações:</span>
          <span className="text-sm font-mono">
            {state.unreadCount || 0}
          </span>
        </div>

        {/* Test Button */}
        <Button
          onClick={toggle}
          variant="outline"
          size="sm"
          className="w-full"
        >
          {isOpen ? 'Fechar' : 'Abrir'} Painel
        </Button>

        {/* Warning for no notifications */}
        {state.unreadCount === 0 && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <span>Use o testador para criar notificações</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}