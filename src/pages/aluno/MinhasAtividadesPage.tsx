import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentClasses } from '@/hooks/useStudentClasses';
import { usePosts } from '@/hooks/usePosts';
import { useStudentDeliveries } from '@/hooks/useStudentDeliveries';
import { PostCard } from '@/components/feed/PostCard';
import { ActivityFiltersBar } from '@/components/aluno/ActivityFiltersBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ClipboardList } from 'lucide-react';
import { DeliveryStatus } from '@/types/delivery';
import { ActivityType } from '@/types/post';

export function MinhasAtividadesPage() {
  const { user } = useAuth();
  const { classes, loading: classesLoading } = useStudentClasses();
  const { posts, isLoading: postsLoading } = usePosts();
  
  // Estados de filtro
  const [selectedStatus, setSelectedStatus] = useState<DeliveryStatus | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<ActivityType | 'ALL'>('ALL');

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

  // Buscar entregas do aluno
  const { activitiesWithDelivery, isLoading: deliveriesLoading, counters } = useStudentDeliveries(relevantActivities);

  // Filtrar atividades baseado nos filtros selecionados
  const filteredActivities = useMemo(() => {
    let filtered = activitiesWithDelivery;

    // Filtrar por status
    if (selectedStatus !== 'ALL') {
      filtered = filtered.filter(a => a.deliveryStatus === selectedStatus);
    }

    // Filtrar por tipo
    if (selectedType !== 'ALL') {
      filtered = filtered.filter(a => a.post.type === selectedType);
    }

    return filtered;
  }, [activitiesWithDelivery, selectedStatus, selectedType]);

  const isLoading = classesLoading || postsLoading || deliveriesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (studentClassIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 sm:p-8 text-center">
        <p className="text-base sm:text-lg font-medium text-muted-foreground">
          Você ainda não está matriculado em nenhuma turma.
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2">
          Entre em contato com a secretaria para mais informações.
        </p>
      </div>
    );
  }

  // Mensagens de estado vazio baseadas nos filtros ativos
  const getEmptyStateMessage = () => {
    if (selectedStatus !== 'ALL' && selectedType !== 'ALL') {
      return {
        title: 'Nenhuma atividade encontrada',
        description: 'Não há atividades que correspondam aos filtros selecionados.'
      };
    }
    
    if (selectedStatus === 'NAO_ENTREGUE') {
      return {
        title: 'Parabéns! 🎉',
        description: 'Você não tem atividades pendentes no momento.'
      };
    }
    
    if (selectedStatus === 'AGUARDANDO') {
      return {
        title: 'Nenhuma atividade em análise',
        description: 'Você não tem atividades aguardando correção no momento.'
      };
    }
    
    if (selectedStatus === 'APROVADA') {
      return {
        title: 'Nenhuma atividade aprovada ainda',
        description: 'Continue entregando suas atividades para receber aprovações.'
      };
    }
    
    if (selectedStatus === 'DEVOLVIDA') {
      return {
        title: 'Nenhuma atividade devolvida',
        description: 'Você não tem atividades que precisam ser refeitas.'
      };
    }

    return {
      title: 'Nenhuma atividade encontrada',
      description: 'Quando seus professores publicarem novas atividades, elas aparecerão aqui.'
    };
  };

  const emptyState = getEmptyStateMessage();

  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-x-hidden">
      {/* Header responsivo */}
      <header className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 border-b border-border/50 glass">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
            <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold gradient-text">Minhas Atividades</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Todas as atividades das suas turmas
            </p>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4 lg:space-y-6">
          {/* Barra de Filtros */}
          {relevantActivities.length > 0 && (
            <ActivityFiltersBar
              selectedStatus={selectedStatus}
              selectedType={selectedType}
              onStatusChange={setSelectedStatus}
              onTypeChange={setSelectedType}
              counters={counters}
            />
          )}

          {/* Lista de Atividades */}
          {filteredActivities.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {filteredActivities.map((activity) => (
                <PostCard post={activity.post} key={activity.post.id} />
              ))}
            </div>
          ) : relevantActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 sm:h-64 p-4 sm:p-8 text-center glass rounded-lg border border-border/50">
              <p className="text-base sm:text-lg font-medium text-muted-foreground">
                Nenhuma atividade encontrada.
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                Quando seus professores publicarem novas atividades, elas aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 sm:h-64 p-4 sm:p-8 text-center glass rounded-lg border border-border/50">
              <p className="text-base sm:text-lg font-medium text-muted-foreground">
                {emptyState.title}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                {emptyState.description}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
