import { useState, useEffect, useMemo } from 'react';
import { useBattle } from '@/hooks/useBattle';
import { useBattleResult } from '@/hooks/useBattleResult';
import { useCards } from '@/hooks/useCards';
import { BattleLine } from './BattleLine';
import { BattleBackground } from './BattleBackground';
import { BattlePlayerInfo } from './BattlePlayerInfo';
import { BattleCard } from './BattleCard';
import { BattleTurnIndicator } from './BattleTurnIndicator';
import { CardPlayEffect } from './BattleEffects';
import { BattleVictoryModal } from './BattleVictoryModal';
import { BattleDefeatModal } from './BattleDefeatModal';
import { BattleTutorial } from './BattleTutorial';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Swords } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card as CardType } from '@/types/cards';
import { useScreenShake } from '@/hooks/useScreenShake';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentGamification } from '@/stores/studentGamification';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useBattleSounds } from '@/hooks/useBattleSounds';

interface BattleArenaProps {
  battleId: string;
}

export function BattleArena({ battleId }: BattleArenaProps) {
  const { battle, currentRound, isMyTurn, myPlayerNumber, playCard, finishRound, isPlaying } = useBattle(battleId);
  const { userCards } = useCards();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { playSwooshSound, playAttackSound } = useBattleSounds();
  const battleResult = useBattleResult(battle, user?.id);
  
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [playingCard, setPlayingCard] = useState<{ name: string; line: number } | null>(null);
  const [attackingLines, setAttackingLines] = useState<number[]>([]);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [showDefeatModal, setShowDefeatModal] = useState(false);
  const { shakeClass, triggerShake } = useScreenShake();
  
  // Track HP changes to trigger screen shake
  const [prevPlayer1HP, setPrevPlayer1HP] = useState<number | null>(null);
  const [prevPlayer2HP, setPrevPlayer2HP] = useState<number | null>(null);

  // Handle battle finish - update XP and show modal
  useEffect(() => {
    if (battle?.status === 'FINISHED' && battleResult && !showVictoryModal && !showDefeatModal) {
      const { isVictory, xpGained, streakInfo } = battleResult;
      const totalXP = xpGained + streakInfo.bonusXP;

      // Update XP in gamification store directly
      const currentState = useStudentGamification.getState();
      useStudentGamification.setState({ 
        xp: currentState.xp + totalXP 
      });

      // Sync to database
      if (user?.id) {
        currentState.syncToDatabase(user.id).catch(console.error);
      }

      // Invalidate rankings to reflect new XP
      queryClient.invalidateQueries({ queryKey: ['rankings'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });

      // Show appropriate modal
      if (isVictory) {
        setShowVictoryModal(true);
      } else {
        setShowDefeatModal(true);
      }
    }
  }, [battle?.status, battleResult, user?.id, showVictoryModal, showDefeatModal, queryClient]);

  // Mock HP values (will be managed by backend later)
  const player1HP = battle ? 100 - (battle.player2_rounds_won * 30) : 100;
  const player2HP = battle ? 100 - (battle.player1_rounds_won * 30) : 100;
  
  // Get available cards for player's hand (optimize with useMemo) - MOVED BEFORE EARLY RETURN
  const playerHand = useMemo(() => {
    if (!userCards) return [];
    return userCards.slice(0, 6);
  }, [userCards]);
  
  // Detect HP changes and trigger screen shake
  useEffect(() => {
    if (!battle) return;
    
    if (prevPlayer1HP !== null && player1HP < prevPlayer1HP) {
      const damage = prevPlayer1HP - player1HP;
      triggerShake({ 
        intensity: damage > 20 ? 'heavy' : damage > 10 ? 'medium' : 'light',
        duration: damage > 20 ? 600 : 500
      });
    }
    if (prevPlayer2HP !== null && player2HP < prevPlayer2HP) {
      const damage = prevPlayer2HP - player2HP;
      triggerShake({ 
        intensity: damage > 20 ? 'heavy' : damage > 10 ? 'medium' : 'light',
        duration: damage > 20 ? 600 : 500
      });
    }
    setPrevPlayer1HP(player1HP);
    setPrevPlayer2HP(player2HP);
  }, [battle, player1HP, player2HP, prevPlayer1HP, prevPlayer2HP, triggerShake]);

  if (!battle) {
    return (
      <div className="relative flex items-center justify-center h-screen">
        <BattleBackground />
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handlePlayCard = () => {
    if (!selectedCard || selectedLine === null) return;
    
    // Play swoosh sound
    playSwooshSound();
    
    // Show card play effect
    setPlayingCard({ name: selectedCard.name, line: selectedLine });
    
    // Play card after animation starts
    setTimeout(() => {
      playCard({ battleId, line: selectedLine, cardId: selectedCard.id });
      setSelectedCard(null);
      setSelectedLine(null);
    }, 300);
  };

  const handleLineClick = (line: number) => {
    if (!isMyTurn || !selectedCard) return;
    setSelectedLine(line);
  };

  return (
    <div className={cn("battle-arena relative min-h-screen overflow-hidden", shakeClass)}>
      <BattleBackground />
      
      {/* Tutorial Overlay */}
      <BattleTutorial />
      
      <div className="container mx-auto py-3 sm:py-6 lg:py-8 px-2 sm:px-4 relative z-10">
        {/* Battle Header with HP bars */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6 lg:mb-8"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between max-w-4xl mx-auto gap-3 sm:gap-4">
            {/* Player 1 (You) */}
            <div className="battle-hp-player w-full sm:w-auto">
              <BattlePlayerInfo
                playerName="Você"
                currentHP={player1HP}
                maxHP={100}
                isPlayer={true}
              />
            </div>
            
            {/* Round indicator */}
            <div className="text-center px-3 sm:px-6 flex-shrink-0">
              <div className="bg-background/80 backdrop-blur-sm border border-primary/50 rounded-lg p-2 sm:p-4 shadow-lg">
                <Swords className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto mb-1 sm:mb-2" />
                <p className="text-lg sm:text-2xl font-bold text-primary">
                  {battle.player1_rounds_won} - {battle.player2_rounds_won}
                </p>
                <p className="text-[0.65rem] sm:text-xs text-muted-foreground mt-1">
                  Round {battle.current_round}/3
                </p>
              </div>
            </div>
            
            {/* Player 2 (Opponent) */}
            <div className="w-full sm:w-auto">
              <BattlePlayerInfo
                playerName="Oponente"
                currentHP={player2HP}
                maxHP={100}
                isPlayer={false}
              />
            </div>
          </div>
          
          {/* Turn indicator - Pulsante */}
          {battle.status === 'IN_PROGRESS' && (
            <div className="mt-3 sm:mt-4">
              <BattleTurnIndicator isMyTurn={isMyTurn} />
            </div>
          )}
        </motion.div>

        {/* Arena com 3 linhas */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-3 sm:space-y-4 mb-4 sm:mb-6 lg:mb-8"
        >
          {currentRound && (
            <>
              <BattleLine
                lineNumber={1}
                playerCards={
                  myPlayerNumber === 'PLAYER1'
                    ? currentRound.player1_cards.line1
                    : currentRound.player2_cards.line1
                }
                opponentCards={
                  myPlayerNumber === 'PLAYER1'
                    ? currentRound.player2_cards.line1
                    : currentRound.player1_cards.line1
                }
                isMyTurn={isMyTurn}
                canPlayOnLine={!!selectedCard}
                onCardClick={() => handleLineClick(1)}
                isAttacking={attackingLines.includes(1)}
              />

              <BattleLine
                lineNumber={2}
                playerCards={
                  myPlayerNumber === 'PLAYER1'
                    ? currentRound.player1_cards.line2
                    : currentRound.player2_cards.line2
                }
                opponentCards={
                  myPlayerNumber === 'PLAYER1'
                    ? currentRound.player2_cards.line2
                    : currentRound.player1_cards.line2
                }
                isMyTurn={isMyTurn}
                canPlayOnLine={!!selectedCard}
                onCardClick={() => handleLineClick(2)}
                isAttacking={attackingLines.includes(2)}
              />

              <BattleLine
                lineNumber={3}
                playerCards={
                  myPlayerNumber === 'PLAYER1'
                    ? currentRound.player1_cards.line3
                    : currentRound.player2_cards.line3
                }
                opponentCards={
                  myPlayerNumber === 'PLAYER1'
                    ? currentRound.player2_cards.line3
                    : currentRound.player1_cards.line3
                }
                isMyTurn={isMyTurn}
                canPlayOnLine={!!selectedCard}
                onCardClick={() => handleLineClick(3)}
                isAttacking={attackingLines.includes(3)}
              />
            </>
          )}
        </motion.div>

      {/* Mão do jogador */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="battle-hand px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6"
      >
        <Card className="bg-background/80 backdrop-blur-sm border-primary/30 p-3 sm:p-4 lg:p-6">
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-3 sm:mb-4 text-center">Sua Mão</h3>
          <div className="flex gap-2 sm:gap-3 lg:gap-4 justify-start sm:justify-center overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
            {playerHand.map((userCard, index) => (
              <motion.div
                key={userCard.card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex-shrink-0"
              >
                <BattleCard
                  card={userCard.card}
                  isSelectable={isMyTurn}
                  isSelected={selectedCard?.id === userCard.card.id}
                  onClick={() => setSelectedCard(userCard.card)}
                />
              </motion.div>
            ))}
          </div>

          {selectedCard && selectedLine && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 p-2 sm:p-3 bg-primary/20 border border-primary rounded-lg"
            >
              <span className="text-xs sm:text-sm font-semibold text-primary text-center sm:text-left">
                {selectedCard.name} → Linha {selectedLine}
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSelectedCard(null);
                    setSelectedLine(null);
                  }}
                  className="flex-1 sm:flex-none text-xs sm:text-sm"
                >
                  Cancelar
                </Button>
                <Button 
                  size="sm" 
                  onClick={handlePlayCard} 
                  disabled={isPlaying}
                  className="flex-1 sm:flex-none text-xs sm:text-sm"
                >
                  Confirmar Jogada
                </Button>
              </div>
            </motion.div>
          )}
        </Card>
      </motion.div>

        {/* Botão para passar turno/finalizar round */}
        {isMyTurn && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex justify-center mt-4 sm:mt-6"
          >
            <Button
              variant="outline"
              onClick={() => {
                // Play attack sound
                playAttackSound();
                
                // Trigger attack animations
                setAttackingLines([1, 2, 3]);
                setTimeout(() => {
                  setAttackingLines([]);
                  finishRound(battleId);
                }, 2000);
              }}
              disabled={isPlaying}
              className="border-primary/50 hover:bg-primary/20 text-xs sm:text-sm"
            >
              Passar Turno / Finalizar Round
            </Button>
          </motion.div>
        )}
        
        {/* Card play effect */}
        <AnimatePresence>
          {playingCard && (
            <CardPlayEffect
              cardName={playingCard.name}
              lineNumber={playingCard.line}
              onComplete={() => setPlayingCard(null)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Victory Modal */}
      {battleResult && (
        <BattleVictoryModal
          open={showVictoryModal}
          onOpenChange={setShowVictoryModal}
          xpGained={battleResult.xpGained}
          streakBonus={battleResult.streakInfo.bonusXP}
          stats={battleResult.stats}
          onPlayAgain={() => {
            setShowVictoryModal(false);
            navigate('/aluno/batalha');
            window.location.reload();
          }}
        />
      )}

      {/* Defeat Modal */}
      {battleResult && (
        <BattleDefeatModal
          open={showDefeatModal}
          onOpenChange={setShowDefeatModal}
          xpGained={battleResult.xpGained}
          stats={battleResult.stats}
          onTryAgain={() => {
            setShowDefeatModal(false);
            navigate('/aluno/batalha');
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
