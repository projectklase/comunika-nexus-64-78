import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentClasses } from '@/hooks/useStudentClasses';
import { usePosts } from '@/hooks/usePosts';
import { PostCard } from '@/components/feed/PostCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

export function MinhasAtividadesPage() {
  const { user } = useAuth();
  const { classes, loading: classesLoading } = useStudentClasses();
  const { posts, isLoading: postsLoading } = usePosts();

  const studentClassIds = React.useMemo(() => {
    return classes.map((c) => c.id);
  }, [classes]);

  const relevantActivities = React.useMemo(() => {
    if (!studentClassIds.length) return [];
    return posts
      .filter((post) => {
        const isActivity = ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type);
        const isTargetedToStudent =
          post.audience === 'CLASS' &&
          post.classIds &&
          post.classIds.some((targetId) => studentClassIds.includes(targetId));
        return isActivity && isTargetedToStudent;
      })
      .sort((a, b) => {
        if (!a.dueAt) return 1;
        if (!b.dueAt) return -1;
        return new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime();
      });
  }, [posts, studentClassIds]);

  const isLoading = classesLoading || postsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (studentClassIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          Você ainda não está matriculado em nenhuma turma.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Entre em contato com a secretaria para mais informações.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="p-6 border-b border-border/50 glass">
        <h1 className="text-3xl font-bold gradient-text">Minhas Atividades</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Todas as atividades das suas turmas
        </p>
      </header>
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {relevantActivities.length > 0 ? (
            <div className="space-y-4">
              {relevantActivities.map((post) => (
                <PostCard post={post} key={post.id} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 p-8 text-center glass rounded-lg border border-border/50">
              <p className="text-lg font-medium text-muted-foreground">
                Nenhuma atividade encontrada.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Quando seus professores publicarem novas atividades, elas aparecerão aqui.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
