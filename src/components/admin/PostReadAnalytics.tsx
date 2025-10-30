import { usePostReadAnalytics } from '@/hooks/usePostReadAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, Eye, TrendingUp, AlertTriangle } from 'lucide-react';
import { TopPostsTable } from './TopPostsTable';
import { EngagementChart } from './EngagementChart';
import { TopReadersTable } from './TopReadersTable';

interface PostReadAnalyticsProps {
  daysFilter: number;
}

export function PostReadAnalytics({ daysFilter }: PostReadAnalyticsProps) {
  const { data, isLoading, error } = usePostReadAnalytics(daysFilter);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar analytics de engajamento. Tente novamente.
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertDescription>
          Sem dados de engajamento disponíveis para o período selecionado.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métricas Gerais */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Posts Publicados
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_posts_published}</div>
            <p className="text-xs text-muted-foreground">
              Últimos {daysFilter} dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Leituras
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_reads}</div>
            <p className="text-xs text-muted-foreground">
              Todas as leituras registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa Média de Leitura
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avg_read_rate}%</div>
            <p className="text-xs text-muted-foreground">
              {data.avg_read_rate >= 70 ? 'Excelente engajamento! 🎉' :
               data.avg_read_rate >= 40 ? 'Engajamento moderado' :
               'Engajamento baixo ⚠️'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Engajamento por Tipo */}
      <EngagementChart data={data.read_rate_by_type} />

      {/* Grid com 2 colunas */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Posts */}
        <TopPostsTable
          posts={data.top_posts}
          title="📊 Top 10 Posts Mais Lidos"
          emptyMessage="Nenhum post foi lido no período"
        />

        {/* Posts com Baixo Engajamento */}
        <TopPostsTable
          posts={data.posts_with_low_engagement}
          title="⚠️ Posts com Baixo Engajamento (<30%)"
          emptyMessage="Todos os posts têm bom engajamento!"
        />
      </div>

      {/* Top Leitores */}
      <TopReadersTable readers={data.top_readers} />
    </div>
  );
}
