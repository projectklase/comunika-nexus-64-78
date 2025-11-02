import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WeeklyHeatmapData } from '@/hooks/useWeeklyHeatmap';

interface HeatmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: WeeklyHeatmapData | undefined;
}

function createHeatmapMatrix(data: Array<{ day_of_week: number; hour: number; count: number }>): number[][] {
  const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  data.forEach(({ day_of_week, hour, count }) => {
    matrix[day_of_week][hour] = count;
  });
  return matrix;
}

export function HeatmapModal({ isOpen, onClose, data }: HeatmapModalProps) {
  if (!data) return null;
  
  const matrix = createHeatmapMatrix(data.deliveries_heatmap);
  const maxValue = Math.max(...data.deliveries_heatmap.map(d => d.count), 1);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mapa de Calor Semanal - Entregas</DialogTitle>
          <DialogDescription>
            Intensidade de entregas por dia da semana e hora do dia (últimos 30 dias)
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-6 space-y-6">
          {/* Heatmap */}
          <div className="overflow-x-auto">
            <div className="inline-grid grid-cols-25 gap-1 min-w-max">
              {/* Header com horas */}
              <div className="text-xs font-medium text-foreground p-2"></div>
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="text-xs text-center text-foreground p-2">{i}h</div>
              ))}
              
              {/* Linhas por dia da semana */}
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, dayIdx) => (
                <React.Fragment key={`day-${dayIdx}`}>
                  <div className="text-xs font-medium text-foreground p-2 flex items-center">
                    {day}
                  </div>
                  {Array.from({ length: 24 }, (_, hour) => {
                    const value = matrix[dayIdx]?.[hour] || 0;
                    const intensity = value / maxValue;
                    return (
                      <div
                        key={`${dayIdx}-${hour}`}
                        className="aspect-square rounded-sm cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                        style={{
                          backgroundColor: value > 0 
                            ? `hsl(264 89% ${58 - intensity * 30}% / ${Math.max(0.3, intensity)})` 
                            : 'hsl(var(--muted) / 0.2)',
                        }}
                        title={`${day} ${hour}h: ${value} entregas`}
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
          
          {/* Legenda */}
          <div className="flex items-center gap-4 justify-center">
            <span className="text-sm text-muted-foreground">Baixa</span>
            <div className="flex gap-1">
              {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity) => (
                <div
                  key={intensity}
                  className="w-8 h-4 rounded"
                  style={{ backgroundColor: `hsl(264 89% ${58 - intensity * 30}% / ${intensity})` }}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">Alta</span>
          </div>
          
          {/* Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Horário de Pico</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">
                  {data.peak_hour}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Dia Mais Ativo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">
                  {data.peak_day}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total de Entregas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">
                  {data.total_deliveries}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
