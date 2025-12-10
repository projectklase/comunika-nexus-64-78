import { Post, PostInput } from '@/types/post';
import { NormalizedCalendarEvent } from '@/utils/calendar-events';
import { postStore } from '@/stores/post-store';
import { deliveryStore } from '@/stores/delivery-store';
import { ROUTES } from '@/constants/routes';
import { buildAlunoCalendarUrl } from '@/utils/calendar-navigation';
import { format } from 'date-fns';

export interface UnifiedPostActionHandlers {
  // Navigation and details
  openDetails: (post: Post | NormalizedCalendarEvent, userRole: string, navigate: Function) => void;
  openInCalendar: (post: Post | NormalizedCalendarEvent, userRole: string, navigate: Function) => void;
  editPost: (post: Post | NormalizedCalendarEvent, userRole: string, navigate: Function) => void;
  
  // CRUD operations
  duplicatePost: (post: Post | NormalizedCalendarEvent, authorName: string, authorId: string) => Promise<boolean>;
  publishNow: (post: Post | NormalizedCalendarEvent) => Promise<boolean>;
  archivePost: (post: Post | NormalizedCalendarEvent) => Promise<boolean>;
  deletePost: (post: Post | NormalizedCalendarEvent) => Promise<boolean>;
  
  // Linking
  copyLink: (post: Post | NormalizedCalendarEvent, userRole: string) => Promise<void>;
  
  // Student actions
  markDelivered: (post: Post | NormalizedCalendarEvent, userId: string) => Promise<boolean>;
  
  // Teacher actions
  openDeliveries: (post: Post | NormalizedCalendarEvent, navigate: Function) => void;
  
  // Attachments and calendar
  openAttachments: (post: Post | NormalizedCalendarEvent) => void;
  addToMyCalendar: (post: Post | NormalizedCalendarEvent) => void;
  
  // Utilities
  extractPost: (event: Post | NormalizedCalendarEvent) => Post;
  canPerformAction: (action: string, post: Post | NormalizedCalendarEvent, userRole: string) => boolean;
  buildCanonicalUrl: (post: Post | NormalizedCalendarEvent, userRole: string) => string;
}

// Helper to extract Post from either format
export function extractPost(event: Post | NormalizedCalendarEvent): Post {
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
      allow_attachments: event.meta.allow_attachments ?? false,
    };
  }
  return event;
}

// RBAC permissions check
export function canPerformAction(action: string, post: Post | NormalizedCalendarEvent, userRole: string): boolean {
  const postData = extractPost(post);
  
  switch (action) {
    case 'edit':
    case 'duplicate':
    case 'archive':
    case 'delete':
      return userRole === 'secretaria' || 
             (userRole === 'professor' && ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(postData.type));
    case 'publishNow':
      return (userRole === 'secretaria' || userRole === 'professor') && postData.status === 'SCHEDULED';
    case 'viewInCalendar':
    case 'copyLink':
    case 'openAttachments':
    case 'addToMyCalendar':
      return true; // Everyone can perform these actions
    case 'markDelivered':
      return userRole === 'aluno' && ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(postData.type);
    case 'openDeliveries':
      return userRole === 'professor' && ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(postData.type);
    default:
      return false;
  }
}

// Build canonical URLs for deep linking
export function buildCanonicalUrl(post: Post | NormalizedCalendarEvent, userRole: string): string {
  const postData = extractPost(post);
  const baseUrl = window.location.origin;
  
  // For activities with due dates, link to calendar
  if (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(postData.type) && postData.dueAt) {
    if (userRole === 'aluno') {
      return `${baseUrl}${buildAlunoCalendarUrl({
        date: postData.dueAt,
        postId: postData.id,
        classId: postData.classId || postData.classIds?.[0]
      })}`;
    } else if (userRole === 'professor') {
      return `${baseUrl}${ROUTES.PROFESSOR.CALENDARIO}?d=${format(new Date(postData.dueAt), 'yyyy-MM-dd')}&postId=${postData.id}`;
    } else {
      return `${baseUrl}${ROUTES.SECRETARIA.CALENDARIO}?d=${format(new Date(postData.dueAt), 'yyyy-MM-dd')}&postId=${postData.id}`;
    }
  }
  
  // For events with start dates, link to calendar
  if (postData.type === 'EVENTO' && postData.eventStartAt) {
    if (userRole === 'aluno') {
      return `${baseUrl}${buildAlunoCalendarUrl({
        date: postData.eventStartAt,
        postId: postData.id,
        classId: postData.classId || postData.classIds?.[0]
      })}`;
    } else if (userRole === 'professor') {
      return `${baseUrl}${ROUTES.PROFESSOR.CALENDARIO}?d=${format(new Date(postData.eventStartAt), 'yyyy-MM-dd')}&postId=${postData.id}`;
    } else {
      return `${baseUrl}${ROUTES.SECRETARIA.CALENDARIO}?d=${format(new Date(postData.eventStartAt), 'yyyy-MM-dd')}&postId=${postData.id}`;
    }
  }
  
  // For other post types, link to appropriate feed
  if (userRole === 'aluno') {
    return `${baseUrl}${ROUTES.ALUNO.FEED}?postId=${postData.id}`;
  } else if (userRole === 'professor') {
    return `${baseUrl}${ROUTES.PROFESSOR.ACTIVITIES}?postId=${postData.id}`;
  } else {
    return `${baseUrl}${ROUTES.SECRETARIA.FEED}?postId=${postData.id}`;
  }
}

