import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EventChip } from './EventChip';
import { NormalizedCalendarEvent } from '@/utils/calendar-events';
import { sortCalendarEvents, getEventTimeDisplay } from '@/utils/calendar-sorting';
import { getOverflowText, getOverflowAriaLabel } from '@/utils/calendar-day-items';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface EventOverflowPopoverProps {
  events: NormalizedCalendarEvent[];
  overflowCount: number;
  visibleCount: number;
  date: Date;
  className?: string;
  isMobile?: boolean;
}

export function EventOverflowPopover({ 
  events, 
  overflowCount, 
  visibleCount, 
  date, 
  className, 
  isMobile = false 
}: EventOverflowPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const sortedEvents = sortCalendarEvents(events);

  if (overflowCount <= 0) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 text-xs text-muted-foreground hover:text-foreground px-2 py-0.5",
            "hover:bg-accent/30 transition-colors duration-200 min-h-[44px] sm:min-h-[24px]",
            "border border-border/30 rounded-md glass-card",
            className
          )}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
          aria-label={getOverflowAriaLabel(overflowCount, date)}
        >
          {getOverflowText(overflowCount)}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn(
          "p-0 glass-card border-border/50",
          isMobile ? "w-[90vw] max-w-sm" : "w-80"
        )}
        align={isMobile ? "center" : "start"}
        side={isMobile ? "bottom" : "right"}
        sideOffset={8}
      >
        <div className="p-3 border-b border-border/30">
          <h4 className="font-medium text-foreground">
            {format(date, "d 'de' MMMM", { locale: ptBR })}
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            {events.length} {events.length === 1 ? 'item' : 'itens'} no total
          </p>
        </div>
        <ScrollArea className={cn(isMobile ? "max-h-[60vh]" : "max-h-80")}>
          <div className="p-2 space-y-2">
            {sortedEvents.map(event => (
              <EventChip
                key={event.id}
                event={event}
                className="w-full text-xs h-7"
                useUnifiedHandler={true}
                onClick={() => {
                  // Ensure popover closes when item is clicked
                  setIsOpen(false);
                }}
              />
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}