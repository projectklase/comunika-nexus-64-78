import { useState, useMemo, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AttachmentGrid } from '@/components/attachments/AttachmentGrid';
import { DrawerEntrega } from '@/components/feed/DrawerEntrega';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePostActionsUnified } from '@/hooks/usePostActionsUnified';
import { CalendarActionsBar } from './CalendarActionsBar';
import { usePost } from '@/hooks/usePost';
import { deliveryStore } from '@/stores/delivery-store';
import { useClassStore } from '@/stores/class-store';
import { useWeightsEnabled } from '@/hooks/useWeightsEnabled';
import { ActivityType } from '@/types/post';
import { 
  FileText, 
  FolderOpen, 
  ClipboardCheck,
  Calendar,
  Clock,
  AlertTriangle,
  Upload,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  ExternalLink,
  Copy,
  MessageCircle,
  User,
  Weight,
  MapPin,
  Users,
  Maximize2,
  Minimize2,
  X,
  PlayCircle,
  Settings,
  Trash2,
  Archive,
  Link2,
  CopyIcon,
  ChevronDown
} from 'lucide-react';

import { format, formatDistanceToNow, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';

interface ActivityDrawerProps {
  postId: string | null;
  classId?: string;
  isOpen: boolean;
  onClose: () => void;
}

const TYPE_CONFIG = {
  ATIVIDADE: {
    label: 'Atividade',
    icon: FileText,
    gradient: 'from-blue-500 to-blue-400',
    bgGradient: 'bg-gradient-to-r from-blue-500/20 to-blue-400/20',
    borderColor: 'border-blue-500/30'
  },
  TRABALHO: {
    label: 'Trabalho',
    icon: FolderOpen,
    gradient: 'from-amber-500 to-amber-400',
    bgGradient: 'bg-gradient-to-r from-amber-500/20 to-amber-400/20',
    borderColor: 'border-amber-500/30'
  },
  PROVA: {
    label: 'Prova',
    icon: ClipboardCheck,
    gradient: 'from-red-500 to-red-400',
    bgGradient: 'bg-gradient-to-r from-red-500/20 to-red-400/20',
    borderColor: 'border-red-500/30'
  },
  EVENTO: {
    label: 'Evento',
    icon: Calendar,
    gradient: 'from-amber-500 to-orange-400',
    bgGradient: 'bg-gradient-to-r from-amber-500/20 to-orange-400/20',
    borderColor: 'border-amber-500/30'
  }
} as const;

export function ActivityDrawer({ postId, classId, isOpen, onClose }: ActivityDrawerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { getClass } = useClassStore();
  const weightsEnabled = useWeightsEnabled();
  const { editPost, copyLink, publishNow, canPerformAction, duplicatePost, archivePost, deletePost, openInCalendar } = usePostActionsUnified();
  
  // State for confirmation dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  
  const [showEntregaDrawer, setShowEntregaDrawer] = useState(false);
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('activity-drawer-expanded');
    return saved ? JSON.parse(saved) : false;
  });
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Responsive breakpoint detection
  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
      setIsDesktop(width >= 1024);
      
      // Reset expanded state on smaller screens
      if (width < 1024) {
        setIsExpanded(false);
      }
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  // Persist expanded preference
  useEffect(() => {
    if (isDesktop) {
      localStorage.setItem('activity-drawer-expanded', JSON.stringify(isExpanded));
    }
  }, [isExpanded, isDesktop]);

  const toggleExpanded = () => {
    if (isDesktop) {
      setIsExpanded(!isExpanded);
    }
  };
  
  // Get post data
  const { post, isLoading } = usePost(postId);
  
  // Get delivery for student
  const delivery = user && post ? deliveryStore.getByStudentAndPost(user.id, post.id) : null;

  const config = post ? TYPE_CONFIG[post.type as keyof typeof TYPE_CONFIG] : null;
  const Icon = config?.icon || FileText;
  
  const classData = classId ? getClass(classId) : null;
  
  const countdown = useMemo(() => {
    if (post?.type === 'EVENTO') {
      if (!post?.eventStartAt) return null;
      
      const eventDate = new Date(post.eventStartAt);
      const now = new Date();
      
      if (isBefore(eventDate, now)) {
        return { text: 'Evento encerrado', isOverdue: false };
      }
      
      const distance = formatDistanceToNow(eventDate, { 
        addSuffix: false, 
        locale: ptBR 
      });
      
      return { text: `Começa em ${distance}`, isOverdue: false };
    }
    
    if (!post?.dueAt) return null;
    
    const dueDate = new Date(post.dueAt);
    const now = new Date();
    
    if (isBefore(dueDate, now)) {
      return { text: 'Prazo vencido', isOverdue: true };
    }
    
    const distance = formatDistanceToNow(dueDate, { 
      addSuffix: false, 
      locale: ptBR 
    });
    
    return { text: `Faltam ${distance}`, isOverdue: false };
  }, [post?.dueAt, post?.eventStartAt, post?.type]);

  const formatDueDateTime = () => {
    if (!post?.dueAt) return '';
    return format(new Date(post.dueAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const formatEventDateTime = () => {
    if (!post?.eventStartAt) return { start: '', end: '', duration: '' };
    
    const startDate = new Date(post.eventStartAt);
    const endDate = post.eventEndAt ? new Date(post.eventEndAt) : null;
    
    const startFormatted = format(startDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    const endFormatted = endDate ? format(endDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '';
    
    let duration = '';
    if (endDate) {
      const diffMs = endDate.getTime() - startDate.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours > 0) {
        duration = diffMinutes > 0 ? `${diffHours}h ${diffMinutes}min` : `${diffHours}h`;
      } else {
        duration = `${diffMinutes}min`;
      }
    }
    
    return { start: startFormatted, end: endFormatted, duration };
  };

  const getDeliveryStatus = () => {
    if (!delivery) return null;
    
    switch (delivery.reviewStatus) {
      case 'AGUARDANDO':
        return {
          label: 'Aguardando revisão',
          icon: Clock,
          color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        };
      case 'APROVADA':
        return {
          label: 'Aprovada',
          icon: CheckCircle,
          color: 'bg-green-500/20 text-green-400 border-green-500/30'
        };
      case 'DEVOLVIDA':
        return {
          label: 'Devolvida',
          icon: XCircle,
          color: 'bg-red-500/20 text-red-400 border-red-500/30'
        };
      default:
        return null;
    }
  };

  const deliveryStatus = getDeliveryStatus();
  const isOverdue = countdown?.isOverdue && delivery?.reviewStatus !== 'APROVADA';

  const handleCopyLink = async () => {
    if (post) {
      try {
        await copyLink(post);
      } catch (error) {
        // Error handling is done by copyLink function
      }
    }
  };

  const handleAddToCalendar = () => {
    let startDate: Date, endDate: Date, details = '';
    
    if (post?.type === 'EVENTO' && post.eventStartAt) {
      startDate = new Date(post.eventStartAt);
      endDate = post.eventEndAt ? new Date(post.eventEndAt) : new Date(startDate.getTime() + 60 * 60 * 1000);
      details = post.body || '';
      if (post.eventLocation) {
        details += `\n\nLocal: ${post.eventLocation}`;
      }
    } else if (post?.dueAt) {
      startDate = new Date(post.dueAt);
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour
      details = post.body || '';
    } else {
      return;
    }
    
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(post.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(details)}${post?.eventLocation ? `&location=${encodeURIComponent(post.eventLocation)}` : ''}`;
    
    window.open(googleCalendarUrl, '_blank');
  };

  // Loading state content
  const LoadingContent = () => (
    <div className="p-6 space-y-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );

  if (isLoading) {
    if (isMobile) {
      return (
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className="h-screen max-h-screen w-screen rounded-none flex flex-col">
            <LoadingContent />
          </DrawerContent>
        </Drawer>
      );
    }

    if (isTablet) {
      return (
        <Sheet open={isOpen} onOpenChange={onClose}>
          <SheetContent 
            side="right" 
            className="w-[90vw] max-w-[900px] glass-card border-border/50 p-0 overflow-hidden"
          >
            <LoadingContent />
          </SheetContent>
        </Sheet>
      );
    }

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={cn(
          "max-w-[960px] max-h-[90vh] glass-card border-border/50 p-0 overflow-hidden",
          isExpanded && "max-w-[1200px] w-[85vw]"
        )}>
          <LoadingContent />
        </DialogContent>
      </Dialog>
    );
  }

  if (!post || !config) {
    return null;
  }

  // Header component with responsive titles and actions
  const HeaderContent = ({ 
    HeaderComponent, 
    TitleComponent, 
    DescriptionComponent 
  }: {
    HeaderComponent: React.ElementType;
    TitleComponent: React.ElementType;
    DescriptionComponent: React.ElementType;
  }) => (
    <div className={cn(
      "relative text-white sticky top-0 z-10",
      `bg-gradient-to-br ${config.gradient}`,
      isMobile ? "p-4" : "p-6"
    )}>
      <div className="absolute inset-0 bg-black/15 backdrop-blur-sm" />
      <div className="relative space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-white/20 text-white border-white/30">
              <Icon className="h-4 w-4 mr-1" />
              {config.label}
            </Badge>
            
            {isOverdue && (
              <Badge variant="destructive" className="bg-pink-600/20 text-pink-200 border-pink-400/30">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Atrasada
              </Badge>
            )}
            
            {post.status === 'SCHEDULED' && (
              <Badge variant="outline" className="bg-blue-600/20 text-blue-200 border-blue-400/30">
                <Calendar className="h-3 w-3 mr-1" />
                Agendada
              </Badge>
            )}
            
            {deliveryStatus && (
              <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                <deliveryStatus.icon className="h-3 w-3 mr-1" />
                {deliveryStatus.label}
              </Badge>
            )}
          </div>

          {/* Desktop expand/collapse button */}
          {isDesktop && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleExpanded}
                className="text-white hover:bg-white/20 h-10 w-10 p-0 rounded-xl"
                aria-label={isExpanded ? "Recolher" : "Expandir"}
                title={isExpanded ? "Recolher visualização" : "Expandir visualização"}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>
        
        <HeaderComponent className="text-left">
          <TitleComponent className={cn(
            "text-white leading-tight line-clamp-2",
            isMobile ? "text-xl" : isTablet ? "text-2xl" : "text-xl"
          )}>
            {post.title}
          </TitleComponent>
          <DescriptionComponent className="text-white/80">
            Por {post.authorName}
          </DescriptionComponent>
        </HeaderComponent>
        
        {countdown && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            <span className="font-medium">{countdown.text}</span>
            {post.type === 'EVENTO' ? (
              <span className="text-white/60 hidden sm:inline">• {formatEventDateTime().start}</span>
            ) : (
              <span className="text-white/60 hidden sm:inline">• {formatDueDateTime()}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Main content component
  const MainContent = () => (
    <div className="flex-1 overflow-y-auto">
      {/* Metadata Grid */}
      <div className={cn(
        "space-y-6",
        isMobile ? "p-5" : isTablet ? "p-7" : "p-6"
      )}>
        <div className={cn(
          "grid gap-4",
          isMobile ? "grid-cols-1" : "grid-cols-2"
        )}>
          {classData && (
            <div className="space-y-1">
              <div className={cn("text-xs text-muted-foreground uppercase tracking-wide", isTablet && "text-sm")}>Turma</div>
              <div className={cn("text-sm font-medium flex items-center gap-2", isTablet && "text-base")}>
                <Users className="h-4 w-4 text-muted-foreground" />
                {classData.name}
              </div>
            </div>
          )}
          
          <div className="space-y-1">
            <div className={cn("text-xs text-muted-foreground uppercase tracking-wide", isTablet && "text-sm")}>Professor</div>
            <div className={cn("text-sm font-medium flex items-center gap-2", isTablet && "text-base")}>
              <User className="h-4 w-4 text-muted-foreground" />
              {post.authorName}
            </div>
          </div>
          
          {post.type === 'EVENTO' ? (
            <>
              <div className="space-y-1">
                <div className={cn("text-xs text-muted-foreground uppercase tracking-wide", isTablet && "text-sm")}>Data e Hora</div>
                <div className={cn("text-sm font-medium flex items-center gap-2", isTablet && "text-base")}>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatEventDateTime().start}
                  {formatEventDateTime().end && (
                    <span className="text-muted-foreground">até {formatEventDateTime().end.split(' às ')[1]}</span>
                  )}
                </div>
              </div>
              
              {post.eventLocation && (
                <div className="space-y-1">
                  <div className={cn("text-xs text-muted-foreground uppercase tracking-wide", isTablet && "text-sm")}>Local</div>
                  <div className={cn("text-sm font-medium flex items-center gap-2", isTablet && "text-base")}>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {post.eventLocation}
                  </div>
                </div>
              )}
              
              {formatEventDateTime().duration && (
                <div className="space-y-1">
                  <div className={cn("text-xs text-muted-foreground uppercase tracking-wide", isTablet && "text-sm")}>Duração</div>
                  <div className={cn("text-sm font-medium flex items-center gap-2", isTablet && "text-base")}>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {formatEventDateTime().duration}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-1">
              <div className={cn("text-xs text-muted-foreground uppercase tracking-wide", isTablet && "text-sm")}>Prazo</div>
              <div className={cn("text-sm font-medium flex items-center gap-2", isTablet && "text-base")}>
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {formatDueDateTime()}
              </div>
            </div>
          )}
          
          {weightsEnabled && post.activityMeta?.usePeso && post.activityMeta?.peso !== null && (
            <div className="space-y-1">
              <div className={cn("text-xs text-muted-foreground uppercase tracking-wide", isTablet && "text-sm")}>Peso</div>
              <div className={cn("text-sm font-medium flex items-center gap-2", isTablet && "text-base")}>
                <Weight className="h-4 w-4 text-muted-foreground" />
                {post.activityMeta.peso}
              </div>
            </div>
          )}
        </div>

        <Separator className="bg-border/50" />

        {/* Instructions */}
        {post.body && (
          <div className="space-y-3">
            <h4 className={cn("font-semibold text-sm", isTablet && "text-base")}>Instruções</h4>
            <div className={cn("text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap", isTablet && "text-base")}>
              {post.body}
            </div>
          </div>
        )}

        {/* Activity Metadata */}
        {post.activityMeta?.rubrica && (
          <div className="space-y-3">
            <h4 className={cn("font-semibold text-sm", isTablet && "text-base")}>Critérios de Avaliação</h4>
            <div className={cn("text-sm text-muted-foreground leading-relaxed", isTablet && "text-base")}>
              {post.activityMeta.rubrica}
            </div>
          </div>
        )}

        {/* Attachments */}
        {post.attachments && post.attachments.length > 0 && (
          <div className="space-y-3">
            <h4 className={cn("font-semibold text-sm", isTablet && "text-base")}>
              Anexos ({post.attachments.length})
            </h4>
            <AttachmentGrid
              attachments={post.attachments}
              postTitle={post.title}
            />
          </div>
        )}

        <Separator className="bg-border/50" />

        {/* Student Actions - Only for activities, not events */}
        {user?.role === 'aluno' && post.type !== 'EVENTO' && (
          <div className="space-y-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {delivery ? 'Sua Entrega' : 'Fazer Entrega'}
            </h4>

            {delivery && delivery.reviewStatus === 'DEVOLVIDA' && delivery.reviewNote && (
              <Card className="p-4 bg-red-500/10 border-red-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <span className="text-sm font-medium text-red-400">Feedback do Professor</span>
                </div>
                <p className="text-sm text-muted-foreground">{delivery.reviewNote}</p>
              </Card>
            )}

            {delivery && delivery.reviewStatus === 'APROVADA' ? (
              <Card className="p-4 bg-green-500/10 border-green-500/20 text-center">
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-400">Atividade aprovada!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Entregue em {format(new Date(delivery.submittedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={() => setShowEntregaDrawer(true)}
                  className={cn(
                    "w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl",
                    isMobile && "min-h-[48px] text-base"
                  )}
                  disabled={delivery?.reviewStatus === 'APROVADA'}
                >
                  {delivery?.reviewStatus === 'DEVOLVIDA' ? (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Reenviar Entrega
                    </>
                  ) : delivery ? (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Entrega
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Marcar como Entregue
                    </>
                  )}
                </Button>

                {delivery && (
                  <Card className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status da entrega:</span>
                      {deliveryStatus && (
                        <Badge variant="outline" className={deliveryStatus.color}>
                          <deliveryStatus.icon className="h-3 w-3 mr-1" />
                          {deliveryStatus.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Entregue em {format(new Date(delivery.submittedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {/* Professor/Secretaria Actions */}
        {(user?.role === 'professor' || user?.role === 'secretaria') && (
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">
              {user?.role === 'professor' ? 'Ações do Professor' : 'Ações da Secretaria'}
            </h4>
            
            <div className={cn(
              "grid gap-3",
              isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-3"
            )}>
              {/* Primary actions with dynamic handlers */}
              {user?.role === 'professor' && post.type !== 'EVENTO' && (
                <>
                  <Button 
                    variant="secondary"
                    asChild
                    className="glass-card border-border/50 bg-card/80 hover:bg-card/90 hover:border-primary/20 backdrop-blur-sm rounded-xl min-h-[44px]"
                  >
                    <Link to={`/professor/turma/${classId}/atividade/${post.id}?tab=entregas`}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Entregas
                    </Link>
                  </Button>
                </>
              )}

              {/* Publish now for SCHEDULED posts */}
              {post.status === 'SCHEDULED' && canPerformAction('publishNow', post) && (
                <Button 
                  variant="default" 
                  className="col-span-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl min-h-[44px]"
                  onClick={() => publishNow(post.id)}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Publicar Agora
                </Button>
              )}
            </div>

            {/* Statistics - only for published activities (not events) */}
            {post.status === 'PUBLISHED' && user?.role === 'professor' && post.type !== 'EVENTO' && (
              <Card className="p-4 space-y-3">
                <h5 className="font-medium text-sm">Estatísticas Rápidas</h5>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">12 Entregues</Badge>
                  <Badge variant="destructive">3 Atrasadas</Badge>
                  <Badge variant="outline">8 Não entregues</Badge>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Unified Actions Bar */}
        <CalendarActionsBar
          event={post}
          onEditClick={() => editPost(post)}
          onCopyLink={() => handleCopyLink()}
          onOpenCalendar={() => {
            try {
              openInCalendar(post);
            } catch (error) {
              console.error('Error navigating to calendar from activity drawer:', error);
            }
          }}
          onAddToCalendar={handleAddToCalendar}
          onViewAttachments={() => {
            if (post.attachments?.[0]?.url) {
              window.open(post.attachments[0].url, '_blank');
            }
          }}
          layout={isMobile ? 'vertical' : 'horizontal'}
          showLabels={true}
          className={cn(
            "border-t border-border/50 pt-4 mt-6",
            isMobile ? "px-0" : "px-0"
          )}
        />
      </div>
    </div>
  );

  // Mobile: Full-screen bottom sheet
  if (isMobile) {
    return (
      <>
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className="h-screen max-h-screen w-screen rounded-none flex flex-col">
            <HeaderContent 
              HeaderComponent={DrawerHeader}
              TitleComponent={DrawerTitle}
              DescriptionComponent={DrawerDescription}
            />
            <MainContent />
          </DrawerContent>
        </Drawer>

        <DrawerEntrega
          isOpen={showEntregaDrawer}
          onClose={() => setShowEntregaDrawer(false)}
          activity={post}
          classId={classId || ''}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      </>
    );
  }

  // Tablet: Side sheet
  if (isTablet) {
    return (
      <>
        <Sheet open={isOpen} onOpenChange={onClose}>
          <SheetContent 
            side="right" 
            className="w-[90vw] max-w-[900px] glass-card border-border/50 p-0 overflow-hidden flex flex-col"
          >
            <HeaderContent 
              HeaderComponent={SheetHeader}
              TitleComponent={SheetTitle}
              DescriptionComponent={SheetDescription}
            />
            <MainContent />
          </SheetContent>
        </Sheet>

        <DrawerEntrega
          isOpen={showEntregaDrawer}
          onClose={() => setShowEntregaDrawer(false)}
          activity={post}
          classId={classId || ''}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      </>
    );
  }

  // Desktop: Centered modal
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={cn(
          "glass-card border-border/50 p-0 overflow-hidden flex flex-col",
          "max-h-[90vh] w-[90vw] max-w-[960px]",
          isExpanded && "max-w-[1200px] w-[85vw]",
          "transition-all duration-300 ease-out"
        )}>
          <HeaderContent 
            HeaderComponent={DialogHeader}
            TitleComponent={DialogTitle}
            DescriptionComponent={DialogDescription}
          />
          <MainContent />
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialogs */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {post.type === 'EVENTO' ? 'Evento' : 'Atividade'}</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir permanentemente "{post.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                const success = await deletePost(post.id);
                if (success) {
                  onClose();
                }
                setShowDeleteDialog(false);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar {post.type === 'EVENTO' ? 'Evento' : 'Atividade'}</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja arquivar "{post.title}"? O item será removido da visualização normal, mas pode ser recuperado posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                const success = await archivePost(post.id);
                if (success) {
                  onClose();
                }
                setShowArchiveDialog(false);
              }}
            >
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DrawerEntrega
        isOpen={showEntregaDrawer}
        onClose={() => setShowEntregaDrawer(false)}
        activity={post}
        classId={classId || ''}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </>
  );
}