import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { CadastrosModal } from '@/components/admin/CadastrosModal';
import {
  LayoutDashboard,
  Rss,
  Plus,
  Calendar,
  Users,
  History,
  BookOpen,
  PlusCircle,
  ClipboardList,
  LogOut,
  Settings,
  Layers,
  Target,
  FileText,
  UserCog,
  Gift,
  Store,
  ListTodo,
  Sparkles,
  Shield,
  BarChart3,
} from 'lucide-react';

const menuItems = {
  administrador: [
    { title: 'Dashboard Admin', url: '/admin/dashboard', icon: LayoutDashboard },
    { title: 'Inteligência', url: '/admin/analytics', icon: BarChart3 },
    { title: 'Gerenciar Secretarias', url: '/admin/gerenciar-secretarias', icon: Shield },
    { title: 'Histórico', url: '/secretaria/historico', icon: History },
    { title: 'Calendário', url: '/secretaria/calendario', icon: Calendar },
    { title: 'Recompensas', url: '/secretaria/gerenciar-recompensas', icon: Gift },
    { title: 'Desafios', url: '/secretaria/gerenciar-desafios', icon: Target },
  ],
  administradorCadastros: [
    { title: 'Programas', url: '/secretaria/cadastros/programas', icon: Target },
    { title: 'Catálogo Global', url: '/secretaria/cadastros/catalogo', icon: BookOpen },
    { title: 'Alunos', url: '/secretaria/cadastros/alunos', icon: Users },
    { title: 'Professores', url: '/secretaria/cadastros/professores', icon: UserCog },
    { title: 'Turmas', url: '/secretaria/turmas', icon: Users },
  ],
  secretaria: [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Feed', url: '/secretaria/feed', icon: Rss },
    { title: 'Calendário', url: '/secretaria/calendario', icon: Calendar },
    { title: 'Recompensas', url: '/secretaria/gerenciar-recompensas', icon: Gift },
    { title: 'Desafios', url: '/secretaria/gerenciar-desafios', icon: Target },
    { title: 'Histórico', url: '/secretaria/historico', icon: History },
  ],
  secretariaCadastros: [
    { title: 'Programas', url: '/secretaria/cadastros/programas', icon: Target },
    { title: 'Catálogo Global', url: '/secretaria/cadastros/catalogo', icon: BookOpen },
    { title: 'Alunos', url: '/secretaria/cadastros/alunos', icon: Users },
    { title: 'Professores', url: '/secretaria/cadastros/professores', icon: UserCog },
    { title: 'Turmas', url: '/secretaria/turmas', icon: Users },
  ],
  professor: [
    { title: 'Dashboard', url: '/professor/dashboard', icon: LayoutDashboard },
    { title: 'Feed', url: '/professor/feed', icon: Rss },
    { title: 'Minhas Turmas', url: '/professor/turmas', icon: BookOpen },
    { title: 'Atividades', url: '/professor/atividades', icon: ClipboardList },
    { title: 'Calendário', url: '/professor/calendario', icon: Calendar },
  ],
  aluno: [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Feed', url: '/aluno/feed', icon: Rss },
    { title: 'Nexus', url: '/aluno/nexus', icon: Sparkles },
    { title: 'Minhas Atividades', url: '/minhas-atividades', icon: ListTodo },
    { title: 'Calendário', url: '/aluno/calendario', icon: Calendar },
    { title: 'Loja de Recompensas', url: '/aluno/loja-recompensas', icon: Store },
  ],
};

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const [cadastrosModalOpen, setCadastrosModalOpen] = useState(false);

  if (!user) return null;

  const items = menuItems[user.role as keyof typeof menuItems] || [];
  const cadastrosItems = (user.role === 'secretaria' || user.role === 'administrador') 
    ? menuItems[`${user.role}Cadastros` as keyof typeof menuItems] || []
    : [];
  const isActive = (path: string) => {
    if (path === '/secretaria/cadastros/catalogo') {
      return currentPath.startsWith('/secretaria/cadastros/catalogo');
    }
    if (path === '/secretaria/calendario') {
      return currentPath === '/secretaria/calendario' || currentPath === '/calendario';
    }
    return currentPath === path;
  };
  const isCollapsed = state === 'collapsed';

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'bg-primary/20 text-primary border border-primary/30 neon-glow'
      : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground';

  return (
    <Sidebar
      className={`${isCollapsed ? 'w-14' : 'w-60'} glass border-r border-border/50`}
      collapsible="icon"
    >
      <SidebarContent className="bg-transparent">
        <div className="p-4">
          <SidebarTrigger className="mb-4" />
          {!isCollapsed && (
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold gradient-text">Comunika</h2>
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClass}>
                      <item.icon className={`h-4 w-4 ${isActive(item.url) ? 'animate-glow-pulse' : ''}`} />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user.role === 'secretaria' && cadastrosItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
              Cadastros
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {cadastrosItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavClass}>
                        <item.icon className={`h-4 w-4 ${isActive(item.url) ? 'animate-glow-pulse' : ''}`} />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {user.role === 'administrador' && cadastrosItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
              Cadastros
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                      onClick={() => setCadastrosModalOpen(true)}
                    >
                      <Target className="h-4 w-4" />
                      {!isCollapsed && <span>Abrir Cadastros</span>}
                    </Button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <div className="mt-auto p-4">
          <SidebarMenuButton
            onClick={logout}
            className="w-full text-destructive hover:bg-destructive/20 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span>Sair</span>}
          </SidebarMenuButton>
        </div>
      </SidebarContent>

      <CadastrosModal 
        open={cadastrosModalOpen} 
        onOpenChange={setCadastrosModalOpen} 
      />
    </Sidebar>
  );
}