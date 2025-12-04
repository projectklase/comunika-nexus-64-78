import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
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
import { BattleFieldEnhanced } from './BattleFieldEnhanced';
import { BattlePlayerInfo } from './BattlePlayerInfo';
import { BattleCard } from './BattleCard';
import { BattleTurnIndicator } from './BattleTurnIndicator';
import { BattleTurnTimer } from './BattleTurnTimer';
import { BattleVictoryModal } from './BattleVictoryModal';
import { BattleDefeatModal } from './BattleDefeatModal';
import { BattleLog } from './BattleLog';
import { BattleActionButtons } from './BattleActionButtons';
import { BattleZoneDivider } from './BattleZoneDivider';
import { CardPlayEffect } from './CardPlayEffect';
import { BattleDuelStart } from './BattleDuelStart';
import { BattlePhaseAnnouncement } from './BattlePhaseAnnouncement';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/app-dialog/ConfirmDialog';
import { AnimatePresence, motion } from 'framer-motion';
import { ScrollText, AlertTriangle, Flag } from 'lucide-react';

interface BattleArenaProps {
  battleId: string;
}

export const BattleArena = ({ battleId }: BattleArenaProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { battle, isLoading, playCard, attack, abandonBattle, forceTimeoutTurn, endTurn, isMyTurn, myPlayerNumber } = useBattle(battleId);
  const { userCards, allCards } = useCards();
  const battleResult = useBattleResult(battle, user?.id);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [showDefeatModal, setShowDefeatModal] = useState(false);
  const [showBattleLog, setShowBattleLog] = useState(false);
const [player1Profile, setPlayer1Profile] = useState<{ 
    name: string; 
    avatar?: string;
    equippedAvatar?: {
      emoji?: string;
      imageUrl?: string;
      rarity?: string;
    };
  } | null>(null);
  const [player2Profile, setPlayer2Profile] = useState<{ 
    name: string; 
    avatar?: string;
    equippedAvatar?: {
      emoji?: string;
      imageUrl?: string;
      rarity?: string;
    };
  } | null>(null);
  const [prevTurn, setPrevTurn] = useState<string | null>(null);
  const [showForfeitDialog, setShowForfeitDialog] = useState(false);
  const [hasShownResultModal, setHasShownResultModal] = useState(false);
  const [showDuelStart, setShowDuelStart] = useState(true);
  const [duelStartComplete, setDuelStartComplete] = useState(false);
  const abandonTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { triggerShake } = useScreenShake();
  const { playAttackSound, playSwooshSound, playWinSound, playLoseSound, playBattleMusic, stopBattleMusic } = useBattleSounds();

  const gameState = battle?.game_state as any;
  const isPlayer1 = myPlayerNumber() === 'PLAYER1';
  
  const myHP = isPlayer1 ? gameState?.player1_hp : gameState?.player2_hp;
  const opponentHP = isPlayer1 ? gameState?.player2_hp : gameState?.player1_hp;
  const myField = isPlayer1 ? gameState?.player1_field : gameState?.player2_field;
  const opponentField = isPlayer1 ? gameState?.player2_field : gameState?.player1_field;
  const battleLog = gameState?.battle_log || [];
  const isSetupPhase = gameState?.is_setup_phase === true;

  // Fetch player profiles with loading state - refetch on battle change
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!battle?.player1_id || !battle?.player2_id) return;
      
      setIsLoadingProfiles(true);
      
      // Fetch basic profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name, avatar')
        .in('id', [battle.player1_id, battle.player2_id]);
      
      if (error) {
        console.error('Erro ao carregar perfis:', error);
        setIsLoadingProfiles(false);
        return;
      }

      // Fetch equipped avatars from gamification system
      const { data: equippedAvatars } = await supabase
        .from('user_unlocks')
        .select(`
          user_id,
          unlockable:unlockables(type, rarity, preview_data)
        `)
        .in('user_id', [battle.player1_id, battle.player2_id])
        .eq('is_equipped', true);

      // Build avatar map from equipped unlockables
      const avatarMap: Record<string, { emoji?: string; imageUrl?: string; rarity?: string }> = {};
      equippedAvatars?.forEach((unlock: any) => {
        if (unlock.unlockable?.type === 'AVATAR') {
          avatarMap[unlock.user_id] = {
            emoji: unlock.unlockable.preview_data?.emoji,
            imageUrl: unlock.unlockable.preview_data?.imageUrl,
            rarity: unlock.unlockable.rarity
          };
        }
      });
      
      if (profiles) {
        const p1 = profiles.find(p => p.id === battle.player1_id);
        const p2 = profiles.find(p => p.id === battle.player2_id);
        
        setPlayer1Profile(p1 ? { 
          name: p1.name, 
          avatar: p1.avatar || undefined,
          equippedAvatar: avatarMap[battle.player1_id]
        } : null);
        setPlayer2Profile(p2 ? { 
          name: p2.name, 
          avatar: p2.avatar || undefined,
          equippedAvatar: avatarMap[battle.player2_id]
        } : null);
      }
      
      setIsLoadingProfiles(false);
    };
    
    fetchProfiles();
  }, [battle?.player1_id, battle?.player2_id, battle?.id]);

  // Monitor turn changes and show feedback (avoid duplicate toasts)
  const hasShownTurnToast = useRef(false);
  
  useEffect(() => {
    if (!battle?.current_turn || !prevTurn) {
      setPrevTurn(battle?.current_turn || null);
      return;
    }
    
    // Track turn changes for internal state only
    // Visual feedback is provided by the turn overlay - no toasts needed
    if (battle.current_turn !== prevTurn) {
      if (isMyTurn()) {
        hasShownTurnToast.current = true;
      } else {
        hasShownTurnToast.current = false;
      }
      setPrevTurn(battle.current_turn);
    }
  }, [battle?.current_turn, isMyTurn, prevTurn]);

  // Auto-abandon after 60s away from page
  useEffect(() => {
    if (!battle || battle.status !== 'IN_PROGRESS') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Start 60s timer
        abandonTimerRef.current = setTimeout(() => {
          abandonBattle.mutate(battle.id);
          toast.warning('Batalha abandonada por inatividade');
        }, 60000);
      } else {
        // Cancel timer if user returns
        if (abandonTimerRef.current) {
          clearTimeout(abandonTimerRef.current);
          abandonTimerRef.current = null;
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (abandonTimerRef.current) {
        clearTimeout(abandonTimerRef.current);
      }
    };
  }, [battle?.id, battle?.status, abandonBattle]);

  // Show result modal only once per battle
  useEffect(() => {
    if (battle?.status === 'FINISHED' && battleResult && !hasShownResultModal) {
      // FIRST: Stop background music before showing result
      stopBattleMusic();
      
      setHasShownResultModal(true);
      
      // THEN: Play win/lose sound
      if (battleResult.isVictory) {
        playWinSound();
        setShowVictoryModal(true);
      } else {
        playLoseSound();
        setShowDefeatModal(true);
      }
    }
  }, [battle?.status, battleResult, hasShownResultModal, playWinSound, playLoseSound, stopBattleMusic]);

  // Reset modal flag when battle changes
  useEffect(() => {
    setHasShownResultModal(false);
  }, [battleId]);

  // Control background music based on battle state
  useEffect(() => {
    const isBattleActive = battle?.status === 'IN_PROGRESS' && 
      battle.game_state && 
      Object.keys(battle.game_state).length > 0 &&
      battle.player2_id;
    
    if (isBattleActive) {
      playBattleMusic();
    } else {
      stopBattleMusic();
    }
    
    // Cleanup on unmount
    return () => {
      stopBattleMusic();
    };
  }, [battle?.status, battle?.player2_id, battle?.game_state, playBattleMusic, stopBattleMusic]);

  const playerHand = useMemo(() => {
    if (!battle || !gameState) return [];
    const handCardIds = isPlayer1 ? gameState.player1_hand : gameState.player2_hand;
    if (!handCardIds || !Array.isArray(handCardIds)) return [];
    
    // Handle both formats: string UUID or {id: UUID}
    return handCardIds
      .map((cardEntry: any) => {
        const cardId = typeof cardEntry === 'string' ? cardEntry : cardEntry?.id;
        // Try userCards first, fallback to allCards
        return userCards?.find(uc => uc.card?.id === cardId)?.card || allCards?.find(c => c.id === cardId);
      })
      .filter((card): card is NonNullable<typeof card> => card !== undefined);
  }, [battle, gameState, isPlayer1, userCards, allCards]);

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

  const handleTurnTimeout = useCallback(() => {
    if (!battle?.id) return;
    forceTimeoutTurn?.(battle.id);
  }, [battle?.id, forceTimeoutTurn]);

  const handleEndTurn = useCallback(async () => {
    if (!battle || !isMyTurn()) return;
    endTurn?.(battle.id);
  }, [battle?.id, isMyTurn, endTurn]);

  const handleForfeit = useCallback(() => {
    setShowForfeitDialog(true);
  }, []);

  const confirmForfeit = async () => {
    if (!battle) return;
    await abandonBattle.mutateAsync(battle.id);
    setShowForfeitDialog(false);
    navigate('/aluno/batalha');
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

  // Check if battle is properly initialized with both players
  const isBattleReady = battle && gameState && 
    battle.player2_id && 
    typeof gameState.player1_hp === 'number' &&
    typeof gameState.player2_hp === 'number' &&
    gameState.player1_hand !== undefined &&
    gameState.player2_hand !== undefined;

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
          equippedAvatar={isPlayer1 ? player2Profile?.equippedAvatar : player1Profile?.equippedAvatar}
          currentHP={opponentHP || 100}
          maxHP={100}
          isPlayer={false}
        />
        
        <BattleTurnTimer 
          isMyTurn={isMyTurn()} 
          turnStartedAt={battle.turn_started_at || null}
          maxSeconds={30}
          onTimeout={handleTurnTimeout}
        />
        
        <BattleFieldEnhanced monster={opponentField?.monster} traps={opponentField?.traps || []} isOpponent />
        
        <BattleZoneDivider />

        <BattleFieldEnhanced monster={myField?.monster} traps={myField?.traps || []} />
        
        <BattlePlayerInfo
          playerName={isPlayer1 ? player1Profile?.name || 'Você' : player2Profile?.name || 'Você'}
          playerAvatar={isPlayer1 ? player1Profile?.avatar : player2Profile?.avatar}
          equippedAvatar={isPlayer1 ? player1Profile?.equippedAvatar : player2Profile?.equippedAvatar}
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

        <BattleActionButtons 
          canPlayCard={selectedCard !== null && isMyTurn()} 
          canAttack={myField?.monster !== null && isMyTurn() && !isSetupPhase} 
          isMyTurn={isMyTurn()} 
          onPlayCard={handlePlayCard} 
          onAttack={handleAttack} 
          onEndTurn={handleEndTurn}
          isSetupPhase={isSetupPhase}
        />

        {/* Duel Start Announcement */}
        <BattleDuelStart 
          isVisible={showDuelStart && battle.status === 'IN_PROGRESS'} 
          onComplete={() => {
            setShowDuelStart(false);
            setDuelStartComplete(true);
          }} 
        />

        {/* Setup Phase Announcement */}
        <BattlePhaseAnnouncement 
          isVisible={duelStartComplete && isSetupPhase && battle.status === 'IN_PROGRESS'} 
          phase="SETUP" 
        />

        {/* Opponent Turn Overlay */}
        <AnimatePresence>
          {!isMyTurn() && battle.status === 'IN_PROGRESS' && !isSetupPhase && (
            <motion.div
              className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-background/90 backdrop-blur-sm px-8 py-6 rounded-2xl border-2 border-primary/50 shadow-2xl"
                animate={{ 
                  scale: [1, 1.05, 1],
                  opacity: [0.9, 1, 0.9],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <p className="text-2xl font-bold text-center text-primary">⏳ Turno do Oponente</p>
                <p className="text-sm text-muted-foreground text-center mt-2">Aguardando jogada...</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Battle Log Toggle Button + Forfeit */}
        <div className="fixed bottom-4 right-4 z-20 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleForfeit}
            className="gap-2 bg-background/80 backdrop-blur-sm text-destructive hover:bg-destructive/10"
          >
            <Flag className="w-4 h-4" />
            Desistir
          </Button>
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
          <BattleVictoryModal 
            open={showVictoryModal} 
            onOpenChange={(open) => {
              setShowVictoryModal(open);
              if (!open) navigate('/aluno/batalha');
            }} 
            xpGained={battleResult.xpGained} 
            streakBonus={battleResult.streakInfo.bonusXP} 
            stats={battleResult.stats} 
            onPlayAgain={() => navigate('/aluno/batalha')} 
          />
          <BattleDefeatModal 
            open={showDefeatModal} 
            onOpenChange={(open) => {
              setShowDefeatModal(open);
              if (!open) navigate('/aluno/batalha');
            }} 
            xpGained={battleResult.xpGained} 
            stats={battleResult.stats} 
            onTryAgain={() => navigate('/aluno/batalha')} 
          />
        </>
      )}

      <ConfirmDialog
        open={showForfeitDialog}
        onOpenChange={setShowForfeitDialog}
        title="Desistir da Batalha?"
        description="Você perderá a batalha e não receberá XP. Esta ação não pode ser desfeita."
        confirmText="Desistir"
        cancelText="Continuar Lutando"
        variant="destructive"
        onConfirm={confirmForfeit}
      />
    </div>
  );
};
