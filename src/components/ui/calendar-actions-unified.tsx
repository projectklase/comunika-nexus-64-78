/**
 * Unified Calendar Actions Component
 * Replaces scattered action buttons with consistent implementation
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Copy, 
  Edit, 
  ExternalLink, 
  Download, 
  Plus, 
  Eye,
  FileText,
  Share
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Post } from '@/types/post';
import { NormalizedCalendarEvent } from '@/utils/calendar-events';
import { UnifiedCalendarNavigation } from '@/utils/calendar-navigation-unified';
import { useNavigate } from 'react-router-dom';

interface CalendarActionsUnifiedProps {
  event: NormalizedCalendarEvent | Post;
  onEditClick?: () => void;
  onOpenFeed?: () => void;
  onViewAttachments?: () => void;
  className?: string;
  layout?: 'horizontal' | 'vertical' | 'compact';
  showLabels?: boolean;
  disabled?: boolean;
}

export function CalendarActionsUnified({
  event,
  onEditClick,
  onOpenFeed,
  onViewAttachments,
  className,
  layout = 'horizontal',
  showLabels = true,
  disabled = false
}: CalendarActionsUnifiedProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!user || disabled) return null;

  // Extract event data consistently
  const eventData = 'meta' in event ? {
    id: event.postId,
    type: event.subtype,
    title: event.meta.title,
    status: event.status,
    attachments: event.meta.attachments,
    dueAt: event.meta.dueAt,
    eventStartAt: event.meta.eventStartAt,
    eventEndAt: event.meta.eventEndAt,
    eventLocation: event.meta.eventLocation,
  } : {
    id: event.id,
    type: event.type,
    title: event.title,
    status: event.status,
    attachments: event.attachments,
    dueAt: event.dueAt,
    eventStartAt: event.eventStartAt,
    eventEndAt: event.eventEndAt,
    eventLocation: event.eventLocation,
  };

  // Action handlers
  const handleCopyLink = () => {
    const url = `${window.location.origin}/feed?highlight=${eventData.id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link copiado",
        description: "O link foi copiado para a área de transferência.",
      });
    }).catch(() => {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o link.",
        variant: "destructive"
      });
    });
  };

  const handleGoToCalendar = () => {
    if (!user?.role) {
      toast({
        title: "Erro de autenticação",
        description: "Usuário não autenticado.",
        variant: "destructive",
      });
      return;
    }

    const targetDate = eventData.eventStartAt || eventData.dueAt;
    if (targetDate) {
      try {
        // Usar navegação unificada
        if (eventData.type === 'EVENTO' && eventData.eventStartAt) {
          UnifiedCalendarNavigation.navigateToEvent(navigate, user.role, targetDate, eventData.id);
        } else if (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(eventData.type) && eventData.dueAt) {
          UnifiedCalendarNavigation.navigateToActivity(navigate, user.role, targetDate, eventData.id);
        } else {
          // Fallback genérico
          const params = {
            date: targetDate,
            postId: eventData.id,
            view: 'month' as const,
            highlightPost: true
          };
          const url = UnifiedCalendarNavigation.buildCalendarUrl(user.role, params);
          navigate(url);
        }
        
        toast({
          title: "Redirecionando para o calendário",
          description: "Posicionando na data do item.",
        });
      } catch (error) {
        console.error('Error navigating to calendar:', error);
        toast({
          title: "Erro na navegação",
          description: "Não foi possível abrir o calendário.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Data não disponível",
        description: "Este item não possui uma data para exibição no calendário.",
        variant: "destructive",
      });
    }
  };

  const handleAddToCalendar = () => {
    // Generate .ics file for user's calendar app
    const startDate = new Date(eventData.eventStartAt || eventData.dueAt || Date.now());
    const endDate = eventData.eventEndAt ? new Date(eventData.eventEndAt) : new Date(startDate.getTime() + 60 * 60 * 1000);
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Comunika//Calendar Event//PT',
      'BEGIN:VEVENT',
      `UID:${eventData.id}@comunika.app`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `SUMMARY:${eventData.title}`,
      ...(eventData.eventLocation ? [`LOCATION:${eventData.eventLocation}`] : []),
      `DESCRIPTION:Evento do Comunika - ${eventData.title}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${eventData.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Arquivo baixado",
      description: "O evento foi baixado para seu calendário.",
    });
  };

  // Build actions based on user role and context
  const actions = [];

  // Primary actions
  if (user.role === 'aluno') {
    // Student: Add to calendar for events
    if (eventData.type === 'EVENTO' || eventData.dueAt || eventData.eventStartAt) {
      actions.push({
        key: 'add-calendar',
        variant: 'default' as const,
        icon: Plus,
        label: 'Adicionar',
        onClick: handleAddToCalendar,
        tooltip: 'Baixar para seu calendário',
        isPrimary: true
      });
    }
  } else if (user.role === 'professor' || user.role === 'secretaria') {
    // Teachers/Secretary: Edit as primary
    if (onEditClick) {
      actions.push({
        key: 'edit',
        variant: 'default' as const,
        icon: Edit,
        label: 'Editar',
        onClick: onEditClick,
        tooltip: 'Editar este item',
        isPrimary: true
      });
    }
  }

  // Secondary actions
  actions.push({
    key: 'copy-link',
    variant: 'secondary' as const,
    icon: Copy,
    label: 'Copiar link',
    onClick: handleCopyLink,
    tooltip: 'Copiar link',
    isPrimary: false
  });

  actions.push({
    key: 'calendar',
    variant: 'ghost' as const,
    icon: Calendar,
    label: 'Calendário',
    onClick: handleGoToCalendar,
    tooltip: 'Ver no calendário',
    isPrimary: false
  });

  if (onOpenFeed) {
    actions.push({
      key: 'feed',
      variant: 'ghost' as const,
      icon: ExternalLink,
      label: 'Feed',
      onClick: onOpenFeed,
      tooltip: 'Abrir no feed',
      isPrimary: false
    });
  }

  // Attachments
  const hasAttachments = eventData.attachments && eventData.attachments.length > 0;
  if (hasAttachments && onViewAttachments) {
    actions.push({
      key: 'attachments',
      variant: 'ghost' as const,
      icon: FileText,
      label: 'Anexos',
      onClick: onViewAttachments,
      tooltip: `${eventData.attachments?.length} anexo(s)`,
      isPrimary: false
    });
  }

  if (actions.length === 0) return null;

  const isCompact = layout === 'compact';
  const isVertical = layout === 'vertical';

  return (
    <div
      className={cn(
        'calendar-actions-unified',
        'flex gap-2',
        isVertical ? 'flex-col items-stretch' : 'flex-row items-center',
        isCompact ? 'gap-1' : 'gap-2',
        className
      )}
    >
      {actions.map((action) => (
        <Button
          key={action.key}
          variant={action.variant}
          size={isCompact ? "sm" : "default"}
          onClick={action.onClick}
          disabled={disabled}
          className={cn(
            'transition-all duration-200',
            isCompact ? 'h-8 px-2' : 'h-9 px-3',
            action.isPrimary && 'shadow-sm',
            isVertical && 'w-full justify-start'
          )}
          title={action.tooltip}
          aria-label={action.tooltip}
        >
          <action.icon className={cn(
            isCompact ? "h-3 w-3" : "h-4 w-4",
            showLabels && !isCompact && "mr-2"
          )} />
          {(showLabels && !isCompact) && (
            <span className="truncate">{action.label}</span>
          )}
        </Button>
      ))}
    </div>
  );
}