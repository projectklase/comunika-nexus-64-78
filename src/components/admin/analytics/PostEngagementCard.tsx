import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageSquare, BookOpen, Target, Eye, Clock, AlertTriangle } from 'lucide-react';
import { TopPost } from '@/types/post-read-analytics';
import { ProgressBarWithTooltip } from './ProgressBarWithTooltip';
import { cn } from '@/lib/utils';

interface PostEngagementCardProps {
  post: TopPost;
}

export function PostEngagementCard({ post }: PostEngagementCardProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'COMUNICADO':
        return <MessageSquare className="h-4 w-4" />;
      case 'MATERIAL':
        return <BookOpen className="h-4 w-4" />;
      case 'ATIVIDADE':
        return <Target className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getPriorityBadge = (readRate: number) => {
    if (readRate < 50) {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs font-mono">
          🔴 URGENTE
        </Badge>
      );
    }
    if (readRate < 70) {
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs font-mono">
          🟡 ATENÇÃO
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs font-mono">
        🟢 OK
      </Badge>
    );
  };

  const getColorScheme = (readRate: number): 'green' | 'amber' | 'red' => {
    if (readRate >= 70) return 'green';
    if (readRate >= 40) return 'amber';
    return 'red';
  };

  // Calcular total de alunos (aproximado)
  const totalStudents = post.unique_readers > 0 
    ? Math.round(post.unique_readers / (post.read_rate / 100))
    : 0;
  const notReadCount = totalStudents - post.unique_readers;

  return (
    <div
      className={cn(
        "group relative bg-slate-950/50 backdrop-blur-sm rounded-lg border p-5",
        "transition-all duration-300 hover:-translate-y-1",
        "hover:shadow-[0_0_20px_rgba(0,255,65,0.15)]",
        "border-slate-800 hover:border-green-500/40"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-2 flex-1">
          <div className="mt-1 text-cyan-400">
            {getTypeIcon(post.post_type)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-mono font-bold text-white text-sm mb-1 line-clamp-2">
              {post.post_title}
            </h3>
            {post.class_name && (
              <p className="text-xs text-slate-400 font-mono">
                📊 {post.class_name}
              </p>
            )}
          </div>
        </div>
        <div className="ml-2">
          {getPriorityBadge(post.read_rate)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <ProgressBarWithTooltip
          value={post.unique_readers}
          maxValue={totalStudents}
          tooltipContent={`${post.unique_readers} de ${totalStudents} alunos leram (${post.read_rate.toFixed(0)}%)`}
          colorScheme={getColorScheme(post.read_rate)}
        />
      </div>

      {/* Métricas Inline */}
      <div className="flex items-center gap-4 text-xs font-mono text-slate-300 mb-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-help">
                <Eye className="h-3 w-3 text-cyan-400" />
                <span>{post.total_reads} leituras</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-slate-900 border border-slate-700">
              <p className="text-xs font-mono text-slate-200">
                {post.unique_readers} leitores únicos | {post.total_reads} leituras totais
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-slate-400" />
          <span>Há 2h</span>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex items-center gap-2">
        {notReadCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 rounded border border-red-500/30 text-xs font-mono text-red-400">
            <AlertTriangle className="h-3 w-3" />
            <span>{notReadCount} não leram</span>
          </div>
        )}
      </div>

      {/* Accordion para Detalhes */}
      <Accordion type="single" collapsible className="border-t border-slate-800 mt-4 pt-4">
        <AccordionItem value="details" className="border-none">
          <AccordionTrigger className="text-xs font-mono text-green-400 hover:text-green-300 py-0">
            🔍 Ver Quem Leu
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Coluna 1: Quem leu */}
              <div>
                <h4 className="text-sm font-mono uppercase mb-2 text-green-400 flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  Leram ({post.unique_readers})
                </h4>
                <div className="p-3 bg-green-500/10 rounded border border-green-500/30">
                  <p className="text-xs font-mono text-slate-300">
                    {post.unique_readers} alunos visualizaram este post
                  </p>
                </div>
              </div>

              {/* Coluna 2: Quem não leu */}
              <div>
                <h4 className="text-sm font-mono uppercase mb-2 text-red-400 flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  Não Leram ({notReadCount})
                </h4>
                <div className="p-3 bg-red-500/10 rounded border border-red-500/30">
                  <p className="text-xs font-mono text-slate-300">
                    {notReadCount} alunos ainda não acessaram
                  </p>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
