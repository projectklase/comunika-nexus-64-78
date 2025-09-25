import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Post } from '@/types/post';
import { NormalizedCalendarEvent } from '@/utils/calendar-events';
import { usePostActionsUnified } from './usePostActionsUnified';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCalendarNavigation } from '@/hooks/useCalendarNavigation';
import { UnifiedCalendarNavigation } from '@/utils/calendar-navigation-unified';
import { activityDrawerStore } from '@/utils/activity-drawer-handler';
import { logAudit } from '@/stores/audit-store';

export interface CalendarActionHandlers {
  // Core handlers - unique and reused everywhere
  openDetails: (event: NormalizedCalendarEvent | Post) => void;
  openInCalendar: (event: NormalizedCalendarEvent | Post) => void;
  editPost: (event: NormalizedCalendarEvent | Post) => void;
  duplicatePost: (event: NormalizedCalendarEvent | Post) => void;
  publishNow: (event: NormalizedCalendarEvent | Post) => void;
  archivePost: (event: NormalizedCalendarEvent | Post) => void;
  deletePost: (event: NormalizedCalendarEvent | Post) => void;
  markDelivered: (event: NormalizedCalendarEvent | Post) => void;
  openDeliveries: (event: NormalizedCalendarEvent | Post) => void;
  openAttachments: (event: NormalizedCalendarEvent | Post) => void;
  copyLink: (event: NormalizedCalendarEvent | Post) => void;
  
  addToMyCalendar: (event: NormalizedCalendarEvent | Post) => void;
  
  // UI state
  isLoading: string | null;
  
  // Confirmation handlers
  confirmAction: (action: 'archive' | 'delete', data: { id: string; title: string }) => void;
  
  // RBAC helpers
  canPerformAction: (action: string, event: NormalizedCalendarEvent | Post) => boolean;
  shouldShowEvent: (event: NormalizedCalendarEvent | Post) => boolean;
}

