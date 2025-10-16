import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KoinTransaction } from '@/types/rewards';
import { 
  calculateMonthlyDistribution, 
  calculateTopItems, 
  calculateApprovalRates,
  calculateKoinCirculation 
} from '@/utils/rewards-analytics';
import { TrendingUp, TrendingDown, Award, CheckCircle, XCircle, Clock, Coins } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RewardsAnalyticsProps {
  transactions: KoinTransaction[];
}

const COLORS = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(142 76% 36%)',
  danger: 'hsl(0 84% 60%)',
  warning: 'hsl(38 92% 50%)',
  muted: 'hsl(var(--muted-foreground))'
};

export function RewardsAnalytics({ transactions }: RewardsAnalyticsProps) {
  const monthlyData = calculateMonthlyDistribution(transactions, 6);
  const topItems = calculateTopItems(transactions, 5);
  const approvalRates = calculateApprovalRates(transactions);
  const circulation = calculateKoinCirculation(transactions);

  const pieData = [
    { name: 'Aprovados', value: approvalRates.approved, color: COLORS.success },
    { name: 'Rejeitados', value: approvalRates.rejected, color: COLORS.danger },
    { name: 'Pendentes', value: approvalRates.pending, color: COLORS.warning }
  ];

  return (
    <div className="space-y-6">
      {/* Estatísticas Resumidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Koins Distribuídos</p>
              <p className="text-2xl font-bold">{circulation.totalDistributed.toLocaleString()}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Koins Resgatados</p>
              <p className="text-2xl font-bold">{circulation.totalSpent.toLocaleString()}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Em Circulação</p>
              <p className="text-2xl font-bold">{circulation.inCirculation.toLocaleString()}</p>
            </div>
            <Coins className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Aprovação</p>
              <p className="text-2xl font-bold">{approvalRates.approvalRate.toFixed(1)}%</p>
            </div>
            <Award className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Gráficos */}
      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monthly">Distribuição Mensal</TabsTrigger>
          <TabsTrigger value="items">Top Itens</TabsTrigger>
          <TabsTrigger value="approval">Aprovações</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Distribuição Mensal de Koins</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="earned" 
                  stroke={COLORS.success} 
                  strokeWidth={2} 
                  name="Ganhos" 
                />
                <Line 
                  type="monotone" 
                  dataKey="spent" 
                  stroke={COLORS.danger} 
                  strokeWidth={2} 
                  name="Gastos" 
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top 5 Itens Mais Resgatados</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topItems}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="itemName" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }} 
                />
                <Bar dataKey="redemptionCount" fill={COLORS.primary} name="Resgates" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="approval" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Status dos Resgates</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Aprovados</span>
                  </div>
                  <span className="text-xl font-bold">{approvalRates.approved}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-medium">Rejeitados</span>
                  </div>
                  <span className="text-xl font-bold">{approvalRates.rejected}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium">Pendentes</span>
                  </div>
                  <span className="text-xl font-bold">{approvalRates.pending}</span>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
