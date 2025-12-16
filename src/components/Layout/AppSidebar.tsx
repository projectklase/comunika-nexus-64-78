import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { NavLink, useLocation } from 'react-router-dom';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { CadastrosModal } from '@/components/admin/CadastrosModal';
import { LayoutDashboard, Rss, Plus, Calendar, Users, History, BookOpen, PlusCircle, ClipboardList, LogOut, Settings, Layers, Target, FileText, UserCog, Gift, Store, ListTodo, Sparkles, Shield, BarChart3, User, Building2, Package, Sword, CreditCard, ChevronDown, HeadphonesIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import klaseLogoViolet from '@/assets/klase-logo-violet.png';
const menuItems = {
  administrador: [{
    title: 'Dashboard Admin',
    url: '/admin/dashboard',
    icon: LayoutDashboard
  }, {
    title: 'Inteligência',
    url: '/admin/analytics',
    icon: BarChart3
  }, {
    title: 'Feed',
    url: '/secretaria/feed',
    icon: Rss
  }, {
    title: 'Gerenciar Secretarias',
    url: '/admin/gerenciar-secretarias',
    icon: Shield
  }, {
    title: 'Gerenciar Escolas',
    url: '/admin/gerenciar-escolas',
    icon: Building2
  }, {
    title: 'Assinatura',
    url: '/admin/assinatura',
    icon: CreditCard
  }, {
    title: 'Histórico',
    url: '/secretaria/historico',
    icon: History
  }, {
    title: 'Calendário',
    url: '/secretaria/calendario',
    icon: Calendar
  }, {
    title: 'Eventos',
    url: '/secretaria/eventos',
    icon: Calendar
  }, {
    title: 'Recompensas',
    url: '/secretaria/gerenciar-recompensas',
    icon: Gift
  }, {
    title: 'Desafios',
    url: '/secretaria/gerenciar-desafios',
    icon: Target
  }, {
    title: 'Suporte',
    url: '/admin/suporte',
    icon: HeadphonesIcon
  }],
  administradorCadastros: [{
    title: 'Programas',
    url: '/secretaria/cadastros/programas',
    icon: Target
  }, {
    title: 'Catálogo Global',
    url: '/secretaria/cadastros/catalogo',
    icon: BookOpen
  }, {
    title: 'Alunos',
    url: '/secretaria/cadastros/alunos',
    icon: Users
  }, {
    title: 'Professores',
    url: '/secretaria/cadastros/professores',
    icon: UserCog
  }, {
    title: 'Turmas',
    url: '/secretaria/turmas',
    icon: Users
  }],
  secretaria: [{
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard
  }, {
    title: 'Feed',
    url: '/secretaria/feed',
    icon: Rss
  }, {
    title: 'Calendário',
    url: '/secretaria/calendario',
    icon: Calendar
  }, {
    title: 'Eventos',
    url: '/secretaria/eventos',
    icon: Calendar
  }, {
    title: 'Recompensas',
    url: '/secretaria/gerenciar-recompensas',
    icon: Gift
  }, {
    title: 'Desafios',
    url: '/secretaria/gerenciar-desafios',
    icon: Target
  }, {
    title: 'Suporte',
    url: '/admin/suporte',
    icon: HeadphonesIcon
  }],
  secretariaCadastros: [{
    title: 'Programas',
    url: '/secretaria/cadastros/programas',
    icon: Target
  }, {
    title: 'Catálogo Global',
    url: '/secretaria/cadastros/catalogo',
    icon: BookOpen
  }, {
    title: 'Alunos',
    url: '/secretaria/cadastros/alunos',
    icon: Users
  }, {
    title: 'Professores',
    url: '/secretaria/cadastros/professores',
    icon: UserCog
  }, {
    title: 'Turmas',
    url: '/secretaria/turmas',
    icon: Users
  }],
  professor: [{
    title: 'Dashboard',
    url: '/professor/dashboard',
    icon: LayoutDashboard
  }, {
    title: 'Feed',
    url: '/professor/feed',
    icon: Rss
  }, {
    title: 'Minhas Turmas',
    url: '/professor/turmas',
    icon: BookOpen
  }, {
    title: 'Atividades',
    url: '/professor/atividades',
    icon: ClipboardList
  }, {
    title: 'Calendário',
    url: '/professor/calendario',
    icon: Calendar
  }],
  // Itens do aluno ANTES do submenu Klase Kards
  alunoBeforeKards: [{
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard
  }, {
    title: 'Perfil',
    url: '/aluno/perfil',
    icon: User
  }, {
    title: 'Feed',
    url: '/aluno/feed',
    icon: Rss
  }, {
    title: 'Nexus',
    url: '/aluno/nexus',
    icon: Sparkles
  }],
  // Itens do aluno DEPOIS do submenu Klase Kards
  alunoAfterKards: [{
    title: 'Minhas Atividades',
    url: '/minhas-atividades',
    icon: ListTodo
  }, {
    title: 'Calendário',
    url: '/aluno/calendario',
    icon: Calendar
  }, {
    title: 'Loja de Recompensas',
    url: '/aluno/loja-recompensas',
    icon: Store
  }],
  aluno: [] // Mantido para compatibilidade
};
export function AppSidebar() {
  const {
    user,
    logout
  } = useAuth();
  const {
    state
  } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const [cadastrosModalOpen, setCadastrosModalOpen] = useState(false);
  const {
    getKoinsEnabled
  } = useSchoolSettings();
  const koinsEnabled = getKoinsEnabled();

  // Estado para submenu Klase Kards Arena - auto-expande se estiver nas rotas
  const isInKardsSection = currentPath.includes('/aluno/cartas') || currentPath.includes('/aluno/batalha');
  const [kardsOpen, setKardsOpen] = useState(isInKardsSection);
  if (!user) return null;
  const baseItems = menuItems[user.role as keyof typeof menuItems] || [];

  // Filter menu items based on feature flags
  const items = baseItems.filter(item => {
    // Hide "Loja de Recompensas" if Koins are disabled
    if (item.url.includes('loja-recompensas') && !koinsEnabled) return false;
    // Hide "Recompensas" (management) if Koins are disabled
    if (item.url.includes('gerenciar-recompensas') && !koinsEnabled) return false;
    // Hide "Desafios" if Koins are disabled (challenges give Koins)
    if (item.url.includes('gerenciar-desafios') && !koinsEnabled) return false;
    return true;
  });
  const cadastrosItems = user.role === 'secretaria' || user.role === 'administrador' ? menuItems[`${user.role}Cadastros` as keyof typeof menuItems] || [] : [];
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
  const getNavClass = ({
    isActive
  }: {
    isActive: boolean;
  }) => isActive ? 'bg-primary/20 text-primary border border-primary/30 neon-glow' : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground';
  return <Sidebar className={`${isCollapsed ? 'w-14' : 'w-60'} glass border-r border-border/50`} collapsible="icon">
      <SidebarContent className="bg-transparent">
        <div className="p-4">
          <SidebarTrigger className="mb-4" />
          {!isCollapsed && <div className="text-center mb-6">
              <img src={klaseLogoViolet} alt="Klase" className="h-12 w-auto mx-auto" />
              <p className="text-xs text-muted-foreground capitalize mt-1">{user.role}</p>
            </div>}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Para alunos: renderizar em ordem específica com submenu no meio */}
              {user.role === 'aluno' ? <>
                  {/* Itens antes do submenu */}
                  {menuItems.alunoBeforeKards.map(item => <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} className={getNavClass}>
                          <item.icon className={`h-4 w-4 ${isActive(item.url) ? 'animate-glow-pulse' : ''}`} />
                          {!isCollapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>)}
                  
                  {/* Submenu Klase Kards Arena */}
                  <Collapsible open={kardsOpen} onOpenChange={setKardsOpen}>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <CollapsibleTrigger className={isInKardsSection ? 'bg-primary/20 text-primary border border-primary/30 neon-glow' : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'}>
                          <Sword className={`h-4 w-4 ${isInKardsSection ? 'animate-glow-pulse' : ''}`} />
                          {!isCollapsed && <>
                              <span className="flex-1 text-left text-primary">Klase Kards Arena</span>
                              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", kardsOpen && "rotate-180")} />
                            </>}
                        </CollapsibleTrigger>
                      </SidebarMenuButton>
                      
                      <CollapsibleContent className="text-primary">
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={isActive('/aluno/cartas')}>
                              <NavLink to="/aluno/cartas" className={getNavClass}>
                                <Package className="h-4 w-4" />
                                <span className="text-primary">Cartas</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={isActive('/aluno/batalha')}>
                              <NavLink to="/aluno/batalha" className={getNavClass}>
                                <Sword className="h-4 w-4" />
                                <span className="text-primary">Arena</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                  
                  {/* Itens depois do submenu */}
                  {menuItems.alunoAfterKards.filter(item => {
                if (item.url.includes('loja-recompensas') && !koinsEnabled) return false;
                return true;
              }).map(item => <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} className={getNavClass}>
                          <item.icon className={`h-4 w-4 ${isActive(item.url) ? 'animate-glow-pulse' : ''}`} />
                          {!isCollapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>)}
                </> : (/* Para outros roles: renderizar normalmente */
            items.map(item => <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavClass}>
                        <item.icon className={`h-4 w-4 ${isActive(item.url) ? 'animate-glow-pulse' : ''}`} />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user.role === 'secretaria' && cadastrosItems.length > 0 && <SidebarGroup>
            <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
              Cadastros
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {cadastrosItems.map(item => <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavClass}>
                        <item.icon className={`h-4 w-4 ${isActive(item.url) ? 'animate-glow-pulse' : ''}`} />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}

        {user.role === 'administrador' && cadastrosItems.length > 0 && <SidebarGroup>
            <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
              Cadastros
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Button variant="ghost" className="w-full justify-start hover:bg-accent/50 text-muted-foreground hover:text-foreground" onClick={() => setCadastrosModalOpen(true)}>
                      <Target className="h-4 w-4" />
                      {!isCollapsed && <span>Abrir Cadastros</span>}
                    </Button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}

        <div className="mt-auto p-4">
          <SidebarMenuButton onClick={logout} className="w-full text-destructive hover:bg-destructive/20 hover:text-destructive">
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span>Sair</span>}
          </SidebarMenuButton>
        </div>
      </SidebarContent>

      <CadastrosModal open={cadastrosModalOpen} onOpenChange={setCadastrosModalOpen} />
    </Sidebar>;
}