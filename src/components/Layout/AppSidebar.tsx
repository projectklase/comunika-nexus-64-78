import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { NavLink, useLocation } from 'react-router-dom';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { CadastrosModal } from '@/components/admin/CadastrosModal';
import { LayoutDashboard, Rss, Plus, Calendar, Users, History, BookOpen, PlusCircle, ClipboardList, LogOut, Settings, Layers, Target, FileText, UserCog, Gift, Store, ListTodo, Sparkles, Shield, BarChart3, User, Building2, Package, Sword, CreditCard, ChevronDown } from 'lucide-react';
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
    title: 'Histórico',
    url: '/secretaria/historico',
    icon: History
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
  aluno: []
};

// Premium menu item component
const PremiumMenuItem = ({ 
  item, 
  isActive, 
  isCollapsed 
}: { 
  item: { title: string; url: string; icon: any }; 
  isActive: boolean; 
  isCollapsed: boolean;
}) => {
  const Icon = item.icon;
  
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink 
          to={item.url} 
          className={cn(
            "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300",
            "border border-transparent",
            isActive 
              ? "bg-gradient-to-r from-primary/25 via-primary/15 to-primary/5 border-primary/40 shadow-[0_0_20px_rgba(139,92,246,0.25)]" 
              : "hover:bg-white/5 hover:border-white/10 hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
          )}
        >
          {/* Icon container with glow effect */}
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300",
            isActive 
              ? "bg-primary/20 shadow-[0_0_12px_rgba(139,92,246,0.4)]" 
              : "bg-white/5 group-hover:bg-primary/10 group-hover:shadow-[0_0_8px_rgba(139,92,246,0.2)]"
          )}>
            <Icon className={cn(
              "h-4 w-4 transition-all duration-300",
              isActive 
                ? "text-primary drop-shadow-[0_0_6px_rgba(139,92,246,0.8)]" 
                : "text-muted-foreground group-hover:text-primary"
            )} />
          </div>
          
          {!isCollapsed && (
            <span className={cn(
              "font-medium tracking-wide transition-colors duration-300",
              isActive 
                ? "text-primary" 
                : "text-muted-foreground group-hover:text-foreground"
            )}>
              {item.title}
            </span>
          )}
          
          {/* Active indicator bar */}
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-primary to-primary/50 rounded-r-full shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

