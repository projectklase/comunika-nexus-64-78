import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, PackType, PACK_COSTS, PACK_SIZES } from '@/types/cards';
import { CardDetailModal } from './CardDetailModal';
import { PackOpeningScene } from './PackOpeningScene';
import { useState, useEffect, useRef } from 'react';
import { Sparkles, Gift, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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

// Probabilidades de raridade por tipo de pacote (devem coincidir com o backend)
const PACK_PROBABILITIES: Record<PackType, { common: number; rare: number; epic: number; legendary: number }> = {
  BASIC: { common: 85, rare: 13, epic: 1.9, legendary: 0.1 },
  RARE: { common: 60, rare: 35, epic: 4.5, legendary: 0.5 },
  EPIC: { common: 40, rare: 45, epic: 14, legendary: 1 },
  LEGENDARY: { common: 25, rare: 45, epic: 25, legendary: 5 },
  FREE: { common: 80, rare: 18, epic: 2, legendary: 0 },
};

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
  const [showEpicScene, setShowEpicScene] = useState(false);
  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const hasStartedReveal = useRef(false);

  const packs: { type: PackType; name: string; color: string }[] = [
    { type: 'BASIC', name: 'Pacote Básico', color: 'bg-gray-500' },
    { type: 'RARE', name: 'Pacote Raro', color: 'bg-blue-500' },
    { type: 'EPIC', name: 'Pacote Épico', color: 'bg-purple-500' },
    { type: 'LEGENDARY', name: 'Pacote Lendário', color: 'bg-yellow-500' },
  ];

  // Reset state when modal closes or opens
  useEffect(() => {
    if (!isOpen) {
      setSelectedPack(null);
      setRevealing(false);
      setShowEpicScene(false);
      setDetailCard(null);
      hasStartedReveal.current = false;
    }
  }, [isOpen]);

  // Show epic scene when pack opening completes
  useEffect(() => {
    if (revealing && lastOpenedCards && lastOpenedCards.length > 0 && !isOpening && !hasStartedReveal.current) {
      hasStartedReveal.current = true;
      setShowEpicScene(true);
    }
  }, [revealing, lastOpenedCards, isOpening]);

  const handleOpenPack = async (packType: PackType) => {
    setSelectedPack(packType);
    setRevealing(true);
    setShowEpicScene(false);
    hasStartedReveal.current = false;
    onOpenPack(packType);
  };

  const handleClose = () => {
    setSelectedPack(null);
    setRevealing(false);
    setShowEpicScene(false);
    setDetailCard(null);
    hasStartedReveal.current = false;
    onClose();
  };

  const renderProbabilities = (packType: PackType) => {
    const probs = PACK_PROBABILITIES[packType];
    return (
      <div className="text-xs space-y-1 text-left">
        <p className="font-semibold mb-2">Probabilidades:</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-400"></span>
          <span>Comum: {probs.common}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span>Rara: {probs.rare}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
          <span>Épica: {probs.epic}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
          <span>Lendária: {probs.legendary}%</span>
        </div>
      </div>
    );
  };

  // Show epic scene as fullscreen overlay
  if (showEpicScene && lastOpenedCards && lastOpenedCards.length > 0) {
    return (
      <>
        <PackOpeningScene
          cards={lastOpenedCards}
          onComplete={handleClose}
          onCardClick={(card) => setDetailCard(card)}
        />
        <CardDetailModal
          card={detailCard}
          isOpen={!!detailCard}
          onClose={() => setDetailCard(null)}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className={cn(
          // Mobile: fullscreen - sobrescrever posição do Radix
          "w-full h-[100dvh] max-w-none rounded-none p-4",
          "left-0 top-0 translate-x-0 translate-y-0",
          // Desktop: modal centralizado
          "sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:max-w-4xl sm:h-auto sm:max-h-[85vh] sm:rounded-lg sm:p-6",
          "flex flex-col overflow-y-auto"
        )}>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Gift className="w-5 h-5" />
              Loja de Pacotes
            </DialogTitle>
          </DialogHeader>

          {!revealing ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-xs sm:text-sm text-muted-foreground">Seu XP disponível</p>
                <p className="text-xl sm:text-2xl font-bold flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
                  {userXP} XP
                </p>
              </div>

              {/* Pacote Inicial Gratuito */}
              {!hasClaimedFreePack && onClaimFreePack && (
                <div
                  className="relative p-4 sm:p-6 rounded-lg border-4 border-green-500 bg-gradient-to-br from-green-500/20 to-emerald-500/20 cursor-pointer hover:scale-105 transition-all animate-pulse active:scale-[0.98]"
                  onClick={onClaimFreePack}
                >
                  <div className="absolute -top-3 -right-3">
                    <Badge className="bg-green-500 text-white border-0 px-2 sm:px-3 py-1 text-xs sm:text-sm font-bold">
                      GRÁTIS
                    </Badge>
                  </div>
                  
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-3 sm:mb-4 mx-auto shadow-lg shadow-green-500/50">
                    <Gift className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </div>
                  
                  <h3 className="text-lg sm:text-xl font-bold text-center mb-2 text-green-400">
                    🎁 Pacote Inicial Gratuito!
                  </h3>
                  <p className="text-xs sm:text-sm text-center mb-3 text-muted-foreground">
                    5 cartas para começar sua jornada
                  </p>
                  
                  <div className="text-center">
                    <p className="text-base sm:text-lg font-bold text-green-400">
                      Reivindique agora!
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                      Disponível apenas uma vez
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
                {packs.map(pack => {
                  const cost = PACK_COSTS[pack.type];
                  const size = PACK_SIZES[pack.type];
                  const canAfford = userXP >= cost;

                  return (
                    <TooltipProvider key={pack.type}>
                      <div
                        className={cn(
                          "relative p-4 sm:p-6 rounded-lg border-2 transition-all",
                          "min-h-[140px] sm:min-h-[160px]",
                          "active:scale-[0.98]",
                          canAfford 
                            ? 'border-primary hover:border-primary/80 cursor-pointer hover:scale-105' 
                            : 'border-muted opacity-50 cursor-not-allowed'
                        )}
                        onClick={() => canAfford && handleOpenPack(pack.type)}
                      >
                        {/* Info tooltip */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button 
                              className="absolute top-2 left-2 p-1.5 sm:p-1 rounded-full hover:bg-muted/50 transition-colors min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Info className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="p-3">
                            {renderProbabilities(pack.type)}
                          </TooltipContent>
                        </Tooltip>

                        <div className={cn(
                          "w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-3 sm:mb-4 mx-auto",
                          pack.color
                        )}>
                          <Gift className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </div>
                        
                        <h3 className="text-sm sm:text-lg font-bold text-center mb-1 sm:mb-2">{pack.name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground text-center mb-2 sm:mb-3">
                          {size} cartas
                        </p>
                        
                        <div className="flex items-center justify-center gap-1 sm:gap-2">
                          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                          <span className="text-sm sm:text-base font-bold">{cost} XP</span>
                        </div>

                        {!canAfford && (
                          <Badge variant="destructive" className="absolute top-2 right-2 text-[10px] sm:text-xs px-1.5 sm:px-2">
                            XP Insuficiente
                          </Badge>
                        )}
                      </div>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <Gift className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 animate-bounce text-primary" />
              <p className="text-base sm:text-lg font-semibold">Abrindo pacote...</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">Prepare-se para revelar suas cartas!</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Card Detail Modal */}
      <CardDetailModal
        card={detailCard}
        isOpen={!!detailCard}
        onClose={() => setDetailCard(null)}
      />
    </>
  );
};
