import { useState, useEffect } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Upload, 
  FileText, 
  MapPin, 
  Clock,
  CheckCircle,
  ExternalLink,
  Paperclip,
  Image as ImageIcon,
  FileIcon,
  BookOpen,
  X,
  Calendar as CalendarPlus,
  Users
} from 'lucide-react';
import { Post, PostType } from '@/types/post';
import { useAuth } from '@/contexts/AuthContext';
import { useReads } from '@/hooks/useReads';
import { useSaved } from '@/hooks/useSaved';
import { deliveryStore } from '@/stores/delivery-store';
import { useSmartAgenda } from '@/hooks/useSmartAgenda';
import { usePostViews } from '@/stores/post-views.store';
import { PostReadInsights } from '@/components/feed/PostReadInsights';
import { EventConfirmationManager } from '@/components/student/EventConfirmationManager';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ImmersivePostCardProps {
  post: Post;
  onOpenDetails: (post: Post) => void;
  onGoToCalendar: (post: Post) => void;
  onMarkDelivered: (post: Post) => void;
  onMarkAsRead: (post: Post) => void;
  onScheduleStudyBlock?: (post: Post) => void;
  onRemoveStudyBlock?: (post: Post) => void;
  onInviteFriend?: (post: Post) => void;
}

export function ImmersivePostCard({ 
  post, 
  onOpenDetails, 
  onGoToCalendar, 
  onMarkDelivered,
  onMarkAsRead,
  onScheduleStudyBlock,
  onRemoveStudyBlock,
  onInviteFriend
}: ImmersivePostCardProps) {
  const { user } = useAuth();
  const { isRead } = useReads();
  const { isSaved } = useSaved();
  const { getTodayBlocks, scheduleStudyBlock } = useSmartAgenda();
  const { recordPostView } = usePostViews();
  const [isHovering, setIsHovering] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

  const isActivity = ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type);
  const [delivery, setDelivery] = useState<any>(null);
  
  useEffect(() => {
    if (isActivity && user) {
      deliveryStore.getByStudentAndPost(user.id, post.id).then(setDelivery);
    }
  }, [isActivity, user, post.id]);
  const isNewPost = !isRead(post.id);
  const isPostSaved = isSaved(post.id);
  const isOverdue = post.dueAt ? new Date() > new Date(post.dueAt) : false;
  
  // Check if there's a study block scheduled for this activity
  const todayBlocks = getTodayBlocks();
  const hasStudyBlock = isActivity && todayBlocks.some(block => block.activityId === post.id);

  const getTypeConfig = (type: PostType) => {
    switch (type) {
      case 'AVISO': 
        return { 
          color: 'from-orange-500/20 to-amber-500/20 border-orange-500/30',
          icon: '📢',
          accent: 'text-orange-400'
        };
      case 'COMUNICADO': 
        return { 
          color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
          icon: '📋',
          accent: 'text-blue-400'
        };
      case 'EVENTO': 
        return { 
          color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
          icon: '📅',
          accent: 'text-purple-400'
        };
      case 'ATIVIDADE': 
        return { 
          color: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
          icon: '📝',
          accent: 'text-green-400'
        };
      case 'TRABALHO': 
        return { 
          color: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
          icon: '📚',
          accent: 'text-yellow-400'
        };
      case 'PROVA': 
        return { 
          color: 'from-red-500/20 to-rose-500/20 border-red-500/30',
          icon: '📄',
          accent: 'text-red-400'
        };
      default: 
        return { 
          color: 'from-gray-500/20 to-slate-500/20 border-gray-500/30',
          icon: '📄',
          accent: 'text-gray-400'
        };
    }
  };

  const typeConfig = getTypeConfig(post.type);

  const renderAttachmentPreview = () => {
    if (!post.attachments || post.attachments.length === 0) return null;

    const firstAttachment = post.attachments[0];
    const isImage = firstAttachment.name?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);
    const isPdf = firstAttachment.name?.toLowerCase().endsWith('.pdf');

    return (
      <div className="relative rounded-lg overflow-hidden bg-background/50 p-3 border border-border/50">
        <div className="flex items-center gap-2">
          {isImage ? (
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          ) : isPdf ? (
            <FileIcon className="h-4 w-4 text-red-400" />
          ) : (
            <Paperclip className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground truncate">
            {firstAttachment.name}
          </span>
          {post.attachments.length > 1 && (
            <Badge variant="secondary" className="text-xs">
              +{post.attachments.length - 1}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  const formatDueDate = () => {
    if (!post.dueAt) return null;
    const dueDate = parseISO(post.dueAt);
    const now = new Date();
    const isOverduePost = dueDate < now;
    
    return (
      <div className={cn(
        "flex items-center gap-1 text-xs",
        isOverduePost ? "text-red-400" : "text-muted-foreground"
      )}>
        <Clock className="h-3 w-3" />
        <span>
          {isOverduePost ? 'Atrasado • ' : 'Entrega: '}
          {formatDistanceToNow(dueDate, { addSuffix: true, locale: ptBR })}
        </span>
      </div>
    );
  };

  const formatEventDate = () => {
    if (!post.eventStartAt) return null;
    const eventDate = parseISO(post.eventStartAt);
    
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" />
        <span>
          {formatDistanceToNow(eventDate, { addSuffix: true, locale: ptBR })}
        </span>
      </div>
    );
  };

  const handleActionWithLoading = async (actionKey: string, action: () => Promise<void> | void) => {
    setIsActionLoading(actionKey);
    try {
      await action();
    } catch (error) {
      console.error(`Error in action ${actionKey}:`, error);
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleScheduleStudy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    await handleActionWithLoading('schedule', async () => {
      if (onScheduleStudyBlock) {
        onScheduleStudyBlock(post);
      } else {
        // Fallback to direct scheduling
        const suggestions = useSmartAgenda().suggestStudyBlocks(post.id);
        if (suggestions.length > 0) {
          const firstSuggestion = suggestions[0];
          scheduleStudyBlock(post.id, firstSuggestion.startTime, firstSuggestion.duration);
          toast({
            title: 'Bloco de estudo agendado',
            description: `Estudo agendado para ${firstSuggestion.startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
          });
        }
      }
    });
  };

  const handleRemoveStudy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    await handleActionWithLoading('remove', async () => {
      if (onRemoveStudyBlock) {
        onRemoveStudyBlock(post);
      }
      toast({
        title: 'Bloco de estudo removido',
        description: 'O bloco de estudo foi removido da sua agenda'
      });
    });
  };

  const getPrimaryCTA = () => {
    // Activity CTAs
    if (isActivity) {
      if (!delivery) {
        return (
          <Button 
            size="xs" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium min-h-[32px] max-w-[6rem] sm:max-w-[8rem]"
            disabled={isActionLoading === 'delivery'}
            onClick={(e) => {
              e.stopPropagation();
              handleActionWithLoading('delivery', () => onMarkDelivered(post));
            }}
            aria-label={`Marcar ${post.title} como entregue`}
          >
            <Upload className="h-3 w-3 flex-shrink-0" />
            <span className="truncate text-xs">
              <span className="sm:hidden">Entregar</span>
              <span className="hidden sm:inline">Marcar Entregue</span>
            </span>
          </Button>
        );
      } else if (delivery.reviewStatus === 'DEVOLVIDA') {
        return (
          <Button 
            size="sm" 
            variant="outline"
            className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 min-h-[36px] max-w-[100px]"
            disabled={isActionLoading === 'delivery'}
            onClick={(e) => {
              e.stopPropagation();
              handleActionWithLoading('delivery', () => onMarkDelivered(post));
            }}
            aria-label={`Reenviar ${post.title}`}
          >
            <Upload className="h-3 w-3 mr-1.5 flex-shrink-0" />
            <span className="truncate text-xs">Reenviar</span>
          </Button>
        );
      }
    }

    // Notice CTAs
    if (['AVISO', 'COMUNICADO'].includes(post.type) && isNewPost) {
      return (
        <Button 
          size="sm" 
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium min-h-[36px] max-w-[120px]"
          disabled={isActionLoading === 'read'}
          onClick={(e) => {
            e.stopPropagation();
            handleActionWithLoading('read', () => onMarkAsRead(post));
          }}
          aria-label={`Marcar ${post.title} como lido`}
        >
          <CheckCircle className="h-3 w-3 mr-1.5 flex-shrink-0" />
          <span className="truncate text-xs">Marcar Lido</span>
        </Button>
      );
    }

    // Default CTA
    return (
      <Button 
        size="sm" 
        variant="outline"
        className="min-h-[36px] max-w-[80px]"
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetails(post);
        }}
        aria-label={`Abrir detalhes de ${post.title}`}
      >
        <FileText className="h-3 w-3 mr-1.5 flex-shrink-0" />
        <span className="truncate text-xs">Abrir</span>
      </Button>
    );
  };

  const getStudyCTA = () => {
    if (!isActivity || delivery?.reviewStatus === 'APROVADA') return null;
    
    if (hasStudyBlock) {
      return (
        <Button 
          size="sm" 
          variant="ghost"
          className="opacity-70 hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-500/10 min-h-[32px] max-w-[140px]"
          disabled={isActionLoading === 'remove'}
          onClick={handleRemoveStudy}
          aria-label={`Remover bloco de estudo de ${post.title}`}
        >
          <X className="h-3 w-3 mr-1 flex-shrink-0" />
          <span className="truncate text-xs">Remover Estudo</span>
        </Button>
      );
    }
    
    return (
      <Button 
        size="sm" 
        variant="ghost"
        className="opacity-70 hover:opacity-100 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 min-h-[32px] max-w-[140px]"
        disabled={isActionLoading === 'schedule'}
        onClick={handleScheduleStudy}
        aria-label={`Agendar estudo para ${post.title}`}
      >
        <BookOpen className="h-3 w-3 mr-1 flex-shrink-0" />
        <span className="truncate text-xs">Agendar Estudo</span>
      </Button>
    );
  };

  return (
    <Card 
      className={cn(
        "glass-card hover:scale-[1.02] transition-all duration-300 cursor-pointer group relative overflow-hidden min-h-[200px] flex flex-col",
        `bg-gradient-to-br ${typeConfig.color}`,
        isNewPost && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background",
        isHovering && "shadow-xl shadow-primary/20",
        hasStudyBlock && "ring-2 ring-blue-400/30"
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={() => {
        if (user) {
          recordPostView(post.id, user, 'feed');
        }
        onOpenDetails(post);
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="text-lg">{typeConfig.icon}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="outline" className={cn("text-xs", typeConfig.accent)}>
                  {post.type}
                </Badge>
                {isNewPost && (
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-xs animate-glow-pulse">
                    Novo
                  </Badge>
                )}
                {delivery && (
                  <Badge 
                    variant={delivery.reviewStatus === 'APROVADA' ? 'default' : 'secondary'} 
                    className="text-xs"
                  >
                    {delivery.reviewStatus === 'AGUARDANDO' && '⏳ Aguardando'}
                    {delivery.reviewStatus === 'APROVADA' && '✅ Aprovada'}
                    {delivery.reviewStatus === 'DEVOLVIDA' && '🔄 Devolvida'}
                  </Badge>
                )}
                {isActivity && !delivery && isOverdue && (
                  <Badge variant="destructive" className="text-xs animate-pulse">
                    ⚠️ Atrasada
                  </Badge>
                )}
                {user && <PostReadInsights post={post} currentUser={user} />}
              </div>
              <h3 className={cn(
                "font-semibold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-2 text-sm sm:text-base",
                isHovering ? "text-primary" : ""
              )}>
                {post.title}
              </h3>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Body preview */}
        {post.body && (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2 break-words">
            {post.body}
          </p>
        )}

        {/* Event details */}
        {post.type === 'EVENTO' && post.eventLocation && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{post.eventLocation}</span>
          </div>
        )}

        {/* Attachment preview */}
        {renderAttachmentPreview()}

        {/* Date info */}
        <div className="flex items-center justify-between">
          <div>
            {isActivity && formatDueDate()}
            {post.type === 'EVENTO' && formatEventDate()}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 pt-3 border-t border-border/30">
          <div className="flex items-center gap-2 w-full">
            {getPrimaryCTA()}
            
            <Button 
              size="sm" 
              variant="ghost"
              className="opacity-70 hover:opacity-100 min-h-[32px] flex-shrink-0 max-w-[140px]"
              disabled={isActionLoading === 'calendar'}
              onClick={(e) => {
                e.stopPropagation();
                handleActionWithLoading('calendar', () => onGoToCalendar(post));
              }}
              aria-label={`Ver ${post.title} no calendário`}
            >
              <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="hidden sm:inline text-xs truncate">Ver no Calendário</span>
              <span className="sm:hidden text-xs truncate">Calendário</span>
            </Button>
            
            <Button 
              size="sm" 
              variant="ghost"
              className="opacity-70 hover:opacity-100 w-8 h-8 p-0 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(post);
              }}
              aria-label={`Abrir ${post.title} em nova janela`}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>

          {getStudyCTA() && (
            <div className="flex justify-center">
              {getStudyCTA()}
            </div>
          )}
          
          {/* Event Confirmation - Student View */}
          {post.type === 'EVENTO' && user?.id && (
            <div className="flex justify-center px-2">
              <div className="w-full max-w-[280px]">
                <EventConfirmationManager 
                  event={post} 
                  studentId={user.id}
                />
              </div>
            </div>
          )}
          
          {/* Invite Friends CTA for events */}
          {post.type === 'EVENTO' && post.allowInvitations && onInviteFriend && (
            <div className="flex justify-center">
              <Button 
                size="sm" 
                variant="outline"
                className="opacity-70 hover:opacity-100 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 min-h-[32px] max-w-[160px] w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onInviteFriend(post);
                }}
                aria-label={`Convidar amigos para ${post.title}`}
              >
                <Users className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate text-xs">Convidar Amigos</span>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}