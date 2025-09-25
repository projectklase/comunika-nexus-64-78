import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { PostType } from '@/types/post';
import { useProfessorMetrics } from '@/hooks/useProfessorMetrics';
import { postStore } from '@/stores/post-store';
import { format, isToday, isThisWeek, isWithinInterval, subDays } from 'date-fns';

export type ProfessorQuickFilter = 'all' | 'atividade' | 'trabalho' | 'prova' | 'eventos' | 'agendados';
export type ProfessorPeriodFilter = 'hoje' | 'semana' | 'mes' | 'custom';

export interface ProfessorFeedFilters {
  type: ProfessorQuickFilter;
  period: ProfessorPeriodFilter;
  classId: string;
  customRange?: {
    from: Date;
    to: Date;
  };
}

export interface ProfessorFeedMetrics {
  all: number;
  atividade: number;
  trabalho: number;
  prova: number;
  eventos: number;
  agendados: number;
}

const DEFAULT_FILTERS: ProfessorFeedFilters = {
  type: 'all',
  period: 'semana',
  classId: 'ALL'
};

export function useProfessorFeedFilters() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const metrics = useProfessorMetrics();
  
  const [filters, setFilters] = useState<ProfessorFeedFilters>(DEFAULT_FILTERS);
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false);

  const STORAGE_KEY = `profFeedFilters_v1_${user?.id}`;

  // Load filters from URL params, then localStorage, then defaults
  useEffect(() => {
    const urlType = searchParams.get('type') as ProfessorQuickFilter;
    const urlPeriod = searchParams.get('period') as ProfessorPeriodFilter;
    const urlClass = searchParams.get('class');
    const urlFrom = searchParams.get('from');
    const urlTo = searchParams.get('to');

    // URL takes precedence
    if (urlType || urlPeriod || urlClass || (urlFrom && urlTo)) {
      const urlFilters: ProfessorFeedFilters = {
        type: urlType || DEFAULT_FILTERS.type,
        period: urlPeriod || DEFAULT_FILTERS.period,
        classId: urlClass || DEFAULT_FILTERS.classId,
        customRange: (urlFrom && urlTo) ? {
          from: new Date(urlFrom),
          to: new Date(urlTo)
        } : undefined
      };
      
      setFilters(urlFilters);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(urlFilters));
      return;
    }

    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFilters({ ...DEFAULT_FILTERS, ...parsed });
        return;
      }
    } catch (error) {
      console.warn('Error loading professor feed filters:', error);
    }

    // Use defaults
    setFilters(DEFAULT_FILTERS);
  }, [user?.id, searchParams]);

  // Sync URL with filters (with debounce to avoid excessive updates)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const newParams = new URLSearchParams();
      
      if (filters.type !== DEFAULT_FILTERS.type) {
        newParams.set('type', filters.type);
      }
      
      if (filters.period !== DEFAULT_FILTERS.period) {
        newParams.set('period', filters.period);
      }
      
      if (filters.classId !== DEFAULT_FILTERS.classId) {
        newParams.set('class', filters.classId);
      }
      
      if (filters.customRange) {
        newParams.set('from', format(filters.customRange.from, 'yyyy-MM-dd'));
        newParams.set('to', format(filters.customRange.to, 'yyyy-MM-dd'));
      }

      const currentSearch = searchParams.toString();
      const newSearch = newParams.toString();
      
      if (currentSearch !== newSearch) {
        setSearchParams(newParams, { replace: true });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters, setSearchParams]);

  // Save to localStorage when filters change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters, STORAGE_KEY]);

  // Get filtered posts with memoization
  const filteredPosts = useMemo(() => {
    if (!user || !metrics) return [];

    const professorClassIds = metrics.professorClasses.map(c => c.id);
    let posts = postStore.list({});

    // Filter by type
    if (filters.type === 'agendados') {
      posts = posts.filter(post => 
        post.status === 'SCHEDULED' && 
        post.authorName === user.name &&
        post.publishAt &&
        new Date(post.publishAt) >= new Date()
      );
    } else if (filters.type === 'eventos') {
      posts = posts.filter(post => 
        ['EVENTO', 'COMUNICADO', 'AVISO'].includes(post.type) &&
        (post.audience === 'GLOBAL' || 
         (post.audience === 'CLASS' && post.classIds?.some(id => professorClassIds.includes(id))))
      );
    } else if (filters.type !== 'all') {
      const typeMap: Record<string, PostType> = {
        atividade: 'ATIVIDADE',
        trabalho: 'TRABALHO', 
        prova: 'PROVA'
      };
      
      posts = posts.filter(post => 
        post.type === typeMap[filters.type] && 
        post.authorName === user.name
      );
    } else {
      // Show all relevant posts (professor's activities + secretaria events)
      posts = posts.filter(post => {
        // Professor's own activities
        if (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type) && post.authorName === user.name) {
          return true;
        }
        
        // Relevant secretaria events
        if (['EVENTO', 'COMUNICADO', 'AVISO'].includes(post.type)) {
          return post.audience === 'GLOBAL' || 
                 (post.audience === 'CLASS' && post.classIds?.some(id => professorClassIds.includes(id)));
        }
        
        return false;
      });
    }

    // Filter by class
    if (filters.classId !== 'ALL') {
      posts = posts.filter(post => 
        post.audience === 'CLASS' && post.classIds?.includes(filters.classId)
      );
    }

    // Filter by period
    if (filters.period !== 'custom') {
      posts = posts.filter(post => {
        const postDate = new Date(post.createdAt);
        
        switch (filters.period) {
          case 'hoje':
            return isToday(postDate);
          case 'semana':
            return isThisWeek(postDate, { weekStartsOn: 0 });
          case 'mes':
            const monthAgo = subDays(new Date(), 30);
            return postDate >= monthAgo;
          default:
            return true;
        }
      });
    } else if (filters.customRange) {
      posts = posts.filter(post => {
        const postDate = new Date(post.createdAt);
        return isWithinInterval(postDate, {
          start: filters.customRange!.from,
          end: filters.customRange!.to
        });
      });
    }

    return posts;
  }, [user, metrics, filters]);

  // Calculate metrics from filtered data
  const feedMetrics = useMemo((): ProfessorFeedMetrics => {
    if (!user || !metrics) {
      return { all: 0, atividade: 0, trabalho: 0, prova: 0, eventos: 0, agendados: 0 };
    }

    const professorClassIds = metrics.professorClasses.map(c => c.id);
    const allPosts = postStore.list({});
    
    // Apply same class and period filters as main filter
    let basePosts = allPosts;
    
    if (filters.classId !== 'ALL') {
      basePosts = basePosts.filter(post => 
        post.audience === 'CLASS' && post.classIds?.includes(filters.classId)
      );
    }

    if (filters.period !== 'custom') {
      basePosts = basePosts.filter(post => {
        const postDate = new Date(post.createdAt);
        
        switch (filters.period) {
          case 'hoje':
            return isToday(postDate);
          case 'semana':
            return isThisWeek(postDate, { weekStartsOn: 0 });
          case 'mes':
            const monthAgo = subDays(new Date(), 30);
            return postDate >= monthAgo;
          default:
            return true;
        }
      });
    } else if (filters.customRange) {
      basePosts = basePosts.filter(post => {
        const postDate = new Date(post.createdAt);
        return isWithinInterval(postDate, {
          start: filters.customRange!.from,
          end: filters.customRange!.to
        });
      });
    }

    // Count by type
    const atividade = basePosts.filter(p => p.type === 'ATIVIDADE' && p.authorName === user.name).length;
    const trabalho = basePosts.filter(p => p.type === 'TRABALHO' && p.authorName === user.name).length;
    const prova = basePosts.filter(p => p.type === 'PROVA' && p.authorName === user.name).length;
    
    const eventos = basePosts.filter(p => 
      ['EVENTO', 'COMUNICADO', 'AVISO'].includes(p.type) &&
      (p.audience === 'GLOBAL' || 
       (p.audience === 'CLASS' && p.classIds?.some(id => professorClassIds.includes(id))))
    ).length;
    
    const agendados = basePosts.filter(p => 
      p.status === 'SCHEDULED' && 
      p.authorName === user.name &&
      p.publishAt &&
      new Date(p.publishAt) >= new Date()
    ).length;

    const all = atividade + trabalho + prova + eventos;

    return { all, atividade, trabalho, prova, eventos, agendados };
  }, [user, metrics, filters]);

  const updateFilters = (updates: Partial<ProfessorFeedFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    localStorage.removeItem(STORAGE_KEY);
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters = () => {
    return filters.type !== DEFAULT_FILTERS.type || 
           filters.period !== DEFAULT_FILTERS.period || 
           filters.classId !== DEFAULT_FILTERS.classId ||
           !!filters.customRange;
  };

  const applyCustomRange = (from: Date, to: Date) => {
    updateFilters({
      period: 'custom',
      customRange: { from, to }
    });
    setIsCustomRangeOpen(false);
  };

  return {
    filters,
    filteredPosts,
    feedMetrics,
    updateFilters,
    clearFilters,
    hasActiveFilters: hasActiveFilters(),
    isCustomRangeOpen,
    setIsCustomRangeOpen,
    applyCustomRange,
    professorClasses: metrics?.professorClasses || []
  };
}