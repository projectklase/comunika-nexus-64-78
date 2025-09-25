import * as React from "react";
import { cn } from "@/lib/utils";
import { parseDateTime, formatToDateTimeInput } from "@/lib/format";
import { Input } from "./input";

interface InputDateTimeProps extends Omit<React.ComponentProps<"input">, "onChange" | "type" | "value"> {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  onBlur?: () => void;
  error?: string | null;
  showError?: boolean;
}

const InputDateTime = React.forwardRef<HTMLInputElement, InputDateTimeProps>(
  ({ className, value, onChange, onBlur, error, showError = true, ...props }, ref) => {
    const [inputValue, setInputValue] = React.useState(() => 
      value ? formatToDateTimeInput(value) : ""
    );
    const [internalError, setInternalError] = React.useState<string | null>(null);
    const displayError = error || internalError;

    // Update input value when external value changes
    React.useEffect(() => {
      if (value) {
        setInputValue(formatToDateTimeInput(value));
      } else {
        setInputValue("");
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      setInputValue(rawValue);
      
      // Clear previous errors
      if (internalError) {
        setInternalError(null);
      }

      // Try to parse the date as user types
      if (rawValue.length === 16) { // dd/mm/yyyy HH:mm
        const parsedDate = parseDateTime(rawValue);
        if (parsedDate) {
          onChange?.(parsedDate);
        }
      } else if (rawValue === "") {
        onChange?.(null);
      }
    };

    const handleBlur = () => {
      if (inputValue.trim() === "") {
        onChange?.(null);
        onBlur?.();
        return;
      }

      const parsedDate = parseDateTime(inputValue);
      if (parsedDate) {
        onChange?.(parsedDate);
        setInputValue(formatToDateTimeInput(parsedDate)); // Normalize format
        setInternalError(null);
      } else {
        setInternalError("Formato inválido. Use dd/mm/aaaa HH:mm");
      }
      
      onBlur?.();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow numbers, slash, space, colon, and control keys
      const allowed = /^[0-9\/\s:]+$/;
      const isControlKey = e.key.length > 1 || e.ctrlKey || e.metaKey || e.altKey;
      
      if (!isControlKey && !allowed.test(e.key)) {
        e.preventDefault();
      }
    };

    return (
      <div className="space-y-1">
        <Input
          ref={ref}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            displayError && showError && "border-destructive focus-visible:ring-destructive",
            className
          )}
          placeholder="dd/mm/aaaa HH:mm"
          maxLength={16}
          {...props}
        />
        {displayError && showError && (
          <p className="text-sm text-destructive">{displayError}</p>
        )}
      </div>
    );
  }
);

InputDateTime.displayName = "InputDateTime";

export { InputDateTime };