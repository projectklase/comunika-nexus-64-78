import { useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Swords, Users, Clock } from 'lucide-react';
import { useMatchmaking } from '@/hooks/useMatchmaking';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';

interface MatchmakingModalProps {
  open: boolean;
  deckId: string | null;
  onClose: () => void;
  onMatchFound: (battleId: string) => void;
}

export function MatchmakingModal({ open, deckId, onClose, onMatchFound }: MatchmakingModalProps) {
  const { user } = useAuth();
  const { status, queuePosition, searchTime, foundBattleId, playersInQueue, joinQueue, leaveQueue } = useMatchmaking();

  useEffect(() => {
    if (open && deckId && status === 'idle') {
      joinQueue(deckId);
    }
  }, [open, deckId, status, joinQueue]);

  useEffect(() => {
    if (foundBattleId) {
      setTimeout(() => {
        onMatchFound(foundBattleId);
        onClose();
      }, 3000);
    }
  }, [foundBattleId, onMatchFound, onClose]);

  const handleCancel = async () => {
    await leaveQueue();
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-primary/20">
        <DialogTitle className="sr-only">
          {status === 'searching' ? 'Procurando Partida' : 
           status === 'found' ? 'Oponente Encontrado!' : 
           'Matchmaking'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Tela de busca de partida para batalha de cartas
        </DialogDescription>
        
        {status === 'searching' && (
          <div className="space-y-6 py-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-primary/50 animate-pulse">
                    <AvatarImage src={user?.avatar || ''} />
                    <AvatarFallback className="bg-primary/20 text-2xl">
                      {user?.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -inset-2 border-2 border-primary/30 rounded-full animate-ping" />
                  <div className="absolute -inset-4 border border-primary/20 rounded-full animate-pulse" />
                </div>
              </div>
              <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Procurando Partida
              </h2>
              <p className="text-muted-foreground">Aguarde enquanto encontramos um oponente...</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center space-y-1 p-3 rounded-lg bg-muted/50">
                <Clock className="h-4 w-4 mx-auto text-primary" />
                <div className="text-2xl font-bold">{formatTime(searchTime)}</div>
                <div className="text-xs text-muted-foreground">Tempo</div>
              </div>
              <div className="text-center space-y-1 p-3 rounded-lg bg-muted/50">
                <Users className="h-4 w-4 mx-auto text-primary" />
                <div className="text-2xl font-bold">{playersInQueue}</div>
                <div className="text-xs text-muted-foreground">Na Fila</div>
              </div>
              <div className="text-center space-y-1 p-3 rounded-lg bg-muted/50">
                <Swords className="h-4 w-4 mx-auto text-primary" />
                <div className="text-2xl font-bold">#{queuePosition || '?'}</div>
                <div className="text-xs text-muted-foreground">Posição</div>
              </div>
            </div>

            {/* Cancel Button */}
            <Button variant="outline" className="w-full" onClick={handleCancel}>
              Cancelar Busca
            </Button>
          </div>
        )}

        {status === 'found' && (
          <div className="space-y-6 py-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-primary flex items-center justify-center gap-2">
                <Swords className="h-6 w-6" />
                Oponente Encontrado!
              </h2>
              <p className="text-muted-foreground">Preparando a arena de batalha...</p>
            </div>

            {/* VS Display */}
            <div className="flex items-center justify-center gap-8">
              <div className="text-center space-y-2">
                <Avatar className="h-20 w-20 border-4 border-primary mx-auto">
                  <AvatarImage src={user?.avatar || ''} />
                  <AvatarFallback className="bg-primary/20 text-xl">
                    {user?.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="font-semibold">{user?.name.split(' ')[0]}</p>
              </div>

              <div className="text-4xl font-bold text-primary animate-pulse">VS</div>

              <div className="text-center space-y-2">
                <Avatar className="h-20 w-20 border-4 border-destructive mx-auto">
                  <AvatarFallback className="bg-destructive/20 text-xl">?</AvatarFallback>
                </Avatar>
                <p className="font-semibold">Oponente</p>
              </div>
            </div>

            {/* Loading Progress */}
            <div className="space-y-2">
              <Progress value={66} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">Entrando na arena...</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6 py-6 text-center">
            <div className="text-destructive text-lg font-semibold">Erro ao buscar partida</div>
            <p className="text-muted-foreground">Tente novamente em alguns instantes.</p>
            <Button onClick={handleCancel} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
