import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, LogOut, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { KoinBalanceHeader } from '@/components/rewards/KoinBalanceHeader';
import { PasswordResetNotificationHandler } from '@/components/notifications/PasswordResetNotificationHandler';
// import { UniversalNexusOrb } from '@/components/nexus/UniversalNexusOrb'; // NEXUS REMOVIDO
import { ActivityDrawer } from '@/components/calendar/ActivityDrawer';
import { useActivityDrawerState } from '@/hooks/useActivityDrawerState';
import { closeActivityDrawer } from '@/utils/activity-drawer-handler';
import { useStudentClass } from '@/hooks/useStudentClass';
import { usePeopleStore } from '@/stores/people-store';

// Import test utilities for development
if (process.env.NODE_ENV === 'development') {
  // import('@/utils/nexus-orb-test'); // NEXUS REMOVIDO
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const activityDrawerState = useActivityDrawerState();
  const { loadPeople } = usePeopleStore();
  const studentClass = useStudentClass();

  // Ensure stores are loaded
  React.useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Top Header */}
          <header className="h-16 glass-card border-b border-border/50 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="lg:hidden" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  Bem-vindo, {user.name}
                </h1>
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground capitalize">
                    {user.role}
                  </p>
                  {user.role === 'aluno' && studentClass && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-lg border border-primary/20">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <div className="text-sm">
                        <span className="font-medium text-foreground">{studentClass.name}</span>
                        <span className="text-muted-foreground ml-2">{studentClass.schedule}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <NotificationPanel />
              
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="cursor-pointer ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-card border border-border/50">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleSettings}
                  className="hover:bg-accent/50 cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-destructive hover:bg-destructive/20 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
      
      {/* Universal NEXUS Orb for Students - REMOVIDO */}
      {/* <UniversalNexusOrb /> */}
      
      {/* Password Reset Notification Handler */}
      <PasswordResetNotificationHandler />
      
      {/* Global Activity Drawer for notifications */}
      <ActivityDrawer
        postId={activityDrawerState.postId}
        classId={activityDrawerState.classId}
        isOpen={activityDrawerState.isOpen}
        onClose={() => closeActivityDrawer(navigate)}
      />
    </SidebarProvider>
  );
}