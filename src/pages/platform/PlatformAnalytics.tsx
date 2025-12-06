import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileText,
  Bell,
  Activity
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';

interface FinancialMetrics {
  mrr: number;
  arr: number;
  arpu: number;
  ltv: number;
  active_subscriptions: number;
  total_customers: number;
  churned_last_month: number;
  churn_rate: number;
  mrr_growth: number;
}

interface SchoolUsage {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  total_users: number;
  total_posts: number;
  posts_last_30_days: number;
  logins_last_30_days: number;
  logins_last_7_days: number;
  engagement_level: 'inactive' | 'low' | 'medium' | 'high';
}

interface PlatformAlert {
  id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  entity_type: string;
  entity_id: string;
  entity_label: string;
  created_at: string;
  is_resolved: boolean;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

const engagementColors: Record<string, string> = {
  inactive: 'bg-red-500/20 text-red-400',
  low: 'bg-yellow-500/20 text-yellow-400',
  medium: 'bg-blue-500/20 text-blue-400',
  high: 'bg-green-500/20 text-green-400',
};

const severityColors: Record<string, string> = {
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function PlatformAnalytics() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('financial');

  const { data: financialMetrics, isLoading: loadingFinancial } = useQuery({
    queryKey: ['financial-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_financial_metrics');
      if (error) throw error;
      return data as unknown as FinancialMetrics;
    },
  });

  const { data: schoolUsage = [], isLoading: loadingUsage } = useQuery({
    queryKey: ['school-usage'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_school_usage_analytics');
      if (error) throw error;
      return (data as unknown as SchoolUsage[]) || [];
    },
  });

