import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBattle } from '@/hooks/useBattle';
import { useCards } from '@/hooks/useCards';
import { useBattleResult } from '@/hooks/useBattleResult';
import { useScreenShake } from '@/hooks/useScreenShake';
import { useBattleSounds } from '@/hooks/useBattleSounds';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { BattleBackground } from './BattleBackground';
import { BattleField } from './BattleField';
import { BattlePlayerInfo } from './BattlePlayerInfo';
import { BattleCard } from './BattleCard';
import { BattleTurnIndicator } from './BattleTurnIndicator';
import { BattleVictoryModal } from './BattleVictoryModal';
import { BattleDefeatModal } from './BattleDefeatModal';
import { BattleLog } from './BattleLog';
import { ActionButtons } from './ActionButtons';
import { CardPlayEffect } from './CardPlayEffect';
import { AnimatePresence, motion } from 'framer-motion';

interface BattleArenaProps {
  battleId: string;
}

export const BattleArena = ({ battleId }: BattleArenaProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { battle, isLoading, playCard, attack, isMyTurn, myPlayerNumber } = useBattle(battleId);
  const { userCards } = useCards();
  const battleResult = useBattleResult(battle, user?.id);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [showDefeatModal, setShowDefeatModal] = useState(false);
  const [player1Profile, setPlayer1Profile] = useState<{ name: string; avatar?: string } | null>(null);
  const [player2Profile, setPlayer2Profile] = useState<{ name: string; avatar?: string } | null>(null);
  
  const { triggerShake } = useScreenShake();
  const { playAttackSound, playSwooshSound, playWinSound, playLoseSound } = useBattleSounds();

  const gameState = battle?.game_state as any;
  const isPlayer1 = myPlayerNumber() === 'PLAYER1';
  
  const myHP = isPlayer1 ? gameState?.player1_hp : gameState?.player2_hp;
  const opponentHP = isPlayer1 ? gameState?.player2_hp : gameState?.player1_hp;
  const myField = isPlayer1 ? gameState?.player1_field : gameState?.player2_field;
  const opponentField = isPlayer1 ? gameState?.player2_field : gameState?.player1_field;
  const battleLog = gameState?.battle_log || [];

  // Fetch player profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!battle) return;
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar')
        .in('id', [battle.player1_id, battle.player2_id]);
      
      if (profiles) {
        const p1 = profiles.find(p => p.id === battle.player1_id);
        const p2 = profiles.find(p => p.id === battle.player2_id);
        
        if (p1) setPlayer1Profile({ name: p1.name, avatar: p1.avatar || undefined });
        if (p2) setPlayer2Profile({ name: p2.name, avatar: p2.avatar || undefined });
      }
    };
    
    fetchProfiles();
  }, [battle]);

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

  return (
    <div className="min-h-screen relative overflow-hidden">
      <BattleBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-8 space-y-6 max-w-7xl">
        <BattlePlayerInfo
          playerName={isPlayer1 ? player2Profile?.name || 'Oponente' : player1Profile?.name || 'Oponente'}
          playerAvatar={isPlayer1 ? player2Profile?.avatar : player1Profile?.avatar}
          currentHP={opponentHP || 100}
          maxHP={100}
          isPlayer={false}
        />
        
        <BattleTurnIndicator isMyTurn={isMyTurn()} />
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

        <div className="hidden lg:block fixed right-4 top-1/2 -translate-y-1/2 w-80 h-[500px]">
          <BattleLog logs={battleLog} />
        </div>

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
