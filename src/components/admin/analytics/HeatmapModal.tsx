import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Info, Package, FileText, CheckCircle, Activity, Users, GraduationCap, BookOpen, Briefcase, type LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WeeklyHeatmapData } from '@/hooks/useWeeklyHeatmap';
import { useLoginHeatmap, LoginHeatmapDataPoint } from '@/hooks/useLoginHeatmap';
import { cn } from '@/lib/utils';

type HeatmapView = 'deliveries' | 'posts' | 'corrections' | 'activity' | 'logins';
type LoginRoleFilter = 'all' | 'aluno' | 'professor' | 'secretaria';

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

const ROLE_COLORS = {
  aluno: { hsl: '217 91%', name: 'Azul', label: 'Alunos' },
  professor: { hsl: '142 76%', name: 'Verde', label: 'Professores' },
  secretaria: { hsl: '24 95%', name: 'Laranja', label: 'Secretaria' }
};

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

function createLoginHeatmapMatrix(data: LoginHeatmapDataPoint[]): Map<string, LoginHeatmapDataPoint> {
  const matrix = new Map<string, LoginHeatmapDataPoint>();
  data.forEach((point) => {
    const key = `${point.day_of_week}-${point.hour}`;
    matrix.set(key, point);
  });
  return matrix;
}

