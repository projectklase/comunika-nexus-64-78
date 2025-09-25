import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNexus } from '@/hooks/useNexus';
import { cn } from '@/lib/utils';

interface NexusOrbProps {
  onOpenPanel: () => void;
  className?: string;
}

export function NexusOrb({ onOpenPanel, className }: NexusOrbProps) {
  const { getNexusStatus } = useNexus();
  const [isHovering, setIsHovering] = useState(false);
  
  const status = getNexusStatus();
  const urgency = status.mostUrgentActivity?.urgency;

  // Get orb urgency colors
  const getUrgencyColors = () => {
    if (!urgency) return { accent: 'hsl(var(--muted))', glow: 'hsl(var(--muted) / 0.3)' };
    
    switch (urgency.level) {
      case 'critical': return { accent: 'hsl(0 84% 60%)', glow: 'hsl(0 84% 60% / 0.4)' };
      case 'high': return { accent: 'hsl(25 95% 53%)', glow: 'hsl(25 95% 53% / 0.3)' };
      case 'medium': return { accent: 'hsl(45 93% 47%)', glow: 'hsl(45 93% 47% / 0.2)' };
      default: return { accent: 'hsl(142 76% 36%)', glow: 'hsl(142 76% 36% / 0.2)' };
    }
  };

  const colors = getUrgencyColors();

  return (
    <div className={cn(
      "fixed z-50 transition-all duration-300",
      "bottom-4 right-4 sm:bottom-6 sm:right-6",
      "max-w-[calc(100vw-2rem)]", // Prevent overflow
      className
    )}>
      {/* Main Bubble */}
      <Button
        onClick={onOpenPanel}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={cn(
          "group relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-0 border-0 overflow-visible",
          "bg-white/5 backdrop-blur-md border border-white/10",
          "shadow-xl shadow-black/20",
          "transition-all duration-300 ease-out",
          "hover:scale-105 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
          "will-change-transform"
        )}
        variant="ghost"
        size="icon"
        aria-label="Abrir NEXUS"
        style={{
          boxShadow: `0 8px 32px ${colors.glow}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`
        }}
      >
        {/* Bubble Glass Effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-white/5 to-transparent" />
        
        {/* Highlight Reflection */}
        <div className="absolute top-1 left-2 sm:left-3 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-radial from-white/30 via-white/10 to-transparent blur-[2px]" />
        
        {/* Urgency Accent Ring */}
        {urgency && (
          <div 
            className={cn(
              "absolute inset-0 rounded-full ring-1 ring-offset-2 ring-offset-transparent",
              urgency.level === 'critical' && "animate-pulse"
            )}
            style={{ 
              borderColor: colors.accent,
              filter: `drop-shadow(0 0 8px ${colors.glow})`
            }}
          />
        )}
        
        {/* Content Container */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
          <div className="text-base sm:text-lg font-bold text-white drop-shadow-lg">
            {status.todayCount || 0}
          </div>
          <div className="text-[9px] sm:text-[10px] text-white/70 font-medium leading-none">
            hoje
          </div>
        </div>

        {/* Week Count Badge */}
        {status.weekCount > 0 && (
          <div className="absolute -top-1 -right-1 z-20">
            <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-white/90 text-black text-xs font-bold rounded-full shadow-lg border border-white/20">
              {status.weekCount}
            </div>
          </div>
        )}

        {/* Focus Session Indicator */}
        {status.hasActiveFocus && (
          <div className="absolute -top-1 -left-1 z-20">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full animate-pulse shadow-lg ring-2 ring-white/30" />
          </div>
        )}
      </Button>

      {/* Smart Tooltip - Enhanced Positioning */}
      {isHovering && urgency && (
        <div className="absolute bottom-full mb-4 z-[60] animate-fade-in">
          <div 
            className={cn(
              "w-64 sm:w-72 max-w-[calc(100vw-3rem)] p-4 glass-card border border-white/20 rounded-lg shadow-2xl",
              "right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2",
              "transform-gpu backdrop-blur-xl"
            )}
          >
            <div className="space-y-3">
              <div className="text-sm font-semibold text-white leading-tight line-clamp-2">
                {status.mostUrgentActivity?.activity.title}
              </div>
              <div className="text-xs text-white/80 leading-relaxed">
                {urgency.message}
              </div>
              {status.nextStep && (
                <div className="text-xs text-primary-glow font-medium px-2 py-1 bg-primary/20 rounded border border-primary/30 line-clamp-2">
                  → {status.nextStep.title}
                </div>
              )}
            </div>
            {/* Arrow pointer */}
            <div className="absolute top-full left-4 sm:left-1/2 sm:-translate-x-1/2 w-3 h-3 bg-inherit border-r border-b border-white/20 rotate-45 translate-y-[-1px]" />
          </div>
        </div>
      )}
    </div>
  );
}