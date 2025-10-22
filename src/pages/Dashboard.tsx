import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardCard } from "@/components/Dashboard/DashboardCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePosts } from "@/hooks/usePosts";
import { useNavigate } from "react-router-dom";
import { PostPreviewCard } from "@/components/dashboard/PostPreviewCard";
import { PostComposer } from "@/components/feed/PostComposer";
import { PostInput, PostType } from "@/types/post";
import { useToast } from "@/hooks/use-toast";
import { PostLinkBuilder, UserRole } from "@/utils/post-links";
import { Bell, Calendar, Users, FileText, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notificationStore, RoleTarget } from "@/stores/notification-store";

const Dashboard = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showComposer, setShowComposer] = useState(false);
  const [activeClassesCount, setActiveClassesCount] = useState(0);
  const { posts, isLoading: isLoadingPosts, invalidate: invalidatePosts } = usePosts();

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { count, error } = await supabase
        .from("classes")
        .select("*", { count: "exact", head: true })
        .eq("status", "Ativa");

      if (error) {
        console.error("Erro ao buscar contagem de turmas:", error);
      } else if (count !== null) {
        setActiveClassesCount(count);
      }
    };

    if (user?.role === "secretaria") {
      fetchDashboardData();
    }
  }, [user]);

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

  const getRecipients = async (audience: string, classIds?: string[]): Promise<{ id: string; role: string }[]> => {
    if (audience === "TURMAS" && classIds && classIds.length > 0) {
      // Buscar alunos das turmas selecionadas
      const { data: students, error: studentsError } = await supabase
        .from("class_students")
        .select("student_id")
        .in("class_id", classIds);

      if (studentsError) {
        console.error("Erro ao buscar alunos das turmas:", studentsError);
        throw studentsError;
      }

      // Buscar professores principais das turmas
      const { data: classes, error: classesError } = await supabase
        .from("classes")
        .select("main_teacher_id")
        .in("id", classIds);

      if (classesError) {
        console.error("Erro ao buscar professores das turmas:", classesError);
        throw classesError;
      }

      // Coletar IDs únicos
      const recipientIds = new Set<string>();
      students?.forEach(s => s.student_id && recipientIds.add(s.student_id));
      classes?.forEach(c => c.main_teacher_id && recipientIds.add(c.main_teacher_id));

      // Buscar roles dos usuários
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", Array.from(recipientIds));

      if (rolesError) throw rolesError;

      return userRoles?.map(ur => ({ 
        id: ur.user_id, 
        role: ur.role.toUpperCase() 
      })) || [];
    } else if (audience === "GLOBAL") {
      // Buscar todos alunos e professores
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["aluno", "professor"]);

      if (error) throw error;
      return data?.map(ur => ({ 
        id: ur.user_id, 
        role: ur.role.toUpperCase() 
      })) || [];
    } else if (audience === "PROFESSORES") {
      // Buscar todos professores
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "professor");

      if (error) throw error;
      return data?.map(ur => ({ 
        id: ur.user_id, 
        role: ur.role.toUpperCase() 
      })) || [];
    }

    return [];
  };

  const handleCreatePost = async (postInput: PostInput) => {
    if (!user) return;

    try {
      // 1. Inserir o post no Supabase
      const { data: newPostData, error: postError } = await supabase
        .from("posts")
        .insert([
          {
            author_id: user.id,
            author_name: user.name || "Admin",
            author_role: user.role || "SECRETARIA",
            audience: postInput.audience,
            body: postInput.body,
            title: postInput.title,
            type: postInput.type,
            status: postInput.status,
            class_id: postInput.classId || null,
            class_ids: postInput.classIds || [],
            due_at: postInput.dueAt || null,
            event_start_at: postInput.eventStartAt || null,
            event_end_at: postInput.eventEndAt || null,
            activity_meta: postInput.activityMeta as any,
            attachments: postInput.attachments as any,
            meta: postInput.meta as any,
          },
        ])
        .select()
        .single();

      if (postError) throw postError;

      // 2. Buscar todos os destinatários com base no público-alvo
      const recipients = await getRecipients(postInput.audience, postInput.classIds);

      if (recipients.length === 0) {
        console.warn("Nenhum destinatário encontrado para este post.", postInput);
      }

      // 3. Criar uma lista de promessas de notificação
      const notificationPromises = recipients.map((recipient) => {
        const targetRole = recipient.role.toLowerCase() as UserRole;
        const postLink = PostLinkBuilder.buildPostUrl(newPostData as any, targetRole);

        return notificationStore.add({
          userId: recipient.id,
          title: `Novo Post: ${newPostData.title}`,
          message: `Um novo post foi publicado por ${user.name || "Secretaria"}.`,
          type: "POST_NEW",
          roleTarget: recipient.role as RoleTarget,
          link: postLink,
        });
      });

      // 4. Executar todas as promessas em paralelo
      await Promise.all(notificationPromises);
      
      setShowComposer(false);
      toast({
        title: "Post criado com sucesso",
        description: `Seu post foi publicado e enviado para ${recipients.length} destinatários.`,
      });
      
      invalidatePosts();
    } catch (error) {
      console.error("Erro ao criar post ou notificações:", error);
      toast({
        title: "Erro ao criar post",
        description: "Ocorreu um erro ao salvar seu post ou enviar as notificações. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const renderSecretariaDashboard = () => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const unreadAnnouncements = posts.filter(
      (p) =>
        (p.type === "AVISO" || p.type === "COMUNICADO") &&
        p.status === "PUBLISHED" &&
        new Date(p.createdAt) > new Date(twentyFourHoursAgo),
    ).length;

    const upcomingEvents = posts
      .filter((p) => p.type === "EVENTO" && p.eventStartAt && new Date(p.eventStartAt) > new Date())
      .sort((a, b) => new Date(a.eventStartAt).getTime() - new Date(b.eventStartAt).getTime());
    
    const latestPosts = [...posts].slice(0, 3);

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
        const dashboardPath = `/${user.role}/dashboard`;
        if (window.location.pathname !== dashboardPath) {
          navigate(dashboardPath);
        }
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
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
