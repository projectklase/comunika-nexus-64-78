import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRewardsStore } from "@/stores/rewards-store";
import { useSchool } from "@/contexts/SchoolContext";
import { 
  calculateMonthlyDistribution,
  calculateTopItems,
  calculateKoinCirculation,
  calculateApprovalRates 
} from "@/utils/rewards-analytics";
import { 
  TrendingUp, 
  Coins, 
  ShoppingBag, 
  Trophy, 
  CheckCircle, 
  XCircle, 
  Clock,
  Users,
  Activity,
  Loader2,
  Info
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  CartesianGrid
} from "recharts";
import type { OperationalMetrics } from "@/hooks/useOperationalMetrics";

interface OperationalModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: OperationalMetrics | undefined;
}

interface StudentRanking {
  id: string;
  name: string;
  totalKoins: number;
  spentKoins: number;
  position: number;
}

interface DashboardData {
  // KPIs
  totalStudents: number;
  activeStudents: number;
  participationRate: number;
  totalDistributed: number;
  totalSpent: number;
  inCirculation: number;
  circulationVelocity: number;
  totalRedemptions: number;
  conversionRate: number;
  avgRedemptionValue: number;
  approvalRate: number;
  avgProcessingTime: number;
  
  // Rankings
  topStudents: StudentRanking[];
  topItems: Array<{ itemName: string; redemptionCount: number; totalKoins: number }>;
  
  // Timeline
  monthlyData: Array<{ month: string; earned: number; spent: number }>;
  
  // Status
  pendingRedemptions: number;
  approvedRedemptions: number;
  rejectedRedemptions: number;
}