// Premium Arena section with special styling
const ArenaSection = ({ 
  isCollapsed, 
  kardsOpen, 
  setKardsOpen, 
  isInKardsSection, 
  isActive 
}: { 
  isCollapsed: boolean; 
  kardsOpen: boolean; 
  setKardsOpen: (open: boolean) => void;
  isInKardsSection: boolean;
  isActive: (path: string) => boolean;
}) => {
  return (
    <Collapsible open={kardsOpen} onOpenChange={setKardsOpen}>
      <SidebarMenuItem>
        {/* Special Arena container with animated gradient border */}
        <div className={cn(
          "relative rounded-xl overflow-hidden transition-all duration-500",
          "before:absolute before:inset-0 before:rounded-xl before:p-[1px]",
          "before:bg-gradient-to-r before:from-amber-500/50 before:via-primary before:to-amber-500/50",
          "before:animate-[gradient-shift_3s_ease-in-out_infinite]",
          isInKardsSection && "shadow-[0_0_30px_rgba(139,92,246,0.3),0_0_60px_rgba(217,168,22,0.15)]"
        )}>
          <SidebarMenuButton asChild className="relative z-10">
            <CollapsibleTrigger className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300",
              "bg-gradient-to-r from-primary/15 via-amber-500/10 to-primary/15",
              "hover:from-primary/25 hover:via-amber-500/15 hover:to-primary/25",
              "border border-primary/30"
            )}>
              {/* Animated sword icon */}
              <div className={cn(
                "flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-300",
                "bg-gradient-to-br from-amber-500/30 to-primary/30",
                "shadow-[0_0_15px_rgba(217,168,22,0.3)]",
                isInKardsSection && "animate-pulse"
              )}>
                <Sword className={cn(
                  "h-5 w-5 transition-all duration-300",
                  "text-amber-400 drop-shadow-[0_0_8px_rgba(217,168,22,0.8)]"
                )} />
              </div>
              
              {!isCollapsed && (
                <>
                  <div className="flex-1 text-left">
                    <span className="font-bold tracking-wide bg-gradient-to-r from-amber-400 via-primary to-amber-400 bg-clip-text text-transparent">
                      Klase Kards Arena
                    </span>
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500/20 to-primary/20 text-amber-400 rounded border border-amber-500/30">
                      Game
                    </span>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-primary transition-transform duration-300",
                    kardsOpen && "rotate-180"
                  )} />
                </>
              )}
            </CollapsibleTrigger>
          </SidebarMenuButton>
        </div>
        
        <CollapsibleContent className="mt-1">
          <SidebarMenuSub className="space-y-1 pl-4 border-l-2 border-primary/20 ml-6">
            <SidebarMenuSubItem>
              <SidebarMenuSubButton asChild isActive={isActive('/aluno/cartas')}>
                <NavLink 
                  to="/aluno/cartas" 
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300",
                    isActive('/aluno/cartas')
                      ? "bg-primary/20 text-primary shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                      : "hover:bg-white/5 text-muted-foreground hover:text-primary"
                  )}
                >
                  <Package className="h-4 w-4" />
                  <span className="font-medium">Cartas</span>
                </NavLink>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
            
            <SidebarMenuSubItem>
              <SidebarMenuSubButton asChild isActive={isActive('/aluno/batalha')}>
                <NavLink 
                  to="/aluno/batalha" 
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300",
                    isActive('/aluno/batalha')
                      ? "bg-primary/20 text-primary shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                      : "hover:bg-white/5 text-muted-foreground hover:text-primary"
                  )}
                >
                  <Sword className="h-4 w-4" />
                  <span className="font-medium">Arena</span>
                </NavLink>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
};

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const [cadastrosModalOpen, setCadastrosModalOpen] = useState(false);
  const { getKoinsEnabled } = useSchoolSettings();
  const koinsEnabled = getKoinsEnabled();

  const isInKardsSection = currentPath.includes('/aluno/cartas') || currentPath.includes('/aluno/batalha');
  const [kardsOpen, setKardsOpen] = useState(isInKardsSection);
  
  if (!user) return null;
  
  const baseItems = menuItems[user.role as keyof typeof menuItems] || [];

  const items = baseItems.filter(item => {
    if (item.url.includes('loja-recompensas') && !koinsEnabled) return false;
    if (item.url.includes('gerenciar-recompensas') && !koinsEnabled) return false;
    if (item.url.includes('gerenciar-desafios') && !koinsEnabled) return false;
    return true;
  });
  
  const cadastrosItems = user.role === 'secretaria' || user.role === 'administrador' 
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

  return (
    <Sidebar 
      className={cn(
        isCollapsed ? 'w-14' : 'w-64',
        "border-r border-white/10 bg-gradient-to-b from-background via-background to-background/95"
      )} 
      collapsible="icon"
    >
      <SidebarContent className="bg-transparent">
        {/* Header with logo */}
        <div className="p-4">
          <SidebarTrigger className="mb-4 hover:bg-white/10 rounded-lg transition-colors" />
          {!isCollapsed && (
            <div className="text-center mb-6">
              <div className="relative inline-block">
                <img 
                  src={klaseLogoViolet} 
                  alt="Klase" 
                  className="h-12 w-auto mx-auto drop-shadow-[0_0_10px_rgba(139,92,246,0.3)]" 
                />
              </div>
              <p className="text-xs text-muted-foreground capitalize mt-2 tracking-wider">
                {user.role}
              </p>
            </div>
          )}
        </div>

        {/* Separator */}
        {!isCollapsed && (
          <div className="mx-4 mb-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        )}

        <SidebarGroup>
          <SidebarGroupLabel className={cn(
            isCollapsed ? 'sr-only' : 'px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2'
          )}>
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="space-y-1">
              {user.role === 'aluno' ? (
                <>
                  {menuItems.alunoBeforeKards.map(item => (
                    <PremiumMenuItem 
                      key={item.title}
                      item={item}
                      isActive={isActive(item.url)}
                      isCollapsed={isCollapsed}
                    />
                  ))}
                  
                  {/* Special Arena Section */}
                  <div className="py-2">
                    <ArenaSection
                      isCollapsed={isCollapsed}
                      kardsOpen={kardsOpen}
                      setKardsOpen={setKardsOpen}
                      isInKardsSection={isInKardsSection}
                      isActive={isActive}
                    />
                  </div>
                  
                  {menuItems.alunoAfterKards
                    .filter(item => {
                      if (item.url.includes('loja-recompensas') && !koinsEnabled) return false;
                      return true;
                    })
                    .map(item => (
                      <PremiumMenuItem 
                        key={item.title}
                        item={item}
                        isActive={isActive(item.url)}
                        isCollapsed={isCollapsed}
                      />
                    ))}
                </>
              ) : (
                items.map(item => (
                  <PremiumMenuItem 
                    key={item.title}
                    item={item}
                    isActive={isActive(item.url)}
                    isCollapsed={isCollapsed}
                  />
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Cadastros section for secretaria */}
        {user.role === 'secretaria' && cadastrosItems.length > 0 && (
          <>
            {!isCollapsed && (
              <div className="mx-4 my-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            )}
            <SidebarGroup>
              <SidebarGroupLabel className={cn(
                isCollapsed ? 'sr-only' : 'px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2'
              )}>
                Cadastros
              </SidebarGroupLabel>
              <SidebarGroupContent className="px-2">
                <SidebarMenu className="space-y-1">
                  {cadastrosItems.map(item => (
                    <PremiumMenuItem 
                      key={item.title}
                      item={item}
                      isActive={isActive(item.url)}
                      isCollapsed={isCollapsed}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Cadastros modal button for admin */}
        {user.role === 'administrador' && cadastrosItems.length > 0 && (
          <>
            {!isCollapsed && (
              <div className="mx-4 my-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            )}
            <SidebarGroup>
              <SidebarGroupLabel className={cn(
                isCollapsed ? 'sr-only' : 'px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2'
              )}>
                Cadastros
              </SidebarGroupLabel>
              <SidebarGroupContent className="px-2">
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Button 
                        variant="ghost" 
                        className={cn(
                          "w-full justify-start gap-3 px-3 py-2.5 rounded-xl transition-all duration-300",
                          "border border-transparent",
                          "hover:bg-white/5 hover:border-white/10 hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)]",
                          "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => setCadastrosModalOpen(true)}
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 group-hover:bg-primary/10 transition-all">
                          <Target className="h-4 w-4" />
                        </div>
                        {!isCollapsed && <span className="font-medium tracking-wide">Abrir Cadastros</span>}
                      </Button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Logout button */}
        <div className="mt-auto p-4">
          {!isCollapsed && (
            <div className="mb-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          )}
          <SidebarMenuButton 
            onClick={logout} 
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300",
              "border border-transparent",
              "hover:bg-destructive/10 hover:border-destructive/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]",
              "text-muted-foreground hover:text-destructive"
            )}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 group-hover:bg-destructive/10 transition-all">
              <LogOut className="h-4 w-4" />
            </div>
            {!isCollapsed && <span className="font-medium tracking-wide">Sair</span>}
          </SidebarMenuButton>
        </div>
      </SidebarContent>

      <CadastrosModal open={cadastrosModalOpen} onOpenChange={setCadastrosModalOpen} />
      
      {/* CSS for gradient animation */}
      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </Sidebar>
  );
}
