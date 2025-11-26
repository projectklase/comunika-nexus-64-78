import { Post } from '@/types/post';
import { startOfDay, isAfter, isBefore, addDays, isToday as dateIsToday } from 'date-fns';

/**
 * Smart post filtering utilities
 * Filters out expired/past posts intelligently based on type and context
 */
export class SmartPostFilters {
  
  /**
   * Check if a post is considered expired/past and should be filtered out
   */
  static isExpiredPost(post: Post): boolean {
    const now = new Date();
    const today = startOfDay(now);
    
    switch (post.type) {
      case 'EVENTO':
        // Events are expired if they've ended
        if (post.eventEndAt) {
          return isBefore(new Date(post.eventEndAt), now);
        }
        // If no end time, use start time
        if (post.eventStartAt) {
          return isBefore(new Date(post.eventStartAt), now);
        }
        // Events without dates expire after 7 days
        const eventAge = (now.getTime() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return eventAge > 7;
        
      case 'ATIVIDADE':
      case 'TRABALHO':
      case 'PROVA':
        // Activities are expired if due date has passed
        if (post.dueAt) {
          return isBefore(new Date(post.dueAt), now);
        }
        // Activities without due date expire after 14 days
        const activityAge = (now.getTime() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return activityAge > 14;
        
      case 'AVISO':
      case 'COMUNICADO':
        // Announcements expire after 30 days to keep feed clean
        const createdDate = new Date(post.createdAt);
        const expiryDate = addDays(createdDate, 30);
        return isBefore(expiryDate, now);
    }
    
    return false;
  }
  
  /**
   * Filter posts to show only relevant (non-expired) ones
   */
  static filterRelevantPosts(posts: Post[]): Post[] {
    return posts.filter(post => {
      // Always show scheduled posts
      if (post.status === 'SCHEDULED') return true;
      
      // Always show archived posts if explicitly requested
      if (post.status === 'ARCHIVED') return false;
      
      // Apply smart expiry filter
      return !this.isExpiredPost(post);
    });
  }
  
  /**
   * Get upcoming posts (next 7 days)
   */
  static getUpcomingPosts(posts: Post[], days: number = 7): Post[] {
    const now = new Date();
    const futureLimit = addDays(now, days);
    
    return posts.filter(post => {
      let targetDate: Date | null = null;
      
      switch (post.type) {
        case 'EVENTO':
          targetDate = post.eventStartAt ? new Date(post.eventStartAt) : null;
          break;
        case 'ATIVIDADE':
        case 'TRABALHO':
        case 'PROVA':
          targetDate = post.dueAt ? new Date(post.dueAt) : null;
          break;
      }
      
      if (!targetDate) return false;
      
      return isAfter(targetDate, now) && isBefore(targetDate, futureLimit);
    });
  }
  
  /**
   * Get posts due today
   */
  static getTodaysPosts(posts: Post[]): Post[] {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    
    return posts.filter(post => {
      let targetDate: Date | null = null;
      
      switch (post.type) {
        case 'EVENTO':
          targetDate = post.eventStartAt ? new Date(post.eventStartAt) : null;
          break;
        case 'ATIVIDADE':
        case 'TRABALHO':
        case 'PROVA':
          targetDate = post.dueAt ? new Date(post.dueAt) : null;
          break;
      }
      
      if (!targetDate) return false;
      
      const targetDay = startOfDay(targetDate);
      return targetDay.getTime() === today.getTime();
    });
  }
  
  /**
   * Get priority posts (due soon or important)
   */
  static getPriorityPosts(posts: Post[]): Post[] {
    const now = new Date();
    const urgent = addDays(now, 2); // Next 2 days
    
    return posts.filter(post => {
      // High priority types
      if (post.type === 'PROVA') return true;
      
      // Activities/trabalhos due soon
      if ((post.type === 'ATIVIDADE' || post.type === 'TRABALHO') && post.dueAt) {
        return isBefore(new Date(post.dueAt), urgent);
      }
      
      // Events happening soon
      if (post.type === 'EVENTO' && post.eventStartAt) {
        return isBefore(new Date(post.eventStartAt), urgent);
      }
      
      return false;
    });
  }
  
  /**
   * Sort posts by temporal urgency (prioritizes time over type)
   * Priority order:
   * 1. Posts happening/due TODAY
   * 2. Posts URGENT (next 2 days)
   * 3. Posts UPCOMING (next 7 days)
   * 4. Posts FUTURE (by date, closest first)
   * 5. Posts without dates (by creation date, newest first)
   */
  static sortByUrgency(posts: Post[]): Post[] {
    const now = new Date();
    const today = startOfDay(now);
    const urgent = addDays(now, 2);
    const upcoming = addDays(now, 7);
    
    return [...posts].sort((a, b) => {
      // Get relevant dates
      const aDate = this.getPostDate(a);
      const bDate = this.getPostDate(b);
      
      // Check if posts are today
      const aIsToday = this.isPostToday(a);
      const bIsToday = this.isPostToday(b);
      
      // PRIORITY 1: Posts de HOJE (máxima prioridade)
      if (aIsToday && !bIsToday) return -1;
      if (!aIsToday && bIsToday) return 1;
      
      // Se ambos são de hoje, ordenar por tipo dentro de hoje
      if (aIsToday && bIsToday) {
        const priorityOrder = {
          PROVA: 100,
          ATIVIDADE: 80,
          TRABALHO: 80,
          EVENTO: 60,
          AVISO: 40,
          COMUNICADO: 40
        };
        
        const aPriority = priorityOrder[a.type] || 0;
        const bPriority = priorityOrder[b.type] || 0;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        // Mesmo tipo e mesmo dia: ordenar por hora
        if (aDate && bDate) {
          return aDate.getTime() - bDate.getTime();
        }
      }
      
      // PRIORITY 2: Posts URGENTES (próximos 2 dias)
      const aIsUrgent = aDate && isAfter(aDate, now) && isBefore(aDate, urgent);
      const bIsUrgent = bDate && isAfter(bDate, now) && isBefore(bDate, urgent);
      
      if (aIsUrgent && !bIsUrgent) return -1;
      if (!aIsUrgent && bIsUrgent) return 1;
      
      // Se ambos são urgentes, ordenar por data mais próxima
      if (aIsUrgent && bIsUrgent && aDate && bDate) {
        return aDate.getTime() - bDate.getTime();
      }
      
      // PRIORITY 3: Posts PRÓXIMOS (próximos 7 dias)
      const aIsUpcoming = aDate && isAfter(aDate, urgent) && isBefore(aDate, upcoming);
      const bIsUpcoming = bDate && isAfter(bDate, urgent) && isBefore(bDate, upcoming);
      
      if (aIsUpcoming && !bIsUpcoming) return -1;
      if (!aIsUpcoming && bIsUpcoming) return 1;
      
      // Se ambos são próximos, ordenar por tipo e depois data
      if (aIsUpcoming && bIsUpcoming) {
        // Provas têm prioridade mesmo dentro da janela de 7 dias
        if (a.type === 'PROVA' && b.type !== 'PROVA') return -1;
        if (a.type !== 'PROVA' && b.type === 'PROVA') return 1;
        
        // Ordenar por data
        if (aDate && bDate) {
          return aDate.getTime() - bDate.getTime();
        }
      }
      
      // PRIORITY 4: Posts FUTUROS (com data, mas não urgentes)
      if (aDate && bDate) {
        return aDate.getTime() - bDate.getTime();
      }
      
      // Um tem data, outro não: com data vem primeiro
      if (aDate && !bDate) return -1;
      if (!aDate && bDate) return 1;
      
      // PRIORITY 5: Posts SEM DATA - ordenar por criação (mais recente primeiro)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  /**
   * Sort posts chronologically with recency as primary factor
   * Perfect for administrative feeds where recent posts matter most
   * 
   * Priority:
   * 1. Posts created in last 24 hours (newest first)
   * 2. Urgent items due TODAY (provas, atividades, trabalhos)
   * 3. All other posts by creation date (newest first)
   */
  static sortChronologicalFirst(posts: Post[]): Post[] {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const today = startOfDay(now);
    const tomorrow = addDays(today, 1);

    return [...posts].sort((a, b) => {
      const aCreatedAt = new Date(a.createdAt);
      const bCreatedAt = new Date(b.createdAt);
      
      // Check if posts are from last 24 hours
      const aIsRecent = aCreatedAt >= last24h;
      const bIsRecent = bCreatedAt >= last24h;
      
      // PRIORITY 1: Recent posts (last 24h) - always first, newest first
      if (aIsRecent && !bIsRecent) return -1;
      if (!aIsRecent && bIsRecent) return 1;
      if (aIsRecent && bIsRecent) {
        return bCreatedAt.getTime() - aCreatedAt.getTime(); // newest first
      }
      
      // PRIORITY 2: Check for TODAY's urgent items
      const aDate = this.getPostDate(a);
      const bDate = this.getPostDate(b);
      
      const aIsToday = aDate && aDate >= today && aDate < tomorrow;
      const bIsToday = bDate && bDate >= today && bDate < tomorrow;
      
      // Urgent types due today
      const urgentTypes = ['PROVA', 'TRABALHO', 'ATIVIDADE'];
      const aIsUrgentToday = aIsToday && urgentTypes.includes(a.type);
      const bIsUrgentToday = bIsToday && urgentTypes.includes(b.type);
      
      if (aIsUrgentToday && !bIsUrgentToday) return -1;
      if (!aIsUrgentToday && bIsUrgentToday) return 1;
      
      // PRIORITY 3: All other posts by creation date (newest first)
      return bCreatedAt.getTime() - aCreatedAt.getTime();
    });
  }

  /**
   * Sort posts by relevance and urgency (legacy method)
   */
  static sortByRelevance(posts: Post[]): Post[] {
    return [...posts].sort((a, b) => {
      // PRIORIDADE MÁXIMA: Posts de HOJE
      const aIsToday = this.isPostToday(a);
      const bIsToday = this.isPostToday(b);
      
      if (aIsToday && !bIsToday) return -1;
      if (!aIsToday && bIsToday) return 1;

      // Priority order: PROVA > ATIVIDADE/TRABALHO > EVENTO > AVISO/COMUNICADO
      const priorityOrder = {
        PROVA: 100,
        ATIVIDADE: 80,
        TRABALHO: 80,
        EVENTO: 60,
        AVISO: 40,
        COMUNICADO: 40
      };
      
      const aPriority = priorityOrder[a.type] || 0;
      const bPriority = priorityOrder[b.type] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // For same priority, sort by urgency (closer dates first)
      const aDate = this.getPostDate(a);
      const bDate = this.getPostDate(b);
      
      if (aDate && bDate) {
        return aDate.getTime() - bDate.getTime();
      }
      
      if (aDate && !bDate) return -1;
      if (!aDate && bDate) return 1;
      
      // Finally, sort by creation date (newer first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }
  
  /**
   * Check if post is today
   */
  private static isPostToday(post: Post): boolean {
    let targetDate: Date | null = null;
    
    switch (post.type) {
      case 'EVENTO':
        targetDate = post.eventStartAt ? new Date(post.eventStartAt) : null;
        break;
      case 'ATIVIDADE':
      case 'TRABALHO':
      case 'PROVA':
        targetDate = post.dueAt ? new Date(post.dueAt) : null;
        break;
    }
    
    if (!targetDate) return false;
    
    return dateIsToday(targetDate);
  }
  
  /**
   * Get the most relevant date for a post
   */
  private static getPostDate(post: Post): Date | null {
    switch (post.type) {
      case 'EVENTO':
        return post.eventStartAt ? new Date(post.eventStartAt) : null;
      case 'ATIVIDADE':
      case 'TRABALHO':
      case 'PROVA':
        return post.dueAt ? new Date(post.dueAt) : null;
      default:
        return new Date(post.createdAt);
    }
  }
  
  /**
   * Get smart feed based on user context and preferences
   */
  static getSmartFeed(posts: Post[], options?: {
    includeExpired?: boolean;
    maxAge?: number; // days
    prioritizeUpcoming?: boolean;
  }): Post[] {
    let filteredPosts = [...posts];
    
    // Filter expired posts unless explicitly requested
    if (!options?.includeExpired) {
      filteredPosts = this.filterRelevantPosts(filteredPosts);
    }
    
    // Apply max age filter
    if (options?.maxAge) {
      const cutoffDate = addDays(new Date(), -options.maxAge);
      filteredPosts = filteredPosts.filter(post => 
        isAfter(new Date(post.createdAt), cutoffDate)
      );
    }
    
    // Sort by relevance
    if (options?.prioritizeUpcoming) {
      return this.sortByRelevance(filteredPosts);
    }
    
    return filteredPosts;
  }
}