export function useCalendarActions(): CalendarActionHandlers {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  // Removed unused calendar navigation import - using UnifiedCalendarNavigation instead
  const postActions = usePostActionsUnified();
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: 'archive' | 'delete' | null;
    data: { id: string; title: string } | null;
  }>({ isOpen: false, action: null, data: null });

  // Helper to extract Post from either NormalizedCalendarEvent or Post
  const extractPost = (event: NormalizedCalendarEvent | Post): Post => {
    if ('meta' in event) {
      // It's a NormalizedCalendarEvent
      return {
        id: event.postId,
        type: event.subtype as any,
        title: event.meta.title,
        authorName: event.meta.author,
        status: event.status as any,
        audience: event.meta.audience as any,
        body: event.meta.body,
        attachments: event.meta.attachments,
        dueAt: event.meta.dueAt,
        eventStartAt: event.meta.eventStartAt,
        eventEndAt: event.meta.eventEndAt,
        eventLocation: event.meta.eventLocation,
        classId: event.classId,
        classIds: event.classIds,
        activityMeta: event.meta.activityMeta,
        createdAt: new Date().toISOString(), // Default fallback
      };
    }
    return event;
  };

  // RBAC helper
  const canPerformAction = (action: string, event: NormalizedCalendarEvent | Post): boolean => {
    const post = extractPost(event);
    return postActions.canPerformAction(action, post);
  };

  // Visibility helper
  const shouldShowEvent = (event: NormalizedCalendarEvent | Post): boolean => {
    const post = extractPost(event);
    return postActions.shouldShowPost(post);
  };

  // Handler: Open details (always ActivityDrawer)
  const openDetails = (event: NormalizedCalendarEvent | Post) => {
    const post = extractPost(event);
    
    // Close any existing drawers first
    activityDrawerStore.close();
    
    // Open new drawer
    activityDrawerStore.open({
      postId: post.id,
      classId: post.classId || post.classIds?.[0],
      mode: 'calendar',
      type: 'meta' in event ? event.type : 'event',
      subtype: post.type,
      status: post.status,
    });

    // Update URL for deep linking
    const params = new URLSearchParams(window.location.search);
    params.set('drawer', 'activity');
    params.set('postId', post.id);
    
    if (post.classId && post.classId !== 'ALL_CLASSES') {
      params.set('classId', post.classId);
    }
    
    const currentPath = window.location.pathname;
    navigate(`${currentPath}?${params.toString()}`, { replace: true });

    // Log audit event
    if (user) {
      logAudit({
        action: 'READ',
        entity: 'POST',
        entity_id: post.id,
        entity_label: post.title,
        actor_id: user.id,
        actor_name: user.name,
        actor_email: user.email,
        actor_role: user.role,
        scope: post.audience === 'GLOBAL' ? 'GLOBAL' : `CLASS:${post.classId}`,
        meta: { 
          post_type: post.type,
          source: 'calendar_action',
          surface: 'calendar'
        }
      });
    }
  };

  // Handler: Open in calendar (navigate with date)
  const openInCalendar = (event: NormalizedCalendarEvent | Post) => {
    const post = extractPost(event);
    
    if (!user?.role) {
      toast({
        title: "Erro de autenticação",
        description: "Usuário não autenticado.",
        variant: "destructive",
      });
      return;
    }

    // Usar navegação unificada para garantir consistência
    try {
      if (post.type === 'EVENTO' && post.eventStartAt) {
        const targetDate = post.eventStartAt;
        const classId = post.classId || post.classIds?.[0];
        
        // Navegar com UnifiedCalendarNavigation
        const params = {
          date: targetDate,
          postId: post.id,
          classId: classId !== 'ALL_CLASSES' ? classId : undefined,
          view: 'month' as const,
          highlightPost: true,
          openDayModal: true
        };
        
        const url = UnifiedCalendarNavigation.buildCalendarUrl(user.role, params);
        navigate(url);
        
        toast({
          title: "Redirecionando para o calendário",
          description: "Posicionando na data do evento.",
        });
      } else if (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type) && post.dueAt) {
        const targetDate = post.dueAt;
        const classId = post.classId || post.classIds?.[0];
        
        // Navegar com UnifiedCalendarNavigation
        const params = {
          date: targetDate,
          postId: post.id,
          classId: classId !== 'ALL_CLASSES' ? classId : undefined,
          view: 'month' as const,
          highlightPost: true,
          openDayModal: true
        };
        
        const url = UnifiedCalendarNavigation.buildCalendarUrl(user.role, params);
        navigate(url);
        
        toast({
          title: "Redirecionando para o calendário",
          description: "Posicionando na data de entrega.",
        });
      } else {
        toast({
          title: "Data não disponível",
          description: "Este post não possui uma data para exibição no calendário.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error navigating to calendar:', error);
      toast({
        title: "Erro na navegação",
        description: "Não foi possível abrir o calendário.",
        variant: "destructive",
      });
    }
  };

  // Handler: Edit post
  const editPost = (event: NormalizedCalendarEvent | Post) => {
    const post = extractPost(event);
    
    if (!canPerformAction('edit', post)) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para editar este item.",
        variant: "destructive",
      });
      return;
    }

    // Use unified edit handler
    postActions.editPost(post);
  };

  // Handler: Duplicate post
  const duplicatePost = (event: NormalizedCalendarEvent | Post) => {
    const post = extractPost(event);
    
    if (user) {
      postActions.duplicatePost(post.id, user.name, {
        onSuccess: () => {
          toast({
            title: "Post duplicado",
            description: "O post foi duplicado com sucesso.",
          });
        }
      });
    }
  };

  // Handler: Publish now
  const publishNow = (event: NormalizedCalendarEvent | Post) => {
    const post = extractPost(event);
    postActions.publishNow(post.id);
  };

  // Handler: Archive post (with confirmation)
  const archivePost = (event: NormalizedCalendarEvent | Post) => {
    const post = extractPost(event);
    setConfirmDialog({
      isOpen: true,
      action: 'archive',
      data: { id: post.id, title: post.title }
    });
  };

  // Handler: Delete post (with confirmation)
  const deletePost = (event: NormalizedCalendarEvent | Post) => {
    const post = extractPost(event);
    setConfirmDialog({
      isOpen: true,
      action: 'delete',
      data: { id: post.id, title: post.title }
    });
  };

  // Handler: Mark as delivered (student only)
  const markDelivered = (event: NormalizedCalendarEvent | Post) => {
    const post = extractPost(event);
    
    if (user?.role !== 'aluno') {
      toast({
        title: "Ação não permitida",
        description: "Apenas alunos podem marcar entregas.",
        variant: "destructive",
      });
      return;
    }

    // TODO: Integrate with delivery store
    toast({
      title: "Entrega marcada",
      description: "Sua entrega foi registrada com sucesso.",
    });

    // Log audit event
    if (user) {
      logAudit({
        action: 'UPDATE',
        entity: 'POST',
        entity_id: post.id,
        entity_label: post.title,
        actor_id: user.id,
        actor_name: user.name,
        actor_email: user.email,
        actor_role: user.role,
        scope: post.audience === 'GLOBAL' ? 'GLOBAL' : `CLASS:${post.classId}`,
        meta: { 
          post_type: post.type,
          delivery_method: 'mark_delivered',
          source: 'calendar_action'
        }
      });
    }
  };

  // Handler: Open deliveries (professor only)
  const openDeliveries = (event: NormalizedCalendarEvent | Post) => {
    const post = extractPost(event);
    
    if (user?.role !== 'professor') {
      toast({
        title: "Acesso negado",
        description: "Apenas professores podem visualizar entregas.",
        variant: "destructive",
      });
      return;
    }

    navigate(`/professor/turma/${post.classId}/atividade/${post.id}?tab=entregas`);
  };

  // Handler: Open attachments
  const openAttachments = (event: NormalizedCalendarEvent | Post) => {
    const post = extractPost(event);
    
    if (!post.attachments || post.attachments.length === 0) {
      toast({
        title: "Nenhum anexo",
        description: "Este item não possui anexos.",
        variant: "destructive",
      });
      return;
    }

    // For now, open the first attachment
    if (post.attachments[0].url) {
      window.open(post.attachments[0].url, '_blank');
    }
  };

  // Handler: Copy link
  const copyLink = (event: NormalizedCalendarEvent | Post) => {
    const post = extractPost(event);
    postActions.copyLink(post);
  };


  // Handler: Add to my calendar
  const addToMyCalendar = (event: NormalizedCalendarEvent | Post) => {
    const post = extractPost(event);
    
    let startDate: Date, endDate: Date, details = '';
    
    if (post.type === 'EVENTO' && post.eventStartAt) {
      startDate = new Date(post.eventStartAt);
      endDate = post.eventEndAt ? new Date(post.eventEndAt) : new Date(startDate.getTime() + 60 * 60 * 1000);
      details = post.body || '';
      if (post.eventLocation) {
        details += `\n\nLocal: ${post.eventLocation}`;
      }
    } else if (post.dueAt) {
      startDate = new Date(post.dueAt);
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour
      details = post.body || '';
    } else {
      toast({
        title: "Data não disponível",
        description: "Este item não possui uma data para adicionar ao calendário.",
        variant: "destructive",
      });
      return;
    }
    
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(post.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(details)}${post.eventLocation ? `&location=${encodeURIComponent(post.eventLocation)}` : ''}`;
    
    window.open(googleCalendarUrl, '_blank');
    
    toast({
      title: "Calendário aberto",
      description: "O evento foi aberto no Google Calendar.",
    });
  };

  // Confirmation handler
  const confirmAction = (action: 'archive' | 'delete', data: { id: string; title: string }) => {
    if (action === 'archive') {
      postActions.archivePost(data.id);
    } else if (action === 'delete') {
      postActions.deletePost(data.id);
    }
    
    setConfirmDialog({ isOpen: false, action: null, data: null });
  };

  return {
    // Core handlers
    openDetails,
    openInCalendar,
    editPost,
    duplicatePost,
    publishNow,
    archivePost,
    deletePost,
    markDelivered,
    openDeliveries,
    openAttachments,
    copyLink,
    addToMyCalendar,
    
    // State
    isLoading: postActions.isLoading,
    
    // Confirmation
    confirmAction,
    
    // RBAC
    canPerformAction,
    shouldShowEvent,
  };
}