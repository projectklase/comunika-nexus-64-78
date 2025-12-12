import { useState, useRef, useCallback, useEffect } from 'react';
import { Card } from '@/types/cards';
import { CardDisplay } from './CardDisplay';
import cardBackImage from '@/assets/cards/card-back.png';
import { cn } from '@/lib/utils';
import { RotateCcw } from 'lucide-react';

interface InteractiveCard3DProps {
  card: Card;
  size?: 'md' | 'lg';
}

export const InteractiveCard3D = ({ card, size = 'lg' }: InteractiveCard3DProps) => {
  const [rotationY, setRotationY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [velocity, setVelocity] = useState(0);
  const startXRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animationRef = useRef<number>();
  const rotationRef = useRef(0);

  // Sincroniza ref com state para uso em animação
  useEffect(() => {
    rotationRef.current = rotationY;
  }, [rotationY]);

  // Cleanup da animação
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleDragStart = useCallback((clientX: number) => {
    setIsDragging(true);
    startXRef.current = clientX;
    lastXRef.current = clientX;
    lastTimeRef.current = Date.now();
    setVelocity(0);
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
  }, []);

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging) return;
    
    const deltaX = clientX - lastXRef.current;
    const now = Date.now();
    const deltaTime = now - lastTimeRef.current;
    
    // Calcula velocidade para inércia
    if (deltaTime > 0) {
      setVelocity(deltaX / deltaTime * 15);
    }
    
    setRotationY(prev => prev + deltaX * 0.5);
    lastXRef.current = clientX;
    lastTimeRef.current = now;
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    
    // Aplica inércia após soltar
    const applyInertia = () => {
      setVelocity(prev => {
        const newVel = prev * 0.92; // Fricção
        
        if (Math.abs(newVel) < 0.1) {
          animationRef.current = undefined;
          return 0;
        }
        
        setRotationY(r => r + newVel);
        animationRef.current = requestAnimationFrame(applyInertia);
        return newVel;
      });
    };
    
    if (Math.abs(velocity) > 0.5) {
      animationRef.current = requestAnimationFrame(applyInertia);
    }
  }, [velocity]);

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  };
  
  const onMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX);
  };
  
  const onMouseUp = () => handleDragEnd();
  const onMouseLeave = () => {
    if (isDragging) handleDragEnd();
  };

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  };
  
  const onTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX);
  };
  
  const onTouchEnd = () => handleDragEnd();

  // Reset para posição inicial
  const resetRotation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setRotationY(0);
    setVelocity(0);
  };

  // Dimensões baseadas no tamanho
  const sizeClasses = size === 'lg' 
    ? 'w-52 h-[21rem] sm:w-56 sm:h-[25rem]' 
    : 'w-40 h-64 sm:w-44 sm:h-72';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Container 3D */}
      <div
        className="cursor-grab active:cursor-grabbing select-none touch-none"
        style={{ perspective: '1200px' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className={cn(
            "relative",
            isDragging ? "transition-none" : "transition-transform duration-100 ease-out"
          )}
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateY(${rotationY}deg)`,
          }}
        >
          {/* Frente da Carta */}
          <div 
            className="pointer-events-none"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <CardDisplay card={card} size={size} showStats={true} />
          </div>

          {/* Bordas 3D - Espessura do papel */}
          <div
            className="absolute bg-gradient-to-r from-gray-900 to-gray-800 rounded-l-sm"
            style={{
              width: '3px',
              height: '100%',
              left: 0,
              top: 0,
              transform: 'rotateY(-90deg) translateZ(1.5px)',
              transformOrigin: 'left center',
            }}
          />
          <div
            className="absolute bg-gradient-to-l from-gray-900 to-gray-800 rounded-r-sm"
            style={{
              width: '3px',
              height: '100%',
              right: 0,
              top: 0,
              transform: 'rotateY(90deg) translateZ(1.5px)',
              transformOrigin: 'right center',
            }}
          />
          <div
            className="absolute bg-gradient-to-b from-gray-800 to-gray-900 rounded-t-sm"
            style={{
              height: '3px',
              width: '100%',
              top: 0,
              left: 0,
              transform: 'rotateX(90deg) translateZ(1.5px)',
              transformOrigin: 'top center',
            }}
          />
          <div
            className="absolute bg-gradient-to-t from-gray-800 to-gray-900 rounded-b-sm"
            style={{
              height: '3px',
              width: '100%',
              bottom: 0,
              left: 0,
              transform: 'rotateX(-90deg) translateZ(1.5px)',
              transformOrigin: 'bottom center',
            }}
          />

          {/* Verso da Carta */}
          <div
            className={cn(
              "absolute inset-0 rounded-xl overflow-hidden shadow-2xl pointer-events-none",
              sizeClasses
            )}
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <img
              src={cardBackImage}
              alt="Verso da carta"
              className="w-full h-full object-cover"
              draggable={false}
            />
            {/* Brilho sutil no verso */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20" />
          </div>
        </div>
      </div>

      {/* Controles e instrução */}
      <div className="flex items-center gap-3">
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <span className="text-base">↔️</span> Arraste para girar
        </p>
        
        {/* Botão de reset se carta foi girada */}
        {Math.abs(rotationY) > 10 && (
          <button
            onClick={resetRotation}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-full transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
};
