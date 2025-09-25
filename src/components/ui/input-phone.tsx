import * as React from "react";
import { cn } from "@/lib/utils";
import { normalizePhone, onlyDigits, validatePhone } from "@/lib/validation";
import { Input } from "./input";

interface InputPhoneProps extends Omit<React.ComponentProps<"input">, "onChange" | "type"> {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  showError?: boolean;
}

const InputPhone = React.forwardRef<HTMLInputElement, InputPhoneProps>(
  ({ className, value = "", onChange, onBlur, error, showError = true, ...props }, ref) => {
    const [internalError, setInternalError] = React.useState<string | null>(null);
    const displayError = error || internalError;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const digitsOnly = onlyDigits(rawValue);
      const formatted = normalizePhone(digitsOnly);
      
      onChange?.(formatted);
      
      // Clear error on change if there was one
      if (internalError) {
        setInternalError(null);
      }
    };

    const handleBlur = () => {
      const validationError = validatePhone(value);
      setInternalError(validationError);
      onBlur?.();
    };

    return (
      <div className="space-y-1">
        <Input
          ref={ref}
          type="tel"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn(
            displayError && showError && "border-destructive focus-visible:ring-destructive",
            className
          )}
          placeholder="(11) 99999-9999"
          {...props}
        />
        {displayError && showError && (
          <p className="text-sm text-destructive">{displayError}</p>
        )}
      </div>
    );
  }
);

InputPhone.displayName = "InputPhone";

export { InputPhone };