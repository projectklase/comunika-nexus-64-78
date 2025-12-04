import { Card } from '@/types/cards';
import { CardDisplay } from './CardDisplay';
import cardBackImage from '@/assets/cards/card-back.png';

interface FlipCardProps {
  card: Card;
  isRevealed: boolean;
  delay?: number;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const FlipCard = ({ card, isRevealed, delay = 0, onClick, size = 'sm' }: FlipCardProps) => {
  const sizeClasses = {
    sm: 'w-24 h-36 md:w-28 md:h-40',
    md: 'w-32 h-48 md:w-36 md:h-52',
    lg: 'w-40 h-60 md:w-44 md:h-64'
  };

  return (
    <div 
      className={`flip-card-container ${sizeClasses[size]} cursor-pointer`}
      onClick={onClick}
      style={{ 
        perspective: '1000px',
        transitionDelay: `${delay}ms`
      }}
    >
      <div 
        className={`flip-card relative w-full h-full transition-transform duration-700 ${isRevealed ? 'flipped' : ''}`}
        style={{ 
          transformStyle: 'preserve-3d',
          transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* Card Back (verso) */}
        <div 
          className="flip-card-face absolute inset-0 rounded-lg overflow-hidden shadow-xl"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <img 
            src={cardBackImage} 
            alt="Card back" 
            className="w-full h-full object-cover"
            draggable={false}
          />
          {/* Glow effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
        </div>
        
        {/* Card Front (frente) */}
        <div 
          className="flip-card-face absolute inset-0"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <CardDisplay card={card} size={size} />
        </div>
      </div>
    </div>
  );
};
