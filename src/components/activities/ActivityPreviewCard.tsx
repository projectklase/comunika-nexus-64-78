import { ActivityType, ActivityMeta } from '@/types/post';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, ClockIcon, UsersIcon, FileText, FolderOpen, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ActivityPreviewCardProps {
  type: ActivityType;
  title: string;
  body?: string;
  className?: string;
  dueDate?: Date | null;
  dueTime?: string;
  activityMeta?: ActivityMeta;
}

const activityConfig = {
  ATIVIDADE: {
    label: 'Atividade',
    icon: FileText,
    bgColor: 'bg-gradient-to-br from-blue-900/20 to-blue-800/30 dark:from-blue-900/40 dark:to-blue-800/50 border-blue-400/30',
    badgeColor: 'bg-blue-600 dark:bg-blue-500',
    iconColor: 'text-blue-200 dark:text-blue-100',
    titleColor: 'text-blue-50 dark:text-blue-50'
  },
  TRABALHO: {
    label: 'Trabalho', 
    icon: FolderOpen,
    bgColor: 'bg-gradient-to-br from-orange-900/20 to-orange-800/30 dark:from-orange-900/40 dark:to-orange-800/50 border-orange-400/30',
    badgeColor: 'bg-orange-600 dark:bg-orange-500',
    iconColor: 'text-orange-200 dark:text-orange-100',
    titleColor: 'text-orange-50 dark:text-orange-50'
  },
  PROVA: {
    label: 'Prova',
    icon: ClipboardCheck,
    bgColor: 'bg-gradient-to-br from-red-900/20 to-red-800/30 dark:from-red-900/40 dark:to-red-800/50 border-red-400/30',
    badgeColor: 'bg-red-600 dark:bg-red-500',
    iconColor: 'text-red-200 dark:text-red-100',
    titleColor: 'text-red-50 dark:text-red-50'
  }
};

export function ActivityPreviewCard({ 
  type, 
  title, 
  body,
  className,
  dueDate,
  dueTime,
  activityMeta 
}: ActivityPreviewCardProps) {
  const config = activityConfig[type];
  const Icon = config.icon;
  
  const deadline = dueDate && dueTime ? 
    new Date(dueDate.toDateString() + ' ' + dueTime) : null;

  return (
    <div className={cn('w-full max-w-md', className)}>
      <Card className={cn(
        'border-2 transition-all shadow-lg rounded-xl overflow-hidden',
        config.bgColor
      )}>
        <CardHeader className="pb-3 relative">
          {/* Header with type and weight */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Icon className={cn('h-5 w-5', config.iconColor)} />
              <Badge className={cn('text-white font-medium', config.badgeColor)}>
                {config.label}
              </Badge>
            </div>
            {activityMeta?.peso && activityMeta?.usePeso !== false && (
              <div className={cn('text-sm font-medium', config.titleColor)}>
                Peso: {activityMeta.peso}
              </div>
            )}
          </div>
          
          {/* Centered title */}
          <div className="text-center">
            <h3 className={cn(
              'font-bold text-xl leading-tight mb-2',
              config.titleColor
            )}>
              {title || 'Título da atividade...'}
            </h3>
            
            {body && (
              <p className={cn(
                'text-sm opacity-90 line-clamp-2',
                config.titleColor
              )}>
                {body}
              </p>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-2">
            {deadline && (
              <div className={cn(
                'flex items-center gap-2 text-sm justify-center',
                config.titleColor
              )}>
                <CalendarIcon className="h-4 w-4" />
                <span>
                  {format(deadline, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            )}
            
            {type === 'PROVA' && activityMeta?.duracao && (
              <div className={cn(
                'flex items-center gap-2 text-sm justify-center',
                config.titleColor
              )}>
                <ClockIcon className="h-4 w-4" />
                <span>{activityMeta.duracao} minutos</span>
              </div>
            )}
            
            {type === 'TRABALHO' && activityMeta?.permitirGrupo && (
              <div className={cn(
                'flex items-center gap-2 text-sm justify-center',
                config.titleColor
              )}>
                <UsersIcon className="h-4 w-4" />
                <span>Trabalho em grupo permitido</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}