import React, { useState } from 'react';
import { AuroraNotificationBell } from './AuroraNotificationBell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Minus, RotateCcw, Zap, AlertTriangle } from 'lucide-react';

export function AuroraNotificationTest() {
  const [count, setCount] = useState(0);
  const [hasImportant, setHasImportant] = useState(false);
  const { toast } = useToast();

  const handleIncrement = () => {
    setCount(prev => prev + 1);
  };

  const handleDecrement = () => {
    setCount(prev => Math.max(0, prev - 1));
  };

  const handleReset = () => {
    setCount(0);
    setHasImportant(false);
  };

  const handleMakeImportant = () => {
    setHasImportant(!hasImportant);
    if (!hasImportant) {
      toast({
        title: 'Notificação importante simulada',
        description: 'O badge agora está em modo importante.',
        variant: 'destructive'
      });
    }
  };

  const handleBellClick = () => {
    toast({
      title: 'Sino clicado!',
      description: `Badge com ${count} notificações foi clicado.`,
    });
  };

  const handleLongPress = () => {
    toast({
      title: 'Long press detectado!',
      description: 'Esta ação normalmente marcaria as novidades como lidas.',
    });
  };

  const handleMiddleClick = () => {
    toast({
      title: 'Middle click detectado!',
      description: 'Esta ação normalmente abriria a página de notificações em nova aba.',
    });
  };

  const testCounts = [0, 1, 5, 9, 10, 25, 99, 100, 150, 999];

  return (
    <div className="p-8 space-y-8 bg-background min-h-screen">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Aurora Notification Bell - Teste
          </CardTitle>
          <CardDescription>
            Teste do novo sistema de notificações com badge futurista
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Live Preview */}
          <div className="flex items-center justify-center p-8 bg-muted/20 rounded-lg border-2 border-dashed border-border">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Preview:
              </div>
              <AuroraNotificationBell
                count={count}
                hasImportant={hasImportant}
                hasUnread={count > 0}
                onClick={handleBellClick}
                onLongPress={handleLongPress}
                onMiddleClick={handleMiddleClick}
                size="md"
              />
              <div className="text-sm text-muted-foreground">
                {count === 0 && 'Sem notificações'}
                {count > 0 && !hasImportant && `${count} notificações normais`}
                {count > 0 && hasImportant && `${count} notificações (importantes)`}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button onClick={handleIncrement} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              +1
            </Button>
            <Button onClick={handleDecrement} variant="outline" size="sm">
              <Minus className="w-4 h-4 mr-2" />
              -1
            </Button>
            <Button onClick={handleMakeImportant} variant={hasImportant ? "destructive" : "secondary"} size="sm">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {hasImportant ? 'Normal' : 'Importante'}
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>

          {/* Quick Test Numbers */}
          <div>
            <h3 className="text-sm font-medium mb-2">Testes Rápidos:</h3>
            <div className="flex flex-wrap gap-2">
              {testCounts.map(testCount => (
                <Button
                  key={testCount}
                  variant="ghost"
                  size="sm"
                  onClick={() => setCount(testCount)}
                  className="text-xs"
                >
                  {testCount === 0 ? '0 (vazio)' : 
                   testCount <= 9 ? testCount.toString() : 
                   testCount <= 99 ? testCount.toString() : 
                   '99+'}
                </Button>
              ))}
            </div>
          </div>

          {/* Size Variants */}
          <div>
            <h3 className="text-sm font-medium mb-4">Tamanhos Disponíveis:</h3>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <AuroraNotificationBell
                  count={3}
                  hasUnread={true}
                  onClick={handleBellClick}
                  size="sm"
                />
                <span className="text-xs text-muted-foreground">Small</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <AuroraNotificationBell
                  count={15}
                  hasUnread={true}
                  onClick={handleBellClick}
                  size="md"
                />
                <span className="text-xs text-muted-foreground">Medium</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <AuroraNotificationBell
                  count={99}
                  hasImportant={true}
                  hasUnread={true}
                  onClick={handleBellClick}
                  size="lg"
                />
                <span className="text-xs text-muted-foreground">Large</span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Como testar:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Click</strong>: Abre o popover de notificações</li>
              <li>• <strong>Long press</strong> (mobile): Marca novidades como lidas</li>
              <li>• <strong>Middle click</strong> (desktop): Abre página de notificações em nova aba</li>
              <li>• <strong>Zoom</strong>: Teste em 100%, 125%, 150% para verificar se o badge não é cortado</li>
              <li>• <strong>Responsivo</strong>: Teste em diferentes tamanhos de tela</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}