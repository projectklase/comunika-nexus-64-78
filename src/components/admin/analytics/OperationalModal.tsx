import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { OperationalMetrics } from '@/hooks/useOperationalMetrics';

interface OperationalModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: OperationalMetrics | undefined;
}

function calculateOccupied(occupancyData: Array<{ enrolled: number; capacity: number }>): number {
  return occupancyData.reduce((sum, cls) => sum + cls.enrolled, 0);
}

function calculateAvailable(occupancyData: Array<{ enrolled: number; capacity: number }>): number {
  return occupancyData.reduce((sum, cls) => sum + (cls.capacity - cls.enrolled), 0);
}

function calculateIdleCapacity(occupancyData: Array<{ occupancy_rate: number }>): number {
  if (occupancyData.length === 0) return 0;
  const avgOccupancy = occupancyData.reduce((sum, cls) => sum + cls.occupancy_rate, 0) / occupancyData.length;
  return Math.round(100 - avgOccupancy);
}

export function OperationalModal({ isOpen, onClose, data }: OperationalModalProps) {
  if (!data) return null;
  
  const pieData = [
    { name: 'Ocupadas', value: calculateOccupied(data.occupancy_data) },
    { name: 'Disponíveis', value: calculateAvailable(data.occupancy_data) }
  ];
  
  const COLORS = ['hsl(var(--success))', 'hsl(var(--muted))'];
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Métricas Operacionais</DialogTitle>
          <DialogDescription>
            Eficiência, capacidade e distribuição de recursos
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-6 space-y-8">
          {/* Grid com 3 cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Pie Chart - Ocupação de Turmas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Ocupação de Turmas</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value, entry: any) => `${value}: ${entry.payload.value}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* 2. Distribuição de Koins */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Distribuição de Koins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Total em Circulação</p>
                    <p className="text-2xl font-bold text-warning">
                      {data.koins_distribution.total_koins.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Média por Aluno</p>
                    <p className="text-2xl font-bold text-primary">
                      {Math.round(data.koins_distribution.avg_koins_per_student)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* 3. Capacidade Ociosa */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Capacidade Ociosa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-[200px]">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-warning">
                      {calculateIdleCapacity(data.occupancy_data)}%
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Vagas não preenchidas
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Tabela de ROI de Professores */}
          <Card>
            <CardHeader>
              <CardTitle>ROI de Professores</CardTitle>
              <CardDescription>
                Produtividade e taxa de entrega por professor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Professor</TableHead>
                    <TableHead className="text-right">Alunos Atendidos</TableHead>
                    <TableHead className="text-right">Taxa de Aprovação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.teacher_roi.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nenhum dado disponível
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.teacher_roi.map((teacher, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{teacher.teacher_name}</TableCell>
                        <TableCell className="text-right">{teacher.students_count}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={teacher.delivery_rate >= 80 ? 'default' : 'secondary'}>
                            {teacher.delivery_rate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
