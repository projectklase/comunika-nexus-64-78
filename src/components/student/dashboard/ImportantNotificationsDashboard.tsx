import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Star, Calendar, ArrowRight, Clock } from 'lucide-react';
import { Post } from '@/types/post';
import { format, isToday } from 'date-fns';
import { resolveNotificationTarget } from '@/utils/resolve-notification-target';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface ImportantNotificationsDashboardProps {
  posts: Post[];
}

export function ImportantNotificationsDashboard({ posts }: ImportantNotificationsDashboardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const importantPosts = useMemo(() => {
    return posts
      .filter(post => post.meta?.important === true)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3); // Show only the 3 most recent important posts
  }, [posts]);

  const handleNotificationClick = (post: Post) => {
    if (!user) return;

    // Create a compatible notification object for the resolver
    const notificationData = {
      id: post.id,
      type: 'POST_IMPORTANT' as const,
      title: post.title,
      message: '',
      roleTarget: 'ALUNO' as const,
      isRead: false,
      createdAt: post.createdAt,
      userId: user?.id || 'system',
      meta: {
        postId: post.id,
        postType: post.type,
        dueDate: post.dueAt,
        eventStartAt: post.eventStartAt,
        classId: post.classId
      }
    };

    const target = resolveNotificationTarget(notificationData, user.role);
    navigate(target.url);
  };

  const getPostIcon = (type: string) => {
    switch (type) {
      case 'EVENTO':
        return <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
      case 'PROVA':
      case 'TRABALHO':
      case 'ATIVIDADE':
        return <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
      default:
        return <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
    }
  };

  const getDateDisplay = (post: Post) => {
    const dateStr = post.dueAt || post.eventStartAt;
    if (!dateStr) return 'Sem data definida';

    const date = new Date(dateStr);
    if (isToday(date)) {
      return `Hoje • ${format(date, 'HH:mm')}`;
    }
    
    return format(date, 'dd/MM • HH:mm');
  };

  if (importantPosts.length === 0) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Star className="h-4 w-4 sm:h-5 sm:w-5 text-[hsl(var(--golden))]" />
            Importantes
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Comunicações marcadas como importantes
          </CardDescription>
        </CardHeader>
        <CardContent className="py-6 sm:py-8 px-4 sm:px-6">
          <div className="text-center">
            <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-xs sm:text-sm text-muted-foreground">
              Nenhuma notificação importante no momento
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Star className="h-4 w-4 sm:h-5 sm:w-5 text-[hsl(var(--golden))]" />
          Importantes
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Últimas comunicações marcadas como importantes
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-2 sm:space-y-3 px-4 sm:px-6">
        {importantPosts.map((post) => (
          <div
            key={post.id}
            className={cn(
              "relative overflow-hidden p-3 sm:p-4 rounded-lg border cursor-pointer transition-all duration-200",
              "border-[hsl(var(--golden))] bg-[hsl(var(--golden))]/5",
              "hover:shadow-[var(--golden-glow)] hover:border-[hsl(var(--golden-light))]",
              "before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-[hsl(var(--golden))]/10 before:to-transparent before:pointer-events-none",
              "glass-subtle"
            )}
            onClick={() => handleNotificationClick(post)}
          >
            <div className="relative z-10 flex items-start gap-2 sm:gap-3">
              <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[hsl(var(--golden))]/20 border border-[hsl(var(--golden))]/30 flex-shrink-0">
                {getPostIcon(post.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-[hsl(var(--golden))]/20 text-[hsl(var(--golden-light))] border-[hsl(var(--golden))]/60"
                  >
                    {post.type}
                  </Badge>
                  <Badge className="bg-[hsl(var(--golden))]/20 text-[hsl(var(--golden-light))] border-[hsl(var(--golden))]/60 text-xs font-medium shadow-[var(--golden-glow)] backdrop-blur-sm hidden sm:flex">
                    <Star className="h-3 w-3 mr-1 fill-[hsl(var(--golden-light))]" />
                    Importante
                  </Badge>
                </div>
                
                <h4 className="font-medium text-sm text-foreground mb-1 truncate">
                  {post.title}
                </h4>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{getDateDisplay(post)}</span>
                  {post.classId && (
                    <span className="hidden sm:inline">Turma {post.classId.slice(-4)}</span>
                  )}
                </div>
              </div>
              
              <ArrowRight className="h-4 w-4 text-[hsl(var(--golden))] opacity-70 flex-shrink-0" />
            </div>
          </div>
        ))}
        
        {/* View All Button */}
        <div className="pt-2 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-xs text-muted-foreground hover:text-foreground min-h-11"
            onClick={() => navigate('/notifications')}
          >
            Ver todas as notificações
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}