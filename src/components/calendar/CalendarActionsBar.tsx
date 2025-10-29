import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Copy, 
  Edit
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Post } from '@/types/post';
import { NormalizedCalendarEvent } from '@/utils/calendar-events';

interface ActionItem {
  key: string;
  variant: 'default' | 'secondary' | 'ghost' | 'outline';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  tooltip: string;
  isPrimary: boolean;
}

interface CalendarActionsBarProps {
  event: NormalizedCalendarEvent | Post;
  onEdit?: () => void;
  onEditClick?: () => void; // Alternative name used in some places
  onCopyLink?: () => void;
  onCalendarView?: () => void;
  onOpenCalendar?: () => void; // Alternative name
  onAddToCalendar?: () => void;
  onViewAttachments?: () => void;
  showEditOptions?: boolean;
  className?: string;
  size?: 'default' | 'sm';
  variant?: 'outline' | 'ghost';
  layout?: string;
  showLabels?: boolean;
}

export function CalendarActionsBar({
  event,
  onEdit,
  onEditClick,
  onCopyLink,
  onCalendarView,
  onOpenCalendar,
  showEditOptions = true,
  className,
  size = 'default',
}: CalendarActionsBarProps) {
  const { user } = useAuth();

  if (!user) return null;

  // ✅ VALIDAÇÃO DEFENSIVA
  if (!event) {
    console.warn('[CalendarActionsBar] Event is null');
    return null;
  }

  // Validar meta para NormalizedCalendarEvent
  if ('meta' in event && (!event.meta || !event.meta.title)) {
    console.warn('[CalendarActionsBar] Event meta is incomplete:', event);
    return null;
  }

  // Validar post para CalendarEvent
  if ('post' in event) {
    const eventWithPost = event as any;
    if (!eventWithPost.post || !eventWithPost.post.title) {
      console.warn('[CalendarActionsBar] Event post is incomplete:', event);
      return null;
    }
  }

  // Extract post data for easier access COM FALLBACKS
  const extractedPost = 'meta' in event ? {
    id: event.postId || 'unknown',
    type: event.subtype || 'AVISO',
    title: event.meta?.title || 'Sem título',
    status: event.status || 'PUBLISHED',
    attachments: event.meta?.attachments,
    dueAt: event.meta?.dueAt,
    eventStartAt: event.meta?.eventStartAt,
    eventEndAt: event.meta?.eventEndAt,
    eventLocation: event.meta?.eventLocation,
  } as Post : event as Post;

  // Helper function to check if post has date
  const hasDate = (post: Post): boolean => {
    return (post.type === 'EVENTO' && !!post.eventStartAt) ||
           (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type) && !!post.dueAt);
  };

  // Use appropriate handler
  const editHandler = onEditClick || onEdit;
  const calendarHandler = onOpenCalendar || onCalendarView;

  // Build actions array based on user role and context
  const actions: ActionItem[] = [];

  // Copy link action
  if (onCopyLink) {
    actions.push({
      key: 'copy',
      variant: 'outline' as const,
      icon: Copy,
      label: 'Copiar link',
      onClick: onCopyLink,
      tooltip: 'Copiar link para compartilhamento',
      isPrimary: false
    });
  }

  // Calendar view action - only show if post has date
  if (hasDate(extractedPost) && calendarHandler) {
    actions.push({
      key: 'calendar',
      variant: 'outline' as const,
      icon: Calendar,
      label: 'Ver no calendário',
      onClick: calendarHandler,
      tooltip: 'Ver no calendário',
      isPrimary: false
    });
  }

  // Edit action - only for professor/secretaria
  if (showEditOptions && editHandler && user.role !== 'aluno') {
    actions.push({
      key: 'edit',
      variant: 'default' as const,
      icon: Edit,
      label: 'Editar',
      onClick: editHandler,
      tooltip: 'Editar item',
      isPrimary: true
    });
  }

  if (actions.length === 0) return null;

  return (
    <div className={cn('flex gap-2', className)}>
      {actions.map((action) => (
        <Button
          key={action.key}
          variant={action.variant}
          size={size}
          onClick={action.onClick}
          className={cn(
            'h-8 px-3',
            action.isPrimary && 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
          title={action.tooltip}
        >
          <action.icon className="h-4 w-4" />
          <span className="ml-2 text-xs">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}