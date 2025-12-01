import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBattle } from '@/hooks/useBattle';
import { useCards } from '@/hooks/useCards';
import { useBattleResult } from '@/hooks/useBattleResult';
import { useScreenShake } from '@/hooks/useScreenShake';
import { useBattleSounds } from '@/hooks/useBattleSounds';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BattleBackground } from './BattleBackground';
import { BattleField } from './BattleField';
import { BattlePlayerInfo } from './BattlePlayerInfo';
import { BattleCard } from './BattleCard';
import { BattleTurnIndicator } from './BattleTurnIndicator';
import { BattleTurnTimer } from './BattleTurnTimer';
import { BattleVictoryModal } from './BattleVictoryModal';
import { BattleDefeatModal } from './BattleDefeatModal';
import { BattleLog } from './BattleLog';
import { ActionButtons } from './ActionButtons';
import { CardPlayEffect } from './CardPlayEffect';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { ScrollText, AlertTriangle } from 'lucide-react';

interface BattleArenaProps {
  battleId: string;
}

export const BattleArena = ({ battleId }: BattleArenaProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { battle, isLoading, playCard, attack, abandonBattle, forceTimeoutTurn, isMyTurn, myPlayerNumber } = useBattle(battleId);
  const { userCards } = useCards();
  const battleResult = useBattleResult(battle, user?.id);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [showDefeatModal, setShowDefeatModal] = useState(false);
  const [showBattleLog, setShowBattleLog] = useState(false);
  const [player1Profile, setPlayer1Profile] = useState<{ name: string; avatar?: string } | null>(null);
  const [player2Profile, setPlayer2Profile] = useState<{ name: string; avatar?: string } | null>(null);
  const [prevTurn, setPrevTurn] = useState<string | null>(null);
  
  const { triggerShake } = useScreenShake();
  const { playAttackSound, playSwooshSound, playWinSound, playLoseSound } = useBattleSounds();

  const gameState = battle?.game_state as any;
  const isPlayer1 = myPlayerNumber() === 'PLAYER1';
  
  const myHP = isPlayer1 ? gameState?.player1_hp : gameState?.player2_hp;
  const opponentHP = isPlayer1 ? gameState?.player2_hp : gameState?.player1_hp;
  const myField = isPlayer1 ? gameState?.player1_field : gameState?.player2_field;
  const opponentField = isPlayer1 ? gameState?.player2_field : gameState?.player1_field;
  const battleLog = gameState?.battle_log || [];

  // Fetch player profiles with loading state
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!battle?.player1_id || !battle?.player2_id) return;
      
      setIsLoadingProfiles(true);
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name, avatar')
        .in('id', [battle.player1_id, battle.player2_id]);
      
      if (error) {
        console.error('Erro ao carregar perfis:', error);
        setIsLoadingProfiles(false);
        return;
      }
      
      if (profiles) {
        const p1 = profiles.find(p => p.id === battle.player1_id);
        const p2 = profiles.find(p => p.id === battle.player2_id);
        
        setPlayer1Profile(p1 ? { name: p1.name, avatar: p1.avatar || undefined } : null);
        setPlayer2Profile(p2 ? { name: p2.name, avatar: p2.avatar || undefined } : null);
      }
      
      setIsLoadingProfiles(false);
    };
    
    fetchProfiles();
  }, [battle?.player1_id, battle?.player2_id]);

  // Monitor turn changes and show feedback
  useEffect(() => {
    if (!battle?.current_turn || !prevTurn) {
      setPrevTurn(battle?.current_turn || null);
      return;
    }
    
    if (battle.current_turn !== prevTurn) {
      if (isMyTurn()) {
        toast.info('🎯 Agora é seu turno!', {
          duration: 2000,
        });
      } else {
        toast.info('⏳ Turno do oponente...', {
          duration: 2000,
        });
      }
      setPrevTurn(battle.current_turn);
    }
  }, [battle?.current_turn, isMyTurn, prevTurn]);

  useEffect(() => {
    if (battle?.status === 'FINISHED' && battleResult) {
      if (battleResult.isVictory) {
        playWinSound();
        setShowVictoryModal(true);
      } else {
        playLoseSound();
        setShowDefeatModal(true);
      }
    }
  }, [battle?.status, battleResult]);

  const playerHand = useMemo(() => {
    if (!battle || !gameState) return [];
    const handCardIds = isPlayer1 ? gameState.player1_hand : gameState.player2_hand;
    if (!handCardIds || !Array.isArray(handCardIds)) return [];
    
    // Filter userCards to match the hand card IDs from game_state
    return handCardIds
      .map((cardId: string) => userCards?.find(uc => uc.card?.id === cardId)?.card)
      .filter((card): card is NonNullable<typeof card> => card !== undefined);
  }, [battle, gameState, isPlayer1, userCards]);

  const handleCardClick = (cardId: string) => {
    if (!isMyTurn()) return;
    setSelectedCard(cardId);
  };

  const handlePlayCard = async () => {
    if (!selectedCard || !battle) return;
    setIsPlaying(true);
    playSwooshSound();
    
    const selectedCardData = playerHand.find(c => c.id === selectedCard);
    const isTrap = selectedCardData?.card_type === 'TRAP';
    
    await playCard.mutateAsync({
      battleId: battle.id,
      cardId: selectedCard,
      isTrap,
    });
    
    setSelectedCard(null);
    setIsPlaying(false);
  };

  const handleAttack = async () => {
    if (!battle || !myField?.monster) return;
    playAttackSound();
    triggerShake();
    await attack.mutateAsync(battle.id);
  };

  const handleAbandonBattle = async () => {
    if (!battle) return;
    await abandonBattle.mutateAsync(battle.id);
    navigate('/aluno/batalha');
  };

  const handleTurnTimeout = () => {
    if (!battle || !isMyTurn()) return;
    forceTimeoutTurn?.(battle.id);
  };

  if (isLoading || !battle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando batalha...</p>
        </div>
      </div>
    );
  }

  // Verificar batalha inválida (game_state NULL ou vazio)
  if (!battle.game_state || Object.keys(battle.game_state).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <AlertTriangle className="w-16 h-16 text-destructive animate-pulse" />
        <h2 className="text-2xl font-bold text-center">Batalha com Erro</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Esta batalha não foi inicializada corretamente e não pode continuar. 
          Por favor, abandone esta batalha e inicie uma nova.
        </p>
        <div className="flex gap-3 mt-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/aluno/batalha')}
          >
            Voltar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleAbandonBattle}
            disabled={abandonBattle.isPending}
          >
            {abandonBattle.isPending ? 'Abandonando...' : 'Abandonar Batalha'}
          </Button>
        </div>
      </div>
    );
  }

  // Check if battle is properly initialized with both players and cards
  const isBattleReady = battle && gameState && 
    battle.player2_id && 
    gameState.player1_hand && 
    gameState.player2_hand &&
    Array.isArray(gameState.player1_hand) &&
    Array.isArray(gameState.player2_hand) &&
    gameState.player1_hand.length > 0 && 
    gameState.player2_hand.length > 0;

  if (!isBattleReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-pulse text-primary text-lg font-semibold">
          Aguardando oponente...
        </div>
        <div className="text-sm text-muted-foreground">
          Procurando adversário na sua escola
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <BattleBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-8 space-y-6 max-w-7xl">
        <BattlePlayerInfo
          playerName={isLoadingProfiles ? 'Carregando...' : (isPlayer1 ? player2Profile?.name || 'Oponente' : player1Profile?.name || 'Oponente')}
          playerAvatar={isPlayer1 ? player2Profile?.avatar : player1Profile?.avatar}
          currentHP={opponentHP || 100}
          maxHP={100}
          isPlayer={false}
        />
        
        <BattleTurnTimer 
          isMyTurn={isMyTurn()} 
          turnStartedAt={battle.turn_started_at || null}
          maxSeconds={15}
          onTimeout={handleTurnTimeout}
        />
        
        <BattleField monster={opponentField?.monster} traps={opponentField?.traps || []} isOpponent />
        
        <div className="flex items-center justify-center py-8">
          <motion.div className="text-center space-y-2" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}>
            <div className="text-4xl">⚔️</div>
            <p className="text-sm text-muted-foreground font-semibold">ZONA DE BATALHA</p>
          </motion.div>
        </div>

        <BattleField monster={myField?.monster} traps={myField?.traps || []} />
        
        <BattlePlayerInfo
          playerName={isPlayer1 ? player1Profile?.name || 'Você' : player2Profile?.name || 'Você'}
          playerAvatar={isPlayer1 ? player1Profile?.avatar : player2Profile?.avatar}
          currentHP={myHP || 100}
          maxHP={100}
          isPlayer={true}
        />

        <div className="mt-8">
          <p className="text-sm text-center text-muted-foreground mb-4">Sua Mão</p>
          <div className="flex flex-wrap justify-center gap-4">
            {playerHand.map((card) => (
              <BattleCard key={card.id} card={card} isSelected={selectedCard === card.id} onClick={() => handleCardClick(card.id)} isSelectable={isMyTurn()} />
            ))}
          </div>
        </div>

        <ActionButtons canPlayCard={selectedCard !== null && isMyTurn()} canAttack={myField?.monster !== null && isMyTurn()} isMyTurn={isMyTurn()} onPlayCard={handlePlayCard} onAttack={handleAttack} onEndTurn={() => setSelectedCard(null)} />

        {/* Battle Log Toggle Button */}
        <div className="fixed bottom-4 right-4 z-20">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBattleLog(!showBattleLog)}
            className="gap-2 bg-background/80 backdrop-blur-sm"
          >
            <ScrollText className="w-4 h-4" />
            {showBattleLog ? 'Ocultar Log' : 'Ver Histórico'}
          </Button>
        </div>

        {/* Battle Log Panel */}
        {showBattleLog && (
          <div className="fixed right-4 bottom-16 z-20 w-64 max-h-[250px]">
            <BattleLog logs={battleLog} onClose={() => setShowBattleLog(false)} />
          </div>
        )}

        <AnimatePresence>
          {isPlaying && selectedCard && <CardPlayEffect cardId={selectedCard} />}
        </AnimatePresence>
      </div>

      {battleResult && (
        <>
          <BattleVictoryModal open={showVictoryModal} onOpenChange={setShowVictoryModal} xpGained={battleResult.xpGained} streakBonus={battleResult.streakInfo.bonusXP} stats={battleResult.stats} onPlayAgain={() => navigate('/aluno/batalhas')} />
          <BattleDefeatModal open={showDefeatModal} onOpenChange={setShowDefeatModal} xpGained={battleResult.xpGained} stats={battleResult.stats} onTryAgain={() => navigate('/aluno/batalhas')} />
        </>
      )}
    </div>
  );
};
