import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PostLinkBuilder } from '@/utils/post-links';
import { usePostViews } from '@/stores/post-views.store';
import { 
  Bell, 
  Star, 
  Calendar, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Archive, 
  Check, 
  CheckCheck,
  Sparkles,
  Flag,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNotificationContext } from '@/contexts/NotificationContext';
import { parseNotificationLink, navigateWithScroll, generateCalendarLink } from '@/utils/deep-links';
import { Notification } from '@/stores/notification-store';
import { NotificationTab } from '@/hooks/useNotificationPanel';
import { AuroraNotificationBell } from './AuroraNotificationBell';

export function NotificationPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isClient, setIsClient] = useState(false);
  
  const {
    isOpen,
    open,
    close,
    toggle,
    panelData,
    focusRef,
    returnFocusRef
  } = useNotificationContext();
  
  const { recordPostView } = usePostViews();
  
  const {
    state,
    setActiveTab,
    markAsRead,
    markAllAsRead, 
    archiveNotification,
    hideNotification,
    hasNotifications,
    hasUnread
  } = panelData;
  
  const { notifications, unreadCounts, activeTab, loading } = state;
  
  // Client-side only rendering for portal
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Handle notification actions
  const handleOpen = async (notification: Notification) => {
    await markAsRead(notification.id);
    
    // Record post view if this is a post notification
    if (notification.meta?.postId && user) {
      recordPostView(notification.meta.postId, user, 'notification', notification.meta.classId);
    }
    
    // FASE 5: Lidar com notificações de resgate
    if (notification.type === 'REDEMPTION_APPROVED' || notification.type === 'REDEMPTION_REJECTED') {
      close();
      navigate('/aluno/loja-recompensas?tab=history');
      return;
    }
    
    // Import smart routing utility
    const { resolveNotificationTarget } = await import('@/utils/resolve-notification-target');
    const target = resolveNotificationTarget(notification, user?.role as any);
    
    close();
    
    if (target.destination === 'feed') {
      // Navigate to feed with smart parameters
      navigate(target.url);
    } else if (target.destination === 'calendar') {
      // Navigate to calendar
      navigate(target.url);
    } else {
      // Fallback for unknown destinations
      console.warn('Unknown notification destination:', notification.title);
    }
  };
  
  const handleViewInCalendar = async (notification: Notification) => {
    await markAsRead(notification.id);
    
    // Record post view if this is a post notification
    if (notification.meta?.postId && user) {
      recordPostView(notification.meta.postId, user, 'calendar', notification.meta.classId);
    }
    
    close();
    
    if (notification.meta?.holidayDate) {
      // For holidays, use unified calendar link
      const { UnifiedCalendarLinks } = await import('@/utils/unified-calendar-links');
      const url = UnifiedCalendarLinks.buildHolidayCalendarLink(
        notification.meta.holidayDate, 
        user?.role as any
      );
      navigate(url);
    } else if (notification.meta?.postId && notification.meta?.dueDate) {
      // For posts with due dates, use unified link builder
      const mockPost = {
        id: notification.meta.postId,
        type: notification.meta.postType || 'ATIVIDADE',
        title: notification.title,
        dueAt: notification.meta.dueDate,
        eventStartAt: notification.meta.eventStartAt,
        classId: notification.meta.classId
      } as any;
      
      const { UnifiedCalendarLinks } = await import('@/utils/unified-calendar-links');
      const url = UnifiedCalendarLinks.buildPostCalendarLink(mockPost, user?.role as any);
      navigate(url);
    }
  };
  
  // Get notification icon
  const getNotificationIcon = (notification: Notification) => {
    // FASE 5: Ícones para notificações de resgate
    if (notification.type === 'REDEMPTION_APPROVED') {
      return <Sparkles className="w-4 h-4 text-green-500" />;
    }
    
    if (notification.type === 'REDEMPTION_REJECTED') {
      return <Bell className="w-4 h-4 text-red-500" />;
    }
    
    if (notification.type === 'HOLIDAY') {
      return <Calendar className="w-4 h-4 text-amber-500" />;
    }
    
    if (notification.type === 'POST_IMPORTANT' || notification.meta?.important) {
      return <Star className="w-4 h-4 text-orange-500" />;
    }
    
    // Post type icons
    switch (notification.meta?.postType) {
      case 'ATIVIDADE':
        return <Bell className="w-4 h-4 text-blue-500" />;
      case 'PROVA':
        return <Flag className="w-4 h-4 text-red-500" />;
      case 'EVENTO':
        return <Calendar className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };
  
  // Get notification chips
  const getNotificationChips = (notification: Notification) => {
    const chips = [];
    
    // Type chip
    if (notification.meta?.postType) {
      chips.push(
        <Badge key="type" variant="outline" className="text-xs">
          {notification.meta.postType}
        </Badge>
      );
    }
    
    if (notification.type === 'HOLIDAY') {
      chips.push(
        <Badge key="holiday" variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
          FERIADO
        </Badge>
      );
    }
    
    // Important chip
    if (notification.type === 'POST_IMPORTANT' || notification.meta?.important) {
      chips.push(
        <Badge key="important" variant="destructive" className="text-xs">
          IMPORTANTE
        </Badge>
      );
    }
    
    return chips;
  };
  
  // Render notification item
  const renderNotification = (notification: Notification) => {
    // Determinar se a notificação é clicável
    const isClickable = notification.link || 
                       notification.meta?.holidayDate || 
                       notification.meta?.postId; // All posts are clickable now
    
    return (
        <div
          key={notification.id}
          className={cn(
            "group relative p-4 rounded-lg border transition-all duration-300",
            "w-full max-w-full overflow-hidden",
        "bg-gradient-glass backdrop-blur-sm border-border/30",
        isClickable && "cursor-pointer hover:bg-gradient-card hover:border-primary/30 hover:shadow-glow",
        !notification.isRead && [
          "bg-gradient-to-r from-primary/5 via-primary/3 to-transparent",
          "border-primary/30 shadow-neon",
          "before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r",
          "before:from-primary/10 before:to-transparent before:opacity-0",
          "hover:before:opacity-100 before:transition-opacity before:duration-300"
        ]
      )}
      onClick={isClickable ? () => handleOpen(notification) : undefined}
    >
      <div className="flex items-start gap-3 relative z-10">
        <div className="flex-shrink-0 mt-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center backdrop-blur-sm">
            {getNotificationIcon(notification)}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className={cn(
                "text-sm font-medium leading-tight",
                !notification.isRead
                  ? 'text-foreground font-semibold' 
                  : 'text-muted-foreground'
              )}>
                {notification.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                {notification.message}
              </p>
            </div>
            
            {!notification.isRead && (
              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 animate-pulse shadow-neon" />
            )}
          </div>
          
          {/* Chips */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {getNotificationChips(notification)}
          </div>
          
          {/* Contact Phone */}
          {notification.meta?.contactPhone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Phone className="w-3 h-3 text-primary" />
              <a 
                href={`tel:+55${notification.meta.contactPhone.replace(/\D/g, '')}`}
                className="text-primary hover:text-primary/80 underline transition-colors"
                title="Clique para ligar"
                onClick={(e) => e.stopPropagation()}
              >
                {notification.meta.contactPhone}
              </a>
            </div>
          )}
          
          {/* Meta info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground/80 mb-3">
            <span className="font-medium">
              {formatDistanceToNow(new Date(notification.createdAt), { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </span>
            
              {notification.meta?.authorName && (
                <span className="text-primary/70 truncate max-w-[100px]">por {notification.meta.authorName}</span>
              )}
          </div>
          
            {/* Action buttons */}
            <div className="flex flex-wrap gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
              {notification.link && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs font-medium bg-glass/50 border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpen(notification);
                  }}
                >
                  <ExternalLink className="w-3 h-3 mr-1.5" />
                  Abrir
                </Button>
              )}
              
              {/* Only show calendar button for events with dates or holidays */}
              {(notification.meta?.holidayDate || 
                (notification.meta?.postType === 'EVENTO' && notification.meta?.eventStartAt) ||
                (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(notification.meta?.postType || '') && notification.meta?.dueDate)) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs font-medium bg-glass/50 border-secondary/20 hover:bg-secondary/10 hover:border-secondary/40 transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewInCalendar(notification);
                  }}
                >
                  <Calendar className="w-3 h-3 mr-1.5" />
                  Calendário
                </Button>
              )}
              
              {!notification.isRead && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2.5 text-xs font-medium bg-glass/30 hover:bg-success/10 hover:text-success transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(notification.id);
                  }}
                >
                  <Check className="w-3 h-3 mr-1.5" />
                  Lida
                </Button>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2.5 text-xs font-medium bg-glass/30 hover:bg-muted/50 hover:text-muted-foreground transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  hideNotification(notification.id);
                }}
              >
                <EyeOff className="w-3 h-3 mr-1.5" />
                Ocultar
              </Button>
            </div>
        </div>
      </div>
    </div>
    );
  };
  
  // Render tab content
  const renderTabContent = (tab: NotificationTab) => {
    const tabNotifications = notifications[tab];
    const tabUnreadCount = unreadCounts[tab];
    
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50 animate-pulse" />
            <p className="text-muted-foreground">Carregando notificações...</p>
          </div>
        </div>
      );
    }
    
    if (tabNotifications.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-12">
          {tab === 'importantes' ? (
            <>
              <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma notificação importante</p>
              <p className="text-sm">Posts marcados como importantes e feriados aparecerão aqui.</p>
            </>
          ) : (
            <>
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma novidade</p>
              <p className="text-sm">Novos posts e atividades aparecerão aqui.</p>
            </>
          )}
        </div>
      );
    }
    
      return (
        <div className="space-y-3 pb-4 w-full max-w-full box-border">
          {/* Tab actions */}
          <div className="sticky top-0 bg-background/95 backdrop-blur-sm px-3 py-2 mb-3 border-b border-border/20 rounded-lg">
            <div className="flex items-center gap-2">
              {tabUnreadCount > 0 ? (
                <>
                  <div className="w-2 h-2 bg-destructive rounded-full animate-pulse flex-shrink-0" />
                  <span className="text-sm font-medium text-destructive">
                    {tabUnreadCount} não lida{tabUnreadCount !== 1 ? 's' : ''}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-success rounded-full flex-shrink-0" />
                  <span className="text-sm font-medium text-success">Todas lidas</span>
                </>
              )}
            </div>
            
            {tabUnreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsRead(tab)}
                className="text-xs h-7 mt-2 w-full bg-glass/50 border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200"
              >
                <CheckCheck className="w-3 h-3 mr-1.5" />
                Marcar como lidas
              </Button>
            )}
          </div>
          
          {/* Notifications list */}
          <div className="space-y-2 w-full max-w-full">
            {tabNotifications.map(renderNotification)}
          </div>
        </div>
      );
  };
  
  // Main panel content
  const panelContent = (
    <div
      ref={focusRef as React.RefObject<HTMLDivElement>}
      className="w-full h-full flex flex-col"
      id="notifications-popover"
      role="dialog"
      aria-labelledby="notifications-title"
      aria-describedby="notifications-description"
    >
      {/* Header */}
      <div className="p-6 border-b border-border/20 bg-gradient-glass backdrop-blur-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-neon">
              <Bell className="w-4 h-4 text-primary-foreground" />
            </div>
            {hasUnread && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <h2 id="notifications-title" className="font-bold text-xl text-foreground">Notificações</h2>
            <p className="text-xs text-muted-foreground">Centro de mensagens e alertas</p>
          </div>
        </div>
        
        <div id="notifications-description" className="sr-only">
          Painel de notificações com {unreadCounts.total} não lidas
        </div>
        
      </div>
      
      {/* Tabs */}
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as NotificationTab)}
        className="w-full flex-1 flex flex-col min-h-0"
      >
        <div className="px-6 pt-4">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-glass/50 backdrop-blur-sm border border-border/20 p-1">
            <TabsTrigger 
              value="novidades" 
              className="relative flex items-center justify-center gap-2 h-10 rounded-md data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-neon transition-all duration-300 font-medium"
            >
              <Sparkles className="w-4 h-4" />
              <span>Novidades</span>
              {unreadCounts.novidades > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs font-bold animate-pulse shadow-neon"
                >
                  {unreadCounts.novidades}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="importantes" 
              className="relative flex items-center justify-center gap-2 h-10 rounded-md data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-neon transition-all duration-300 font-medium"
            >
              <Star className="w-4 h-4" />
              <span>Importantes</span>
              {unreadCounts.importantes > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs font-bold animate-pulse shadow-neon"
                >
                  {unreadCounts.importantes}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="novidades" className="mt-0 flex-1 min-h-0">
          <ScrollArea className="max-h-[calc(80vh-200px)] px-4">
            {renderTabContent('novidades')}
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="importantes" className="mt-0 flex-1 min-h-0">
          <ScrollArea className="max-h-[calc(80vh-200px)] px-4">
            {renderTabContent('importantes')}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
  
  // Handle bell interactions
  const handleBellClick = () => {
    toggle();
  };
  
  const handleLongPress = () => {
    // Long press to mark Novidades as read
    if (unreadCounts.novidades > 0) {
      markAllAsRead('novidades');
      toast({
        title: 'Novidades marcadas como lidas',
        description: `${unreadCounts.novidades} notificações marcadas como lidas.`,
      });
    }
  };
  
  const handleMiddleClick = () => {
    // Middle click to open notifications page in new tab
    window.open('/secretaria/notificacoes', '_blank');
  };
  
  // Determine if we have important notifications  
  const hasImportant = notifications.importantes.some(n => !n.isRead);
  
  // Aurora Bell Trigger
  const bellTrigger = (
    <AuroraNotificationBell
      count={unreadCounts.total}
      hasImportant={hasImportant}
      hasUnread={hasUnread}
      onClick={handleBellClick}
      onLongPress={handleLongPress}
      onMiddleClick={handleMiddleClick}
      size="md"
      isOpen={isOpen}
      aria-controls="notifications-popover"
    />
  );
  
  // Render mobile (Drawer) or desktop (Popover)
  if (isMobile) {
    return (
      <>
        <Drawer open={isOpen} onOpenChange={close}>
          <DrawerTrigger asChild>
            {bellTrigger}
          </DrawerTrigger>
          <DrawerContent className="max-h-[80vh] overflow-hidden z-[100]">
            {panelContent}
          </DrawerContent>
        </Drawer>
      </>
    );
  }
  
  // Desktop: Use portal to avoid clipping in header
  return (
    <>
      {bellTrigger}
      {isClient && isOpen && createPortal(
        <div 
          className="fixed inset-0 z-[60] pointer-events-none"
          onClick={close}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/20 backdrop-blur-sm pointer-events-auto" />
          
          {/* Panel positioned relative to bell */}
          <div
            className="absolute top-[70px] right-8 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-[440px] max-h-[80vh] flex flex-col p-0 bg-gradient-glass backdrop-blur-xl border border-border/30 rounded-xl shadow-3d-hover z-[70]">
              {panelContent}
            </div>
          </div>
        </div>,
        document.getElementById('portal-root') || document.body
      )}
    </>
  );
}