import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardCard } from '@/components/Dashboard/DashboardCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePosts } from '@/hooks/usePosts'; // Assumindo que este hook busca posts do Supabase
import { useNavigate } from 'react-router-dom';
import { PostPreviewCard } from '@/components/dashboard/PostPreviewCard';
import { PostComposer } from '@/components/feed/PostComposer';
import { PostInput, PostType } from '@/types/post';
import { useToast } from '@/hooks/use-toast';
import { PostLinkBuilder, UserRole } from '@/utils/post-links';
import { Bell, Calendar, Users, FileText, Plus } from 'lucide-react';

// CORREÇÃO: Importar o cliente Supabase e o serviço de notificações
import { supabase } from '@/lib/supabaseClient'; 
import { addNotification } from '@/stores/notification-store'; // O nosso novo serviço de notificações

const Dashboard = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { posts, invalidate: invalidatePosts } = usePosts(); // Assumindo que seu hook usePosts retorna uma função para invalidar/refazer a busca
  const { toast } = useToast();
  const [showComposer, setShowComposer] = useState(false);
  
  // CORREÇÃO: Estado para armazenar o número de turmas ativas
  const [activeClassesCount, setActiveClassesCount] = useState(0);

  // CORREÇÃO: Buscar dados agregados (como turmas ativas) do Supabase ao carregar
  useEffect(() => {
    const fetchDashboardData = async () => {
      // Busca a contagem de turmas ativas
      const { count, error } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Ativa');

      if (error) {
        console.error('Erro ao buscar contagem de turmas:', error);
      } else if (count !== null) {
        setActiveClassesCount(count);
      }
    };

    if (user?.role === 'secretaria') {
      fetchDashboardData();
    }
  }, [user]);


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-4">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  const getButtonConfig = () => {
    switch (user.role) {
      case 'secretaria':
        return { show: true, label: 'Novo Post', allowedTypes: ['AVISO', 'COMUNICADO', 'EVENTO'] as PostType[] };
      case 'professor':
        return { show: true, label: 'Nova Atividade', allowedTypes: ['ATIVIDADE'] as PostType[] };
      default:
        return { show: false, label: '', allowedTypes: [] };
    }
  };

  const buttonConfig = getButtonConfig();

  // CORREÇÃO: Função handleCreatePost totalmente reescrita
  const handleCreatePost = async (postInput: PostInput) => {
    if (!user) return;

    try {
      // 1. Salva o novo post no Supabase
      const { data: newPost, error: postError } = await supabase
        .from('posts')
        .insert({
          ...postInput,
          author_id: user.id,
          author_name: user.name,
          // Mapeie outros campos se necessário (ex: class_ids para postInput.classIds)
        })
        .select()
        .single();
      
      if (postError) throw postError;

      // 2. Cria uma notificação sobre o novo post (usando nosso novo serviço)
      //    Você pode customizar a lógica para quem recebe a notificação (ex: todos os alunos)
      await addNotification({
        user_id: user.id, // Ou o ID do usuário alvo
        title: `Novo Post: ${newPost.title}`,
        message: `Um novo post foi publicado por ${user.name}.`,
        type: 'POST_NEW',
        role_target: 'ALUNO', // Exemplo: notificar todos os alunos
        link: PostLinkBuilder.buildPostUrl(newPost, 'aluno'),
      });
      
      // 3. Fecha o composer, mostra o toast e invalida os dados para atualizar a lista
      setShowComposer(false);
      toast({
        title: "Post criado com sucesso",
        description: "Seu post foi publicado e a notificação enviada.",
      });
      invalidatePosts(); // Atualiza a lista de posts na tela

    } catch (error) {
      console.error('Erro ao criar post:', error);
      toast({
        title: "Erro ao criar post",
        description: "Ocorreu um erro ao salvar seu post. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const renderSecretariaDashboard = () => {
    // CORREÇÃO: Lógica de "não lidos" simplificada para não usar localStorage.
    // Uma implementação completa usaria uma tabela de 'leituras' no Supabase.
    // Por agora, vamos contar os avisos das últimas 24h como "novos".
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const unreadAnnouncements = posts.filter(p => 
      (p.type === 'AVISO' || p.type === 'COMUNICADO') && 
      p.status === 'PUBLISHED' &&
      new Date(p.created_at) > new Date(twentyFourHoursAgo)
    ).length;

    const upcomingEvents = posts.filter(p => p.type === 'EVENTO' && p.event_start_at && new Date(p.event_start_at) > new Date()).sort((a,b) => new Date(a.event_start_at).getTime() - new Date(b.event_start_at).getTime());
    const latestPosts = [...posts].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3);

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard title="Novos Avisos" value={unreadAnnouncements} icon={Bell} variant="primary" description="Últimas 24 horas" />
          <DashboardCard title="Próximos Eventos" value={upcomingEvents.length} icon={Calendar} variant="secondary" />
          {/* CORREÇÃO: Usando o valor real do Supabase */}
          <DashboardCard title="Turmas Ativas" value={activeClassesCount} icon={Users} variant="success" description="Contagem real" />
          <DashboardCard title="Total de Posts" value={posts.length} icon={FileText} />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {/* O resto do JSX para listar os posts e eventos permanece o mesmo */}
          <Card className="glass-card">
            <CardHeader><CardTitle>Últimas Publicações</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {latestPosts.map((post) => (
                <PostPreviewCard 
                  key={post.id}
                  post={post}
                  onClick={() => navigate(PostLinkBuilder.buildPostUrl(post, user.role as UserRole))}
                />
              ))}
            </CardContent>
          </Card>
          <Card className="glass-card">
             <CardHeader><CardTitle>Próximos Eventos</CardTitle></CardHeader>
             <CardContent className="space-y-3">
               {upcomingEvents.slice(0,3).map((event) => (
                 <div key={event.id} className="flex items-center gap-3 p-3 glass rounded-lg cursor-pointer" onClick={() => navigate(PostLinkBuilder.buildPostUrl(event, user.role as UserRole))}>
                   <div className="flex-1">
                     <p className="font-medium text-sm">{event.title}</p>
                     <p className="text-xs text-muted-foreground">{new Date(event.event_start_at).toLocaleDateString('pt-BR')}</p>
                   </div>
                 </div>
               ))}
             </CardContent>
           </Card>
        </div>
      </div>
    );
  };

  // O resto do seu componente (renderDashboard, return principal) permanece praticamente o mesmo.
  // Colei aqui para garantir que o arquivo fique completo e sem erros.
  
  const renderDashboard = () => {
    switch (user.role) {
      case 'secretaria':
        return renderSecretariaDashboard();
      // ... outras roles
      default:
        // Redirecionamento para outros dashboards ou mensagem de erro
        const dashboardPath = `/${user.role}/dashboard`;
        navigate(dashboardPath);
        return <div>Redirecionando...</div>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
          <p className="text-muted-foreground">Bem-vindo ao seu painel de controle, {user.name}</p>
        </div>
        {buttonConfig.show && (
          <Button onClick={() => user.role === 'professor' ? navigate('/professor/atividades/nova') : setShowComposer(true)}>
            <Plus className="h-4 w-4 mr-2" />{buttonConfig.label}
          </Button>
        )}
      </div>
      {renderDashboard()}
      <Dialog open={showComposer} onOpenChange={setShowComposer}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{buttonConfig.label}</DialogTitle></DialogHeader>
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