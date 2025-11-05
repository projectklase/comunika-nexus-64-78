import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePostReadAnalytics } from '@/hooks/usePostReadAnalytics';
import { MetricCard } from './MetricCard';
import { PostEngagementCard } from './PostEngagementCard';
import { BookOpen, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface PostEngagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  daysFilter: number;
}

const CHART_COLORS = ['#22c55e', '#3b82f6', '#f97316', '#ef4444', '#8b5cf6', '#ec4899'];

export function PostEngagementModal({ open, onOpenChange, daysFilter }: PostEngagementModalProps) {
  const { data, isLoading } = usePostReadAnalytics(daysFilter);

  const totalStudents = useMemo(() => {
    if (!data?.top_readers || data.top_readers.length === 0) return 100;
    return Math.max(...data.top_readers.map(r => r.total_reads)) || 100;
  }, [data]);

  const chartData = useMemo(() => {
    if (!data?.read_rate_by_type) return [];
    return data.read_rate_by_type.map(item => ({
      name: item.post_type,
      value: item.avg_read_rate,
      posts: item.total_posts,
      reads: item.total_reads,
    }));
  }, [data]);

  const getStatus = (rate: number): 'success' | 'warning' | 'critical' => {
    if (rate >= 70) return 'success';
    if (rate >= 40) return 'warning';
    return 'critical';
  };

  const getReaderBadge = (totalReads: number) => {
    if (totalReads >= 50) return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">⭐ Super Leitor</Badge>;
    if (totalReads >= 20) return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">📖 Leitor Ativo</Badge>;
    return <Badge variant="secondary">📚 Iniciante</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            📚 Análise de Engajamento com Posts
          </DialogTitle>
          <DialogDescription>
            Métricas de leitura e interação dos alunos nos últimos {daysFilter} dias
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="posts">Por Post</TabsTrigger>
              <TabsTrigger value="students">Por Aluno</TabsTrigger>
              <TabsTrigger value="category">Por Categoria</TabsTrigger>
            </TabsList>

            {/* TAB 1: Visão Geral */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Posts Publicados"
                  value={data?.total_posts_published || 0}
                  icon={BookOpen}
                  tooltip="Total de posts publicados no período selecionado"
                  status="neutral"
                />
                <MetricCard
                  title="Taxa Média Leitura"
                  value={`${data?.avg_read_rate || 0}%`}
                  icon={TrendingUp}
                  tooltip="Percentual médio de alunos que leem os posts publicados"
                  status={getStatus(data?.avg_read_rate || 0)}
                />
                <MetricCard
                  title="Total de Leituras"
                  value={data?.total_reads || 0}
                  icon={Clock}
                  tooltip="Número total de leituras realizadas por todos os alunos"
                  status="neutral"
                />
                <MetricCard
                  title="Posts c/ Baixo Engajamento"
                  value={data?.posts_with_low_engagement?.length || 0}
                  icon={AlertCircle}
                  tooltip="Posts com taxa de leitura abaixo de 50%"
                  status={data?.posts_with_low_engagement && data.posts_with_low_engagement.length > 10 ? 'critical' : 'warning'}
                />
              </div>

              {/* Gráfico de Pizza */}
              <Card className="glassmorphism">
                <CardHeader>
                  <CardTitle>Distribuição de Leitura por Tipo de Post</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
                labelStyle={{
                  color: 'hsl(var(--foreground))',
                }}
                itemStyle={{
                  color: 'hsl(var(--foreground))',
                }}
                formatter={(value: any, name: any, props: any) => [
                  `${value}% (${props.payload.posts} posts, ${props.payload.reads} leituras)`,
                  'Taxa de Leitura'
                ]}
              />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: Por Post */}
            <TabsContent value="posts" className="space-y-4">
              <div className="grid gap-4">
                {data?.top_posts && data.top_posts.length > 0 ? (
                  data.top_posts.map(post => (
                    <PostEngagementCard
                      key={post.post_id}
                      post={post}
                      totalStudents={totalStudents}
                    />
                  ))
                ) : (
                  <Card className="glassmorphism">
                    <CardContent className="py-12 text-center text-muted-foreground">
                      Nenhum post encontrado no período selecionado
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* TAB 3: Por Aluno */}
            <TabsContent value="students">
              <Card className="glassmorphism">
                <CardHeader>
                  <CardTitle>Ranking de Alunos Mais Engajados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Turma</TableHead>
                          <TableHead className="text-center">Leituras</TableHead>
                          <TableHead className="text-center">Engajamento</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data?.top_readers && data.top_readers.length > 0 ? (
                          data.top_readers.map((reader, index) => (
                            <TableRow key={reader.student_id} className="hover:bg-muted/50 transition-colors">
                              <TableCell>
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs bg-primary/20 text-primary">
                                    {reader.student_name?.charAt(0) || 'A'}
                                  </AvatarFallback>
                                </Avatar>
                              </TableCell>
                              <TableCell className="font-semibold">{reader.student_name}</TableCell>
                              <TableCell className="text-muted-foreground">{reader.class_name || 'N/A'}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="font-mono">
                                  {reader.total_reads}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Progresso</span>
                                    <span className="font-mono">
                                      {Math.min(100, Math.round((reader.total_reads / totalStudents) * 100))}%
                                    </span>
                                  </div>
                                  <Progress
                                    value={Math.min(100, (reader.total_reads / totalStudents) * 100)}
                                    className="h-2"
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {getReaderBadge(reader.total_reads)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                              Nenhum dado de leitura encontrado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: Por Categoria */}
            <TabsContent value="category">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data?.read_rate_by_type && data.read_rate_by_type.length > 0 ? (
                  data.read_rate_by_type.map((type, index) => (
                    <Card key={type.post_type} className="glassmorphism">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          {type.post_type}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                          {type.avg_read_rate}%
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {type.total_posts} posts • {type.total_reads} leituras
                        </p>
                        <Progress value={type.avg_read_rate} className="h-2" />
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="glassmorphism col-span-full">
                    <CardContent className="py-12 text-center text-muted-foreground">
                      Nenhuma categoria encontrada
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
