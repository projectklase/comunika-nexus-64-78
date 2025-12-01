import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/Layout/AppLayout';
import { BattleArena } from '@/components/battle/BattleArena';
import { useBattle } from '@/hooks/useBattle';
import { useCards } from '@/hooks/useCards';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sword, Trophy, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DeckSelectionSheet } from '@/components/battle/DeckSelectionSheet';
import { MatchmakingModal } from '@/components/battle/MatchmakingModal';

export default function BatalhaPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const battleId = searchParams.get('id');
  const { userBattles, isLoading } = useBattle();
  const { decks } = useCards();
  const [showDeckSelection, setShowDeckSelection] = useState(false);
  const [showMatchmaking, setShowMatchmaking] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);

  if (battleId) {
    return (
      <AppLayout>
        <BattleArena battleId={battleId} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sword className="w-8 h-8" />
              Arena de Batalha
            </h1>
            <p className="text-muted-foreground">
              Desafie outros alunos e prove suas habilidades!
            </p>
          </div>
          <Button 
            size="lg" 
            disabled={!decks.length}
            onClick={() => setShowDeckSelection(true)}
          >
            <Sword className="w-5 h-5 mr-2" />
            Nova Batalha
          </Button>
        </div>

        {!decks.length && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="p-4">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                ⚠️ Você precisa criar pelo menos 1 deck antes de batalhar!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Batalhas em andamento */}
        <div>
          <h2 className="text-xl font-bold mb-4">Batalhas Recentes</h2>
          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Carregando batalhas...</p>
              </CardContent>
            </Card>
          ) : userBattles.length > 0 ? (
            <div className="grid gap-4">
              {userBattles.map((battle) => (
                <Card
                  key={battle.id}
                  className="hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => {
                    if (battle.status === 'IN_PROGRESS') {
                      window.location.href = `/aluno/batalha?id=${battle.id}`;
                    }
                  }}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Trophy className="w-5 h-5" />
                        Batalha #{battle.id.slice(0, 8)}
                      </CardTitle>
                      <Badge
                        variant={
                          battle.status === 'IN_PROGRESS'
                            ? 'default'
                            : battle.status === 'FINISHED'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {battle.status === 'IN_PROGRESS' && 'Em Andamento'}
                        {battle.status === 'FINISHED' && 'Finalizada'}
                        {battle.status === 'WAITING' && 'Aguardando'}
                        {battle.status === 'ABANDONED' && 'Abandonada'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">HP</p>
                          <p className="text-2xl font-bold">
                            {(battle.game_state as any)?.player1_hp || 100}
                          </p>
                        </div>
                        <span className="text-muted-foreground">vs</span>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">HP</p>
                          <p className="text-2xl font-bold">
                            {(battle.game_state as any)?.player2_hp || 100}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(battle.last_action_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center space-y-2">
                <Trophy className="w-16 h-16 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  Nenhuma batalha ainda. Comece a batalhar agora!
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Estatísticas */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Vitórias</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Derrotas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Taxa de Vitória</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0%</p>
            </CardContent>
          </Card>
        </div>

        {/* Deck Selection Sheet */}
        <DeckSelectionSheet
          open={showDeckSelection}
          onClose={() => setShowDeckSelection(false)}
          onSelectDeck={(deckId) => {
            setSelectedDeckId(deckId);
            setShowDeckSelection(false);
            setShowMatchmaking(true);
          }}
        />

        {/* Matchmaking Modal */}
        <MatchmakingModal
          open={showMatchmaking}
          deckId={selectedDeckId}
          onClose={() => {
            setShowMatchmaking(false);
            setSelectedDeckId(null);
          }}
          onMatchFound={(battleId) => {
            navigate(`/aluno/batalha?id=${battleId}`);
          }}
        />
      </div>
    </AppLayout>
  );
}
