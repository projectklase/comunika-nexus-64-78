import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, Package, FileText, CheckCircle, Activity, type LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WeeklyHeatmapData } from '@/hooks/useWeeklyHeatmap';
import { cn } from '@/lib/utils';

type HeatmapView = 'deliveries' | 'posts' | 'corrections' | 'activity';

interface HeatmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: WeeklyHeatmapData | undefined;
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  color: string;
}

function TabButton({ active, onClick, icon: Icon, label, color }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-2 px-4 py-2.5 rounded-lg",
        "border transition-all duration-300",
        "text-sm font-medium",
        active
          ? "bg-primary/10 border-primary text-foreground shadow-sm"
          : "border-transparent text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/50"
      )}
    >
      <Icon className="h-4 w-4" style={active ? { color } : undefined} />
      <span>{label}</span>
      
      {active && (
        <div
          className="absolute inset-0 rounded-lg border-2 pointer-events-none"
          style={{ borderColor: color }}
        />
      )}
    </button>
  );
}

function createHeatmapMatrix(data: Array<{ day_of_week: number; hour: number; count: number }>): number[][] {
  const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  data.forEach(({ day_of_week, hour, count }) => {
    if (day_of_week >= 0 && day_of_week <= 6 && hour >= 0 && hour <= 23) {
      matrix[day_of_week][hour] = count;
    }
  });
  return matrix;
}

