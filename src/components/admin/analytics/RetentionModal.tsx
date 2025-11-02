import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { RetentionMetrics } from '@/hooks/useRetentionMetrics';

interface RetentionModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: RetentionMetrics | undefined;
}

export function RetentionModal({ isOpen, onClose, data }: RetentionModalProps) {
  if (!data) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Retenção e Progressão de Alunos</DialogTitle>
          <DialogDescription>
            Análise do ciclo de vida e taxa de retenção
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-6 space-y-8">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Taxa de Retenção</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-success">
                  {data.retention_rate.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Alunos Matriculados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">
                  {data.total_enrolled}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Alunos Ativos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-success">
                  {data.active_students}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tempo Médio Ativo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-warning">
                  {data.avg_days_active} dias
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Gráfico de linha temporal */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução Mensal - Últimos 6 Meses</CardTitle>
              <CardDescription>
                Comparação entre alunos matriculados e ativos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.enrollment_trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                  <Line 
                    type="monotone" 
                    dataKey="enrolled" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Matriculados"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="active" 
                    stroke="hsl(var(--success))" 
                    strokeWidth={2}
                    name="Ativos"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* Insights */}
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              <strong>Análise:</strong> A taxa de retenção está {data.retention_rate >= 80 ? 'excelente' : 'necessita atenção'}. 
              {data.total_enrolled - data.active_students > 0 && (
                ` ${data.total_enrolled - data.active_students} alunos estão inativos e podem necessitar intervenção.`
              )}
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}
