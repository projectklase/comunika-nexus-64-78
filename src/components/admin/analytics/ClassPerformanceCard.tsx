import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ClassPerformanceAnalytics } from '@/types/class-performance';
import { ProgressBarWithTooltip } from './ProgressBarWithTooltip';
import { cn } from '@/lib/utils';

interface ClassPerformanceCardProps {
  performance: ClassPerformanceAnalytics;
  daysFilter: number;
}

export function ClassPerformanceCard({ performance, daysFilter }: ClassPerformanceCardProps) {
  const getStatusColor = (rate: number) => {
    if (rate > 80) return { text: 'text-green-400', border: 'border-green-500/30', bg: 'bg-green-500/20' };
    if (rate > 60) return { text: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-500/20' };
    if (rate > 40) return { text: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/20' };
    return { text: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/20' };
  };

  const getStatusLabel = (rate: number) => {
    if (rate > 80) return 'Alto Desempenho';
    if (rate > 60) return 'Bom Desempenho';
    if (rate > 40) return 'Atenção Necessária';
    return 'Crítico';
  };

  const statusColor = getStatusColor(performance.delivery_rate);
  const inactiveStudents = performance.total_students - performance.active_students_last_7_days;

  return (
    <div
      className={cn(
        "group relative bg-slate-950/50 backdrop-blur-sm rounded-lg border p-5",
        "transition-all duration-300 hover:-translate-y-1",
        "hover:shadow-[0_0_20px_rgba(0,217,255,0.15)]",
        "border-slate-800 hover:border-cyan-500/40"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-mono font-bold text-white text-lg mb-1">
            {performance.class_name}
          </h3>
          <Badge className={cn("text-xs font-mono", statusColor.bg, statusColor.text, statusColor.border)}>
            {getStatusLabel(performance.delivery_rate)}
          </Badge>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <ProgressBarWithTooltip
          value={performance.total_deliveries}
          maxValue={performance.total_activities_assigned * performance.total_students}
          tooltipContent={`${performance.total_deliveries} entregas de ${performance.total_activities_assigned * performance.total_students} possíveis`}
        />
      </div>

      {/* Métricas Inline */}
      <div className="grid grid-cols-4 gap-2 text-xs font-mono mb-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center p-2 bg-slate-900/50 rounded border border-slate-800 cursor-help">
                <Users className="h-3 w-3 mx-auto mb-1 text-cyan-400" />
                <span className="text-white block">{performance.total_students}</span>
                <span className="text-slate-500 text-[10px]">Alunos</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-slate-900 border border-slate-700">
              <p className="text-xs font-mono text-slate-200">
                {performance.active_students_last_7_days} ativos nos últimos 7 dias | {inactiveStudents} inativos
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center p-2 bg-slate-900/50 rounded border border-slate-800 cursor-help">
                <Clock className="h-3 w-3 mx-auto mb-1 text-amber-400" />
                <span className="text-white block">
                  {performance.avg_days_to_deliver !== null ? performance.avg_days_to_deliver.toFixed(1) : '--'}
                </span>
                <span className="text-slate-500 text-[10px]">Dias</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-slate-900 border border-slate-700">
              <p className="text-xs font-mono text-slate-200">
                Tempo médio entre publicação e entrega
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center p-2 bg-slate-900/50 rounded border border-slate-800 cursor-help">
                <CheckCircle2 className="h-3 w-3 mx-auto mb-1 text-green-400" />
                <span className="text-white block">{performance.approved_deliveries}</span>
                <span className="text-slate-500 text-[10px]">Aprovadas</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-slate-900 border border-slate-700">
              <p className="text-xs font-mono text-slate-200">
                {performance.approved_deliveries} aprovadas | {performance.returned_deliveries} devolvidas | {performance.pending_deliveries} pendentes
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center p-2 bg-slate-900/50 rounded border border-slate-800 cursor-help">
                <AlertTriangle className="h-3 w-3 mx-auto mb-1 text-red-400" />
                <span className="text-white block">{performance.late_deliveries}</span>
                <span className="text-slate-500 text-[10px]">Atrasadas</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-slate-900 border border-slate-700">
              <p className="text-xs font-mono text-slate-200">
                Entregas realizadas após o prazo
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Accordion para Detalhes */}
      <Accordion type="single" collapsible className="border-t border-slate-800 pt-4">
        <AccordionItem value="details" className="border-none">
          <AccordionTrigger className="text-xs font-mono text-cyan-400 hover:text-cyan-300 py-0">
            Ver Detalhes Completos
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-900/50 rounded border border-slate-800">
                  <div className="text-slate-400 mb-1">Total de Atividades</div>
                  <div className="text-white text-lg font-bold">{performance.total_activities_assigned}</div>
                </div>
                <div className="p-3 bg-slate-900/50 rounded border border-slate-800">
                  <div className="text-slate-400 mb-1">Entregas Pendentes</div>
                  <div className="text-amber-400 text-lg font-bold">{performance.pending_deliveries}</div>
                </div>
              </div>
              
              {inactiveStudents > 0 && (
                <div className="p-3 bg-red-500/10 rounded border border-red-500/30">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-bold">{inactiveStudents} alunos inativos</span>
                  </div>
                  <div className="text-slate-400 mt-1 text-[11px]">
                    Sem login nos últimos 7 dias
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
