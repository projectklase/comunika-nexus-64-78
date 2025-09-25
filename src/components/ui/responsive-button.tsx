import React from 'react';
import { Button, ButtonProps, ResponsiveButtonProps } from './button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { cn } from '@/lib/utils';

const ResponsiveButton = React.forwardRef<HTMLButtonElement, ResponsiveButtonProps>(
  ({ 
    children, 
    shortLabel, 
    iconOnly = false, 
    tooltip, 
    className, 
    size = "sm",
    ...props 
  }, ref) => {
    const buttonContent = (
      <Button
        ref={ref}
        size={size}
        className={cn(
          "min-w-0 max-w-full",
          iconOnly && "px-2",
          className
        )}
        {...props}
      >
        {/* Mobile: icon only or short label */}
        <span className="sm:hidden flex items-center gap-1.5 min-w-0">
          {iconOnly ? (
            React.Children.map(children, (child) => 
              React.isValidElement(child) && child.type === 'svg' ? child : null
            )
          ) : (
            <>
              {React.Children.map(children, (child) => 
                React.isValidElement(child) && child.type === 'svg' ? child : null
              )}
              {shortLabel && (
                <span className="truncate text-ellipsis overflow-hidden min-w-0 text-xs">
                  {shortLabel}
                </span>
              )}
            </>
          )}
        </span>
        
        {/* Desktop: full label */}
        <span className="hidden sm:flex items-center gap-2 min-w-0">
          {children}
        </span>
      </Button>
    );

    // If tooltip provided, wrap with tooltip
    if (tooltip || iconOnly) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {buttonContent}
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltip || (typeof children === 'string' ? children : shortLabel)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return buttonContent;
  }
);

ResponsiveButton.displayName = "ResponsiveButton";

export { ResponsiveButton };