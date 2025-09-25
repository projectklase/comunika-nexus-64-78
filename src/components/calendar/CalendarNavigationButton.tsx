import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { useCalendarNavigation } from '@/hooks/useCalendarNavigation';
import { cn } from '@/lib/utils';

interface CalendarNavigationButtonProps {
  classId?: string;
  date?: string | Date;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

export function CalendarNavigationButton({ 
  classId, 
  date, 
  variant = 'outline',
  size = 'sm',
  className,
  children
}: CalendarNavigationButtonProps) {
  const { goToCalendarWithDate, goToClassCalendar } = useCalendarNavigation();

  const handleClick = () => {
    if (classId) {
      goToClassCalendar(classId, date);
    } else {
      goToCalendarWithDate(date || new Date());
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn(
        "gap-2 min-w-0 max-w-[8rem] sm:max-w-[10rem] md:max-w-none",
        variant === 'outline' && "glass-card border-primary/30 hover:bg-primary/20",
        className
      )}
    >
      <Calendar className="h-4 w-4 flex-shrink-0" />
      <span className="truncate text-ellipsis overflow-hidden">
        {children || (
          <>
            <span className="sm:hidden">Calendário</span>
            <span className="hidden sm:inline md:hidden">Ver Cal.</span>
            <span className="hidden md:inline">
              {classId ? 'Ver Calendário da Turma' : 'Ver Calendário'}
            </span>
          </>
        )}
      </span>
    </Button>
  );
}