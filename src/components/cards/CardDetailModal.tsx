import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, RARITY_COLORS, RARITY_LABELS, CATEGORY_LABELS } from '@/types/cards';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Shield, Zap, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CardDetailModalProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
  quantity?: number;
}

export const CardDetailModal = ({ card, isOpen, onClose, quantity }: CardDetailModalProps) => {
  if (!card) return null;

  const getEffectIcon = (type: string) => {
    switch (type) {
      case 'BURN': return '🔥';
      case 'SHIELD': return '🛡️';
      case 'BOOST': return '⚡';
      case 'HEAL': return '💚';
      case 'FREEZE': return '❄️';
      case 'DOUBLE': return '✨';
      default: return '⭐';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{card.name}</span>
            <Badge className={RARITY_COLORS[card.rarity]}>
              {RARITY_LABELS[card.rarity]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Imagem da Carta */}
          <div className={cn(
            'relative aspect-[3/4] rounded-lg border-4 overflow-hidden',
            RARITY_COLORS[card.rarity]
          )}>
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 to-background" />
            {card.image_url ? (
              <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Sparkles className="w-24 h-24 text-muted-foreground" />
              </div>
            )}
            
            {quantity !== undefined && quantity > 0 && (
              <div className="absolute top-4 right-4 bg-background/90 rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg border-2 border-primary">
                {quantity}
              </div>
            )}
          </div>

          {/* Informações */}
          <div className="space-y-4">
            {/* Categoria */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Categoria</p>
              <Badge variant="outline">{CATEGORY_LABELS[card.category]}</Badge>
            </div>

            {/* Descrição */}
            {card.description && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Descrição</p>
                <p className="text-sm">{card.description}</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <Zap className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Ataque</p>
                  <p className="text-xl font-bold">{card.atk}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Shield className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Defesa</p>
                  <p className="text-xl font-bold">{card.def}</p>
                </div>
              </div>
            </div>

            {/* Efeitos Especiais */}
            {card.effects.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Efeitos Especiais
                </p>
                <div className="space-y-2">
                  {card.effects.map((effect, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <span className="text-lg">{getEffectIcon(effect.type)}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{effect.type}</p>
                        <p className="text-xs text-muted-foreground">{effect.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Level Requirement */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="w-4 h-4" />
              <span>Nível necessário: {card.required_level}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
