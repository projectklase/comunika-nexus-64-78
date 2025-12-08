import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SchoolSwitcher } from '@/components/SchoolSwitcher';
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
import { ActivityDrawer } from '@/components/calendar/ActivityDrawer';
import { useActivityDrawerState } from '@/hooks/useActivityDrawerState';
import { closeActivityDrawer } from '@/utils/activity-drawer-handler';
import { useStudentClass } from '@/hooks/useStudentClass';
import { usePeopleStore } from '@/stores/people-store';
import { PremiumAvatar } from '@/components/gamification/PremiumAvatar';
import { useUnlockables } from '@/hooks/useUnlockables';
import { KlaseAnnouncementModal } from '@/components/announcements/KlaseAnnouncementModal';

import { useUserSettingsStore } from '@/stores/user-settings-store';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const activityDrawerState = useActivityDrawerState();
  const { loadPeople } = usePeopleStore();
  const studentClass = useStudentClass();
  const { getEquippedAvatarData, getEquippedItem, userUnlocks } = useUnlockables();
  const equippedAvatar = getEquippedAvatarData();
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  // Fetch pending platform announcement
  const { data: pendingAnnouncement } = useQuery({
    queryKey: ['pending-platform-announcement', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .eq('type', 'PLATFORM_ANNOUNCEMENT')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !announcementDismissed,
  });

  // Ensure stores are loaded
  React.useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  // Load user's equipped premium theme from database after login
  React.useEffect(() => {
    // Only apply premium theme if user is authenticated
    if (!user) return;
    
    // Sempre verificar o banco de dados por tema premium equipado
    // O logout reseta o localStorage para dark-neon, então após novo login
    // devemos sempre priorizar o tema equipado no banco
    const equippedTheme = getEquippedItem('THEME');
    if (equippedTheme?.unlockable?.identifier) {
      // Dynamically import to avoid circular dependency
      import('@/hooks/use-theme').then(({ applyPremiumTheme }) => {
        applyPremiumTheme(equippedTheme.unlockable.identifier);
      });
    }
  }, [user, userUnlocks, getEquippedItem]);

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
          <header className="h-16 glass-card border-b border-border/50 flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-2 lg:gap-4 min-w-0 flex-1">
              <SidebarTrigger className="lg:hidden flex-shrink-0" />
              <div className="min-w-0 flex-1 overflow-hidden">
                <h1 className="text-base lg:text-lg font-semibold text-foreground truncate">
                  Bem-vindo, {user.name}
                </h1>
                <div className="flex items-center gap-2 lg:gap-4 flex-wrap">
                  <p className="text-xs lg:text-sm text-muted-foreground capitalize">
                    {user.role}
                  </p>
                  {user.role === 'aluno' && studentClass && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 rounded-md border border-primary/20">
                      <BookOpen className="h-3 w-3 lg:h-4 lg:w-4 text-primary flex-shrink-0" />
                      <div className="text-xs lg:text-sm min-w-0">
                        <span className="font-medium text-foreground truncate">{studentClass.name}</span>
                        <span className="text-muted-foreground ml-1 lg:ml-2 hidden sm:inline">{studentClass.schedule}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
              <div className="hidden md:block">
                <SchoolSwitcher />
              </div>
              <NotificationPanel />
              
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center hover:opacity-80 transition-opacity">
                  <PremiumAvatar 
                    emoji={equippedAvatar?.emoji || '🐱'}
                    rarity={equippedAvatar?.rarity as any || 'COMMON'}
                    size="sm"
                    className="cursor-pointer"
                  />
                </button>
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
          <main className="flex-1 p-2 sm:p-4 lg:p-6 overflow-x-hidden w-full max-w-full box-border">
            {children}
          </main>
        </div>
      </div>
      
      {/* Password Reset Notification Handler */}
      <PasswordResetNotificationHandler />
      
      {/* Global Activity Drawer for notifications */}
      <ActivityDrawer
        postId={activityDrawerState.postId}
        classId={activityDrawerState.classId}
        isOpen={activityDrawerState.isOpen}
        onClose={() => closeActivityDrawer(navigate)}
      />
      
      {/* Platform Announcement Modal */}
      {pendingAnnouncement && !announcementDismissed && (
        <KlaseAnnouncementModal
          notification={pendingAnnouncement}
          onClose={() => setAnnouncementDismissed(true)}
        />
      )}
    </SidebarProvider>
  );
}