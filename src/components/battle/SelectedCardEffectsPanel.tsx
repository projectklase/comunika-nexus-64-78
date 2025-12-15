import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardEffect } from '@/types/cards';
import { InteractiveCard3D } from '@/components/cards/InteractiveCard3D';
import { Flame, Shield, Zap, Heart, Snowflake, Copy, RotateCcw, Skull, Sparkles, Swords, X } from 'lucide-react';

// Effect descriptions for fallback
const EFFECT_DESCRIPTIONS: Record<string, string> = {
  BURN: 'Causa dano direto ao HP do oponente',
  SHIELD: 'Bloqueia ou reduz dano recebido',
  BOOST: 'Aumenta o ATK do monstro',
  HEAL: 'Recupera HP do jogador',
  FREEZE: 'Congela o monstro inimigo por 1 turno',
  DOUBLE: 'Dobra o efeito aplicado',
  REFLECT: 'Reflete dano de volta ao atacante',
  SWAP_STATS: 'Troca ATK e DEF do monstro inimigo',
  DRAIN: 'Rouba HP do oponente',
};

interface SelectedCardEffectsPanelProps {
  card: Card | null;
  isVisible: boolean;
  onClose?: () => void;
}

const EFFECT_ICONS: Record<string, React.ReactNode> = {
  BURN: <Flame className="w-4 h-4 text-orange-400" />,
  SHIELD: <Shield className="w-4 h-4 text-blue-400" />,
  BOOST: <Zap className="w-4 h-4 text-yellow-400" />,
  HEAL: <Heart className="w-4 h-4 text-green-400" />,
  FREEZE: <Snowflake className="w-4 h-4 text-cyan-400" />,
  DOUBLE: <Copy className="w-4 h-4 text-purple-400" />,
  REFLECT: <RotateCcw className="w-4 h-4 text-pink-400" />,
  SWAP_STATS: <RotateCcw className="w-4 h-4 text-pink-400" />,
  DRAIN: <Skull className="w-4 h-4 text-red-400" />,
};

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  MONSTER: { label: 'Monstro', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  SPELL: { label: 'Magia', color: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  TRAP: { label: 'Armadilha', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
};

// Rarity glow colors
const RARITY_GLOW: Record<string, string> = {
  COMMON: 'from-gray-400/30 via-gray-500/20 to-gray-400/30',
  UNCOMMON: 'from-green-400/40 via-emerald-500/30 to-green-400/40',
  RARE: 'from-blue-400/50 via-cyan-500/40 to-blue-400/50',
  EPIC: 'from-purple-400/50 via-violet-500/40 to-purple-400/50',
  LEGENDARY: 'from-amber-400/60 via-yellow-500/50 to-amber-400/60',
};

export const SelectedCardEffectsPanel = ({ card, isVisible, onClose }: SelectedCardEffectsPanelProps) => {
  if (!card) return null;

  const cardType = card.card_type || 'MONSTER';
  const typeBadge = TYPE_BADGES[cardType] || TYPE_BADGES.MONSTER;
  const effects = card.effects || [];
  const rarity = card.rarity || 'COMMON';
  const glowGradient = RARITY_GLOW[rarity] || RARITY_GLOW.COMMON;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 flex items-center justify-center z-[70]"
        >
          {/* Clickable overlay to close */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
            onClick={onClose}
          />
          
          {/* Main container - responsive: column on mobile, row on desktop */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative flex flex-col md:flex-row items-center gap-4 md:gap-6 p-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated holographic glow behind everything */}
            <div 
              className={`absolute -inset-8 bg-gradient-to-r ${glowGradient} blur-3xl opacity-60 animate-pulse pointer-events-none`}
              style={{ animationDuration: '2s' }}
            />
            
            {/* Close button - mobile only */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 md:hidden z-10 p-2 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* The floating card with 3D interaction */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7, rotateY: -20 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              exit={{ opacity: 0, scale: 0.8, rotateY: 10 }}
              transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
              className="relative"
              style={{ perspective: '1000px' }}
            >
              {/* InteractiveCard3D - md on mobile, xl on desktop */}
              <div className="block md:hidden">
                <InteractiveCard3D card={card} size="md" />
              </div>
              <div className="hidden md:block">
                <InteractiveCard3D card={card} size="xl" />
              </div>
              
              {/* Floating shadow beneath card */}
              <div 
                className="absolute -bottom-4 md:-bottom-6 left-1/2 -translate-x-1/2 w-4/5 h-4 md:h-6 bg-black/40 blur-xl rounded-full pointer-events-none"
                style={{ transform: 'translateX(-50%) scaleY(0.3)' }}
              />
            </motion.div>
            
            {/* Info panel - below on mobile, right side on desktop */}
            <motion.div
              initial={{ opacity: 0, y: 20, x: 0 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.35, ease: 'easeOut', delay: 0.15 }}
              className="relative w-full md:w-auto"
            >
              {/* Holographic border effect */}
              <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-cyan-500/50 via-purple-500/50 to-pink-500/50 opacity-70" 
                   style={{ 
                     backgroundSize: '200% 100%',
                     animation: 'holographicShift 3s ease-in-out infinite'
                   }} 
              />
              
              {/* Info content */}
              <div className="relative backdrop-blur-xl bg-black/70 rounded-xl p-4 min-w-[240px] max-w-full md:max-w-[280px] border border-white/5">
                {/* Header with name and type badge */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold text-white text-sm truncate max-w-[150px]">
                      {card.name}
                    </h3>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${typeBadge.color}`}>
                    {typeBadge.label}
                  </span>
                </div>

                {/* Description */}
                {card.description && (
                  <p className="text-xs text-white/70 mb-3 italic line-clamp-2">
                    "{card.description}"
                  </p>
                )}

                {/* Stats for monsters */}
                {cardType === 'MONSTER' && (
                  <div className="flex gap-4 mb-3 text-xs">
                    <div className="flex items-center gap-1">
                      <Swords className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-red-300 font-semibold">{card.atk} ATK</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-blue-300 font-semibold">{card.def} DEF</span>
                    </div>
                  </div>
                )}

                {/* Effects */}
                {effects.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-cyan-400 font-semibold flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      EFEITOS
                    </p>
                    <div className="space-y-1.5">
                      {effects.map((effect: CardEffect, index: number) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + index * 0.08 }}
                          className="flex items-start gap-2 bg-white/5 rounded-lg px-2 py-1.5"
                        >
                          <div className="mt-0.5">
                            {EFFECT_ICONS[effect.type] || <Sparkles className="w-4 h-4 text-white/50" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white/90">
                              <span className="font-semibold text-white">{effect.type}</span>
                              {effect.value > 0 && <span className="text-cyan-300 ml-1">({effect.value})</span>}
                            </p>
                            <p className="text-xs text-white/60 line-clamp-2">
                              {effect.description || EFFECT_DESCRIPTIONS[effect.type] || 'Efeito especial'}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No effects message */}
                {effects.length === 0 && cardType === 'MONSTER' && (
                  <p className="text-xs text-white/40 italic">Sem efeitos especiais</p>
                )}
                
                {/* Hint to close */}
                <p className="text-xs text-white/30 mt-3 text-center hidden md:block">
                  Clique fora para fechar
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* CSS for holographic animation */}
          <style>{`
            @keyframes holographicShift {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
