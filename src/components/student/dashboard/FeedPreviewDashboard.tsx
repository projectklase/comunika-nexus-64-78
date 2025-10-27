import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Newspaper, ArrowRight, Calendar, Clock, FileText, Bell, BookOpen, AlertCircle } from 'lucide-react';
import { Post } from '@/types/post';
import { format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/constants/routes';

interface FeedPreviewDashboardProps {
  posts: Post[];
  onOpenPost: (post: Post) => void;
}

export function FeedPreviewDashboard({ posts, onOpenPost }: FeedPreviewDashboardProps) {
  const navigate = useNavigate();

  const recentPosts = useMemo(() => {
    return posts
      .filter(post => post.status === 'PUBLISHED')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
  }, [posts]);

  const getPostIcon = (type: string) => {
    switch (type) {
      case 'PROVA':
        return <AlertCircle className="h-4 w-4" />;
      case 'TRABALHO':
        return <FileText className="h-4 w-4" />;
      case 'ATIVIDADE':
        return <BookOpen className="h-4 w-4" />;
      case 'EVENTO':
        return <Calendar className="h-4 w-4" />;
      case 'AVISO':
      case 'COMUNICADO':
        return <Bell className="h-4 w-4" />;
      default:
        return <Newspaper className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PROVA':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'TRABALHO':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'ATIVIDADE':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'EVENTO':
        return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'AVISO':
      case 'COMUNICADO':
        return 'bg-info/10 text-info border-info/20';
      default:
        return 'bg-muted/50 text-muted-foreground border-border';
    }
  };

  const getDateDisplay = (post: Post) => {
    const date = new Date(post.createdAt);
    if (isToday(date)) {
      return `Hoje • ${format(date, 'HH:mm')}`;
    }
    return format(date, 'dd/MM • HH:mm');
  };

  const getContentPreview = (post: Post) => {
    // Since Post doesn't have content property, we'll show the type as description
    const descriptions: Record<string, string> = {
      PROVA: 'Avaliação marcada para esta data',
      TRABALHO: 'Trabalho para entrega',
      ATIVIDADE: 'Atividade para realizar',
      EVENTO: 'Evento programado',
      COMUNICADO: 'Comunicado importante',
      AVISO: 'Aviso geral'
    };
    return descriptions[post.type] || 'Nova publicação';
  };

  if (recentPosts.length === 0) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            Últimas Atualizações
          </CardTitle>
          <CardDescription>
            Novos posts e comunicados
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <Newspaper className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma atualização recente
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          Últimas Atualizações
        </CardTitle>
        <CardDescription>
          Novos posts e comunicados da sua escola
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {recentPosts.map((post) => (
          <div
            key={post.id}
            className={cn(
              "relative overflow-hidden p-4 rounded-lg border cursor-pointer transition-all duration-200",
              "hover:bg-muted/30 hover:border-primary/30 hover:shadow-md",
              "glass-subtle"
            )}
            onClick={() => onOpenPost(post)}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg border",
                getTypeColor(post.type)
              )}>
                {getPostIcon(post.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                  >
                    {post.type}
                  </Badge>
                  {post.meta?.importante && (
                    <Badge 
                      className="text-xs bg-[hsl(var(--golden))]/20 text-[hsl(var(--golden))] border-[hsl(var(--golden))]/30"
                    >
                      ⭐ Importante
                    </Badge>
                  )}
                </div>
                
                <h4 className="font-medium text-sm text-foreground mb-1 truncate">
                  {post.title}
                </h4>
                
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {getContentPreview(post)}
                </p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {getDateDisplay(post)}
                  </div>
                  {post.classId && (
                    <span>Turma {post.classId.slice(-4)}</span>
                  )}
                </div>
              </div>
              
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-70 flex-shrink-0" />
            </div>
          </div>
        ))}
        
        {/* View All Button */}
        <div className="pt-2 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate(ROUTES.ALUNO.FEED)}
          >
            Ver tudo no Feed
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}