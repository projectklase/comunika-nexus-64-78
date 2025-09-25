import { useState, useEffect } from 'react';
import { Bell, Clock, AlertCircle, CheckCircle, XCircle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { passwordResetStore, PasswordResetRequest } from '@/stores/password-reset-store';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export const ResetBell = () => {
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const updateRequests = () => {
      setRequests(passwordResetStore.list());
    };

    updateRequests();
    const unsubscribe = passwordResetStore.subscribe(updateRequests);
    return unsubscribe;
  }, []);

  const newRequests = requests.filter(r => r.status === 'NEW');
  const hasNewRequests = newRequests.length > 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'NEW':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'IN_PROGRESS':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'DONE':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'CANCELED':
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'NEW':
        return 'Nova';
      case 'IN_PROGRESS':
        return 'Em andamento';
      case 'DONE':
        return 'Concluída';
      case 'CANCELED':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW':
        return 'destructive';
      case 'IN_PROGRESS':
        return 'secondary';
      case 'DONE':
        return 'default';
      case 'CANCELED':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const handleQuickAction = async (request: PasswordResetRequest, action: string) => {
    try {
      switch (action) {
        case 'start':
          passwordResetStore.setStatus(request.id, 'IN_PROGRESS');
          toast({
            title: "Solicitação iniciada",
            description: `Processando reset para ${request.email}`,
          });
          break;
        case 'open':
          setIsOpen(false);
          navigate(`/secretaria/seguranca/resets?id=${request.id}`);
          break;
        case 'cancel':
          passwordResetStore.cancel(request.id, 'Cancelado via ações rápidas');
          toast({
            title: "Solicitação cancelada",
            description: `Reset cancelado para ${request.email}`,
          });
          break;
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível executar a ação",
        variant: "destructive",
      });
    }
  };

  const openCenterPage = () => {
    setIsOpen(false);
    navigate('/secretaria/seguranca/resets');
  };

  // Don't render if user is not secretaria
  if (!user || user.role !== 'secretaria') {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative p-2 h-9 w-9 rounded-full hover:bg-muted"
          aria-label={`${newRequests.length} solicitações de reset de senha`}
        >
          <Bell className="w-4 h-4" />
          {hasNewRequests && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs font-bold animate-pulse"
            >
              {newRequests.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Solicitações de Reset
          </SheetTitle>
          <SheetDescription>
            Gerenciar solicitações de redefinição de senha
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-destructive">{newRequests.length}</div>
              <div className="text-xs text-muted-foreground">Novas</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{requests.length}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>

          {/* Action button */}
          <Button 
            onClick={openCenterPage}
            className="w-full" 
            variant="outline"
          >
            Abrir Centro de Resets
          </Button>

          {/* Request list */}
          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            {requests.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma solicitação ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.slice(0, 20).map((request) => (
                  <div
                    key={request.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(request.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{request.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(request.createdAt), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </p>
                        </div>
                        <Badge variant={getStatusColor(request.status)} className="text-xs">
                          {getStatusLabel(request.status)}
                        </Badge>
                      </div>
                      
                      {request.status === 'NEW' && (
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleQuickAction(request, 'open')}
                          >
                            Abrir
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleQuickAction(request, 'start')}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Iniciar
                          </Button>
                        </div>
                      )}
                      
                      {request.status === 'IN_PROGRESS' && (
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleQuickAction(request, 'open')}
                          >
                            Continuar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};