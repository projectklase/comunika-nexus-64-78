import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSchool } from "@/contexts/SchoolContext";
import { DashboardCard } from "@/components/Dashboard/DashboardCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePosts } from "@/hooks/usePosts";
import { useNavigate } from "react-router-dom";
import { PostPreviewCard } from "@/components/dashboard/PostPreviewCard";
import { PostComposer } from "@/components/feed/PostComposer";
import { PostInput, PostType } from "@/types/post";
import { PostLinkBuilder, UserRole } from "@/utils/post-links";
import { Bell, Calendar, Users, FileText, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePostActions } from "@/hooks/usePostActions";
import { getRoleRoutePrefix } from "@/utils/auth-helpers";

const Dashboard = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { currentSchool } = useSchool();
  const navigate = useNavigate();
  const [showComposer, setShowComposer] = useState(false);
  const [activeClassesCount, setActiveClassesCount] = useState(0);

  // CORREÇÃO: TODOS os hooks devem ser declarados no topo, antes de qualquer early return
  const { posts, isLoading: isLoadingPosts, invalidate: invalidatePosts } = usePosts();
  const { createPost, isLoading: isCreatingPost } = usePostActions();

  useEffect(() => {
    const fetchDashboardData = async () => {
      // 🔒 GUARD: Bloquear se não tiver escola definida
      if (!currentSchool?.id) {
        console.error('[Dashboard] ⚠️ Tentativa de buscar turmas sem currentSchool definido!');
        setActiveClassesCount(0);
        return;
      }

      const { count, error } = await supabase
        .from("classes")
        .select("*", { count: "exact", head: true })
        .eq("status", "Ativa")
        .eq("school_id", currentSchool.id); // ✅ FILTRO CRÍTICO ADICIONADO

      if (error) {
        console.error("Erro ao buscar contagem de turmas:", error);
      } else if (count !== null) {
        console.log('🔵 [Dashboard] Contagem de turmas ativas:', count, 'para escola:', currentSchool.name);
        setActiveClassesCount(count);
      }
    };

    if (user?.role === "secretaria" && currentSchool) {
      fetchDashboardData();
    }
  }, [user, currentSchool]);

  // Redirecionar roles que têm dashboards específicos
  useEffect(() => {
    if (!user || isAuthLoading) return;

    // Apenas secretaria usa este Dashboard.tsx
    if (user.role !== 'secretaria') {
      const routePrefix = getRoleRoutePrefix(user.role);
      const targetPath = `/${routePrefix}/dashboard`;
      
      // Evitar loop infinito
      if (window.location.pathname !== targetPath) {
        navigate(targetPath, { replace: true });
      }
    }
  }, [user, isAuthLoading, navigate]);

  // Juntando os dois 'isLoading' para uma experiência de carregamento unificada
  if (isAuthLoading || isLoadingPosts) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-4">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  const getButtonConfig = () => {
    switch (user.role) {
      case "secretaria":
        return { show: true, label: "Novo Post", allowedTypes: ["AVISO", "COMUNICADO", "EVENTO"] as PostType[] };
      case "professor":
        return { show: true, label: "Nova Atividade", allowedTypes: ["ATIVIDADE"] as PostType[] };
      default:
        return { show: false, label: "", allowedTypes: [] };
    }
  };

  const buttonConfig = getButtonConfig();

  const handleCreatePost = async (postInput: PostInput) => {
    if (!user) return;
    
    const success = await createPost(postInput, user.name);
    
    if (success) {
      setShowComposer(false);
      invalidatePosts();
    }
  };

  const renderSecretariaDashboard = () => {
    // A lógica de filtragem agora usa a variável 'posts' que vem direto do hook
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const unreadAnnouncements = posts.filter(
      (p) =>
        (p.type === "AVISO" || p.type === "COMUNICADO") &&
        p.status === "PUBLISHED" &&
        new Date(p.createdAt) > new Date(twentyFourHoursAgo), // Usando createdAt camelCase
    ).length;

    const upcomingEvents = posts
      .filter((p) => p.type === "EVENTO" && p.eventStartAt && new Date(p.eventStartAt) > new Date())
      .sort((a, b) => new Date(a.eventStartAt).getTime() - new Date(b.eventStartAt).getTime());
    const latestPosts = [...posts].slice(0, 3); // O hook já retorna os posts ordenados

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md-grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Novos Avisos"
            value={unreadAnnouncements}
            icon={Bell}
            variant="primary"
            description="Últimas 24 horas"
          />
          <DashboardCard title="Próximos Eventos" value={upcomingEvents.length} icon={Calendar} variant="secondary" />
          <DashboardCard
            title="Turmas Ativas"
            value={activeClassesCount}
            icon={Users}
            variant="success"
            description="Contagem real"
          />
          <DashboardCard title="Total de Posts" value={posts.length} icon={FileText} />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Últimas Publicações</CardTitle>
            </CardHeader>
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
            <CardHeader>
              <CardTitle>Próximos Eventos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingEvents.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 glass rounded-lg cursor-pointer"
                  onClick={() => navigate(PostLinkBuilder.buildPostUrl(event, user.role as UserRole))}
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{event.title}</p>
                    {/* Adicionado verificação para event.eventStartAt antes de formatar */}
                    <p className="text-xs text-muted-foreground">
                      {event.eventStartAt ? new Date(event.eventStartAt).toLocaleDateString("pt-BR") : "Data a definir"}
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
      case "secretaria":
        return renderSecretariaDashboard();
      default:
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
          <Button
            onClick={() => (user.role === "professor" ? navigate("/professor/atividades/nova") : setShowComposer(true))}
          >
            <Plus className="h-4 w-4 mr-2" />
            {buttonConfig.label}
          </Button>
        )}
      </div>
      {renderDashboard()}
      <Dialog open={showComposer} onOpenChange={setShowComposer}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{buttonConfig.label}</DialogTitle>
          </DialogHeader>
          <PostComposer
            allowedTypes={buttonConfig.allowedTypes}
            onSubmit={handleCreatePost}
            onCancel={() => setShowComposer(false)}
            isLoading={isCreatingPost}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
