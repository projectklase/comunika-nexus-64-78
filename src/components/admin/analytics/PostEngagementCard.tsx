import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BookOpen, MessageSquare, Target, AlertCircle, Eye, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TopPost } from '@/types/post-read-analytics';

interface PostEngagementCardProps {
  post: TopPost;
  totalStudents: number;
}

export function PostEngagementCard({ post, totalStudents }: PostEngagementCardProps) {
  const getTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      'COMUNICADO': MessageSquare,
      'MATERIAL': BookOpen,
      'ATIVIDADE': Target,
      'AVISOS': AlertCircle,
    };
    return icons[type] || BookOpen;
  };

  const getProgressGradient = (rate: number) => {
    if (rate >= 70) return "bg-gradient-to-r from-green-500 via-green-400 to-green-300";
    if (rate >= 40) return "bg-gradient-to-r from-amber-500 to-amber-400";
    return "bg-gradient-to-r from-red-500 to-red-400";
  };

  const getPriorityVariant = (rate: number): "default" | "secondary" | "destructive" => {
    if (rate < 50) return "destructive";
    if (rate < 70) return "secondary";
    return "default";
  };

  const getPriorityLabel = (rate: number) => {
    if (rate < 50) return "🔴 URGENTE";
    if (rate < 70) return "🟡 ATENÇÃO";
    return "🟢 OK";
  };

  const TypeIcon = getTypeIcon(post.post_type);

  return (
    <Card className="glassmorphism group hover:border-primary/30 hover:shadow-[0_0_20px_hsl(var(--primary)/0.15)] transition-all">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-lg bg-primary/20 shrink-0">
            <TypeIcon className="h-4 w-4 text-primary" />
          </div>
          
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-lg line-clamp-1">{post.post_title}</h4>
            <p className="text-xs text-muted-foreground">
              {post.class_name} • {post.post_type}
            </p>
          </div>
        </div>
        
        <Badge variant={getPriorityVariant(post.read_rate)} className="shrink-0">
          {getPriorityLabel(post.read_rate)}
        </Badge>
      </CardHeader>
      
      <CardContent>
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Taxa de Leitura
            </span>
            <span className="text-sm font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {post.read_rate}%
            </span>
          </div>
          
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-3 bg-muted rounded-full overflow-hidden cursor-help">
                  <div 
                    className={cn(
                      "h-full transition-all duration-700",
                      getProgressGradient(post.read_rate)
                    )}
                    style={{ width: `${post.read_rate}%` }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {post.unique_readers} de {totalStudents} alunos leram ({post.read_rate}%)
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-xs">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 p-2 bg-muted/50 rounded cursor-help">
                  <Eye className="h-3 w-3 text-cyan-400" />
                  <span>{post.unique_readers}/{totalStudents}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Leitores únicos</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 p-2 bg-muted/50 rounded cursor-help">
                  <Clock className="h-3 w-3 text-amber-400" />
                  <span>{post.total_reads}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Total de leituras</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 p-2 bg-muted/50 rounded cursor-help">
                  <Users className="h-3 w-3 text-green-400" />
                  <span>{totalStudents - post.unique_readers}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Não leram ainda</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
