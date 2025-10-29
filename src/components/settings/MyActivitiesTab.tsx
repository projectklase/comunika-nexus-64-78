import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentClasses } from '@/hooks/useStudentClasses';
import { usePosts } from '@/hooks/usePosts';
import { PostCard } from '@/components/feed/PostCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, BookOpen } from 'lucide-react';

export function MyActivitiesTab() {
  const { user } = useAuth();
  const { classes, loading: loadingClasses } = useStudentClasses();
  const { posts, isLoading: loadingPosts } = usePosts();

  // Get list of class IDs for the student
  const studentClassIds = React.useMemo(() => {
    return classes.map(c => c.id);
  }, [classes]);

  // Filter activities targeted at student's classes
  const relevantActivities = React.useMemo(() => {
    if (!studentClassIds.length) return [];
    
    const activityTypes = ['ATIVIDADE', 'TRABALHO', 'PROVA'];
    
    return posts.filter(post => {
      // Must be an activity type
      if (!activityTypes.includes(post.type)) return false;
      
      // Must be targeted at classes (not global)
      if (post.audience !== 'CLASS') return false;
      
      // Must have classIds
      if (!post.classIds || post.classIds.length === 0) return false;
      
      // At least one of the post's target classes must match student's classes
      return post.classIds.some(targetId => studentClassIds.includes(targetId));
    });
  }, [posts, studentClassIds]);

  // Sort by due date (most recent first)
  const sortedActivities = React.useMemo(() => {
    return [...relevantActivities].sort((a, b) => {
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime();
    });
  }, [relevantActivities]);

  // Loading state
  if (loadingClasses || loadingPosts) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando atividades...</span>
      </div>
    );
  }

  // Empty state - no classes
  if (studentClassIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Você não está matriculado em nenhuma turma</h3>
        <p className="text-muted-foreground">
          Entre em contato com a secretaria para ser adicionado a uma turma.
        </p>
      </div>
    );
  }

  // Empty state - no activities
  if (sortedActivities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhuma atividade encontrada</h3>
        <p className="text-muted-foreground">
          Não há atividades publicadas para suas turmas no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Atividades das suas Turmas</h3>
          <p className="text-sm text-muted-foreground">
            {sortedActivities.length} {sortedActivities.length === 1 ? 'atividade encontrada' : 'atividades encontradas'}
          </p>
        </div>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-4 pr-4">
          {sortedActivities.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
