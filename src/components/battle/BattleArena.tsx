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
import { TrapActivationOverlay } from './TrapActivationOverlay';
import { MonsterAttackAnimation } from './MonsterAttackAnimation';
import { DefeatedCardEffect } from './DefeatedCardEffect';
import { TimeoutOverlay } from './TimeoutOverlay';
import { TurnIndicatorBadge } from './TurnIndicatorBadge';
import { BattleContextMenu } from './BattleContextMenu';
import { SelectedCardEffectsPanel } from './SelectedCardEffectsPanel';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/app-dialog/ConfirmDialog';
import { AnimatePresence, motion } from 'framer-motion';
import { ScrollText, AlertTriangle, Flag, Volume2, VolumeX } from 'lucide-react';

interface AttackAnimationData {
  attackerName: string;
  attackerImage?: string;
  attackerAtk: number;
  defenderName: string;
  defenderImage?: string;
  damage: number;
  isCritical?: boolean;
}

interface DefeatedCardData {
  name: string;
  image?: string;
  isOpponent: boolean;
}

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
  const [isAttacking, setIsAttacking] = useState(false);
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
  const [showSetupAnnouncement, setShowSetupAnnouncement] = useState(false);
  const [actualTimerStart, setActualTimerStart] = useState<string | null>(null);
  const [trapOverlay, setTrapOverlay] = useState<{ name: string; description: string; image?: string } | null>(null);
  const [attackAnimation, setAttackAnimation] = useState<AttackAnimationData | null>(null);
  const [defeatedCard, setDefeatedCard] = useState<DefeatedCardData | null>(null);
  const [showTimeoutOverlay, setShowTimeoutOverlay] = useState(false);
  const [timeoutNextPlayerName, setTimeoutNextPlayerName] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const abandonTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTurnStartRef = useRef<string | null>(null);
  const lastTrapTimestampRef = useRef<string>('0');
  const lastAttackTimestampRef = useRef<string>('0');
  const prevMyMonsterRef = useRef<string | null>(null);
  const prevOpponentMonsterRef = useRef<string | null>(null);
  
  const { triggerShake } = useScreenShake();
  const { playAttackSound, playSwooshSound, playWinSound, playLoseSound, playBattleMusic, stopBattleMusic, playDefenseSound, playCardDefeatedSound, playSpellSound } = useBattleSounds();

  const gameState = battle?.game_state as any;
  const isPlayer1 = myPlayerNumber() === 'PLAYER1';
  
  const myHP = isPlayer1 ? gameState?.player1_hp : gameState?.player2_hp;
  const opponentHP = isPlayer1 ? gameState?.player2_hp : gameState?.player1_hp;
  const myField = isPlayer1 ? gameState?.player1_field : gameState?.player2_field;
  const opponentField = isPlayer1 ? gameState?.player2_field : gameState?.player1_field;
  const battleLog = gameState?.battle_log || [];
  const isSetupPhase = gameState?.is_setup_phase === true;
  const hasAttackedThisTurn = gameState?.has_attacked_this_turn === true;
  const hasPlayedCardThisTurn = gameState?.has_played_card_this_turn === true;
  const currentTurnNumber = Number(gameState?.turn_number) || 1;

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

  // Derived boolean that only changes once when game starts (not on every game_state update)
  const hasGameStarted = Boolean(
    battle?.game_state && 
    typeof battle.game_state === 'object' &&
    Object.keys(battle.game_state as object).length > 0
  );

  // Toggle mute function
  const toggleMute = useCallback(() => {
    if (isMuted) {
      playBattleMusic();
    } else {
      stopBattleMusic();
    }
    setIsMuted(!isMuted);
  }, [isMuted, playBattleMusic, stopBattleMusic]);

  // Control background music based on battle state - only depends on status changes, not game_state
  useEffect(() => {
    const isBattleActive = battle?.status === 'IN_PROGRESS' && 
      hasGameStarted &&
      battle?.player2_id;
    
    if (isBattleActive && !isMuted) {
      playBattleMusic();
    } else {
      stopBattleMusic();
    }
    
    // Cleanup on unmount
    return () => {
      stopBattleMusic();
    };
  }, [battle?.status, battle?.player2_id, hasGameStarted, isMuted, playBattleMusic, stopBattleMusic]);

  // Show setup phase announcement for 3 seconds only
  useEffect(() => {
    if (duelStartComplete && isSetupPhase) {
      setShowSetupAnnouncement(true);
      
      const timer = setTimeout(() => {
        setShowSetupAnnouncement(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [duelStartComplete, isSetupPhase]);

  // Track if this is the first turn (animations just completed)
  const isFirstTurnAfterAnimations = useRef(true);

  // Sync timer start when overlays end - for first turn, use NOW to give full time after animations
  useEffect(() => {
    const overlaysActive = showDuelStart || showSetupAnnouncement;
    
    if (!overlaysActive && battle?.status === 'IN_PROGRESS') {
      if (isFirstTurnAfterAnimations.current) {
        // First turn: use NOW so player gets full 30 seconds after animations complete
        setActualTimerStart(new Date().toISOString());
        isFirstTurnAfterAnimations.current = false;
      } else if (battle.turn_started_at) {
        // Subsequent turns: use backend timestamp for synchronization
        setActualTimerStart(battle.turn_started_at);
      }
    }
  }, [showDuelStart, showSetupAnnouncement, battle?.status, battle?.turn_started_at]);

  // Reset timer when turn changes (after first turn)
  useEffect(() => {
    if (!battle?.turn_started_at) return;
    
    // Only update if turn actually changed (not initial load)
    if (lastTurnStartRef.current && lastTurnStartRef.current !== battle.turn_started_at) {
      // Turn changed - use the database timestamp
      setActualTimerStart(battle.turn_started_at);
    }
    
    lastTurnStartRef.current = battle.turn_started_at;
  }, [battle?.turn_started_at]);

  // Detect trap activations from battle_log using timestamp
  useEffect(() => {
    if (!battleLog || battleLog.length === 0) return;
    
    // Look for trap activations - check both dedicated TRAP_ACTIVATED entries AND attack entries with trap_activated=true
    const trapEntries = battleLog.filter((log: any) => 
      (log.type === 'TRAP_ACTIVATED' || log.action === 'TRAP_ACTIVATED') ||
      (log.trap_activated === true && (log.type === 'ATTACK_MONSTER' || log.type === 'DIRECT_ATTACK' || log.action === 'ATTACK'))
    );
    
    if (trapEntries.length === 0) return;
    
    // Sort by timestamp to get the most recent (accept both logged_at and timestamp)
    const sortedTraps = [...trapEntries].sort((a: any, b: any) => {
      const aTime = parseFloat(a.logged_at || '0') || new Date(a.timestamp).getTime() / 1000;
      const bTime = parseFloat(b.logged_at || '0') || new Date(b.timestamp).getTime() / 1000;
      return bTime - aTime;
    });
    const latestTrap = sortedTraps[0];
    const latestTimestamp = latestTrap.logged_at || (new Date(latestTrap.timestamp).getTime() / 1000).toString();
    
    // Only show if this trap is newer than the last one we processed
    if (parseFloat(latestTimestamp) > parseFloat(lastTrapTimestampRef.current)) {
      // Show trap overlay with effect info - use "trap" field for name, fall back to trap_message
      const trapName = latestTrap.trap || "Armadilha";
      const trapEffect = latestTrap.message || latestTrap.trap_message || getTrapEffectDescription(latestTrap.effect);
      
      // Find trap card image from allCards
      const trapCard = allCards?.find(c => 
        c.name?.toLowerCase() === trapName.toLowerCase() && 
        c.card_type === 'TRAP'
      );
      
      setTrapOverlay({ name: trapName, description: trapEffect, image: trapCard?.image_url || undefined });
      playSpellSound();
      
      // Auto-hide after 2.5 seconds
      setTimeout(() => {
        setTrapOverlay(null);
      }, 2500);
      
      // Update the last processed timestamp
      lastTrapTimestampRef.current = latestTimestamp;
    }
  }, [battleLog, playSpellSound, allCards]);

  // Detect opponent attacks from battle_log using timestamp (same pattern as traps)
  useEffect(() => {
    if (!battleLog || battleLog.length === 0) return;
    
    // Find attack entries - accept both old format (action='ATTACK') and new format (type='ATTACK_MONSTER'/'DIRECT_ATTACK')
    // IMPORTANT: Filter out FREEZE_PREVENTED_ATTACK - these are failed attacks that should not show animation
    const attackEntries = battleLog.filter((log: any) => 
      (log.type === 'ATTACK_MONSTER' || log.type === 'DIRECT_ATTACK' || log.action === 'ATTACK') &&
      log.action !== 'FREEZE_PREVENTED_ATTACK' &&
      log.type !== 'FREEZE_PREVENTED_ATTACK' &&
      (log.logged_at || log.timestamp)
    );
    
    if (attackEntries.length === 0) return;
    
    // Sort by timestamp to get the most recent (accept both logged_at and timestamp)
    const sortedAttacks = [...attackEntries].sort((a: any, b: any) => {
      const aTime = parseFloat(a.logged_at || '0') || new Date(a.timestamp).getTime() / 1000;
      const bTime = parseFloat(b.logged_at || '0') || new Date(b.timestamp).getTime() / 1000;
      return bTime - aTime;
    });
    const latestAttack = sortedAttacks[0];
    const latestTimestamp = latestAttack.logged_at || (new Date(latestAttack.timestamp).getTime() / 1000).toString();
    
    // Only process if this attack is newer than the last one we processed
    if (parseFloat(latestTimestamp) > parseFloat(lastAttackTimestampRef.current)) {
      // Determine if this attack was from the opponent (not from us) - accept both attacker_player and player fields
      const attackerPlayer = latestAttack.attacker_player || latestAttack.player;
      const attackerIsPlayer1 = attackerPlayer === 'PLAYER1';
      const weArePlayer1 = isPlayer1;
      const isOpponentAttack = attackerIsPlayer1 !== weArePlayer1;
      
      // Only show animation if opponent attacked (we didn't initiate it)
      if (isOpponentAttack) {
        // Find card data for the animation
        const attackerMonsterName = latestAttack.attacker;
        const defenderMonsterName = latestAttack.defender;
        
        // Find monster cards from allCards
        const attackerCard = allCards?.find(c => 
          c.name?.toLowerCase() === attackerMonsterName?.toLowerCase()
        );
        const defenderCard = allCards?.find(c => 
          c.name?.toLowerCase() === defenderMonsterName?.toLowerCase()
        );
        
        // Set up animation data for opponent attack
        setAttackAnimation({
          attackerName: attackerMonsterName || 'Monstro Inimigo',
          attackerImage: attackerCard?.image_url,
          attackerAtk: attackerCard?.atk || latestAttack.damage || 0,
          defenderName: defenderMonsterName || 'Seu Monstro',
          defenderImage: defenderCard?.image_url,
          damage: latestAttack.damage || 0,
          isCritical: (latestAttack.damage || 0) >= 30
        });
        
        // Play sounds for opponent attack too
        playSwooshSound();
        setTimeout(() => {
          playAttackSound();
          triggerShake();
        }, 900);
        
        // Clear animation after it completes
        setTimeout(() => {
          setAttackAnimation(null);
        }, 2000);
      }
      
      // Update the last processed timestamp regardless of who attacked
      lastAttackTimestampRef.current = latestTimestamp;
    }
  }, [battleLog, isPlayer1, allCards, playSwooshSound, playAttackSound, triggerShake]);

  // Detect defeated monsters
  useEffect(() => {
    const currentMyMonster = myField?.monster?.id || null;
    const currentOpponentMonster = opponentField?.monster?.id || null;
    
    // Check if my monster was destroyed
    if (prevMyMonsterRef.current && !currentMyMonster) {
      const destroyedMonster = allCards?.find(c => c.id === prevMyMonsterRef.current);
      setDefeatedCard({
        name: destroyedMonster?.name || 'Seu Monstro',
        image: destroyedMonster?.image_url,
        isOpponent: false
      });
      playCardDefeatedSound();
      
      setTimeout(() => setDefeatedCard(null), 1500);
    }
    
    // Check if opponent monster was destroyed
    if (prevOpponentMonsterRef.current && !currentOpponentMonster) {
      const destroyedMonster = allCards?.find(c => c.id === prevOpponentMonsterRef.current);
      setDefeatedCard({
        name: destroyedMonster?.name || 'Monstro Inimigo',
        image: destroyedMonster?.image_url,
        isOpponent: true
      });
      playCardDefeatedSound();
      
      setTimeout(() => setDefeatedCard(null), 1500);
    }
    
    // Update refs
    prevMyMonsterRef.current = currentMyMonster;
    prevOpponentMonsterRef.current = currentOpponentMonster;
  }, [myField?.monster?.id, opponentField?.monster?.id, allCards, playCardDefeatedSound]);

  // Helper function to get trap effect descriptions
  const getTrapEffectDescription = (effectType?: string): string => {
    const effects: Record<string, string> = {
      'SHIELD': 'Anula o ataque do oponente completamente!',
      'COUNTER': 'Reflete 50% do dano de volta ao atacante!',
      'DRAIN': 'Absorve HP do oponente para si mesmo!',
      'WEAKEN': 'Reduz o ATK do monstro atacante!',
      'STUN': 'O monstro atacante não pode atacar no próximo turno!',
    };
    return effects[effectType || ''] || 'Efeito especial ativado!';
  };

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
    if (!battle || !myField?.monster || isAttacking) return;
    
    // Block button immediately
    setIsAttacking(true);
    
    // Get monster data for animation
    const myMonster = myField.monster;
    const enemyMonster = opponentField?.monster;
    
    // Find full card data from allCards
    const myMonsterCard = allCards?.find(c => c.id === myMonster.id);
    const enemyMonsterCard = enemyMonster ? allCards?.find(c => c.id === enemyMonster.id) : null;
    
    // Calculate estimated damage (ATK value)
    const estimatedDamage = myMonsterCard?.atk || myMonster.atk || 0;
    
    // Set up animation data
    setAttackAnimation({
      attackerName: myMonsterCard?.name || myMonster.name || 'Monstro',
      attackerImage: myMonsterCard?.image_url || myMonster.image_url,
      attackerAtk: myMonsterCard?.atk || myMonster.atk || 0,
      defenderName: enemyMonsterCard?.name || enemyMonster?.name || 'Oponente',
      defenderImage: enemyMonsterCard?.image_url || enemyMonster?.image_url,
      damage: estimatedDamage,
      isCritical: estimatedDamage >= 30
    });
    
    // Play sounds with timing
    playSwooshSound(); // Card jump sound
    
    // Delayed attack sound at impact moment
    setTimeout(() => {
      playAttackSound();
      triggerShake();
    }, 900);
    
    // Mark our attack timestamp to prevent double animation from log detection
    lastAttackTimestampRef.current = (Date.now() / 1000).toString();
    
    // Execute attack after animation starts
    setTimeout(async () => {
      try {
        const result = await attack.mutateAsync(battle.id) as { damage?: number } | null;
        
        // Update animation with real damage from database
        const realDamage = result?.damage ?? estimatedDamage;
        setAttackAnimation(prev => prev ? {
          ...prev,
          damage: realDamage,
          isCritical: realDamage >= 30
        } : null);
        
        // Keep animation visible for a moment after update
        setTimeout(() => {
          setAttackAnimation(null);
          setIsAttacking(false);
        }, 800);
      } catch (error: any) {
        toast.error(error?.message || 'Erro ao atacar');
        setIsAttacking(false);
        setAttackAnimation(null);
      }
    }, 500);
  };

  const handleAbandonBattle = async () => {
    if (!battle) return;
    await abandonBattle.mutateAsync(battle.id);
    navigate('/aluno/batalha');
  };

  const handleTurnTimeout = useCallback(async () => {
    if (!battle?.id || !forceTimeoutTurn) return;
    
    const showTimeoutResult = (result: any) => {
      if (result?.turn_passed || result?.timeout_occurred) {
        const nextPlayerName = result?.new_turn === 'PLAYER1' 
          ? (player1Profile?.name || 'Jogador 1')
          : (player2Profile?.name || 'Jogador 2');
        
        setTimeoutNextPlayerName(nextPlayerName);
        setShowTimeoutOverlay(true);
        setTimeout(() => setShowTimeoutOverlay(false), 2500);
      }
    };
    
    try {
      const result = await forceTimeoutTurn.mutateAsync(battle.id);
      
      // If turn passed, show overlay
      if (result?.turn_passed || result?.timeout_occurred) {
        showTimeoutResult(result);
        return;
      }
      
      // If not passed yet (race condition), retry after 1 second
      console.log('Timeout not confirmed by backend, retrying in 1s...');
      setTimeout(async () => {
        try {
          const retryResult = await forceTimeoutTurn.mutateAsync(battle.id);
          showTimeoutResult(retryResult);
        } catch (retryError) {
          console.error('Retry timeout error:', retryError);
        }
      }, 1000);
    } catch (error) {
      console.error('Timeout error:', error);
    }
  }, [battle?.id, forceTimeoutTurn, player1Profile?.name, player2Profile?.name]);

  const handleEndTurn = useCallback(async () => {
    if (!battle || !isMyTurn()) return;
    endTurn?.(battle.id);
  }, [battle?.id, isMyTurn, endTurn]);

  // Auto-end turn when all actions completed
  const autoEndTurnRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Clear any pending auto-end
    if (autoEndTurnRef.current) {
      clearTimeout(autoEndTurnRef.current);
      autoEndTurnRef.current = null;
    }
    
    if (!isMyTurn() || !battle || isSetupPhase) return;
    
    // Check if player has completed all possible actions
    const hasMonster = myField?.monster !== null;
    const hasSummoningSickness = hasMonster && Number(myField?.monster?.summoned_on_turn) === currentTurnNumber;
    const canStillAttack = hasMonster && !hasAttackedThisTurn && !hasSummoningSickness;
    
    // Auto-end if: played card AND (attacked OR can't attack)
    const shouldAutoEnd = hasPlayedCardThisTurn && !canStillAttack;
    
    if (shouldAutoEnd) {
      // Delay to let player see the result of their action
      autoEndTurnRef.current = setTimeout(() => {
        handleEndTurn();
      }, 1500);
    }
    
    return () => {
      if (autoEndTurnRef.current) {
        clearTimeout(autoEndTurnRef.current);
      }
    };
  }, [isMyTurn, battle, isSetupPhase, hasPlayedCardThisTurn, hasAttackedThisTurn, myField?.monster, currentTurnNumber, handleEndTurn]);

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
      
      {/* Mute Button - glassmorphic, semi-transparent, z-60 to stay above modals */}
      <button
        onClick={toggleMute}
        className="fixed top-4 left-4 z-[60] p-2 rounded-full bg-background/30 backdrop-blur-sm border border-white/10 hover:bg-background/50 transition-all"
        aria-label={isMuted ? 'Ativar som' : 'Desativar som'}
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Volume2 className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Turn Indicator Badge - always visible, discreet */}
      {battle.status === 'IN_PROGRESS' && !showDuelStart && !showSetupAnnouncement && (
        <TurnIndicatorBadge isMyTurn={isMyTurn()} />
      )}

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
          turnStartedAt={actualTimerStart}
          maxSeconds={30}
          onTimeout={handleTurnTimeout}
          isPaused={showDuelStart || showSetupAnnouncement}
        />
        
        <BattleFieldEnhanced 
          monster={opponentField?.monster} 
          traps={opponentField?.traps || []} 
          isOpponent 
        />
        
        <BattleZoneDivider />

        <BattleFieldEnhanced 
          monster={myField?.monster} 
          traps={myField?.traps || []} 
          hasAttackedThisTurn={hasAttackedThisTurn}
          currentTurnNumber={currentTurnNumber}
          isMyField
        />
        
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

        {/* Holographic Effects Panel for selected card */}
        <SelectedCardEffectsPanel 
          card={selectedCard ? (playerHand.find(c => c.id === selectedCard) || allCards?.find(c => c.id === selectedCard) || null) : null}
          isVisible={selectedCard !== null}
        />

        <BattleActionButtons 
          canPlayCard={selectedCard !== null && isMyTurn() && !hasPlayedCardThisTurn} 
          canAttack={myField?.monster !== null && isMyTurn() && !isSetupPhase && !hasAttackedThisTurn && !isAttacking && Number(myField?.monster?.summoned_on_turn) !== currentTurnNumber} 
          isMyTurn={isMyTurn()} 
          onPlayCard={handlePlayCard} 
          onAttack={handleAttack} 
          onEndTurn={handleEndTurn}
          isSetupPhase={isSetupPhase}
          hasAttackedThisTurn={hasAttackedThisTurn}
          hasPlayedCardThisTurn={hasPlayedCardThisTurn}
          hasSummoningSickness={myField?.monster && Number(myField.monster.summoned_on_turn) === currentTurnNumber}
        />

        {/* Duel Start Announcement */}
        <BattleDuelStart 
          isVisible={showDuelStart && battle.status === 'IN_PROGRESS'} 
          onComplete={() => {
            setShowDuelStart(false);
            setDuelStartComplete(true);
          }} 
        />

        {/* Setup Phase Announcement - shows for 3 seconds only */}
        <BattlePhaseAnnouncement 
          isVisible={showSetupAnnouncement && battle.status === 'IN_PROGRESS'} 
          phase="SETUP" 
        />

        {/* Turn indicator badge provides discreet turn status - removed big overlay */}

        {/* Battle Context Menu - Top Right */}
        <div className="fixed top-4 right-4 z-[60]">
          <BattleContextMenu
            onViewHistory={() => setShowBattleLog(!showBattleLog)}
            onForfeit={handleForfeit}
            showingLog={showBattleLog}
          />
        </div>

        {/* Battle Log Panel */}
        {showBattleLog && (
          <div className="fixed right-4 top-14 z-[55] w-64 max-h-[300px]">
            <BattleLog 
              logs={battleLog} 
              player1Name={player1Profile?.name || 'Jogador 1'}
              player2Name={player2Profile?.name || 'Jogador 2'}
              onClose={() => setShowBattleLog(false)} 
            />
          </div>
        )}

        <AnimatePresence>
          {isPlaying && selectedCard && <CardPlayEffect cardId={selectedCard} />}
        </AnimatePresence>

        {/* Trap Activation Overlay */}
        <TrapActivationOverlay 
          isVisible={trapOverlay !== null}
          trapName={trapOverlay?.name || ''}
          trapDescription={trapOverlay?.description || ''}
          trapImage={trapOverlay?.image}
        />

        {/* Monster Attack Animation */}
        <MonsterAttackAnimation 
          isVisible={attackAnimation !== null}
          attackData={attackAnimation}
          onComplete={() => setAttackAnimation(null)}
        />

        {/* Timeout Overlay */}
        <TimeoutOverlay 
          isVisible={showTimeoutOverlay}
          nextPlayerName={timeoutNextPlayerName}
        />

        {/* Defeated Card Effect */}
        <DefeatedCardEffect 
          isVisible={defeatedCard !== null}
          cardName={defeatedCard?.name || ''}
          cardImage={defeatedCard?.image}
          accentColor={defeatedCard?.isOpponent ? 'red' : 'blue'}
          onComplete={() => setDefeatedCard(null)}
        />
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
            battleLog={battleLog}
            player1Name={player1Profile?.name || 'Jogador 1'}
            player2Name={player2Profile?.name || 'Jogador 2'}
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
            battleLog={battleLog}
            player1Name={player1Profile?.name || 'Jogador 1'}
            player2Name={player2Profile?.name || 'Jogador 2'}
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
