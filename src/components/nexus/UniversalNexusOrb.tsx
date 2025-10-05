import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Target } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { useClassStore } from '@/stores/class-store';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';
import { startOfToday, endOfToday, parseISO, isBefore } from 'date-fns';

interface UniversalNexusOrbProps {
  className?: string;
}

export function UniversalNexusOrb({ className }: UniversalNexusOrbProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isHovering, setIsHovering] = useState(false);
  
  // Get posts and user's classes
  const { posts: allPosts } = usePosts({ status: 'PUBLISHED' });
  const { getClassesByStudent } = useClassStore();
  
  // Calculate badge count
  const badgeCount = useMemo(() => {
    if (!user || user.role !== 'aluno') return 0;
    
    const userClasses = getClassesByStudent(user.id);
    const userClassIds = userClasses.map(c => c.id);
    
    const now = new Date();
    const todayStart = startOfToday();
    const todayEnd = endOfToday();
    
    let count = 0;
    
    allPosts.forEach(post => {
      // Only count activities/work/tests from user's classes
      if (!['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type)) return;
      if (post.audience !== 'CLASS') return;
      
      const postClasses = post.classIds || (post.classId ? [post.classId] : []);
      const hasUserClass = postClasses.some(classId => userClassIds.includes(classId));
      if (!hasUserClass) return;
      
      if (post.dueAt) {
        const dueDate = parseISO(post.dueAt);
        
        // Overdue tasks (dueAt < now)
        if (isBefore(dueDate, now)) {
          count++;
        }
        // Due today (startOfToday <= dueAt <= endOfToday)
        else if (dueDate >= todayStart && dueDate <= todayEnd) {
          count++;
        }
      }
      
      // Optional: Include events happening today
      if (post.type === 'EVENTO' && post.eventStartAt) {
        const eventDate = parseISO(post.eventStartAt);
        if (eventDate >= todayStart && eventDate <= todayEnd) {
          count++;
        }
      }
    });
    
    return Math.min(count, 99); // Clamp to 99
  }, [allPosts, user, getClassesByStudent]);
  
  function handleClick() {
    const nexusUrl = '/aluno/nexus?tab=planner&focus=today';
    
    // If already on nexus, scroll to today section and highlight it
    if (location.pathname === '/aluno/nexus') {
      // Emit custom event to focus on today section
      window.dispatchEvent(new CustomEvent('nexus-focus-today'));
    } else {
      navigate(nexusUrl);
    }
  }
  
  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'KeyG KeyN',
      action: handleClick,
      description: 'Abrir NEXUS Planner'
    }
  ]);
  
  // Don't render for non-students or on calendar pages
  if (!user || user.role !== 'aluno') return null;
  if (location.pathname === '/aluno/calendario' || 
      location.pathname.startsWith('/aluno/turma/') && location.pathname.includes('/calendario')) return null;
  
  const displayCount = badgeCount > 9 ? '9+' : badgeCount.toString();
  const hasItems = badgeCount > 0;
  
  return (
    <div className={cn(
      "fixed z-50 transition-all duration-300",
      "bottom-[max(16px,env(safe-area-inset-bottom))] right-[max(16px,env(safe-area-inset-right))]",
      "sm:bottom-5 sm:right-5 lg:bottom-6 lg:right-6",
      "max-w-[calc(100vw-2rem)]",
      className
    )}>
      {/* Main Orb Button */}
      <Button
        onClick={handleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={cn(
          "group relative w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0 border-0 overflow-visible",
          "bg-white/5 backdrop-blur-md border border-white/10",
          "shadow-xl shadow-black/20",
          "transition-all duration-300 ease-out",
          "hover:scale-105 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          "will-change-transform"
        )}
        variant="ghost"
        size="icon"
        role="button"
        aria-label={`Abrir NEXUS Planner - ${hasItems ? `${badgeCount} importante${badgeCount !== 1 ? 's' : ''} hoje` : 'Hoje'}`}
        style={{
          boxShadow: `0 8px 32px hsl(var(--primary) / 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)`
        }}
      >
        {/* Glass Effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-white/5 to-transparent" />
        
        {/* Highlight Reflection */}
        <div className="absolute top-1 left-2 sm:left-3 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-radial from-white/30 via-white/10 to-transparent blur-[1px]" />
        
        {/* Icon Container */}
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-lg" />
        </div>
        
        {/* Urgency Ring */}
        {hasItems && (
          <div 
            className={cn(
              "absolute inset-0 rounded-full ring-1 ring-offset-1 ring-offset-transparent ring-orange-400/60",
              badgeCount >= 5 && "animate-pulse ring-red-400/80"
            )}
          />
        )}
      </Button>

      {/* Badge */}
      {hasItems && (
        <div 
          className="absolute -top-1 -right-1 z-20"
          aria-live="polite"
          aria-label={`${badgeCount} atividade${badgeCount !== 1 ? 's' : ''} importante${badgeCount !== 1 ? 's' : ''}`}
        >
          <div className="flex items-center justify-center min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] px-1 bg-orange-500 text-white text-[10px] sm:text-xs font-bold rounded-full shadow-lg border border-white/20">
            {displayCount}
          </div>
        </div>
      )}

      {/* Smart Tooltip */}
      {isHovering && (
        <div className="absolute bottom-full mb-4 z-[60] animate-fade-in">
          <div 
            className={cn(
              "w-48 sm:w-56 max-w-[calc(100vw-3rem)] p-3 glass-card border border-white/20 rounded-lg shadow-2xl",
              "right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2",
              "transform-gpu backdrop-blur-xl"
            )}
          >
            <div className="space-y-2">
              <div className="text-sm font-semibold text-white leading-tight">
                Abrir NEXUS Planner
              </div>
              <div className="text-xs text-white/80 leading-relaxed">
                {hasItems ? (
                  <>
                    <span className="text-orange-300 font-medium">{badgeCount} importante{badgeCount !== 1 ? 's' : ''}</span> para hoje
                    <br />
                    <span className="text-white/60">(inclui eventos e atividades)</span>
                  </>
                ) : (
                  'Organize seus estudos de forma inteligente'
                )}
              </div>
              <div className="text-[10px] text-white/50 pt-1 border-t border-white/10">
                Atalho: G + N
              </div>
            </div>
            {/* Arrow pointer */}
            <div className="absolute top-full left-4 sm:left-1/2 sm:-translate-x-1/2 w-3 h-3 bg-inherit border-r border-b border-white/20 rotate-45 translate-y-[-1px]" />
          </div>
        </div>
      )}
    </div>
  );
}