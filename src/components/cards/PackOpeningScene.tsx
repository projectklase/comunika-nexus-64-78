import { useState, useEffect, useRef } from 'react';
import { Card } from '@/types/cards';
import { FlipCard } from './FlipCard';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import packOpeningBg from '@/assets/cards/pack-opening-bg.png';

interface PackOpeningSceneProps {
  cards: Card[];
  onComplete: () => void;
  onCardClick?: (card: Card) => void;
}

type TitleState = 'entering' | 'visible' | 'exiting' | 'hidden';

export const PackOpeningScene = ({ cards, onComplete, onCardClick }: PackOpeningSceneProps) => {
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [titleState, setTitleState] = useState<TitleState>('entering');
  const [showFlash, setShowFlash] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [allRevealed, setAllRevealed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const flipSoundRef = useRef<HTMLAudioElement | null>(null);

  // Play sound on mount
  useEffect(() => {
    audioRef.current = new Audio('/sounds/pack-opening.mp3');
    audioRef.current.volume = 0.5;
    audioRef.current.play().catch(() => {});

    flipSoundRef.current = new Audio('/sounds/card-flipping.mp3');
    flipSoundRef.current.volume = 0.6;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (flipSoundRef.current) {
        flipSoundRef.current.pause();
        flipSoundRef.current = null;
      }
    };
  }, []);

  // Premium cinematic sequence
  useEffect(() => {
    // Phase 1: Title enters (0-1s)
    const enterTimer = setTimeout(() => {
      setTitleState('visible');
    }, 1000);

    // Phase 2: Epic flash + burst + title exit (2s)
    const flashTimer = setTimeout(() => {
      setShowFlash(true);
      setShowBurst(true);
      setTitleState('exiting');
    }, 2000);

    // Phase 3: Hide title, show cards (2.8s)
    const hideTimer = setTimeout(() => {
      setTitleState('hidden');
      setShowFlash(false);
      setShowCards(true);
    }, 2800);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(flashTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  // Check if all cards revealed
  useEffect(() => {
    if (revealedIndices.size === cards.length && cards.length > 0) {
      setAllRevealed(true);
    }
  }, [revealedIndices, cards.length]);

  const revealCard = (index: number) => {
    if (revealedIndices.has(index)) return;

    if (flipSoundRef.current) {
      flipSoundRef.current.currentTime = 0;
      flipSoundRef.current.play().catch(() => {});
    }

    setRevealedIndices(prev => {
      const newSet = new Set(prev);
      newSet.add(index);
      return newSet;
    });

    const card = cards[index];
    if (card.rarity === 'RARE' || card.rarity === 'EPIC' || card.rarity === 'LEGENDARY') {
      const particleCount = card.rarity === 'LEGENDARY' ? 150 : card.rarity === 'EPIC' ? 100 : 60;
      const colors = card.rarity === 'LEGENDARY' 
        ? ['#FFD700', '#FFA500', '#FFFF00'] 
        : card.rarity === 'EPIC' 
          ? ['#8B5CF6', '#A855F7', '#C084FC']
          : ['#3B82F6', '#60A5FA', '#93C5FD'];
      
      confetti({
        particleCount,
        spread: 80,
        origin: { y: 0.5, x: 0.5 },
        colors
      });
    }
  };

  const revealAll = () => {
    cards.forEach((_, index) => {
      setTimeout(() => revealCard(index), index * 300);
    });
  };

  // Generate burst particles
  const burstParticles = [...Array(40)].map((_, i) => ({
    angle: (360 / 40) * i,
    distance: 120 + Math.random() * 180,
    delay: Math.random() * 0.15,
    size: 2 + Math.random() * 4
  }));

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${packOpeningBg})` }}
      >
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-yellow-400/60 rounded-full animate-float-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      {/* Epic Flash Effect */}
      {showFlash && (
        <div className="absolute inset-0 z-30 pointer-events-none animate-epic-flash">
          <div className="absolute inset-0 bg-gradient-radial from-yellow-300/90 via-amber-500/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-radial from-white/60 via-transparent to-transparent" />
        </div>
      )}

      {/* Burst Particles */}
      {showBurst && (
        <div className="absolute inset-0 pointer-events-none z-25">
          {burstParticles.map((particle, i) => (
            <div
              key={`burst-${i}`}
              className="absolute bg-gradient-to-r from-yellow-300 to-amber-400 rounded-full animate-particle-burst"
              style={{
                left: '50%',
                top: '35%',
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                ['--angle' as string]: `${particle.angle}deg`,
                ['--distance' as string]: `${particle.distance}px`,
                animationDelay: `${particle.delay}s`,
                boxShadow: '0 0 6px 2px rgba(251, 191, 36, 0.6)'
              }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 p-4 pb-8 max-w-full">
        
        {/* Premium Title with State Machine */}
        {titleState !== 'hidden' && (
          <div 
            className={`text-center ${
              titleState === 'entering' ? 'animate-pack-title-enter' :
              titleState === 'exiting' ? 'animate-pack-title-exit' : ''
            }`}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-200 animate-shimmer-glow">
              ✨ ABRINDO PACOTE ✨
            </h2>
            <p className="text-white/80 mt-3 text-lg tracking-wide">
              Prepare-se para a revelação...
            </p>
          </div>
        )}

        {/* Instruction text after title exits */}
        {titleState === 'hidden' && showCards && (
          <p className="text-white/90 text-lg animate-fade-in-delayed text-center mb-2">
            ✨ Clique nas cartas para revelar! ✨
          </p>
        )}

        {/* Cards container with delayed entrance */}
        {showCards && (
          <div className="flex flex-wrap justify-center items-center gap-3 md:gap-4 max-w-4xl animate-fade-in">
            {cards.map((card, index) => (
              <div
                key={`${card.id}-${index}`}
                className="transform hover:scale-105 transition-transform"
                style={{ 
                  animation: 'card-entrance 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                  animationDelay: `${index * 150}ms`,
                  opacity: 0
                }}
              >
                <FlipCard
                  card={card}
                  isRevealed={revealedIndices.has(index)}
                  onClick={() => {
                    if (!revealedIndices.has(index)) {
                      revealCard(index);
                    } else if (onCardClick) {
                      onCardClick(card);
                    }
                  }}
                  size="md"
                />
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {showCards && (
          <div className="flex gap-3 mt-16">
            {!allRevealed && revealedIndices.size < cards.length && (
              <Button
                onClick={revealAll}
                variant="outline"
                className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Revelar Todas
              </Button>
            )}
            
            {allRevealed && (
              <Button
                onClick={onComplete}
                className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-bold px-8 py-3 text-lg shadow-lg shadow-yellow-500/50 hover:shadow-yellow-500/70 transition-all duration-500 hover:scale-105"
              >
                Continuar
              </Button>
            )}
          </div>
        )}

        {/* Progress indicator */}
        {showCards && (
          <div className="text-white/70 text-sm">
            {revealedIndices.size} / {cards.length} cartas reveladas
          </div>
        )}
      </div>
    </div>
  );
};
