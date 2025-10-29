import { Post } from '@/types/post';
import { CalendarEvent } from '@/hooks/useCalendarData';
import { addHours } from 'date-fns';

export interface NormalizedCalendarEvent {
  id: string;
  postId: string;
  type: 'event' | 'deadline';
  subtype: string;
  status: string;
  title: string;
  startDate: Date;
  endDate: Date;
  clickable: boolean;
  classId?: string;
  classIds?: string[];
  meta: {
    title: string;
    author: string;
    attachments?: any[];
    weight?: number;
    body?: string;
    dueAt?: string;
    eventStartAt?: string;
    eventEndAt?: string;
    eventLocation?: string;
    audience: string;
    activityMeta?: any;
    allow_attachments?: boolean;
  };
}

export function buildCalendarEvent(post: Post, userRole?: string): NormalizedCalendarEvent | null {
  const baseEvent = {
    id: String(post.id),
    postId: String(post.id),
    status: post.status,
    title: post.title,
    classId: post.classId || post.classIds?.[0],
    classIds: post.classIds,
    meta: {
      title: post.title,
      author: post.authorName,
      attachments: post.attachments,
      weight: post.activityMeta?.peso,
      body: post.body,
      dueAt: post.dueAt,
      eventStartAt: post.eventStartAt,
      eventEndAt: post.eventEndAt,
      eventLocation: post.eventLocation,
      audience: post.audience,
      activityMeta: post.activityMeta,
      allow_attachments: post.allow_attachments,
    }
  };

  // CRITICAL RBAC: Exclude SCHEDULED posts for students
  if (userRole === 'aluno' && post.status === 'SCHEDULED') {
    return null;
  }

  // CRITICAL RBAC: Exclude DRAFT and ARCHIVED posts for students  
  if (userRole === 'aluno' && ['DRAFT', 'ARCHIVED'].includes(post.status)) {
    return null;
  }

  // Professor/Secretaria can see all posts, including SCHEDULED
  const clickable = ['professor', 'secretaria'].includes(userRole || '') || post.status === 'PUBLISHED';

  // Handle activity deadlines
  if (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type) && post.dueAt) {
    const dueDate = new Date(post.dueAt);
    return {
      ...baseEvent,
      type: 'deadline',
      subtype: post.type,
      startDate: dueDate,
      endDate: addHours(dueDate, 1), // +1h for rendering purposes
      clickable,
    };
  }

  // Handle EVENTO (events)
  if (post.type === 'EVENTO' && post.eventStartAt) {
    const startDate = new Date(post.eventStartAt);
    const endDate = post.eventEndAt ? new Date(post.eventEndAt) : addHours(startDate, 1);
    
    return {
      ...baseEvent,
      type: 'event',
      subtype: 'EVENTO',
      startDate,
      endDate,
      clickable,
    };
  }

  return null;
}

export function normalizeCalendarEvents(posts: Post[], userRole?: string): NormalizedCalendarEvent[] {
  return posts
    .map(post => buildCalendarEvent(post, userRole))
    .filter((event): event is NormalizedCalendarEvent => event !== null);
}