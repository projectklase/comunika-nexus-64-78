import { Card, RARITY_FRAME_COLORS, RARITY_STARS } from "@/types/cards";
import { cn } from "@/lib/utils";
import { Lock, Star } from "lucide-react";
import { ProtectedImage } from "@/components/ui/protected-image";

interface CardThumbnailProps {
  card: Card;
  isOwned: boolean;
  quantity?: number;
  onClick: () => void;
}

export const CardThumbnail = ({ card, isOwned, quantity = 0, onClick }: CardThumbnailProps) => {
  const frameColors = RARITY_FRAME_COLORS[card.rarity];
  const stars = RARITY_STARS[card.rarity];

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full aspect-[3/4] rounded-lg overflow-hidden",
        "transition-transform duration-200 active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-primary/50"
      )}
    >
      {/* Borda de raridade com gradiente */}
      <div
        className={cn(
          "absolute inset-0 rounded-lg p-[2px]",
          "bg-gradient-to-br",
          frameColors.outer
        )}
      >
        <div className={cn(
          "w-full h-full rounded-md overflow-hidden",
          "bg-gradient-to-br",
          frameColors.inner
        )}>
          {/* Imagem da carta */}
          {card.image_url ? (
            <ProtectedImage
              src={card.image_url}
              alt={card.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-xs">?</span>
            </div>
          )}
        </div>
      </div>

      {/* Glow effect para cartas raras */}
      {(card.rarity === 'LEGENDARY' || card.rarity === 'EPIC') && (
        <div
          className={cn(
            "absolute inset-0 rounded-lg pointer-events-none",
            "animate-pulse opacity-30",
            frameColors.glow
          )}
        />
      )}

      {/* Overlay para cartas não possuídas */}
      {!isOwned && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
          <Lock className="w-6 h-6 text-gray-400" />
        </div>
      )}

      {/* Indicador de raridade (estrelas) */}
      <div className="absolute top-1 left-1 flex gap-0.5">
        {Array.from({ length: stars }).map((_, i) => (
          <Star
            key={i}
            className="w-2.5 h-2.5 fill-yellow-400 text-yellow-300 drop-shadow-sm"
          />
        ))}
      </div>

      {/* Badge de quantidade */}
      {quantity > 1 && (
        <div className="absolute bottom-1 right-1 bg-black/80 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white">
          x{quantity}
        </div>
      )}
    </button>
  );
};
