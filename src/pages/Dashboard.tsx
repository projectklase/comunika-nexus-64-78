import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardCard } from '@/components/Dashboard/DashboardCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// Mock data imports removed - now using Supabase data
import { usePosts } from '@/hooks/usePosts';
import { getLastSeen } from '@/stores/last-seen';
import { isUpcomingEvent, recentPosts, lastN, sortDesc } from '@/stores/post-selectors';
import { useNavigate } from 'react-router-dom';
import { PostPreviewCard } from '@/components/dashboard/PostPreviewCard';
import { ActivityFilters } from '@/components/activities/ActivityFilters';
import { useActivityFilters } from '@/hooks/useActivityFilters';
import { PostComposer } from '@/components/feed/PostComposer';
import { postStore } from '@/stores/post-store';
import { PostInput, PostType } from '@/types/post';
import { useToast } from '@/hooks/use-toast';
import { PostLinkBuilder, UserRole } from '@/utils/post-links';
import { NotificationTester } from '@/components/notifications/NotificationTester';
import { QuickNotificationTest } from '@/components/notifications/QuickNotificationTest';
import {
  Bell,
  Calendar,
  Users,
  FileText,
  Clock,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Activity,
  Plus,
} from 'lucide-react';

const Dashboard = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const posts = usePosts();
  const { toast } = useToast();
  const [showComposer, setShowComposer] = useState(false);

  console.log('Dashboard: user state:', user);
  console.log('Dashboard: isLoading state:', isLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="glass-card p-8 rounded-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('Dashboard: No user found, redirecting to login');
    navigate('/login');
    return null;
  }

  const getButtonConfig = () => {
    switch (user.role) {
      case 'secretaria':
        return {
          show: true,
          label: 'Novo Post',
          allowedTypes: ['AVISO', 'COMUNICADO', 'EVENTO'] as PostType[]
        };
      case 'professor':
        return {
          show: true,
          label: 'Nova Atividade',
          allowedTypes: ['ATIVIDADE'] as PostType[]
        };
      default:
        return { show: false, label: '', allowedTypes: [] };
    }
  };

  const buttonConfig = getButtonConfig();

  const handleCreatePost = (postInput: PostInput) => {
    if (!user) return;
    
    postStore.create(postInput, user.name);
    setShowComposer(false);
    toast({
      title: "Post criado com sucesso",
      description: "Seu post foi publicado no feed.",
    });
  };

  const renderSecretariaDashboard = () => {
    const lastSeen = getLastSeen('SECRETARIA');
    const unreadAnnouncements = posts.filter(p => 
      (p.type === 'AVISO' || p.type === 'COMUNICADO') && 
      p.status === 'PUBLISHED' && 
      (!lastSeen || new Date(p.createdAt) > lastSeen)
    ).length;
    const weekEvents = posts.filter(p => isUpcomingEvent(p)).length;
    const activeClasses = 0; // TODO: Implement with real data from Supabase
    const recentPostsCount = recentPosts(posts, 7).length;
    const latestPosts = lastN(posts, 3);
    const upcomingEvents = posts.filter(p => isUpcomingEvent(p)).sort(sortDesc).slice(0, 3);

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div onClick={() => {
            const url = PostLinkBuilder.buildFeedUrl('secretaria', undefined, 'AVISO,COMUNICADO');
            navigate(url);
          }} className="cursor-pointer">
            <DashboardCard
              title="Avisos Não Lidos"
              value={unreadAnnouncements}
              icon={Bell}
              variant="primary"
              description="Pendentes de aprovação"
            />
          </div>
          <div onClick={() => {
            const url = PostLinkBuilder.buildFeedUrl('secretaria', undefined, 'EVENTO');
            navigate(url);
          }} className="cursor-pointer">
            <DashboardCard
              title="Eventos da Semana"
              value={weekEvents}
              icon={Calendar}
              variant="secondary"
              description="Próximos 7 dias"
            />
          </div>
          <DashboardCard
            title="Turmas Ativas"
            value={activeClasses}
            icon={Users}
            variant="success"
            description="Ano letivo 2024"
          />
          <div onClick={() => {
            const url = PostLinkBuilder.buildFeedUrl('secretaria', undefined, undefined, '7d');
            navigate(url);
          }} className="cursor-pointer">
            <DashboardCard
              title="Posts Recentes"
              value={recentPostsCount}
              icon={FileText}
              description="Últimas publicações"
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Últimas Publicações
              </CardTitle>
              <CardDescription>Posts recentes no sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {latestPosts.map((post) => (
                <PostPreviewCard 
                  key={post.id}
                  post={post}
                  onClick={() => {
                    const url = PostLinkBuilder.buildPostUrl(post, user.role as UserRole);
                    navigate(url);
                  }}
                />
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-secondary" />
                Eventos da Semana
              </CardTitle>
              <CardDescription>Próximos eventos agendados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingEvents.map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-center gap-3 p-3 glass rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    const url = PostLinkBuilder.buildPostUrl(event, user.role as UserRole);
                    navigate(url);
                  }}
                >
                  <div className="w-2 h-2 bg-secondary rounded-full animate-glow-pulse"></div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-foreground">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.eventStartAt ? new Date(event.eventStartAt).toLocaleDateString('pt-BR') : 'Data não definida'}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    switch (user.role) {
      case 'secretaria':
        return renderSecretariaDashboard();
      case 'professor':
        navigate('/professor/dashboard');
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="glass-card p-8 rounded-xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Redirecionando...</p>
            </div>
          </div>
        );
      case 'aluno':
        navigate('/aluno/dashboard');
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="glass-card p-8 rounded-xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Redirecionando...</p>
            </div>
          </div>
        );
      default:
        return <div>Dashboard não encontrado para este perfil.</div>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao seu painel de controle, {user.name}
          </p>
        </div>
        
        {buttonConfig.show && (
          <Button
            onClick={() => user.role === 'professor' ? navigate('/professor/atividades/nova') : setShowComposer(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 hover:shadow-lg hover:shadow-primary/25"
          >
            <Plus className="h-4 w-4 mr-2" />
            {buttonConfig.label}
          </Button>
        )}
      </div>
      
      {renderDashboard()}

      <Dialog open={showComposer} onOpenChange={setShowComposer}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-card border-border/50">
          <DialogHeader>
            <DialogTitle className="gradient-text">
              {buttonConfig.label}
            </DialogTitle>
          </DialogHeader>
          <PostComposer
            allowedTypes={buttonConfig.allowedTypes}
            onSubmit={handleCreatePost}
            onCancel={() => setShowComposer(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;