export function OperationalModal({ isOpen, onClose, data }: OperationalModalProps) {
  const { currentSchool } = useSchool();
  const { transactions, loadAllTransactions } = useRewardsStore();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && currentSchool) {
      loadDashboardData();
    }
  }, [isOpen, currentSchool]);

  const loadDashboardData = async () => {
    if (!currentSchool) return;
    
    setIsLoading(true);
    try {
      // Carregar transações da escola
      await loadAllTransactions();
      
      // Buscar todos os alunos da escola via school_memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from('school_memberships')
        .select('user_id')
        .eq('school_id', currentSchool.id)
        .eq('role', 'aluno');

      if (membershipsError) throw membershipsError;

      const studentIds = memberships?.map(m => m.user_id) || [];

      if (studentIds.length === 0) {
        setDashboardData({
          totalStudents: 0,
          activeStudents: 0,
          participationRate: 0,
          totalDistributed: 0,
          totalSpent: 0,
          inCirculation: 0,
          circulationVelocity: 0,
          totalRedemptions: 0,
          conversionRate: 0,
          avgRedemptionValue: 0,
          approvalRate: 0,
          avgProcessingTime: 0,
          topStudents: [],
          topItems: [],
          monthlyData: [],
          pendingRedemptions: 0,
          approvedRedemptions: 0,
          rejectedRedemptions: 0,
        });
        setIsLoading(false);
        return;
      }

      // Buscar perfis dos alunos
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('id, name, koins')
        .in('id', studentIds);

      if (studentsError) throw studentsError;

      // Filtrar transações da escola (via studentIds)
      const schoolTransactions = transactions.filter(t => studentIds.includes(t.studentId));

      // Calcular métricas
      const metrics = calculateDashboardMetrics(students || [], schoolTransactions);
      
      setDashboardData(metrics);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDashboardMetrics = (students: any[], schoolTransactions: any[]): DashboardData => {
    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.koins > 0).length;
    const participationRate = totalStudents > 0 ? (activeStudents / totalStudents) * 100 : 0;

    // Economia de Koins
    const { totalDistributed, totalSpent, inCirculation } = calculateKoinCirculation(schoolTransactions);
    const circulationVelocity = totalDistributed > 0 ? (totalSpent / totalDistributed) * 100 : 0;

    // Resgates
    const redemptions = schoolTransactions.filter(t => t.type === 'REDEMPTION' || t.type === 'SPEND');
    const totalRedemptions = redemptions.length;
    const studentsWhoRedeemed = new Set(redemptions.map(t => t.studentId)).size;
    const conversionRate = activeStudents > 0 ? (studentsWhoRedeemed / activeStudents) * 100 : 0;
    const avgRedemptionValue = totalRedemptions > 0 ? totalSpent / totalRedemptions : 0;

    // Saúde do Sistema
    const { approvalRate, approved, rejected, pending } = calculateApprovalRates(schoolTransactions);
    
    // Tempo médio de processamento (em horas)
    const processedRedemptions = redemptions.filter(r => r.redemptionStatus !== 'PENDING' && r.processedAt);
    const avgProcessingTime = processedRedemptions.length > 0
      ? processedRedemptions.reduce((sum, r) => {
          const requested = new Date(r.timestamp).getTime();
          const processed = new Date(r.processedAt!).getTime();
          return sum + (processed - requested) / (1000 * 60 * 60); // horas
        }, 0) / processedRedemptions.length
      : 0;

    // Top 10 Alunos
    const topStudents: StudentRanking[] = students
      .map(s => ({
        id: s.id,
        name: s.name,
        totalKoins: schoolTransactions
          .filter(t => t.studentId === s.id && (t.type === 'EARN' || t.type === 'BONUS'))
          .reduce((sum, t) => sum + t.amount, 0),
        spentKoins: Math.abs(schoolTransactions
          .filter(t => t.studentId === s.id && (t.type === 'SPEND' || t.type === 'REDEMPTION'))
          .reduce((sum, t) => sum + t.amount, 0)),
        position: 0
      }))
      .sort((a, b) => b.totalKoins - a.totalKoins)
      .slice(0, 10)
      .map((s, i) => ({ ...s, position: i + 1 }));

    // Top 5 Itens
    const topItems = calculateTopItems(schoolTransactions, 5);

    // Linha do Tempo
    const monthlyData = calculateMonthlyDistribution(schoolTransactions, 6);

    return {
      totalStudents,
      activeStudents,
      participationRate,
      totalDistributed,
      totalSpent,
      inCirculation,
      circulationVelocity,
      totalRedemptions,
      conversionRate,
      avgRedemptionValue,
      approvalRate,
      avgProcessingTime,
      topStudents,
      topItems,
      monthlyData,
      pendingRedemptions: pending,
      approvedRedemptions: approved,
      rejectedRedemptions: rejected,
    };
  };

  const generateInsights = (): string[] => {
    if (!dashboardData) return [];
    
    const insights: string[] = [];

    // Insight de engajamento
    if (dashboardData.participationRate > 70) {
      insights.push(`📈 Excelente! ${dashboardData.participationRate.toFixed(0)}% dos alunos estão ativos no sistema de Koins`);
    } else if (dashboardData.participationRate > 40) {
      insights.push(`📊 ${dashboardData.participationRate.toFixed(0)}% dos alunos já participaram do sistema. Há espaço para crescimento!`);
    } else if (dashboardData.totalStudents > 0) {
      insights.push(`⚠️ Apenas ${dashboardData.participationRate.toFixed(0)}% dos alunos estão ativos. Considere campanhas de engajamento.`);
    }

    // Insight de circulação
    if (dashboardData.circulationVelocity > 60) {
      insights.push(`⚡ Alta velocidade de circulação (${dashboardData.circulationVelocity.toFixed(0)}%)! Os alunos estão resgatando recompensas ativamente.`);
    } else if (dashboardData.circulationVelocity < 30 && dashboardData.inCirculation > 100) {
      insights.push(`💎 ${dashboardData.inCirculation.toLocaleString()} Koins acumulados. Considere adicionar mais itens atrativos à loja.`);
    }

    // Insight de ranking
    if (dashboardData.topStudents.length > 0 && dashboardData.topStudents[0].totalKoins > 500) {
      insights.push(`🏆 ${dashboardData.topStudents[0].name} lidera o ranking com ${dashboardData.topStudents[0].totalKoins.toLocaleString()} Koins acumulados!`);
    }

    // Insight de popularidade
    if (dashboardData.topItems.length > 0) {
      const topItem = dashboardData.topItems[0];
      insights.push(`🛍️ "${topItem.itemName}" é o item mais popular com ${topItem.redemptionCount} resgates.`);
    }

    // Insight de saúde
    if (dashboardData.approvalRate > 90) {
      insights.push(`✅ Taxa de aprovação de ${dashboardData.approvalRate.toFixed(0)}% indica alta satisfação com os resgates.`);
    }

    return insights.slice(0, 4); // Limitar a 4 insights
  };

  const getMedalEmoji = (position: number): string => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Impacto dos Koins na Escola
          </DialogTitle>
          <DialogDescription>
            Análise estratégica do sistema de recompensas e seu impacto no engajamento dos alunos
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando dashboard executivo...</p>
          </div>
        ) : !dashboardData ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Activity className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum dado disponível para esta escola.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* FASE 3: 4 KPIs Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KPI 1: Engajamento Geral */}
              <Card className="glass-card border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Engajamento Geral
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    {dashboardData.activeStudents}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    de {dashboardData.totalStudents} alunos ativos
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${dashboardData.participationRate}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-primary">
                      {dashboardData.participationRate.toFixed(0)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* KPI 2: Economia de Koins */}
              <Card className="glass-card border-secondary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Coins className="h-4 w-4 text-secondary" />
                    Economia de Koins
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-secondary">
                    {dashboardData.inCirculation.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    em circulação
                  </p>
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Distribuídos:</span>
                      <span className="font-semibold">{dashboardData.totalDistributed.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Velocidade:</span>
                      <span className="font-semibold text-secondary">{dashboardData.circulationVelocity.toFixed(0)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* KPI 3: Atividade de Resgates */}
              <Card className="glass-card border-accent/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-accent" />
                    Atividade de Resgates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-accent">
                    {dashboardData.totalRedemptions}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    resgates realizados
                  </p>
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Conversão:</span>
                      <span className="font-semibold">{dashboardData.conversionRate.toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Média/resgate:</span>
                      <span className="font-semibold text-accent">{dashboardData.avgRedemptionValue.toFixed(0)} K</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* KPI 4: Saúde do Sistema */}
              <Card className="glass-card border-success/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-success" />
                    Saúde do Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-success">
                    {dashboardData.approvalRate.toFixed(0)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    taxa de aprovação
                  </p>
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Processamento:</span>
                      <span className="font-semibold">{dashboardData.avgProcessingTime.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Satisfação:</span>
                      <span className="font-semibold text-success">
                        {dashboardData.approvalRate > 80 ? 'Alta' : dashboardData.approvalRate > 60 ? 'Média' : 'Baixa'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* FASE 4: Linha do Tempo */}
            {dashboardData.monthlyData.length > 0 && (
              <>
                <Separator />
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Evolução Mensal
                    </CardTitle>
                    <CardDescription>
                      Distribuição e consumo de Koins nos últimos 6 meses
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={dashboardData.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="month" 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="earned" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          name="Distribuídos"
                          dot={{ fill: 'hsl(var(--primary))' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="spent" 
                          stroke="hsl(var(--secondary))" 
                          strokeWidth={2}
                          name="Gastos"
                          dot={{ fill: 'hsl(var(--secondary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}

            {/* FASE 5: Rankings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top 10 Alunos */}
              {dashboardData.topStudents.length > 0 && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      Top 10 Alunos Mais Engajados
                    </CardTitle>
                    <CardDescription>
                      Ranking dos alunos com maior acumulação de Koins
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Aluno</TableHead>
                          <TableHead className="text-right">Koins</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboardData.topStudents.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium text-lg">
                              {getMedalEmoji(student.position) || student.position}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{student.name}</span>
                                {student.totalKoins > 500 && (
                                  <Badge variant="secondary" className="text-xs">
                                    Super
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="space-y-1">
                                <div className="font-bold text-primary">
                                  {student.totalKoins.toLocaleString()}
                                </div>
                                {student.spentKoins > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    {student.spentKoins.toLocaleString()} gastos
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Top 5 Itens */}
              {dashboardData.topItems.length > 0 && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5 text-secondary" />
                      Top 5 Itens Mais Resgatados
                    </CardTitle>
                    <CardDescription>
                      Recompensas mais valorizadas pelos alunos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {dashboardData.topItems.map((item, index) => {
                      const maxRedemptions = dashboardData.topItems[0].redemptionCount;
                      const popularity = (item.redemptionCount / maxRedemptions) * 100;
                      
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.itemName}</span>
                              {index === 0 && (
                                <Badge variant="default" className="text-xs">
                                  Mais Popular
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm font-bold text-secondary">
                              {item.redemptionCount}x
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div 
                                className="bg-secondary h-2 rounded-full transition-all"
                                style={{ width: `${popularity}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {item.totalKoins.toLocaleString()} K
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* FASE 6: Status de Resgates */}
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Status de Resgates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="glass-card border-warning/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                        <p className="text-3xl font-bold text-warning mt-1">
                          {dashboardData.pendingRedemptions}
                        </p>
                      </div>
                      <Clock className="h-10 w-10 text-warning opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-success/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Aprovados</p>
                        <p className="text-3xl font-bold text-success mt-1">
                          {dashboardData.approvedRedemptions}
                        </p>
                      </div>
                      <CheckCircle className="h-10 w-10 text-success opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-destructive/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Rejeitados</p>
                        <p className="text-3xl font-bold text-destructive mt-1">
                          {dashboardData.rejectedRedemptions}
                        </p>
                      </div>
                      <XCircle className="h-10 w-10 text-destructive opacity-50" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* FASE 7: Insights Automáticos */}
            {generateInsights().length > 0 && (
              <>
                <Separator />
                <Card className="glass-card bg-primary/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <Info className="h-5 w-5" />
                      Insights Automáticos
                    </CardTitle>
                    <CardDescription>
                      Análises inteligentes do sistema baseadas nos dados atuais
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {generateInsights().map((insight, index) => (
                        <div 
                          key={index}
                          className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50"
                        >
                          <div className="flex-1 text-sm leading-relaxed">
                            {insight}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
