import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { X, ChevronDown } from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 'Segunda', label: 'Segunda-feira', short: 'Seg' },
  { value: 'Terça', label: 'Terça-feira', short: 'Ter' },
  { value: 'Quarta', label: 'Quarta-feira', short: 'Qua' },
  { value: 'Quinta', label: 'Quinta-feira', short: 'Qui' },
  { value: 'Sexta', label: 'Sexta-feira', short: 'Sex' },
  { value: 'Sábado', label: 'Sábado', short: 'Sáb' },
  { value: 'Domingo', label: 'Domingo', short: 'Dom' },
];

interface DaysOfWeekSelectProps {
  selectedDays: string[];
  onSelectionChange: (selectedDays: string[]) => void;
}

export function DaysOfWeekSelect({ 
  selectedDays, 
  onSelectionChange 
}: DaysOfWeekSelectProps) {
  const [open, setOpen] = useState(false);

  const handleToggleDay = (dayValue: string) => {
    const newSelection = selectedDays.includes(dayValue)
      ? selectedDays.filter(day => day !== dayValue)
      : [...selectedDays, dayValue];
    onSelectionChange(newSelection);
  };

  const handleRemoveDay = (dayValue: string) => {
    onSelectionChange(selectedDays.filter(day => day !== dayValue));
  };

  const getShortName = (dayValue: string) => {
    return DAYS_OF_WEEK.find(day => day.value === dayValue)?.short || dayValue;
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between glass-input"
            type="button"
          >
            <span className="text-muted-foreground">
              {selectedDays.length === 0 
                ? 'Selecione os dias...' 
                : `${selectedDays.length} dia(s) selecionado(s)`
              }
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 glass-card p-0" align="start">
          <div className="p-3 border-b border-border/50">
            <h4 className="font-medium">Dias da semana</h4>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {DAYS_OF_WEEK.map((day) => (
              <div 
                key={day.value} 
                className="flex items-center space-x-2 p-3 hover:bg-muted/20 cursor-pointer"
                onClick={() => handleToggleDay(day.value)}
              >
                <Checkbox
                  checked={selectedDays.includes(day.value)}
                  onChange={() => {}} // Controlled by parent click
                />
                <div className="flex-1">
                  <div className="font-medium">{day.label}</div>
                </div>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected days as chips */}
      {selectedDays.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedDays.map((dayValue) => (
            <Badge 
              key={dayValue} 
              variant="secondary" 
              className="flex items-center gap-1 bg-primary/10 text-primary"
            >
              {getShortName(dayValue)}
              <button
                type="button"
                onClick={() => handleRemoveDay(dayValue)}
                className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}