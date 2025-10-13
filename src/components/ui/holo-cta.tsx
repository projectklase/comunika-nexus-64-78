import * as React from "react";
import { useState, useRef, useCallback } from "react";
import { Loader2, Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HoloCTAProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  ariaLabel?: string;
  debounceMs?: number;
}

export const HoloCTA = React.forwardRef<HTMLButtonElement, HoloCTAProps>(
  ({ 
    className, 
    children, 
    loading = false, 
    success = false, 
    error = false,
    ariaLabel,
    debounceMs = 400,
    onClick,
    disabled,
    ...props 
  }, ref) => {
    const [isDebouncing, setIsDebouncing] = useState(false);
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const debounceTimeoutRef = useRef<NodeJS.Timeout>();

    // Parallax effect for icon
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) return;
      
      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = (e.clientX - centerX) * 0.1; // 10% of movement
      const deltaY = (e.clientY - centerY) * 0.1;
      
      setCursorPosition({ x: deltaX, y: deltaY });
    }, [loading, disabled]);

    const handleMouseLeave = useCallback(() => {
      setCursorPosition({ x: 0, y: 0 });
    }, []);

    // Ripple effect
    const createRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      const button = buttonRef.current;
      if (!button || loading || disabled) return;

      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const ripple = document.createElement('div');
      ripple.className = 'holo-cta-ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      button.appendChild(ripple);

      setTimeout(() => {
        if (button.contains(ripple)) {
          button.removeChild(ripple);
        }
      }, 600);
    }, [loading, disabled]);

    // Debounced click handler
    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) {
        e.preventDefault();
        return;
      }

      // Se for um botão de submit sem onClick customizado, deixar o comportamento padrão
      if (props.type === 'submit' && !onClick) {
        createRipple(e);
        // Não aplicar debounce nem preventDefault para não interferir com o submit
        return;
      }

      // Para outros casos, aplicar debounce normalmente
      if (isDebouncing) {
        e.preventDefault();
        return;
      }

      createRipple(e);
      
      setIsDebouncing(true);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      debounceTimeoutRef.current = setTimeout(() => {
        setIsDebouncing(false);
      }, debounceMs);

      onClick?.(e);
    }, [loading, disabled, isDebouncing, debounceMs, onClick, createRipple, props.type]);

    // Keyboard handler
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
      if ((e.key === 'Enter' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) && !loading && !disabled) {
        e.preventDefault();
        const mouseEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: buttonRef.current?.getBoundingClientRect().left || 0,
          clientY: buttonRef.current?.getBoundingClientRect().top || 0,
        });
        handleClick(mouseEvent as any);
      }
    }, [loading, disabled, handleClick]);

    React.useImperativeHandle(ref, () => buttonRef.current!, []);

    // Determine current state classes
    const stateClasses = cn(
      "holo-cta",
      {
        "holo-cta-success": success,
        "holo-cta-error": error,
      },
      className
    );

    // Determine content to show
    const renderContent = () => {
      if (success) {
        return (
          <>
            <Check className="w-4 h-4" />
            Bem-vindo!
          </>
        );
      }

      if (loading) {
        return (
          <>
            <Loader2 className="holo-cta-spinner" />
            Entrando...
          </>
        );
      }

      return (
        <>
          {children}
          <div 
            className="holo-cta-icon"
            style={{
              transform: `translate(${cursorPosition.x}px, ${cursorPosition.y}px)`
            }}
          >
            <ArrowRight className="w-4 h-4" />
          </div>
        </>
      );
    };

    return (
      <button
        ref={buttonRef}
        className={stateClasses}
        disabled={disabled || loading || (props.type !== 'submit' && isDebouncing)}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel || (loading ? "Entrando..." : success ? "Login bem-sucedido" : "Fazer login")}
        aria-busy={loading}
        aria-live="polite"
        {...props}
      >
        {/* Sheen effect */}
        <div className="holo-cta-sheen" />
        
        {/* Aurora background */}
        <div className="relative z-10">
          {renderContent()}
        </div>
      </button>
    );
  }
);

HoloCTA.displayName = "HoloCTA";