import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { PostType, Post } from '@/types/post';
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

  const STORAGE_KEY = `profFeedFilters_v1_${user?.id}`;

  // Load posts from Supabase
  useEffect(() => {
    const loadPosts = async () => {
      setIsLoadingPosts(true);
      try {
        const allPosts = await postStore.list({});
        setPosts(allPosts);
      } catch (error) {
        console.error('Error loading posts:', error);
      } finally {
        setIsLoadingPosts(false);
      }
    };
    loadPosts();
  }, []);

  // Load filters from URL params, then localStorage, then defaults
  useEffect(() => {
    const urlType = searchParams.get('type') as ProfessorQuickFilter;
    const urlPeriod = searchParams.get('period') as ProfessorPeriodFilter;
    const urlClassId = searchParams.get('classId');

    if (urlType || urlPeriod || urlClassId) {
      setFilters({
        type: urlType || DEFAULT_FILTERS.type,
        period: urlPeriod || DEFAULT_FILTERS.period,
        classId: urlClassId || DEFAULT_FILTERS.classId
      });
    } else {
      // Try localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setFilters(parsed);
        } catch (e) {
          console.warn('Failed to parse stored filters:', e);
        }
      }
    }
  }, [searchParams, STORAGE_KEY]);

  // Save to localStorage when filters change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters, STORAGE_KEY]);

  // Get filtered posts with memoization
  const filteredPosts = useMemo(() => {
    if (!user || !metrics || isLoadingPosts) return [];

    const professorClassIds = metrics.professorClasses.map(c => c.id);
    let filteredResults = [...posts];

    // Filter by type
    if (filters.type === 'agendados') {
      filteredResults = filteredResults.filter(post => 
        post.status === 'SCHEDULED' && 
        post.authorName === user.name &&
        post.publishAt &&
        new Date(post.publishAt) >= new Date()
      );
    } else if (filters.type === 'eventos') {
      filteredResults = filteredResults.filter(post => 
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
      
      filteredResults = filteredResults.filter(post => 
        post.type === typeMap[filters.type] && 
        post.authorName === user.name
      );
    } else {
      // Show all relevant posts (professor's activities + secretaria events)
      filteredResults = filteredResults.filter(post => {
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
      filteredResults = filteredResults.filter(post => 
        post.audience === 'CLASS' && post.classIds?.includes(filters.classId)
      );
    }

    // Filter by period
    const today = new Date();
    if (filters.period === 'hoje') {
      filteredResults = filteredResults.filter(post => {
        const postDate = post.dueAt || post.eventStartAt || post.createdAt;
        return postDate && isToday(new Date(postDate));
      });
    } else if (filters.period === 'semana') {
      filteredResults = filteredResults.filter(post => {
        const postDate = post.dueAt || post.eventStartAt || post.createdAt;
        return postDate && isThisWeek(new Date(postDate), { weekStartsOn: 1 });
      });
    } else if (filters.period === 'mes') {
      const monthAgo = subDays(today, 30);
      filteredResults = filteredResults.filter(post => {
        const postDate = post.dueAt || post.eventStartAt || post.createdAt;
        return postDate && isWithinInterval(new Date(postDate), { start: monthAgo, end: today });
      });
    } else if (filters.period === 'custom' && filters.customRange) {
      filteredResults = filteredResults.filter(post => {
        const postDate = post.dueAt || post.eventStartAt || post.createdAt;
        return postDate && isWithinInterval(new Date(postDate), {
          start: filters.customRange!.from,
          end: filters.customRange!.to
        });
      });
    }

    // Sort by date (most recent first)
    return filteredResults.sort((a, b) => {
      const dateA = a.dueAt || a.eventStartAt || a.createdAt;
      const dateB = b.dueAt || b.eventStartAt || b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [user, metrics, posts, filters, isLoadingPosts]);

  // Calculate metrics based on current posts
  const filterMetrics: ProfessorFeedMetrics = useMemo(() => {
    if (!user || !metrics || isLoadingPosts) return {
      all: 0,
      atividade: 0,
      trabalho: 0,
      prova: 0,
      eventos: 0,
      agendados: 0
    };

    const professorClassIds = metrics.professorClasses.map(c => c.id);

    // All posts
    const allPosts = posts.filter(post => {
      if (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type) && post.authorName === user.name) {
        return true;
      }
      if (['EVENTO', 'COMUNICADO', 'AVISO'].includes(post.type)) {
        return post.audience === 'GLOBAL' || 
               (post.audience === 'CLASS' && post.classIds?.some(id => professorClassIds.includes(id)));
      }
      return false;
    });

    // Filter by period (applies to all counts)
    let periodFilteredPosts = allPosts;
    const today = new Date();
    if (filters.period === 'hoje') {
      periodFilteredPosts = periodFilteredPosts.filter(post => {
        const postDate = post.dueAt || post.eventStartAt || post.createdAt;
        return postDate && isToday(new Date(postDate));
      });
    } else if (filters.period === 'semana') {
      periodFilteredPosts = periodFilteredPosts.filter(post => {
        const postDate = post.dueAt || post.eventStartAt || post.createdAt;
        return postDate && isThisWeek(new Date(postDate), { weekStartsOn: 1 });
      });
    } else if (filters.period === 'mes') {
      const monthAgo = subDays(today, 30);
      periodFilteredPosts = periodFilteredPosts.filter(post => {
        const postDate = post.dueAt || post.eventStartAt || post.createdAt;
        return postDate && isWithinInterval(new Date(postDate), { start: monthAgo, end: today });
      });
    } else if (filters.period === 'custom' && filters.customRange) {
      periodFilteredPosts = periodFilteredPosts.filter(post => {
        const postDate = post.dueAt || post.eventStartAt || post.createdAt;
        return postDate && isWithinInterval(new Date(postDate), {
          start: filters.customRange!.from,
          end: filters.customRange!.to
        });
      });
    }

    // Apply class filter if set
    if (filters.classId !== 'ALL') {
      periodFilteredPosts = periodFilteredPosts.filter(post => 
        post.audience === 'CLASS' && post.classIds?.includes(filters.classId)
      );
    }

    return {
      all: periodFilteredPosts.length,
      atividade: periodFilteredPosts.filter(p => p.type === 'ATIVIDADE' && p.authorName === user.name).length,
      trabalho: periodFilteredPosts.filter(p => p.type === 'TRABALHO' && p.authorName === user.name).length,
      prova: periodFilteredPosts.filter(p => p.type === 'PROVA' && p.authorName === user.name).length,
      eventos: periodFilteredPosts.filter(p => ['EVENTO', 'COMUNICADO', 'AVISO'].includes(p.type)).length,
      agendados: posts.filter(p => 
        p.status === 'SCHEDULED' && 
        p.authorName === user.name &&
        p.publishAt &&
        new Date(p.publishAt) >= new Date()
      ).length
    };
  }, [user, metrics, posts, filters, isLoadingPosts]);

  const handleFilterChange = (newFilters: Partial<ProfessorFeedFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    
    // Update URL params
    const params = new URLSearchParams(searchParams);
    if (newFilters.type) params.set('type', newFilters.type);
    if (newFilters.period) params.set('period', newFilters.period);
    if (newFilters.classId) params.set('classId', newFilters.classId);
    setSearchParams(params);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchParams({});
  };

  const hasActiveFilters = () => {
    return filters.type !== DEFAULT_FILTERS.type || 
           filters.period !== DEFAULT_FILTERS.period || 
           filters.classId !== DEFAULT_FILTERS.classId;
  };

  const applyCustomRange = (from: Date, to: Date) => {
    handleFilterChange({
      period: 'custom',
      customRange: { from, to }
    });
    setIsCustomRangeOpen(false);
  };

  return {
    filters,
    setFilters: handleFilterChange,
    updateFilters: handleFilterChange,
    clearFilters,
    hasActiveFilters: hasActiveFilters(),
    filteredPosts,
    feedMetrics: filterMetrics,
    metrics: filterMetrics,
    isCustomRangeOpen,
    setIsCustomRangeOpen,
    applyCustomRange,
    professorClasses: metrics?.professorClasses || [],
    isLoading: isLoadingPosts
  };
}
