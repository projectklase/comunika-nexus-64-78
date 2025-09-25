import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { UnifiedCalendarNavigation } from '@/utils/calendar-navigation-unified';

interface ClassCalendarButtonProps {
  classId: string;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showText?: boolean;
}

export function ClassCalendarButton({ 
  classId, 
  className,
  variant = 'outline',
  size = 'sm',
  showText = true
}: ClassCalendarButtonProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleClick = () => {
    if (user?.role) {
      UnifiedCalendarNavigation.navigateToClassCalendar(navigate, user.role, classId);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn(
        "gap-2",
        variant === 'outline' && "glass-card border-primary/30 hover:bg-primary/20",
        className
      )}
      title="Ver calendário da turma"
    >
      <Calendar className="h-4 w-4" />
      {showText && 'Calendário'}
    </Button>
  );
}