// Navigation Actions
export function openDetails(post: Post | NormalizedCalendarEvent, userRole: string, navigate: Function): void {
  const postData = extractPost(post);
  
  // For activities, open activity drawer
  if (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(postData.type)) {
    // Use activity drawer with proper URL params
    const params = new URLSearchParams(window.location.search);
    params.set('drawer', 'activity');
    params.set('postId', postData.id);
    
    if (postData.classId && postData.classId !== 'ALL_CLASSES') {
      params.set('classId', postData.classId);
    }
    
    const currentPath = window.location.pathname;
    navigate(`${currentPath}?${params.toString()}`, { replace: true });
    return;
  }
  
  // For other posts, open post detail drawer
  const params = new URLSearchParams(window.location.search);
  params.set('drawer', 'post');
  params.set('postId', postData.id);
  
  const currentPath = window.location.pathname;
  navigate(`${currentPath}?${params.toString()}`, { replace: true });
}

export function openInCalendar(post: Post | NormalizedCalendarEvent, userRole: string, navigate: Function): void {
  const postData = extractPost(post);
  
  if (postData.type === 'EVENTO' && postData.eventStartAt) {
    const dateParam = format(new Date(postData.eventStartAt), 'yyyy-MM-dd');
    if (userRole === 'aluno') {
      navigate(buildAlunoCalendarUrl({
        date: dateParam,
        postId: postData.id,
        classId: postData.classId || postData.classIds?.[0]
      }));
    } else if (userRole === 'professor') {
      navigate(`${ROUTES.PROFESSOR.CALENDARIO}?d=${dateParam}&postId=${postData.id}`);
    } else {
      navigate(`${ROUTES.SECRETARIA.CALENDARIO}?d=${dateParam}&postId=${postData.id}`);
    }
  } else if (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(postData.type) && postData.dueAt) {
    const dateParam = format(new Date(postData.dueAt), 'yyyy-MM-dd');
    if (userRole === 'aluno') {
      navigate(buildAlunoCalendarUrl({
        date: dateParam,
        postId: postData.id,
        classId: postData.classId || postData.classIds?.[0]
      }));
    } else if (userRole === 'professor') {
      navigate(`${ROUTES.PROFESSOR.CALENDARIO}?d=${dateParam}&postId=${postData.id}`);
    } else {
      navigate(`${ROUTES.SECRETARIA.CALENDARIO}?d=${dateParam}&postId=${postData.id}`);
    }
  }
}

export function editPost(post: Post | NormalizedCalendarEvent, userRole: string, navigate: Function): void {
  const postData = extractPost(post);
  
  if (!canPerformAction('edit', postData, userRole)) {
    throw new Error('Sem permissão para editar este post');
  }

  // Navigate to correct edit route based on user role and post type
  if (userRole === 'professor' && ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(postData.type)) {
    navigate(`/professor/atividades/${postData.id}/editar`);
  } else if (userRole === 'secretaria') {
    if (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(postData.type)) {
      navigate(`/secretaria/atividades/${postData.id}/editar`);
    } else {
      // For posts (AVISO, COMUNICADO, EVENTO), use feed composer with edit mode
      navigate(`${ROUTES.SECRETARIA.FEED}?edit=${postData.id}`);
    }
  }
}

