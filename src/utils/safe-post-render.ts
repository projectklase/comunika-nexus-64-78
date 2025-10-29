import { Post } from '@/types/post';
import { NormalizedCalendarEvent } from '@/utils/calendar-events';

/**
 * Verifica se um post tem todos os campos necessários para ser renderizado
 */
export function isPostSafe(post: any): post is Post {
  if (!post) {
    console.warn('[SafePostRender] Post is null or undefined');
    return false;
  }

  if (!post.title || post.title.trim() === '') {
    console.warn('[SafePostRender] Post missing title:', post);
    return false;
  }

  if (!post.type) {
    console.warn('[SafePostRender] Post missing type:', post);
    return false;
  }

  if (!post.id) {
    console.warn('[SafePostRender] Post missing id:', post);
    return false;
  }

  return true;
}

/**
 * Retorna um post "placeholder" seguro para evitar crashes
 */
export function getPlaceholderPost(): Partial<Post> {
  return {
    id: 'loading',
    title: 'Carregando...',
    type: 'AVISO',
    body: '',
    createdAt: new Date().toISOString(),
    status: 'PUBLISHED',
    audience: 'CLASS',
    authorName: '...',
    authorId: '',
    authorRole: 'professor',
  };
}

/**
 * Garante que um post é seguro para renderização
 */
export function safePost(post: any): Post {
  if (isPostSafe(post)) {
    return post;
  }
  console.error('[SafePostRender] Using placeholder for unsafe post:', post);
  return getPlaceholderPost() as Post;
}

/**
 * Verifica se um evento normalizado é seguro para renderização
 */
export function isEventSafe(event: any): event is NormalizedCalendarEvent {
  if (!event) {
    console.warn('[SafePostRender] Event is null or undefined');
    return false;
  }

  // Para NormalizedCalendarEvent, verificar meta
  if ('meta' in event) {
    if (!event.meta || !event.meta.title || !event.subtype) {
      console.warn('[SafePostRender] NormalizedCalendarEvent missing meta data:', event);
      return false;
    }
  }

  // Para CalendarEvent, verificar post
  if ('post' in event) {
    if (!event.post || !event.post.title || !event.post.type) {
      console.warn('[SafePostRender] CalendarEvent missing post data:', event);
      return false;
    }
  }

  return true;
}

/**
 * Retorna um evento placeholder seguro
 */
export function getPlaceholderEvent(): Partial<NormalizedCalendarEvent> {
  return {
    id: 'loading',
    postId: 'loading',
    type: 'deadline',
    subtype: 'AVISO',
    status: 'PUBLISHED',
    title: 'Carregando...',
    startDate: new Date(),
    endDate: new Date(),
    clickable: false,
    meta: {
      title: 'Carregando...',
      author: '...',
      audience: 'CLASS',
    }
  };
}

/**
 * Garante que um evento é seguro para renderização
 */
export function safeEvent(event: any): NormalizedCalendarEvent {
  if (isEventSafe(event)) {
    return event;
  }
  console.error('[SafePostRender] Using placeholder for unsafe event:', event);
  return getPlaceholderEvent() as NormalizedCalendarEvent;
}
