import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Settings, ArrowRight } from 'lucide-react';
import { passwordResetStore } from '@/stores/password-reset-store';
import { useNavigate } from 'react-router-dom';

export const QuickAccessCard = () => {
  const [pendingResets, setPendingResets] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const updateStats = () => {
      const stats = passwordResetStore.getStats();
      setPendingResets(stats.newRequests);
    };

    updateStats();
    const unsubscribe = passwordResetStore.subscribe(updateStats);
    return unsubscribe;
  }, []);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Centro de Segurança
        </CardTitle>
        <CardDescription>
          Gerenciar solicitações de redefinição de senha
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="text-sm">Resets pendentes</span>
          </div>
          <Badge variant={pendingResets > 0 ? "destructive" : "secondary"}>
            {pendingResets}
          </Badge>
        </div>
        
        <Button
          onClick={() => navigate('/secretaria/seguranca/resets')}
          variant="outline"
          className="w-full justify-between"
        >
          Acessar centro de resets
          <ArrowRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
};