  const { data: alerts = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ['platform-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_platform_alerts', { p_resolved: false });
      if (error) throw error;
      return (data as unknown as PlatformAlert[]) || [];
    },
  });

  const generateAlertsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('generate_platform_alerts');
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['platform-alerts'] });
      toast.success(`${count} novos alertas gerados`);
    },
  });

  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase.rpc('resolve_platform_alert', { p_alert_id: alertId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-alerts'] });
      toast.success('Alerta resolvido');
    },
  });

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    
    // Financial sheet
    const financialSheet = workbook.addWorksheet('Métricas Financeiras');
    financialSheet.columns = [
      { header: 'Métrica', key: 'metric', width: 25 },
      { header: 'Valor', key: 'value', width: 20 },
    ];
    if (financialMetrics) {
      financialSheet.addRows([
        { metric: 'MRR', value: formatCurrency(financialMetrics.mrr) },
        { metric: 'ARR', value: formatCurrency(financialMetrics.arr) },
        { metric: 'ARPU', value: formatCurrency(financialMetrics.arpu) },
        { metric: 'LTV', value: formatCurrency(financialMetrics.ltv) },
        { metric: 'Assinaturas Ativas', value: financialMetrics.active_subscriptions },
        { metric: 'Churn Rate', value: `${financialMetrics.churn_rate}%` },
      ]);
    }

    // Schools sheet
    const schoolsSheet = workbook.addWorksheet('Uso por Escola');
    schoolsSheet.columns = [
      { header: 'Escola', key: 'name', width: 30 },
      { header: 'Usuários', key: 'users', width: 15 },
      { header: 'Posts', key: 'posts', width: 15 },
      { header: 'Logins (7d)', key: 'logins7', width: 15 },
      { header: 'Logins (30d)', key: 'logins30', width: 15 },
      { header: 'Engajamento', key: 'engagement', width: 15 },
    ];
    schoolUsage.forEach(school => {
      schoolsSheet.addRow({
        name: school.name,
        users: school.total_users,
        posts: school.total_posts,
        logins7: school.logins_last_7_days,
        logins30: school.logins_last_30_days,
        engagement: school.engagement_level,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `analytics_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Relatório Excel exportado');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Relatório de Analytics - Plataforma', 20, 20);
    doc.setFontSize(12);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 20, 30);

    if (financialMetrics) {
      doc.setFontSize(16);
      doc.text('Métricas Financeiras', 20, 50);
      doc.setFontSize(12);
      doc.text(`MRR: ${formatCurrency(financialMetrics.mrr)}`, 20, 60);
      doc.text(`ARR: ${formatCurrency(financialMetrics.arr)}`, 20, 70);
      doc.text(`ARPU: ${formatCurrency(financialMetrics.arpu)}`, 20, 80);
      doc.text(`LTV: ${formatCurrency(financialMetrics.ltv)}`, 20, 90);
      doc.text(`Assinaturas Ativas: ${financialMetrics.active_subscriptions}`, 20, 100);
      doc.text(`Churn Rate: ${financialMetrics.churn_rate}%`, 20, 110);
    }

    doc.setFontSize(16);
    doc.text('Escolas por Engajamento', 20, 130);
    doc.setFontSize(12);
    let yPos = 140;
    schoolUsage.slice(0, 10).forEach(school => {
      doc.text(`${school.name}: ${school.engagement_level} (${school.logins_last_7_days} logins/7d)`, 20, yPos);
      yPos += 10;
    });

    doc.save(`analytics_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('Relatório PDF exportado');
  };

  const exportToCSV = () => {
    const headers = ['Escola', 'Usuários', 'Posts', 'Logins 7d', 'Logins 30d', 'Engajamento'];
    const rows = schoolUsage.map(s => [s.name, s.total_users, s.total_posts, s.logins_last_7_days, s.logins_last_30_days, s.engagement_level]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast.success('Relatório CSV exportado');
  };

  const engagementDistribution = [
    { name: 'Alto', value: schoolUsage.filter(s => s.engagement_level === 'high').length },
    { name: 'Médio', value: schoolUsage.filter(s => s.engagement_level === 'medium').length },
    { name: 'Baixo', value: schoolUsage.filter(s => s.engagement_level === 'low').length },
    { name: 'Inativo', value: schoolUsage.filter(s => s.engagement_level === 'inactive').length },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics & Inteligência</h1>
          <p className="text-muted-foreground">Métricas financeiras, uso e alertas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <FileText className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPDF}>
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="usage">Uso por Escola</TabsTrigger>
          <TabsTrigger value="alerts">
            Alertas
            {alerts.length > 0 && (
              <Badge className="ml-2 bg-red-500/20 text-red-400">{alerts.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-6">
          {/* Financial KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">MRR</p>
                    <p className="text-2xl font-bold">{formatCurrency(financialMetrics?.mrr || 0)}</p>
                    {financialMetrics?.mrr_growth !== undefined && (
                      <p className={`text-xs flex items-center gap-1 ${financialMetrics.mrr_growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {financialMetrics.mrr_growth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {Math.abs(financialMetrics.mrr_growth).toFixed(1)}%
                      </p>
                    )}
                  </div>
                  <div className="p-2 rounded-lg bg-primary/20">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">ARR</p>
                    <p className="text-2xl font-bold">{formatCurrency(financialMetrics?.arr || 0)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <BarChart3 className="h-5 w-5 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">ARPU</p>
                    <p className="text-2xl font-bold">{formatCurrency(financialMetrics?.arpu || 0)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <Users className="h-5 w-5 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">LTV</p>
                    <p className="text-2xl font-bold">{formatCurrency(financialMetrics?.ltv || 0)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <TrendingUp className="h-5 w-5 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Churn & Retenção</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Churn Rate</span>
                    <span className="font-bold text-lg">{financialMetrics?.churn_rate || 0}%</span>
                  </div>
                  <Progress value={100 - (financialMetrics?.churn_rate || 0)} className="h-2" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Churned (30d)</span>
                    <span>{financialMetrics?.churned_last_month || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Assinaturas Ativas</span>
                    <span>{financialMetrics?.active_subscriptions || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Distribuição de Engajamento</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={engagementDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {engagementDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {engagementDistribution.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1 text-xs">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      {entry.name}: {entry.value}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Uso por Escola ({schoolUsage.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingUsage ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : (
                <div className="space-y-3">
                  {schoolUsage.map((school) => (
                    <div key={school.id} className="p-4 rounded-lg border border-border/50 bg-background/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{school.name}</p>
                            <p className="text-xs text-muted-foreground">/{school.slug}</p>
                          </div>
                        </div>
                        <Badge className={engagementColors[school.engagement_level]}>
                          {school.engagement_level}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Usuários</p>
                          <p className="font-medium">{school.total_users}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Posts</p>
                          <p className="font-medium">{school.total_posts}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Logins (7d)</p>
                          <p className="font-medium">{school.logins_last_7_days}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Logins (30d)</p>
                          <p className="font-medium">{school.logins_last_30_days}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateAlertsMutation.mutate()}
              disabled={generateAlertsMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${generateAlertsMutation.isPending ? 'animate-spin' : ''}`} />
              Verificar Alertas
            </Button>
          </div>

          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Alertas Ativos ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAlerts ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-2" />
                  <p className="text-muted-foreground">Nenhum alerta ativo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border ${severityColors[alert.severity]}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 mt-0.5" />
                          <div>
                            <p className="font-medium">{alert.title}</p>
                            <p className="text-sm opacity-80">{alert.message}</p>
                            <p className="text-xs opacity-60 mt-1">
                              {format(new Date(alert.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => resolveAlertMutation.mutate(alert.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
