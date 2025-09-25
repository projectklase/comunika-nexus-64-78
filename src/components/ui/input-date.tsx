import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format, addDays, isValid, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { isHoliday } from "@/utils/br-holidays";

interface InputDateProps {
  value?: string;
  onChange?: (value: string) => void;
  onValidDate?: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  disabled?: boolean;
}

export const InputDate = React.forwardRef<HTMLInputElement, InputDateProps>(
  ({ 
    value = "", 
    onChange, 
    onValidDate, 
    placeholder = "dd/mm/aaaa", 
    className, 
    error = false,
    disabled = false,
    ...props 
  }, ref) => {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState(value);

    // Parse Brazilian date format (dd/mm/yyyy)
    const parseDateBR = (dateStr: string): Date | null => {
      if (!dateStr || dateStr.length < 10) return null;
      
      const cleanDate = dateStr.replace(/\D/g, '');
      if (cleanDate.length !== 8) return null;
      
      const day = parseInt(cleanDate.substring(0, 2), 10);
      const month = parseInt(cleanDate.substring(2, 4), 10);
      const year = parseInt(cleanDate.substring(4, 8), 10);
      
      const date = new Date(year, month - 1, day);
      return isValid(date) && 
             date.getDate() === day && 
             date.getMonth() === month - 1 && 
             date.getFullYear() === year ? date : null;
    };

    // Format date to Brazilian format
    const formatDateBR = (date: Date): string => {
      return format(date, "dd/MM/yyyy");
    };

    // Apply mask to input
    const applyMask = (value: string): string => {
      const numbers = value.replace(/\D/g, '');
      if (numbers.length <= 2) return numbers;
      if (numbers.length <= 4) return `${numbers.substring(0, 2)}/${numbers.substring(2)}`;
      return `${numbers.substring(0, 2)}/${numbers.substring(2, 4)}/${numbers.substring(4, 8)}`;
    };

    const currentDate = parseDateBR(inputValue);

    React.useEffect(() => {
      setInputValue(value);
    }, [value]);

    React.useEffect(() => {
      const validDate = parseDateBR(inputValue);
      onValidDate?.(validDate);
    }, [inputValue, onValidDate]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = applyMask(e.target.value);
      setInputValue(masked);
      onChange?.(masked);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const date = parseDateBR(inputValue) || new Date();
        const newDate = e.key === 'ArrowUp' ? addDays(date, 1) : addDays(date, -1);
        const newValue = formatDateBR(newDate);
        setInputValue(newValue);
        onChange?.(newValue);
      }
    };

    const handleDateSelect = (date: Date | undefined) => {
      if (date) {
        const newValue = formatDateBR(date);
        setInputValue(newValue);
        onChange?.(newValue);
        setOpen(false);
      }
    };

    const handleTodayClick = () => {
      const today = formatDateBR(new Date());
      setInputValue(today);
      onChange?.(today);
      setOpen(false);
    };

    const handleTomorrowClick = () => {
      const tomorrow = formatDateBR(addDays(new Date(), 1));
      setInputValue(tomorrow);
      onChange?.(tomorrow);
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
          placeholder={placeholder}
          className={cn(
            "rounded-r-none border-r-0 focus:z-10",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          disabled={disabled}
          aria-invalid={error}
          maxLength={10}
          {...props}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "rounded-l-none px-3 border-l-0",
                error && "border-destructive",
                !currentDate && "text-muted-foreground"
              )}
              disabled={disabled}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex gap-2 p-3 border-b">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTodayClick}
                className="flex-1"
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTomorrowClick}
                className="flex-1"
              >
                Amanhã
              </Button>
            </div>
            <Calendar
              mode="single"
              selected={currentDate || undefined}
              onSelect={handleDateSelect}
              locale={ptBR}
              weekStartsOn={1}
              initialFocus
              className="p-3 pointer-events-auto [&_.rdp-head_cell]:text-primary/80 [&_.rdp-button:hover]:bg-primary/10 [&_.rdp-button:focus-visible]:bg-primary/10 [&_.rdp-day_selected]:bg-primary [&_.rdp-day_selected]:text-primary-foreground [&_.rdp-day_today]:border-primary/40 [&_.rdp-day_today]:font-semibold [&_.rdp-nav_button:hover]:bg-primary/10 [&_.rdp-nav_button:focus-visible]:bg-primary/10 [&_.rdp-caption_label]:text-primary/90 [&_.rdp-caption_label]:font-semibold"
              modifiers={{
                holiday: (date) => {
                  const holiday = isHoliday(date);
                  return holiday !== null;
                }
              }}
              modifiersClassNames={{
                holiday: "rdp-day_holiday"
              }}
              components={{
                DayContent: ({ date }) => {
                  const holiday = isHoliday(date);
                  return (
                    <span className={cn(
                      holiday ? "text-primary font-semibold" : ""
                    )}>
                      {format(date, 'd')}
                    </span>
                  );
                }
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);

InputDate.displayName = "InputDate";