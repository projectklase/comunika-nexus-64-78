import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface InputTimeProps {
  value?: string;
  onChange?: (value: string) => void;
  onValidTime?: (valid: boolean) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  disabled?: boolean;
  step?: number; // minutes step (5, 15, 30)
}

export const InputTime = React.forwardRef<HTMLInputElement, InputTimeProps>(
  ({ 
    value = "", 
    onChange, 
    onValidTime,
    placeholder = "HH:mm", 
    className, 
    error = false,
    disabled = false,
    step = 15,
    ...props 
  }, ref) => {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState(value);

    // Parse time format (HH:mm)
    const parseTime = (timeStr: string): { valid: boolean; hours?: number; minutes?: number } => {
      if (!timeStr || timeStr.length < 5) return { valid: false };
      
      const cleanTime = timeStr.replace(/\D/g, '');
      if (cleanTime.length !== 4) return { valid: false };
      
      const hours = parseInt(cleanTime.substring(0, 2), 10);
      const minutes = parseInt(cleanTime.substring(2, 4), 10);
      
      const valid = hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
      return { valid, hours, minutes };
    };

    // Apply mask to input
    const applyMask = (value: string): string => {
      const numbers = value.replace(/\D/g, '');
      if (numbers.length <= 2) return numbers;
      return `${numbers.substring(0, 2)}:${numbers.substring(2, 4)}`;
    };

    // Generate time options
    const generateTimeOptions = (): string[] => {
      const options: string[] = [];
      for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += step) {
          const hours = h.toString().padStart(2, '0');
          const minutes = m.toString().padStart(2, '0');
          options.push(`${hours}:${minutes}`);
        }
      }
      return options;
    };

    const timeOptions = generateTimeOptions();
    const timeData = parseTime(inputValue);

    React.useEffect(() => {
      setInputValue(value);
    }, [value]);

    React.useEffect(() => {
      const { valid } = parseTime(inputValue);
      onValidTime?.(valid);
    }, [inputValue, onValidTime]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = applyMask(e.target.value);
      setInputValue(masked);
      onChange?.(masked);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        
        const { valid, hours = 0, minutes = 0 } = parseTime(inputValue);
        if (!valid) return;

        let newHours = hours;
        let newMinutes = minutes;

        if (e.shiftKey) {
          // Shift + arrows change hours
          newHours = e.key === 'ArrowUp' 
            ? (hours + 1) % 24 
            : hours === 0 ? 23 : hours - 1;
        } else {
          // Regular arrows change minutes
          if (e.key === 'ArrowUp') {
            newMinutes += step;
            if (newMinutes >= 60) {
              newMinutes = 0;
              newHours = (hours + 1) % 24;
            }
          } else {
            newMinutes -= step;
            if (newMinutes < 0) {
              newMinutes = 60 - step;
              newHours = hours === 0 ? 23 : hours - 1;
            }
          }
        }

        const newValue = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
        setInputValue(newValue);
        onChange?.(newValue);
      }
    };

    const handleBlur = () => {
      const trimmed = inputValue.trim();
      if (trimmed === '') {
        onValidTime?.(false);
        return;
      }
      const match = trimmed.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
      if (match) {
        const h = Math.min(23, Math.max(0, parseInt(match[1].padStart(2, '0'), 10)));
        const m = Math.min(59, Math.max(0, parseInt((match[2] ?? '00').padEnd(2, '0'), 10)));
        const normalized = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        setInputValue(normalized);
        onChange?.(normalized);
        onValidTime?.(true);
      } else {
        onValidTime?.(false);
      }
    };

    const handleTimeSelect = (time: string) => {
      setInputValue(time);
      onChange?.(time);
      setOpen(false);
    };

    const getCurrentTimeFormatted = (): string => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = Math.floor(now.getMinutes() / step) * step;
      return `${hours}:${minutes.toString().padStart(2, '0')}`;
    };

    const handleNowClick = () => {
      const now = getCurrentTimeFormatted();
      setInputValue(now);
      onChange?.(now);
      setOpen(false);
    };

    return (
      <div className="flex w-full">
        <Input
          ref={ref}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            "rounded-r-none border-r-0 focus:z-10",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          disabled={disabled}
          aria-invalid={error}
          maxLength={5}
          {...props}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "rounded-l-none px-3 border-l-0",
                error && "border-destructive",
                !timeData.valid && "text-muted-foreground"
              )}
              disabled={disabled}
            >
              <Clock className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex gap-2 p-3 border-b">
              <Button
                variant="outline"
                size="sm"
                onClick={handleNowClick}
                className="flex-1"
              >
                Agora
              </Button>
            </div>
            <ScrollArea className="h-60">
              <div className="p-1">
                {timeOptions.map((time) => (
                  <Button
                    key={time}
                    variant={inputValue === time ? "default" : "ghost"}
                    className="w-full justify-start font-mono text-sm"
                    onClick={() => handleTimeSelect(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);

InputTime.displayName = "InputTime";