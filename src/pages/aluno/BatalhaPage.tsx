import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/Layout/AppLayout';
import { BattleArena } from '@/components/battle/BattleArena';
import { useBattle } from '@/hooks/useBattle';
import { useCards } from '@/hooks/useCards';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sword, Trophy, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { DeckSelectionSheet } from '@/components/battle/DeckSelectionSheet';
import { MatchmakingModal } from '@/components/battle/MatchmakingModal';
import { RecentBattleCard } from '@/components/battle/RecentBattleCard';

const DEFAULT_BATTLES_SHOWN = 3;
const MAX_BATTLES_SHOWN = 10;

export default function BatalhaPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const battleId = searchParams.get('id');
  const { userBattles, isLoading } = useBattle();
  const { decks } = useCards();
  const [showDeckSelection, setShowDeckSelection] = useState(false);
  const [showMatchmaking, setShowMatchmaking] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [showAllBattles, setShowAllBattles] = useState(false);

  // Extract opponent IDs from battles (deduplicated)
  const opponentIds = useMemo(() => {
    if (!user?.id || !userBattles.length) return [];
    const ids = userBattles.map(b => 
      b.player1_id === user.id ? b.player2_id : b.player1_id
    ).filter(Boolean);
    return [...new Set(ids)];
  }, [userBattles, user?.id]);

  // Stable query key using sorted string
  const opponentIdsKey = useMemo(() => 
    opponentIds.sort().join(','), 
    [opponentIds]
  );

  const { data: opponentProfiles } = useQuery({
    queryKey: ['opponent-profiles', opponentIdsKey],
    queryFn: async () => {
      if (!opponentIds.length) return {};
      
      // Usar RPC get_public_student_profile para buscar perfis (bypassa RLS)
      const profilePromises = opponentIds.map(id =>
        supabase.rpc('get_public_student_profile', { student_id_param: id }).maybeSingle()
      );
      const results = await Promise.all(profilePromises);
      
      // Construir mapa de perfis no formato esperado
      const profileMap: Record<string, { name: string; avatar?: string; equippedAvatar?: any }> = {};
      
      results.forEach((result, index) => {
        if (result.data) {
          const p = result.data;
          profileMap[opponentIds[index]] = {
            name: p.name || 'Jogador',
            avatar: undefined,
            equippedAvatar: {
              emoji: p.equipped_avatar_emoji,
              imageUrl: p.equipped_avatar_image_url,
              rarity: p.equipped_avatar_rarity
            }
          };
        }
      });
      
      return profileMap;
    },
    enabled: opponentIds.length > 0,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Calculate battle stats
  const battleStats = useMemo(() => {
    if (!user?.id || !userBattles.length) {
      return { wins: 0, losses: 0, winRate: 0 };
    }
    
    const finishedBattles = userBattles.filter(b => b.status === 'FINISHED');
    const wins = finishedBattles.filter(b => b.winner_id === user.id).length;
    const losses = finishedBattles.length - wins;
    const winRate = finishedBattles.length > 0 
      ? Math.round((wins / finishedBattles.length) * 100) 
      : 0;
    
    return { wins, losses, winRate };
  }, [userBattles, user?.id]);

  // Format duration
  const formatDuration = (startedAt?: string, finishedAt?: string) => {
    if (!startedAt || !finishedAt) return undefined;
    const duration = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get battles to display
  const displayedBattles = useMemo(() => {
    const limit = showAllBattles ? MAX_BATTLES_SHOWN : DEFAULT_BATTLES_SHOWN;
    return userBattles.slice(0, limit);
  }, [userBattles, showAllBattles]);

  if (battleId) {
    return (
      <AppLayout>
        <BattleArena battleId={battleId} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Sword className="w-7 h-7 sm:w-8 sm:h-8" />
              Arena de Batalha
            </h1>
            <p className="text-sm text-muted-foreground">
              Desafie outros alunos e prove suas habilidades!
            </p>
          </div>
          <Button 
            size="lg" 
            disabled={!decks.length}
            onClick={() => setShowDeckSelection(true)}
            className="w-full sm:w-auto"
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

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/30">
            <CardContent className="p-4 text-center">
              <Trophy className="w-5 h-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold text-green-500">{battleStats.wins}</p>
              <p className="text-xs text-muted-foreground">Vitórias</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-transparent border-red-500/30">
            <CardContent className="p-4 text-center">
              <Sword className="w-5 h-5 mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-bold text-red-500">{battleStats.losses}</p>
              <p className="text-xs text-muted-foreground">Derrotas</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/30">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold text-primary">{battleStats.winRate}%</p>
              <p className="text-xs text-muted-foreground">Taxa de Vitória</p>
            </CardContent>
          </Card>
        </div>

        {/* Batalhas Recentes */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Batalhas Recentes</h2>
            {userBattles.length > DEFAULT_BATTLES_SHOWN && (
              <span className="text-xs text-muted-foreground">
                {displayedBattles.length} de {Math.min(userBattles.length, MAX_BATTLES_SHOWN)}
              </span>
            )}
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Carregando batalhas...</p>
              </CardContent>
            </Card>
          ) : displayedBattles.length > 0 ? (
            <div className="space-y-3">
              {displayedBattles.map((battle) => {
                const isPlayer1 = battle.player1_id === user?.id;
                const opponentId = isPlayer1 ? battle.player2_id : battle.player1_id;
                const opponent = opponentProfiles?.[opponentId];
                const gameState = battle.game_state as any;
                
                const myHP = isPlayer1 ? gameState?.player1_hp : gameState?.player2_hp;
                const opponentHP = isPlayer1 ? gameState?.player2_hp : gameState?.player1_hp;
                const isVictory = battle.status === 'FINISHED' 
                  ? battle.winner_id === user?.id 
                  : null;

                return (
                  <RecentBattleCard
                    key={battle.id}
                    opponentName={opponent?.name || 'Oponente'}
                    opponentAvatar={opponent?.equippedAvatar}
                    isVictory={isVictory}
                    myFinalHP={myHP ?? 100}
                    opponentFinalHP={opponentHP ?? 100}
                    xpGained={isVictory === true ? 10 : isVictory === false ? 3 : 0}
                    duration={formatDuration(battle.started_at, battle.finished_at)}
                    battleDate={new Date(battle.last_action_at)}
                    status={battle.status}
                    onClick={() => {
                      if (battle.status === 'IN_PROGRESS') {
                        navigate(`/aluno/batalha?id=${battle.id}`);
                      }
                    }}
                  />
                );
              })}

              {/* Botão Ver Mais / Ver Menos */}
              {userBattles.length > DEFAULT_BATTLES_SHOWN && (
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAllBattles(!showAllBattles)}
                >
                  {showAllBattles ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-2" />
                      Ver menos
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Ver histórico ({Math.min(userBattles.length, MAX_BATTLES_SHOWN) - DEFAULT_BATTLES_SHOWN} mais)
                    </>
                  )}
                </Button>
              )}
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
