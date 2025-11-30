import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, PackType, PACK_COSTS, PACK_SIZES, RARITY_LABELS } from '@/types/cards';
import { CardDisplay } from './CardDisplay';
import { useState } from 'react';
import { Sparkles, Gift } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Badge } from '@/components/ui/badge';

interface PackOpeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPack: (packType: PackType) => void;
  onClaimFreePack?: () => void;
  isOpening: boolean;
  userXP: number;
  lastOpenedCards?: Card[];
  hasClaimedFreePack?: boolean;
}

export const PackOpeningModal = ({ 
  isOpen, 
  onClose, 
  onOpenPack,
  onClaimFreePack,
  isOpening,
  userXP,
  lastOpenedCards,
  hasClaimedFreePack = true
}: PackOpeningModalProps) => {
  const [selectedPack, setSelectedPack] = useState<PackType | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [revealedCards, setRevealedCards] = useState<Card[]>([]);

  const packs: { type: PackType; name: string; color: string }[] = [
    { type: 'BASIC', name: 'Pacote Básico', color: 'bg-gray-500' },
    { type: 'RARE', name: 'Pacote Raro', color: 'bg-blue-500' },
    { type: 'EPIC', name: 'Pacote Épico', color: 'bg-purple-500' },
    { type: 'LEGENDARY', name: 'Pacote Lendário', color: 'bg-yellow-500' },
  ];

  const handleOpenPack = async (packType: PackType) => {
    setSelectedPack(packType);
    setRevealing(true);
    setRevealedCards([]);
    onOpenPack(packType);
  };

  const handleRevealCards = () => {
    if (lastOpenedCards) {
      // Revelar cartas uma por uma
      lastOpenedCards.forEach((card, idx) => {
        setTimeout(() => {
          setRevealedCards(prev => [...prev, card]);
          
          // Confetti para cartas raras+
          if (card.rarity === 'RARE' || card.rarity === 'EPIC' || card.rarity === 'LEGENDARY') {
            confetti({
              particleCount: card.rarity === 'LEGENDARY' ? 100 : 50,
              spread: 70,
              origin: { y: 0.6 }
            });
          }
        }, idx * 500);
      });
    }
  };

  const handleClose = () => {
    setSelectedPack(null);
    setRevealing(false);
    setRevealedCards([]);
    onClose();
  };

  // Auto-revelar quando terminar de abrir
  if (revealing && lastOpenedCards && revealedCards.length === 0 && !isOpening) {
    handleRevealCards();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Loja de Pacotes
          </DialogTitle>
        </DialogHeader>

        {!revealing ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Seu XP disponível</p>
              <p className="text-2xl font-bold flex items-center justify-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-500" />
                {userXP} XP
              </p>
            </div>

            {/* Pacote Inicial Gratuito */}
            {!hasClaimedFreePack && onClaimFreePack && (
              <div
                className="relative p-6 rounded-lg border-4 border-green-500 bg-gradient-to-br from-green-500/20 to-emerald-500/20 cursor-pointer hover:scale-105 transition-all animate-pulse"
                onClick={onClaimFreePack}
              >
                <div className="absolute -top-3 -right-3">
                  <Badge className="bg-green-500 text-white border-0 px-3 py-1 text-sm font-bold">
                    GRÁTIS
                  </Badge>
                </div>
                
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-4 mx-auto shadow-lg shadow-green-500/50">
                  <Gift className="w-10 h-10 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-center mb-2 text-green-400">
                  🎁 Pacote Inicial Gratuito!
                </h3>
                <p className="text-sm text-center mb-3 text-muted-foreground">
                  5 cartas para começar sua jornada
                </p>
                
                <div className="text-center">
                  <p className="text-lg font-bold text-green-400">
                    Reivindique agora!
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Disponível apenas uma vez
                  </p>
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {packs.map(pack => {
                const cost = PACK_COSTS[pack.type];
                const size = PACK_SIZES[pack.type];
                const canAfford = userXP >= cost;

                return (
                  <div
                    key={pack.type}
                    className={`relative p-6 rounded-lg border-2 transition-all ${
                      canAfford 
                        ? 'border-primary hover:border-primary/80 cursor-pointer hover:scale-105' 
                        : 'border-muted opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => canAfford && handleOpenPack(pack.type)}
                  >
                    <div className={`w-16 h-16 rounded-full ${pack.color} flex items-center justify-center mb-4 mx-auto`}>
                      <Gift className="w-8 h-8 text-white" />
                    </div>
                    
                    <h3 className="text-lg font-bold text-center mb-2">{pack.name}</h3>
                    <p className="text-sm text-muted-foreground text-center mb-3">
                      {size} cartas
                    </p>
                    
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      <span className="font-bold">{cost} XP</span>
                    </div>

                    {!canAfford && (
                      <Badge variant="destructive" className="absolute top-2 right-2">
                        XP Insuficiente
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {isOpening ? (
              <div className="text-center py-12">
                <Gift className="w-16 h-16 mx-auto mb-4 animate-bounce text-primary" />
                <p className="text-lg font-semibold">Abrindo pacote...</p>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2">🎉 Cartas Recebidas!</h3>
                  <p className="text-sm text-muted-foreground">
                    {revealedCards.length} de {lastOpenedCards?.length || 0}
                  </p>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {revealedCards.map((card, idx) => (
                    <div key={idx} className="animate-in zoom-in duration-300">
                      <CardDisplay card={card} size="sm" />
                    </div>
                  ))}
                </div>

                {revealedCards.length === lastOpenedCards?.length && (
                  <Button onClick={handleClose} className="w-full">
                    Continuar
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
