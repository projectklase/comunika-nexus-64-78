import * as React from "react";
import { cn } from "@/lib/utils";
import { clampLenNoTrim } from "@/lib/validation";

interface TextareaWithCounterProps extends Omit<React.ComponentProps<"textarea">, "onChange"> {
  value?: string;
  onChange?: (value: string) => void;
  maxLength?: number;
  error?: string | null;
  showError?: boolean;
  showCounter?: boolean;
}

const TextareaWithCounter = React.forwardRef<HTMLTextAreaElement, TextareaWithCounterProps>(
  ({ 
    className, 
    value = "", 
    onChange, 
    maxLength = 1000, 
    error, 
    showError = true, 
    showCounter = true,
    ...props 
  }, ref) => {
    const currentLength = value.length;
    const isNearLimit = currentLength > maxLength * 0.8;
    const isOverLimit = currentLength > maxLength;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      // Just limit length during typing, don't trim spaces
      const newValue = clampLenNoTrim(e.target.value, maxLength);
      onChange?.(newValue);
    };

    return (
      <div className="space-y-1">
        <div className="relative">
          <textarea
            ref={ref}
            value={value}
            onChange={handleChange}
            className={cn(
              "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              error && showError && "border-destructive focus-visible:ring-destructive",
              isOverLimit && "border-destructive focus-visible:ring-destructive",
              className
            )}
            {...props}
          />
          {showCounter && (
            <div className={cn(
              "absolute bottom-2 right-2 text-xs",
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

TextareaWithCounter.displayName = "TextareaWithCounter";

export { TextareaWithCounter };