export function HeatmapModal({ isOpen, onClose, data }: HeatmapModalProps) {
  const [activeView, setActiveView] = useState<HeatmapView>('deliveries');
  
  if (!data) return null;
  
  const getHeatmapData = () => {
    switch (activeView) {
      case 'deliveries': return data.deliveries_heatmap;
      case 'posts': return data.posts_heatmap;
      case 'corrections': return data.corrections_heatmap;
      case 'activity': return data.activity_heatmap;
    }
  };

  const getHeatmapColor = () => {
    switch (activeView) {
      case 'deliveries': return '264 89%'; // Roxo
      case 'posts': return '142 76%';      // Verde
      case 'corrections': return '24 95%'; // Laranja
      case 'activity': return '217 91%';   // Azul
    }
  };

  const getViewTitle = () => {
    switch (activeView) {
      case 'deliveries': return 'Entregas de Alunos';
      case 'posts': return 'Posts de Professores';
      case 'corrections': return 'Correções de Professores';
      case 'activity': return 'Atividade Geral';
    }
  };

  const getInsightsLabels = () => {
    switch (activeView) {
      case 'deliveries': 
        return { peak: 'Horário de Maior Entrega', day: 'Dia Mais Ativo', total: 'Total de Entregas' };
      case 'posts': 
        return { peak: 'Horário de Maior Publicação', day: 'Dia Mais Ativo', total: 'Total de Posts' };
      case 'corrections': 
        return { peak: 'Horário de Maior Correção', day: 'Dia Mais Ativo', total: 'Total de Correções' };
      case 'activity': 
        return { peak: 'Horário de Maior Atividade', day: 'Dia Mais Ativo', total: 'Total de Atividades' };
    }
  };

  const getTotalValue = () => {
    switch (activeView) {
      case 'deliveries': return data.total_deliveries;
      case 'posts': return data.total_posts;
      case 'corrections': return data.total_corrections;
      case 'activity': return data.total_activities;
    }
  };
  
  const currentData = getHeatmapData();
  const matrix = createHeatmapMatrix(currentData);
  const maxValue = Math.max(...currentData.map(d => d.count), 1);
  const heatmapColor = getHeatmapColor();
  const insights = getInsightsLabels();
  
  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Mapa de Calor Semanal - {getViewTitle()}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-md">
                  <p className="text-xs">
                    Este mapa mostra os horários de maior atividade dos alunos:
                    <br/><br/>
                    <strong>Como interpretar:</strong>
                    <br/>• <strong>Roxo escuro</strong>: muitas entregas nesse horário
                    <br/>• <strong>Roxo claro</strong>: poucas entregas
                    <br/>• <strong>Cinza</strong>: nenhuma entrega
                    <br/><br/>
                    <strong>Para que serve:</strong>
                    <br/>Identifique os melhores horários para publicar atividades e maximizar o engajamento dos alunos.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogTitle>
          <DialogDescription>
            Intensidade de atividades por dia da semana e hora do dia (últimos 30 dias)
          </DialogDescription>
        </DialogHeader>

        {/* Tabs de visualização */}
        <div className="flex gap-2 border-b pb-3 flex-wrap">
          <TabButton
            active={activeView === 'deliveries'}
            onClick={() => setActiveView('deliveries')}
            icon={Package}
            label="Entregas"
            color="hsl(264 89% 58%)"
          />
          <TabButton
            active={activeView === 'posts'}
            onClick={() => setActiveView('posts')}
            icon={FileText}
            label="Posts"
            color="hsl(142 76% 45%)"
          />
          <TabButton
            active={activeView === 'corrections'}
            onClick={() => setActiveView('corrections')}
            icon={CheckCircle}
            label="Correções"
            color="hsl(24 95% 50%)"
          />
          <TabButton
            active={activeView === 'activity'}
            onClick={() => setActiveView('activity')}
            icon={Activity}
            label="Atividade"
            color="hsl(217 91% 60%)"
          />
        </div>
        
        <div className="space-y-6">
          {/* Heatmap com estrutura de tabela */}
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Header com horas */}
              <div className="flex">
                <div className="w-16 flex-shrink-0" /> {/* Espaço para labels dos dias */}
                <div className="flex flex-1">
                  {Array.from({ length: 24 }, (_, i) => (
                    <div 
                      key={i} 
                      className="text-xs text-center text-foreground flex-1 min-w-[32px] p-1"
                    >
                      {i}h
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Linhas do heatmap */}
              {dayLabels.map((day, dayIdx) => (
                <div key={`day-${dayIdx}`} className="flex items-stretch">
                  {/* Label do dia */}
                  <div className="w-16 flex-shrink-0 text-xs font-medium text-foreground flex items-center pr-2">
                    {day}
                  </div>
                  
                  {/* Células de horas */}
                  <div className="flex flex-1 gap-1">
                    {Array.from({ length: 24 }, (_, hour) => {
                      const value = matrix[dayIdx]?.[hour] || 0;
                      const intensity = maxValue > 0 ? value / maxValue : 0;
                      
                      return (
                        <TooltipProvider key={`${dayIdx}-${hour}`}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="flex-1 min-w-[32px] h-8 rounded-sm cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                style={{
                                  backgroundColor: value > 0 
                                    ? `hsl(${heatmapColor} ${58 - intensity * 30}% / ${Math.max(0.3, intensity)})` 
                                    : 'hsl(var(--muted) / 0.2)',
                                }}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                {day} {hour}h: <strong>{value}</strong> entregas
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Legenda */}
          <div className="space-y-3">
            <div className="flex items-center gap-4 justify-center">
              <span className="text-sm text-muted-foreground">Baixa atividade</span>
              <div className="flex gap-1">
                {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity) => (
                  <div
                    key={intensity}
                    className="w-8 h-4 rounded"
                    style={{ backgroundColor: `hsl(264 89% ${58 - intensity * 30}% / ${intensity})` }}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">Alta atividade</span>
            </div>
            
            {/* Explicação visual adicional */}
            <div className="flex items-center justify-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: `hsl(${heatmapColor} 58% / 0.3)` }} />
                <span className="text-muted-foreground">Pouca atividade</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: `hsl(${heatmapColor} 43% / 0.65)` }} />
                <span className="text-muted-foreground">Atividade moderada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: `hsl(${heatmapColor} 28% / 1)` }} />
                <span className="text-muted-foreground">Muita atividade</span>
              </div>
            </div>
          </div>
          
          {/* Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  {insights.peak}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Horário com maior número de entregas realizadas</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">
                  {data.peak_hour}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  {insights.day}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Dia da semana com maior volume de entregas</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">
                  {data.peak_day}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{insights.total}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">
                  {getTotalValue()}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
