import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { RewardItem } from '@/types/rewards';
import { Coins, Package, ShoppingCart, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ProtectedImage } from '@/components/ui/protected-image';

interface RewardDetailModalProps {
  item: RewardItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRedeem?: (item: RewardItem) => void;
  studentKoins?: number;
  isStudent?: boolean;
}

export function RewardDetailModal({
  item,
  isOpen,
  onClose,
  onRedeem,
  studentKoins = 0,
  isStudent = false
}: RewardDetailModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { toast } = useToast();

  if (!item) return null;

  const isOutOfStock = item.stock <= 0;
  const canAfford = studentKoins >= item.koinPrice;
  const canRedeem = isStudent && !isOutOfStock && canAfford;
  const koinsNeeded = item.koinPrice - studentKoins;

  const handleRedeem = () => {
    if (!canRedeem || !onRedeem) return;
    
    onRedeem(item);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{item.name}</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Image Gallery */}
          <div className="space-y-4">
            {item.images.length > 1 ? (
              <Carousel className="w-full">
                <CarouselContent>
                  {item.images.map((image, index) => (
                    <CarouselItem key={index}>
                      <div className="aspect-square rounded-lg overflow-hidden">
                        <ProtectedImage
                          src={image || '/placeholder.svg'}
                          alt={`${item.name} - Imagem ${index + 1}`}
                          className={cn(
                            "w-full h-full object-cover",
                            isOutOfStock && "grayscale"
                          )}
                          wrapperClassName="w-full h-full"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            ) : (
              <div className="aspect-square rounded-lg overflow-hidden">
                <ProtectedImage
                  src={item.images[0] || '/placeholder.svg'}
                  alt={item.name}
                  className={cn(
                    "w-full h-full object-cover",
                    isOutOfStock && "grayscale"
                  )}
                  wrapperClassName="w-full h-full"
                />
              </div>
            )}
          </div>

          {/* Item Details */}
          <div className="space-y-6">
            {/* Status Badge */}
            {isOutOfStock && (
              <Badge variant="destructive" className="w-fit">
                <Package className="h-3 w-3 mr-1" />
                Esgotado
              </Badge>
            )}

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Descrição</h3>
              <p className="text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>

            {/* Category */}
            {item.category && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Categoria
                </h4>
                <Badge variant="outline">
                  {item.category}
                </Badge>
              </div>
            )}

            {/* Price and Stock Info */}
            <div className="bg-muted/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Preço:</span>
                <div className="flex items-center gap-1">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  <span className="text-xl font-bold text-foreground">
                    {item.koinPrice}
                  </span>
                  <span className="text-sm text-muted-foreground">Koins</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estoque:</span>
                <span className={cn(
                  "font-medium",
                  item.stock > 5 ? "text-success" : 
                  item.stock > 0 ? "text-warning" : "text-destructive"
                )}>
                  {item.stock} unidade{item.stock !== 1 ? 's' : ''} disponível{item.stock !== 1 ? 'eis' : ''}
                </span>
              </div>

              {isStudent && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Seus Koins:</span>
                  <div className="flex items-center gap-1">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium text-foreground">
                      {studentKoins}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {isStudent && onRedeem && (
              <div className="space-y-3">
                <Button
                  onClick={handleRedeem}
                  disabled={!canRedeem}
                  className={cn(
                    "w-full h-12 text-base font-semibold",
                    canRedeem 
                      ? "bg-primary hover:bg-primary/90 shadow-lg hover:shadow-primary/25" 
                      : "cursor-not-allowed"
                  )}
                  size="lg"
                >
                  {isOutOfStock ? (
                    <>
                      <Package className="h-5 w-5 mr-2" />
                      Item Esgotado
                    </>
                  ) : !canAfford ? (
                    <>
                      <Coins className="h-5 w-5 mr-2" />
                      Faltam {koinsNeeded} Koins
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Resgatar Agora
                    </>
                  )}
                </Button>

                {!canAfford && !isOutOfStock && (
                  <div className="text-center text-sm text-muted-foreground bg-muted/10 p-3 rounded-lg">
                    💡 Dica: Continue participando das atividades para ganhar mais Koins!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}