// CRUD Operations
export async function duplicatePost(post: Post | NormalizedCalendarEvent, authorName: string, authorId: string, authorRole: 'secretaria' | 'professor' | 'aluno' = 'aluno'): Promise<boolean> {
  const postData = extractPost(post);
  
  try {
    const duplicateData = await postStore.duplicate(postData.id);
    if (duplicateData) {
      await postStore.create(duplicateData, authorName, authorId, authorRole);
      return true;
    }
    return false;
  } catch (error) {
    throw new Error('Erro ao duplicar post');
  }
}

export async function publishNow(post: Post | NormalizedCalendarEvent): Promise<boolean> {
  const postData = extractPost(post);
  
  try {
    const success = postStore.update(postData.id, { 
      status: 'PUBLISHED', 
      publishAt: undefined 
    });
    return !!success;
  } catch (error) {
    throw new Error('Erro ao publicar post');
  }
}

export async function archivePost(post: Post | NormalizedCalendarEvent): Promise<boolean> {
  const postData = extractPost(post);
  
  try {
    const success = postStore.archive(postData.id);
    return success;
  } catch (error) {
    throw new Error('Erro ao arquivar post');
  }
}

export async function deletePost(post: Post | NormalizedCalendarEvent): Promise<boolean> {
  const postData = extractPost(post);
  
  try {
    const success = postStore.delete(postData.id);
    return success;
  } catch (error) {
    throw new Error('Erro ao excluir post');
  }
}


export async function copyLink(post: Post | NormalizedCalendarEvent, userRole: string): Promise<void> {
  const postData = extractPost(post);
  const canonicalUrl = buildCanonicalUrl(postData, userRole);
  
  try {
    await navigator.clipboard.writeText(canonicalUrl);
  } catch {
    throw new Error('Não foi possível copiar o link');
  }
}

// Student Actions
export async function markDelivered(post: Post | NormalizedCalendarEvent, userId: string): Promise<boolean> {
  const postData = extractPost(post);
  
  try {
    // TODO: Integrate with actual delivery store
    // deliveryStore.markAsDelivered(postData.id, userId);
    console.log('Marking delivery for post:', postData.id, 'user:', userId);
    return true;
  } catch (error) {
    throw new Error('Erro ao marcar entrega');
  }
}

// Teacher Actions
export function openDeliveries(post: Post | NormalizedCalendarEvent, navigate: Function): void {
  const postData = extractPost(post);
  const classId = postData.classIds?.[0] || postData.classId;
  navigate(`/professor/turma/${classId}/atividade/${postData.id}?tab=entregas`);
}

// Attachment Actions
export function openAttachments(post: Post | NormalizedCalendarEvent): void {
  const postData = extractPost(post);
  
  if (!postData.attachments || postData.attachments.length === 0) {
    throw new Error('Este item não possui anexos');
  }

  // For single attachment, open directly
  if (postData.attachments.length === 1 && postData.attachments[0].url) {
    window.open(postData.attachments[0].url, '_blank');
    return;
  }
  
  // For multiple attachments, could open a modal or download all
  // For now, open the first one
  if (postData.attachments[0].url) {
    window.open(postData.attachments[0].url, '_blank');
  }
}

// Calendar Integration
export function addToMyCalendar(post: Post | NormalizedCalendarEvent): void {
  const postData = extractPost(post);
  
  let startDate: Date, endDate: Date, details = '';
  
  if (postData.type === 'EVENTO' && postData.eventStartAt) {
    startDate = new Date(postData.eventStartAt);
    endDate = postData.eventEndAt ? new Date(postData.eventEndAt) : new Date(startDate.getTime() + 60 * 60 * 1000);
    details = postData.body || '';
    if (postData.eventLocation) {
      details += `\n\nLocal: ${postData.eventLocation}`;
    }
  } else if (postData.dueAt) {
    startDate = new Date(postData.dueAt);
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour
    details = postData.body || '';
  } else {
    throw new Error('Este item não possui uma data para adicionar ao calendário');
  }
  
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(postData.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(details)}${postData.eventLocation ? `&location=${encodeURIComponent(postData.eventLocation)}` : ''}`;
  
  window.open(googleCalendarUrl, '_blank');
}

// Export all handlers as a unified object
export const unifiedPostActions: UnifiedPostActionHandlers = {
  openDetails,
  openInCalendar,
  editPost,
  duplicatePost,
  publishNow,
  archivePost,
  deletePost,
  copyLink,
  markDelivered,
  openDeliveries,
  openAttachments,
  addToMyCalendar,
  extractPost,
  canPerformAction,
  buildCanonicalUrl,
};