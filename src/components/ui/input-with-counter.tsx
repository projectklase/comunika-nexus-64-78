import * as React from "react";
import { cn } from "@/lib/utils";
import { clampLenNoTrim } from "@/lib/validation";

interface InputWithCounterProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  value?: string;
  onChange?: (value: string) => void;
  maxLength?: number;
  error?: string | null;
  showError?: boolean;
  showCounter?: boolean;
}

const InputWithCounter = React.forwardRef<HTMLInputElement, InputWithCounterProps>(
  ({ 
    className, 
    value = "", 
    onChange, 
    maxLength = 120, 
    error, 
    showError = true, 
    showCounter = true,
    ...props 
  }, ref) => {
    const currentLength = value.length;
    const isNearLimit = currentLength > maxLength * 0.8;
    const isOverLimit = currentLength > maxLength;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = clampLenNoTrim(e.target.value, maxLength);
      onChange?.(newValue);
    };

    return (
      <div className="space-y-1">
        <div className="relative">
          <input
            ref={ref}
            value={value}
            onChange={handleChange}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              error && showError && "border-destructive focus-visible:ring-destructive",
              isOverLimit && "border-destructive focus-visible:ring-destructive",
              className
            )}
            {...props}
          />
          {showCounter && (
            <div className={cn(
              "absolute top-1/2 right-2 -translate-y-1/2 text-xs",
              isOverLimit ? "text-destructive" : 
              isNearLimit ? "text-warning" : "text-muted-foreground"
            )}>
              {currentLength}/{maxLength}
            </div>
          )}
        </div>
        {error && showError && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {isOverLimit && (
          <p className="text-sm text-destructive">
            Texto muito longo. Máximo {maxLength} caracteres.
          </p>
        )}
      </div>
    );
  }
);

InputWithCounter.displayName = "InputWithCounter";

export { InputWithCounter };