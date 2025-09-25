import { ActivityType } from '@/types/post';
import { Button } from '@/components/ui/button';
import { FileText, FolderOpen, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityTypeSelectorProps {
  value: ActivityType;
  onChange: (type: ActivityType) => void;
}

const activityTypes = [
  {
    type: 'ATIVIDADE' as ActivityType,
    label: 'Atividade',
    icon: FileText,
    color: 'bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500',
    colorInactive: 'border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-950'
  },
  {
    type: 'TRABALHO' as ActivityType,
    label: 'Trabalho',
    icon: FolderOpen,
    color: 'bg-orange-600 border-orange-600 text-white dark:bg-orange-500 dark:border-orange-500',
    colorInactive: 'border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-400 dark:hover:bg-orange-950'
  },
  {
    type: 'PROVA' as ActivityType,
    label: 'Prova',
    icon: ClipboardCheck,
    color: 'bg-red-600 border-red-600 text-white dark:bg-red-500 dark:border-red-500',
    colorInactive: 'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-950'
  }
];

export function ActivityTypeSelector({ value, onChange }: ActivityTypeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {activityTypes.map(({ type, label, icon: Icon, color, colorInactive }) => (
        <Button
          key={type}
          type="button"
          variant="outline"
          className={cn(
            "h-20 flex-col gap-2 transition-all",
            value === type ? color : colorInactive
          )}
          onClick={() => onChange(type)}
        >
          <Icon className="h-5 w-5" />
          <span className="text-sm font-medium">{label}</span>
        </Button>
      ))}
    </div>
  );
}