import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AuroraNotificationBellProps {
  count: number;
  hasImportant?: boolean;
  hasUnread?: boolean;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  // Interaction callbacks
  onLongPress?: () => void;
  onMiddleClick?: () => void;
  // Accessibility
  isOpen?: boolean;
  'aria-controls'?: string;
}

type CounterState = 'normal' | 'important' | 'silent';
type CounterDisplay = string; // "1", "10", "99+"

export const AuroraNotificationBell = forwardRef<HTMLButtonElement, AuroraNotificationBellProps>(
  (props, ref) => {
    const {
      count,
      hasImportant = false,
      hasUnread = false,
      onClick,
      className,
      size = 'md',
      onLongPress,
      onMiddleClick,
      isOpen = false,
      'aria-controls': ariaControls
    } = props;

    const [isPressed, setIsPressed] = useState(false);
    const [justReceivedNotification, setJustReceivedNotification] = useState(false);
    const [displayCount, setDisplayCount] = useState<CounterDisplay>('0');
    const longPressRef = useRef<NodeJS.Timeout | null>(null);
    const prevCountRef = useRef(count);
    
    // Counter logic with smooth transitions
    useEffect(() => {
      let newDisplay: CounterDisplay;
      
      if (count === 0) {
        newDisplay = '0';
      } else if (count <= 9) {
        newDisplay = count.toString();
      } else if (count <= 99) {
        newDisplay = count.toString();
      } else {
        newDisplay = '99+';
      }
      
      // Trigger animation if count increased
      if (count > prevCountRef.current && count > 0) {
        setJustReceivedNotification(true);
        setTimeout(() => setJustReceivedNotification(false), 600);
      }
      
      setDisplayCount(newDisplay);
      prevCountRef.current = count;
    }, [count]);

    // Determine counter state for styling
    const counterState: CounterState = hasImportant ? 'important' : hasUnread ? 'normal' : 'silent';
    
    // Size configurations
    const sizeConfig = {
      sm: {
        button: 'h-8 w-8',
        icon: 'w-3.5 h-3.5',
        badge: 'h-4 w-4 min-w-[16px] text-[10px]',
        badgeOffset: '-top-1 -right-1'
      },
      md: {
        button: 'h-9 w-9', 
        icon: 'w-4 h-4',
        badge: 'h-5 w-5 min-w-[20px] text-xs',
        badgeOffset: '-top-1.5 -right-1.5'
      },
      lg: {
        button: 'h-10 w-10',
        icon: 'w-5 h-5', 
        badge: 'h-6 w-6 min-w-[24px] text-sm',
        badgeOffset: '-top-2 -right-2'
      }
    };
    
    const config = sizeConfig[size];
    
    // Generate dynamic aria-label
    const getAriaLabel = () => {
      if (count === 0) return 'Notificações, nenhuma nova';
      if (count === 1) return 'Notificações, 1 nova';
      if (hasImportant) return `Notificações, ${count} novas incluindo importantes`;
      return `Notificações, ${count} novas`;
    };

    // Handle interactions
    const handleMouseDown = () => {
      setIsPressed(true);
      
      // Start long press timer (mobile)
      if (onLongPress) {
        longPressRef.current = setTimeout(() => {
          onLongPress();
          setIsPressed(false);
        }, 800);
      }
    };

    const handleMouseUp = () => {
      setIsPressed(false);
      if (longPressRef.current) {
        clearTimeout(longPressRef.current);
        longPressRef.current = null;
      }
    };

    const handleClick = (e?: React.MouseEvent<HTMLButtonElement>) => {
      // Middle click handling (desktop)
      if (e?.button === 1 && onMiddleClick) {
        e?.preventDefault();
        e?.stopPropagation();
        onMiddleClick();
        return;
      }
      
      // Prevent default behavior if event exists
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      onClick?.();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onClick?.();
      }
    };

    // Clean up on unmount
    useEffect(() => {
      return () => {
        if (longPressRef.current) {
          clearTimeout(longPressRef.current);
        }
      };
    }, []);

    return (
      <div className={cn('aurora-notification-container relative isolate', className)}>
        {/* Screen reader live region */}
        <div 
          className="sr-only" 
          aria-live="polite" 
          aria-atomic="true"
          key={count} // Force re-render for screen readers
        >
          {count > 0 && `${count} notificações não lidas`}
        </div>
        
        {/* Bell Button */}
        <Button
          ref={ref}
          variant="ghost"
          size="icon"
          className={cn(
            // Base styling
            'aurora-bell-button relative rounded-full transition-all duration-300',
            'hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary/50',
            'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            
            // Size
            config.button,
            
            // Interactive states
            isPressed && 'scale-95',
            hasUnread && 'aurora-bell-glow',
            justReceivedNotification && 'aurora-bell-pop'
          )}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          aria-label={getAriaLabel()}
          aria-describedby={count > 0 ? 'notification-badge' : undefined}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={ariaControls}
        >
          {hasUnread ? (
            <BellRing className={cn(
              config.icon,
              'transition-all duration-300',
              hasUnread ? 'text-primary aurora-icon-glow' : 'text-muted-foreground'
            )} />
          ) : (
            <Bell className={cn(
              config.icon,
              'transition-all duration-300 text-muted-foreground'
            )} />
          )}
        </Button>
        
        {/* Aurora Badge - Positioned outside button to avoid clipping */}
        {count > 0 && (
          <div
            id="notification-badge"
            className={cn(
              // Base positioning (outside button boundary)
              'absolute pointer-events-none',
              config.badgeOffset,
              
              // Aurora badge styling
              'aurora-badge',
              'rounded-full flex items-center justify-center',
              'font-semibold tabular-nums leading-none',
              'transition-all duration-300 ease-out',
              
              // Size and responsive text
              config.badge,
              
              // State-based styling
              counterState === 'important' && 'aurora-badge-important',
              counterState === 'normal' && 'aurora-badge-normal', 
              counterState === 'silent' && 'aurora-badge-silent',
              
              // Animation states
              justReceivedNotification && 'aurora-badge-pop',
              
              // Ensure visibility and proper stacking
              'z-50 transform-gpu will-change-transform'
            )}
            style={{
              // Ensure badge is never clipped by parent
              zIndex: 9999,
              // Hardware acceleration for smooth animations
              transform: 'translateZ(0)',
              // Prevent any inherited overflow clipping
              contain: 'layout style paint'
            }}
            aria-hidden="true"
          >
            <span className="aurora-badge-text truncate">
              {displayCount}
            </span>
          </div>
        )}
      </div>
    );
  }
);

AuroraNotificationBell.displayName = 'AuroraNotificationBell';
