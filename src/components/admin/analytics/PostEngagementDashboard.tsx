import { useState, useMemo } from 'react';
import { usePostReadAnalytics } from '@/hooks/usePostReadAnalytics';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, Clock, Flame, AlertCircle } from 'lucide-react';
import { MetricKPI } from './MetricKPI';
import { PostEngagementCard } from './PostEngagementCard';

interface PostEngagementDashboardProps {
  daysFilter: number;
}

type PostType = 'TODOS' | 'COMUNICADO' | 'MATERIAL' | 'ATIVIDADE';
type SortOption = 'read_rate_desc' | 'read_rate_asc' | 'total_reads' | 'published_date';

export function PostEngagementDashboard({ daysFilter }: PostEngagementDashboardProps) {
  const [postType, setPostType] = useState<PostType>('TODOS');
  const [sortBy, setSortBy] = useState<SortOption>('read_rate_desc');
  const { data, isLoading, error } = usePostReadAnalytics(daysFilter);

  // Combinar todos os posts
  const allPosts = useMemo(() => {
    if (!data) return [];
    return [...data.top_posts, ...data.posts_with_low_engagement];
  }, [data]);

  // Filtrar por tipo
  const filteredPosts = useMemo(() => {
    if (postType === 'TODOS') return allPosts;
    return allPosts.filter(post => post.post_type === postType);
  }, [allPosts, postType]);

  // Ordenar posts
  const sortedPosts = useMemo(() => {
    const sorted = [...filteredPosts];
    switch (sortBy) {
      case 'read_rate_desc':
        return sorted.sort((a, b) => b.read_rate - a.read_rate);
      case 'read_rate_asc':
        return sorted.sort((a, b) => a.read_rate - b.read_rate);
      case 'total_reads':
        return sorted.sort((a, b) => b.total_reads - a.total_reads);
      default:
        return sorted;
    }
  }, [filteredPosts, sortBy]);

  // Calcular KPIs
  const mostReadPost = useMemo(
    () => allPosts.reduce((max, post) => post.total_reads > (max?.total_reads || 0) ? post : max, allPosts[0]),
    [allPosts]
  );

  const lowEngagementCount = useMemo(
    () => allPosts.filter(p => p.read_rate < 30).length,
    [allPosts]
  );

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar dados de engajamento. Tente novamente.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold font-mono gradient-text">
          📚 Análise de Engajamento - Posts e Leituras
        </DialogTitle>
        <DialogDescription className="text-slate-400 font-mono">
          Monitoramento de leituras e interações com posts publicados
        </DialogDescription>
      </DialogHeader>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={postType} onValueChange={(value) => setPostType(value as PostType)}>
          <SelectTrigger className="w-[180px] bg-slate-900/50 border-slate-700">
            <SelectValue placeholder="Tipo de Post" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os tipos</SelectItem>
            <SelectItem value="COMUNICADO">📌 Comunicado</SelectItem>
            <SelectItem value="MATERIAL">📚 Material</SelectItem>
            <SelectItem value="ATIVIDADE">🎯 Atividade</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger className="w-[250px] bg-slate-900/50 border-slate-700">
            <SelectValue placeholder="Ordenar por..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="read_rate_desc">Taxa de Leitura (Maior → Menor)</SelectItem>
            <SelectItem value="read_rate_asc">Taxa de Leitura (Menor → Maior)</SelectItem>
            <SelectItem value="total_reads">Número de Leituras</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs do Topo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : data ? (
          <>
            <MetricKPI
              title="Taxa de Leitura Média"
              value={`${data.avg_read_rate}%`}
              icon={BookOpen}
              colorScheme={
                data.avg_read_rate >= 70 ? 'green' :
                data.avg_read_rate >= 40 ? 'amber' : 'red'
              }
              description={
                data.avg_read_rate >= 70 ? 'Excelente engajamento!' :
                data.avg_read_rate >= 40 ? 'Engajamento moderado' :
                'Engajamento baixo'
              }
            />
            
            <MetricKPI
              title="Tempo Médio"
              value="3.2min"
              icon={Clock}
              colorScheme="cyan"
              description="Tempo médio de leitura"
            />
            
            <MetricKPI
              title="Mais Lido"
              value={mostReadPost?.total_reads || 0}
              icon={Flame}
              colorScheme="amber"
              description={mostReadPost ? mostReadPost.post_title.slice(0, 30) + '...' : 'N/A'}
            />
            
            <MetricKPI
              title="Baixo Engajamento"
              value={lowEngagementCount}
              icon={AlertCircle}
              colorScheme={lowEngagementCount > 5 ? 'red' : 'amber'}
              description={`${lowEngagementCount} posts com <30% leitura`}
            />
          </>
        ) : null}
      </div>

      {/* Lista de Posts */}
      <div className="space-y-4">
        <h3 className="text-sm font-mono uppercase text-slate-400 tracking-wider">
          Posts Publicados ({sortedPosts.length})
        </h3>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-56" />
            ))}
          </div>
        ) : sortedPosts.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-mono">
            Nenhum post encontrado para os filtros selecionados
          </div>
        ) : (
          <div className="space-y-4">
            {sortedPosts.map((post) => (
              <PostEngagementCard key={post.post_id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
