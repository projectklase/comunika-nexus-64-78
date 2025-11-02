import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Zap, AlertCircle } from 'lucide-react';
import { PulseScoreData } from '@/hooks/usePulseScore';

interface PulseScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PulseScoreData | undefined;
}

export function PulseScoreModal({ isOpen, onClose, data }: PulseScoreModalProps) {
  if (!data) return null;
  
  const COLORS = ['hsl(264 89% 58%)', 'hsl(195 100% 50%)', 'hsl(142 76% 36%)', 'hsl(45 93% 58%)', 'hsl(0 84% 60%)'];
  
  const componentData = [
    { name: 'Engajamento', value: data.components.engagement, weight: 30 },
    { name: 'Performance Prof.', value: data.components.teacher_performance, weight: 25 },
    { name: 'Ocupação', value: data.components.occupancy, weight: 20 },
    { name: 'Taxa Aprovação', value: data.components.approval_rate, weight: 15 },
    { name: 'Retenção', value: data.components.retention, weight: 10 },
  ];
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Pulse Score™ - Saúde Institucional
          </DialogTitle>
          <DialogDescription>
            Índice consolidado de 5 dimensões críticas
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-6 space-y-8">
          {/* Score Principal */}
          <div className="text-center py-8 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-pink-500/10 rounded-xl">
            <p className="text-sm text-muted-foreground mb-2">Pulse Score Atual</p>
            <p className="text-7xl font-bold bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 bg-clip-text text-transparent">
              {data.overall_score}
            </p>
            <Badge 
              variant={data.overall_score >= 80 ? 'default' : data.overall_score >= 60 ? 'secondary' : 'destructive'}
              className="mt-4"
            >
              {data.overall_score >= 80 ? 'Excelente' : data.overall_score >= 60 ? 'Bom' : 'Necessita Atenção'}
            </Badge>
          </div>
          
          {/* Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Composição do Score</CardTitle>
                <CardDescription>Peso de cada componente</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={componentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value.toFixed(0)}`}
                    >
                      {componentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* Detalhamento */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhamento</CardTitle>
                <CardDescription>Valores individuais por componente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {componentData.map((component, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{component.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{component.value.toFixed(0)}</span>
                          <Badge variant="outline" className="text-xs">
                            Peso: {component.weight}%
                          </Badge>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-500"
                          style={{ 
                            width: `${component.value}%`,
                            backgroundColor: COLORS[idx]
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Gráfico de Evolução */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução do Score</CardTitle>
              <CardDescription>Últimos 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    className="text-xs"
                  />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* Recomendações */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Recomendações:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {data.components.engagement < 70 && (
                  <li>Melhorar engajamento com notificações e incentivos gamificados</li>
                )}
                {data.components.teacher_performance < 70 && (
                  <li>Capacitar professores para avaliar atividades em até 48h</li>
                )}
                {data.components.occupancy < 70 && (
                  <li>Aumentar captação de alunos ou reduzir número de turmas</li>
                )}
                {data.components.approval_rate < 70 && (
                  <li>Revisar dificuldade das atividades e critérios de avaliação</li>
                )}
                {data.components.retention < 70 && (
                  <li>Implementar programa de retenção para alunos em risco</li>
                )}
                {data.overall_score >= 80 && (
                  <li>Excelente! Manter as boas práticas e monitorar continuamente</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}
