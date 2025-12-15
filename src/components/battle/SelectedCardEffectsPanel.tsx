import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardEffect } from '@/types/cards';
import { Flame, Shield, Zap, Heart, Snowflake, Copy, RotateCcw, Swords, Skull, Sparkles } from 'lucide-react';

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

export const SelectedCardEffectsPanel = ({ card, isVisible }: SelectedCardEffectsPanelProps) => {
  if (!card) return null;

  const cardType = card.card_type || 'MONSTER';
  const typeBadge = TYPE_BADGES[cardType] || TYPE_BADGES.MONSTER;
  const effects = card.effects || [];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed bottom-44 left-1/2 -translate-x-1/2 z-[70] pointer-events-none"
        >
          {/* Holographic glow effect */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 blur-xl animate-pulse" />
          
          {/* Main panel with glassmorphism */}
          <div className="relative backdrop-blur-xl bg-black/60 rounded-xl border border-white/10 p-4 min-w-[280px] max-w-[320px] shadow-2xl">
            {/* Animated gradient border */}
            <div className="absolute inset-0 rounded-xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-pink-500/30 opacity-50" 
                   style={{ 
                     backgroundSize: '200% 100%',
                     animation: 'holographicShift 3s ease-in-out infinite'
                   }} 
              />
            </div>
            
            {/* Content */}
            <div className="relative z-10">
              {/* Header with name and type badge */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-bold text-white text-sm truncate max-w-[180px]">
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
                        transition={{ delay: index * 0.1 }}
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
            </div>
          </div>
        </motion.div>
      )}

      {/* CSS for holographic animation */}
      <style>{`
        @keyframes holographicShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </AnimatePresence>
  );
};
