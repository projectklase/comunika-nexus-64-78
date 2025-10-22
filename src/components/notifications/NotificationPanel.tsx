import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePostViews } from '@/stores/post-views.store';
import { 
  Bell, 
  Star, 
  Calendar, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Check,
  CheckCheck,
  Sparkles,
  Flag,
  Phone,
  BookOpen,
  Megaphone,
  AlertCircle,
  Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Notification } from '@/stores/notification-store';
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
    markAsRead,
    markAllAsRead, 
    archiveNotification,
    hideNotification,
    hasNotifications,
    hasUnread
  } = panelData;
  
  const { notifications, unreadCount, loading } = state;
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Handle notification actions
  const handleOpen = async (notification: Notification) => {
    await markAsRead(notification.id);
    
    if (notification.meta?.postId && user) {
      recordPostView(notification.meta.postId, user, 'notification', notification.meta.classId);
    }
    
    // Handle Rewards notifications (DO NOT TOUCH)
    if (notification.type === 'REDEMPTION_APPROVED' || notification.type === 'REDEMPTION_REJECTED') {
      close();
      navigate('/aluno/loja-recompensas?tab=history');
      return;
    }
    
    const { resolveNotificationTarget } = await import('@/utils/resolve-notification-target');
    const target = resolveNotificationTarget(notification, user?.role as any);
    
    close();
    
    if (target.destination === 'feed') {
      navigate(target.url);
    } else if (target.destination === 'calendar') {
      navigate(target.url);
    } else {
      console.warn('Unknown notification destination:', notification.title);
    }
  };
  
  const handleViewInCalendar = async (notification: Notification) => {
    await markAsRead(notification.id);
    
    if (notification.meta?.postId && user) {
      recordPostView(notification.meta.postId, user, 'calendar', notification.meta.classId);
    }
    
    close();
    
    if (notification.meta?.holidayDate) {
      const { UnifiedCalendarLinks } = await import('@/utils/unified-calendar-links');
      const url = UnifiedCalendarLinks.buildHolidayCalendarLink(
        notification.meta.holidayDate, 
        user?.role as any
      );
      navigate(url);
    } else if (notification.meta?.postId && notification.meta?.dueDate) {
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
  
  // Get notification icon based on type
  const getNotificationIcon = (notification: Notification) => {
    // Rewards icons (DO NOT TOUCH)
    if (notification.type === 'REDEMPTION_APPROVED') {
      return <Sparkles className="w-4 h-4 text-green-500" />;
    }
    if (notification.type === 'REDEMPTION_REJECTED') {
      return <Gift className="w-4 h-4 text-red-500" />;
    }
    
    // Holiday icon
    if (notification.type === 'HOLIDAY') {
      return <Star className="w-4 h-4 text-amber-500" />;
    }
    
    // Post type icons
    switch (notification.meta?.postType) {
      case 'EVENTO':
        return <Calendar className="w-4 h-4 text-green-500" />;
      case 'COMUNICADO':
        return <Megaphone className="w-4 h-4 text-blue-500" />;
      case 'AVISO':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'ATIVIDADE':
      case 'TRABALHO':
        return <BookOpen className="w-4 h-4 text-blue-500" />;
      case 'PROVA':
        return <Flag className="w-4 h-4 text-red-500" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };
  
  // Get notification chips
  const getNotificationChips = (notification: Notification) => {
    const chips = [];
    
    if (notification.meta?.postType) {
      chips.push(
        <Badge key="type" variant="outline" className="text-xs">
          {notification.meta.postType}
        </Badge>
      );
    }
    
    if (notification.type === 'HOLIDAY') {
      chips.push(
        <Badge key="holiday" variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">
          FERIADO
        </Badge>
      );
    }
    
    return chips;
  };
  
  // Render notification item
  const renderNotification = (notification: Notification) => {
    const isClickable = notification.link || 
                       notification.meta?.holidayDate || 
                       notification.meta?.postId;
    
    return (
    <div
      key={notification.id}
      className={cn(
        "group relative p-4 rounded-lg border transition-all duration-300",
        "bg-card/50 backdrop-blur-sm border-border/30",
        isClickable && "cursor-pointer hover:bg-card hover:border-primary/30 hover:shadow-md",
        !notification.isRead && [
          "bg-primary/5 border-primary/30",
          "before:absolute before:inset-0 before:rounded-lg",
          "before:bg-gradient-to-r before:from-primary/10 before:to-transparent",
          "before:opacity-0 hover:before:opacity-100 before:transition-opacity"
        ]
      )}
      onClick={isClickable ? () => handleOpen(notification) : undefined}
    >
      <div className="flex items-start gap-3 relative z-10">
        <div className="flex-shrink-0 mt-1">
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            {getNotificationIcon(notification)}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
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
              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 animate-pulse" />
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
              <span className="text-primary/70">por {notification.meta.authorName}</span>
            )}
          </div>
          
            {/* Action buttons */}
            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
              {notification.link && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpen(notification);
                  }}
                >
                  <ExternalLink className="w-3 h-3 mr-1.5" />
                  Abrir
                </Button>
              )}
              
              {(notification.meta?.holidayDate || 
                (notification.meta?.postType === 'EVENTO' && notification.meta?.eventStartAt) ||
                (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(notification.meta?.postType || '') && notification.meta?.dueDate)) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs font-medium"
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
                  className="h-7 px-2.5 text-xs font-medium"
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
                className="h-7 px-2.5 text-xs font-medium"
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
  
  // Main panel content
  const panelContent = (
    <div
      ref={focusRef as React.RefObject<HTMLDivElement>}
      className="w-full"
      id="notifications-popover"
      role="dialog"
      aria-labelledby="notifications-title"
    >
      {/* Header */}
      <div className="p-6 border-b border-border/20 bg-card/50 backdrop-blur-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Bell className="w-4 h-4 text-primary" />
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
        
        {hasUnread && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
              <span className="text-sm font-medium text-destructive">
                {unreadCount} não lida{unreadCount !== 1 ? 's' : ''}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs h-7 px-3"
            >
              <CheckCheck className="w-3 h-3 mr-1.5" />
              Marcar todas como lidas
            </Button>
          </div>
        )}
      </div>
      
      {/* Content */}
      <ScrollArea className="h-[calc(100vh-16rem)] md:h-[500px]">
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50 animate-pulse" />
                <p className="text-muted-foreground">Carregando notificações...</p>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma notificação</p>
              <p className="text-sm">Você está em dia! Nenhuma notificação no momento.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map(renderNotification)}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
  
  if (!isClient) return null;
  
  // Render bell trigger
  const bellTrigger = (
    <AuroraNotificationBell
      count={unreadCount}
      hasUnread={hasUnread}
      onClick={toggle}
      isOpen={isOpen}
      aria-controls="notifications-popover"
    />
  );
  
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(openState) => openState ? open() : close()}>
        <DrawerTrigger asChild>
          {bellTrigger}
        </DrawerTrigger>
        <DrawerContent className="max-h-[90vh]">
          {panelContent}
        </DrawerContent>
      </Drawer>
    );
  }
  
  return (
    <Popover open={isOpen} onOpenChange={(openState) => openState ? open() : close()}>
      <PopoverTrigger asChild>
        {bellTrigger}
      </PopoverTrigger>
      {createPortal(
        <PopoverContent
          className="w-[95vw] md:w-[600px] p-0 shadow-2xl border-border/50 bg-background/95 backdrop-blur-xl"
          align="end"
          sideOffset={8}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            focusRef.current?.focus();
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            returnFocusRef.current?.focus();
          }}
        >
          {panelContent}
        </PopoverContent>,
        document.body
      )}
    </Popover>
  );
}