export function HeatmapModal({ isOpen, onClose, data }: HeatmapModalProps) {
  const [activeView, setActiveView] = useState<HeatmapView>('deliveries');
  const [loginFilter, setLoginFilter] = useState<LoginRoleFilter>('all');
  
  const { data: loginData, isLoading: isLoginLoading } = useLoginHeatmap(30, loginFilter);
  
  if (!data) return null;
  
  const getHeatmapData = () => {
    switch (activeView) {
      case 'deliveries': return data.deliveries_heatmap;
      case 'posts': return data.posts_heatmap;
      case 'corrections': return data.corrections_heatmap;
      case 'activity': return data.activity_heatmap;
      case 'logins': return loginData?.heatmap_data || [];
    }
  };

  const getHeatmapColor = () => {
    switch (activeView) {
      case 'deliveries': return '264 89%'; // Roxo
      case 'posts': return '142 76%';      // Verde
      case 'corrections': return '24 95%'; // Laranja
      case 'activity': return '217 91%';   // Azul
      case 'logins': 
        return loginFilter !== 'all' 
          ? ROLE_COLORS[loginFilter].hsl 
          : '217 91%'; // Azul por padrão
    }
  };

  const getViewTitle = () => {
    switch (activeView) {
      case 'deliveries': return 'Entregas de Alunos';
      case 'posts': return 'Posts de Professores';
      case 'corrections': return 'Correções de Professores';
      case 'activity': return 'Atividade Geral';
      case 'logins': 
        return loginFilter === 'all' 
          ? 'Logins de Todos os Usuários' 
          : `Logins de ${ROLE_COLORS[loginFilter].label}`;
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
      case 'logins': 
        return { peak: 'Horário de Maior Acesso', day: 'Dia Mais Ativo', total: 'Total de Logins' };
    }
  };

  const getTotalValue = () => {
    switch (activeView) {
      case 'deliveries': return data.total_deliveries;
      case 'posts': return data.total_posts;
      case 'corrections': return data.total_corrections;
      case 'activity': return data.total_activities;
      case 'logins': return loginData?.total_logins || 0;
    }
  };

  const getPeakHour = () => {
    switch (activeView) {
      case 'logins': return loginData?.peak_hour || '--';
      default: return data.peak_hour;
    }
  };

  const getPeakDay = () => {
    switch (activeView) {
      case 'logins': return loginData?.peak_day || '--';
      default: return data.peak_day;
    }
  };

  const getTooltipLabel = () => {
    switch (activeView) {
      case 'deliveries': return 'entregas';
      case 'posts': return 'posts publicados';
      case 'corrections': return 'correções realizadas';
      case 'activity': return 'atividades registradas';
      case 'logins': return 'logins';
    }
  };

  const getExplanationTooltip = () => {
    switch (activeView) {
      case 'deliveries':
        return {
          description: 'Este mapa mostra os horários em que os alunos mais entregam atividades.',
          darkColor: 'Roxo escuro',
          lightColor: 'Roxo claro',
          interpretation: 'muitas entregas',
          usage: 'Identifique os melhores horários para publicar atividades e maximizar o engajamento dos alunos.'
        };
      case 'posts':
        return {
          description: 'Este mapa mostra os horários em que os professores mais publicam conteúdo.',
          darkColor: 'Verde escuro',
          lightColor: 'Verde claro',
          interpretation: 'muitos posts',
          usage: 'Entenda os padrões de publicação dos professores para coordenar melhor o fluxo de conteúdo.'
        };
      case 'corrections':
        return {
          description: 'Este mapa mostra os horários em que os professores mais corrigem atividades.',
          darkColor: 'Laranja escuro',
          lightColor: 'Laranja claro',
          interpretation: 'muitas correções',
          usage: 'Identifique os períodos de maior dedicação dos professores às correções para otimizar processos.'
        };
      case 'activity':
        return {
          description: 'Este mapa mostra os horários de maior atividade geral dos professores no sistema.',
          darkColor: 'Azul escuro',
          lightColor: 'Azul claro',
          interpretation: 'muita atividade',
          usage: 'Visualize os momentos de maior uso da plataforma pelos professores para planejamento estratégico.'
        };
      case 'logins':
        return {
          description: loginFilter === 'all'
            ? 'Este mapa mostra os horários em que todos os usuários mais acessam o sistema.'
            : `Este mapa mostra os horários em que ${ROLE_COLORS[loginFilter].label.toLowerCase()} mais acessam o sistema.`,
          darkColor: loginFilter !== 'all' ? `${ROLE_COLORS[loginFilter].name} escuro` : 'Cores variadas',
          lightColor: loginFilter !== 'all' ? `${ROLE_COLORS[loginFilter].name} claro` : 'Cores variadas',
          interpretation: 'muitos acessos',
          usage: 'Identifique os melhores horários para comunicações importantes e atualizações do sistema.'
        };
    }
  };

  const getDialogDescription = () => {
    switch (activeView) {
      case 'deliveries': 
        return 'Intensidade de entregas de alunos por dia da semana e hora do dia (últimos 30 dias)';
      case 'posts': 
        return 'Intensidade de publicações de professores por dia da semana e hora do dia (últimos 30 dias)';
      case 'corrections': 
        return 'Intensidade de correções realizadas por professores por dia da semana e hora do dia (últimos 30 dias)';
      case 'activity': 
        return 'Intensidade de atividades gerais dos professores por dia da semana e hora do dia (últimos 30 dias)';
      case 'logins':
        return loginFilter === 'all'
          ? 'Horários de acesso ao sistema por todos os usuários em tempo real (últimos 30 dias)'
          : `Horários de acesso de ${ROLE_COLORS[loginFilter].label} em tempo real (últimos 30 dias)`;
    }
  };

  const getPeakHourTooltip = () => {
    switch (activeView) {
      case 'deliveries': return 'Horário com maior número de entregas realizadas pelos alunos';
      case 'posts': return 'Horário com maior número de posts publicados pelos professores';
      case 'corrections': return 'Horário com maior número de correções realizadas pelos professores';
      case 'activity': return 'Horário com maior atividade geral dos professores no sistema';
      case 'logins': 
        return loginFilter === 'all'
          ? 'Horário com maior número de acessos ao sistema por todos os usuários'
          : `Horário com maior número de acessos por ${ROLE_COLORS[loginFilter].label.toLowerCase()}`;
    }
  };

  const getPeakDayTooltip = () => {
    switch (activeView) {
      case 'deliveries': return 'Dia da semana com maior volume de entregas dos alunos';
      case 'posts': return 'Dia da semana com maior volume de publicações dos professores';
      case 'corrections': return 'Dia da semana com maior volume de correções dos professores';
      case 'activity': return 'Dia da semana com maior atividade geral dos professores';
      case 'logins': 
        return loginFilter === 'all'
          ? 'Dia da semana com maior volume de acessos ao sistema'
          : `Dia da semana com maior volume de acessos por ${ROLE_COLORS[loginFilter].label.toLowerCase()}`;
    }
  };
  
  const currentData = getHeatmapData();
  const isLoginView = activeView === 'logins';
  const loginMatrix = isLoginView ? createLoginHeatmapMatrix(currentData as LoginHeatmapDataPoint[]) : null;
  const matrix = !isLoginView ? createHeatmapMatrix(currentData) : null;
  const maxValue = Math.max(...currentData.map(d => d.count), 1);
  const heatmapColor = getHeatmapColor();
  const insights = getInsightsLabels();
  
  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const renderLoginCell = (dayIdx: number, hour: number) => {
    const key = `${dayIdx}-${hour}`;
    const cellData = loginMatrix?.get(key);

    if (!cellData || cellData.count === 0) {
      return (
        <div
          className="flex-1 min-w-[32px] h-8 rounded-sm"
          style={{ backgroundColor: 'hsl(var(--muted) / 0.2)' }}
        />
      );
    }

    const intensity = maxValue > 0 ? cellData.count / maxValue : 0;

    // Modo filtrado: cor única
    if (loginFilter !== 'all') {
      const roleConfig = ROLE_COLORS[loginFilter];
      return (
        <TooltipProvider key={key}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="flex-1 min-w-[32px] h-8 rounded-sm cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                style={{
                  backgroundColor: `hsl(${roleConfig.hsl} ${58 - intensity * 30}% / ${Math.max(0.3, intensity)})`
                }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {dayLabels[dayIdx]} {hour}h: <strong>{cellData.count}</strong> logins de {roleConfig.label}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // Modo "Todos": blocos divididos por role
    const sortedRoles = cellData.roles.sort((a, b) => b.count - a.count);
    const totalCount = cellData.count;

    return (
      <TooltipProvider key={key}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex-1 min-w-[32px] h-8 rounded-sm overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all">
              {sortedRoles.length === 1 ? (
                // Um único role: bloco inteiro
                <div
                  className="w-full h-full"
                  style={{
                    backgroundColor: `hsl(${ROLE_COLORS[sortedRoles[0].role as keyof typeof ROLE_COLORS].hsl} 50% / 0.8)`
                  }}
                />
              ) : (
                // Múltiplos roles: dividir verticalmente
                <div className="flex h-full">
                  {sortedRoles.map((roleData, idx) => {
                    const percentage = (roleData.count / totalCount) * 100;
                    const roleConfig = ROLE_COLORS[roleData.role as keyof typeof ROLE_COLORS];
                    
                    return (
                      <div
                        key={`${roleData.role}-${idx}`}
                        className="h-full"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: `hsl(${roleConfig.hsl} 50% / 0.8)`
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p className="font-semibold">{dayLabels[dayIdx]} {hour}h</p>
              <p className="text-muted-foreground">Total: {cellData.count} logins</p>
              <div className="space-y-0.5 mt-2">
                {sortedRoles.map(roleData => (
                  <div key={roleData.role} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-sm"
                      style={{ 
                        backgroundColor: `hsl(${ROLE_COLORS[roleData.role as keyof typeof ROLE_COLORS].hsl} 50%)`
                      }}
                    />
                    <span>{ROLE_COLORS[roleData.role as keyof typeof ROLE_COLORS].label}: {roleData.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Mapa de Calor Semanal - {getViewTitle()}
            {activeView === 'logins' && (
              <Badge variant="secondary" className="text-xs animate-pulse">
                <Activity className="h-3 w-3 mr-1" />
                Tempo Real
              </Badge>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-md">
                  <p className="text-xs">
                    {getExplanationTooltip().description}
                    <br/><br/>
                    <strong>Como interpretar:</strong>
                    <br/>• <strong>{getExplanationTooltip().darkColor}</strong>: {getExplanationTooltip().interpretation} nesse horário
                    <br/>• <strong>{getExplanationTooltip().lightColor}</strong>: pouca atividade
                    <br/>• <strong>Cinza</strong>: nenhuma atividade registrada
                    <br/><br/>
                    <strong>Para que serve:</strong>
                    <br/>{getExplanationTooltip().usage}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
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
          <TabButton
            active={activeView === 'logins'}
            onClick={() => setActiveView('logins')}
            icon={Users}
            label="Logins"
            color="hsl(280 80% 55%)"
          />
        </div>

        {/* Filtros de Login */}
        {activeView === 'logins' && (
          <div className="flex items-center gap-2 border-b pb-3">
            <span className="text-sm text-muted-foreground font-medium">Filtrar por:</span>
            <div className="flex gap-1 flex-wrap">
              <Button
                variant={loginFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLoginFilter('all')}
                className="h-8 text-xs"
              >
                <Users className="h-3 w-3 mr-1" />
                Todos
              </Button>
              <Button
                variant={loginFilter === 'aluno' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLoginFilter('aluno')}
                className="h-8 text-xs"
              >
                <GraduationCap className="h-3 w-3 mr-1" />
                Alunos
              </Button>
              <Button
                variant={loginFilter === 'professor' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLoginFilter('professor')}
                className="h-8 text-xs"
              >
                <BookOpen className="h-3 w-3 mr-1" />
                Professores
              </Button>
              <Button
                variant={loginFilter === 'secretaria' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLoginFilter('secretaria')}
                className="h-8 text-xs"
              >
                <Briefcase className="h-3 w-3 mr-1" />
                Secretaria
              </Button>
            </div>
          </div>
        )}
        
        <div className="space-y-6">
          {/* Heatmap com estrutura de tabela */}
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Header com horas */}
              <div className="flex">
                <div className="w-16 flex-shrink-0" />
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
                  <div className="w-16 flex-shrink-0 text-xs font-medium text-foreground flex items-center pr-2">
                    {day}
                  </div>
                  
                  <div className="flex flex-1 gap-1">
                    {Array.from({ length: 24 }, (_, hour) => {
                      if (isLoginView) {
                        return renderLoginCell(dayIdx, hour);
                      }

                      const value = matrix?.[dayIdx]?.[hour] || 0;
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
                                {day} {hour}h: <strong>{value}</strong> {getTooltipLabel()}
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
            {isLoginView && loginFilter === 'all' ? (
              // Legenda especial para modo "Todos"
              <div className="flex items-center gap-4 justify-center flex-wrap">
                <span className="text-sm text-muted-foreground font-medium">Tipos de usuário:</span>
                {Object.entries(ROLE_COLORS).map(([role, config]) => (
                  <div key={role} className="flex items-center gap-2">
                    <div 
                      className="w-6 h-4 rounded"
                      style={{ backgroundColor: `hsl(${config.hsl} 50%)` }}
                    />
                    <span className="text-sm text-muted-foreground">{config.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              // Legenda normal
              <div className="flex items-center gap-4 justify-center">
                <span className="text-sm text-muted-foreground">Baixa atividade</span>
                <div className="flex gap-1">
                  {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity) => (
                    <div
                      key={intensity}
                      className="w-8 h-4 rounded"
                      style={{ backgroundColor: `hsl(${heatmapColor} ${58 - intensity * 30}% / ${intensity})` }}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">Alta atividade</span>
              </div>
            )}
            
            {!isLoginView && (
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
            )}
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
                        <p className="text-xs">{getPeakHourTooltip()}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">
                  {getPeakHour()}
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
                        <p className="text-xs">{getPeakDayTooltip()}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">
                  {getPeakDay()}
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
