import { useState, useMemo, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AttachmentGrid } from '@/components/attachments/AttachmentGrid';
import { PostInsights } from './PostInsights';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  MoreVertical,
  Calendar,
  Clock,
  MapPin,
  Archive,
  Copy,
  Edit,
  Trash2,
  Paperclip,
  Users,
  Globe,
  CheckCircle,
  Upload,
  FileText,
  Bookmark,
  BookmarkCheck,
  CalendarPlus,
  Eye,
  Phone,
  Star,
} from 'lucide-react';
import { Post, PostType } from '@/types/post';
import { useClassStore } from '@/stores/class-store';
import { getClassDisplayInfo, resolveSubjectNames } from '@/utils/class-helpers';
import { useLevels } from '@/hooks/useLevels';
import { useModalities } from '@/hooks/useModalities';
import { useSubjects } from '@/hooks/useSubjects';
import { useAuth } from '@/contexts/AuthContext';
import { useReads } from '@/hooks/useReads';
import { usePostViews } from '@/stores/post-views.store';
import { useSaved } from '@/hooks/useSaved';
import { deliveryStore } from '@/stores/delivery-store';
import { DrawerEntrega } from './DrawerEntrega';
import { PostDetailDrawer } from './PostDetailDrawer';
import { PostActionHandler } from './PostActionHandler';
import { PostActionsUnified } from './PostActionsUnified';
import { PostReadInsights } from './PostReadInsights';
import { toast } from '@/hooks/use-toast';
import { useCalendarNavigation } from '@/hooks/useCalendarNavigation';
import { usePostActionsUnified } from '@/hooks/usePostActionsUnified';
import { cn } from '@/lib/utils';

interface PostCardProps {
  post: Post;
  canEdit?: boolean;
  onArchive?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpdate?: () => void;
  onInviteFriend?: (post: Post) => void;
  onViewInvitations?: (post: Post) => void;
}

export function PostCard({ post, canEdit = false, onArchive, onDuplicate, onEdit, onDelete, onUpdate, onInviteFriend, onViewInvitations }: PostCardProps) {

  const { user } = useAuth();
  const { getClass } = useClassStore();
  const { markAsRead, isRead } = useReads();
  const { toggleSave, isSaved } = useSaved();
  const { recordPostView } = usePostViews();
  const { archivePost, deletePost, openInCalendar } = usePostActionsUnified();
  const { levels } = useLevels();
  const { modalities } = useModalities();
  const { subjects } = useSubjects();
  
  const [isDrawerEntregaOpen, setIsDrawerEntregaOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: 'archive' | 'delete' | null;
    title: string;
    description: string;
    postId: string;
  }>({
    isOpen: false,
    action: null,
    title: '',
    description: '',
    postId: ''
  });
  // Memoize expensive computations
  const [delivery, setDelivery] = useState<any>(null);
  
  useEffect(() => {
    const isActivity = ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type);
    if (isActivity && user) {
      deliveryStore.getByStudentAndPost(user.id, post.id).then(setDelivery);
    }
  }, [post.type, user, post.id]);

  const memoizedData = useMemo(() => {
    const isActivity = ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type);
    const isNewPost = !isRead(post.id);
    const isPostSaved = isSaved(post.id);
    const isOverdue = post.dueAt ? new Date() > new Date(post.dueAt) : false;
    
    return { isActivity, isNewPost, isPostSaved, isOverdue };
  }, [post.type, post.id, post.dueAt, isRead, isSaved]);
  
  const { isActivity, isNewPost, isPostSaved, isOverdue } = memoizedData;
  
  const getTypeColor = (type: PostType) => {
    switch (type) {
      case 'AVISO': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'COMUNICADO': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'EVENTO': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'ATIVIDADE': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'TRABALHO': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'PROVA': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getTypeIcon = (type: PostType) => {
    switch (type) {
      case 'AVISO': return '📢';
      case 'COMUNICADO': return '📋';
      case 'EVENTO': return '📅';
      case 'ATIVIDADE': return '📝';
      case 'TRABALHO': return '📚';
      case 'PROVA': return '📄';
      default: return '📄';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'SCHEDULED': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'ARCHIVED': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'Publicado';
      case 'SCHEDULED': return 'Agendado';
      case 'ARCHIVED': return 'Arquivado';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ptBR
    });
  };

  const formatEventDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderAudienceInfo = () => {
    if (post.audience === 'GLOBAL') {
      return (
        <div className="flex items-center gap-1 text-blue-400">
          <Globe className="h-3 w-3" />
          <span>Global</span>
        </div>
      );
    }

    // Get class names for CLASS audience
    const classIds = post.classIds || (post.classId ? [post.classId] : []);
    
    if (classIds.length === 0) {
      return (
        <div className="flex items-center gap-1 text-orange-400">
          <Users className="h-3 w-3" />
          <span>Turmas</span>
        </div>
      );
    }

    if (classIds.length === 1) {
      const cls = getClass(classIds[0]);
      if (cls) {
        const displayInfo = getClassDisplayInfo(cls, levels, modalities);
        const subjectNames = resolveSubjectNames(cls.subjectIds, subjects);
        const subjectText = subjectNames.length > 0 ? ` (+${subjectNames.length} matérias)` : '';
        
        return (
          <div className="flex flex-col gap-0.5 text-orange-400 text-xs max-w-xs">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 shrink-0" />
              <span className="font-medium">Audiência:</span>
            </div>
            <div className="text-xs text-muted-foreground leading-tight">
              {cls.name} — {displayInfo.levelModality} — {displayInfo.schedule}{subjectText}
            </div>
          </div>
        );
      }
    }

    // Multiple classes
    const classNames = classIds
      .map(id => getClass(id)?.name)
      .filter(Boolean);

    const displayText = classNames.length <= 2 
      ? classNames.join(', ')
      : `${classNames.slice(0, 2).join(', ')} (+${classNames.length - 2})`;

    return (
      <div className="flex items-center gap-1 text-orange-400" title={classNames.join(', ')}>
        <Users className="h-3 w-3" />
        <span className="text-xs">{displayText}</span>
      </div>
    );
  };

  const handleMarkAsRead = () => {
    markAsRead(post.id);
    toast({
      title: 'Marcado como lido',
      description: 'Post foi marcado como lido com sucesso.'
    });
    onUpdate?.();
  };

  const handleSaveToggle = () => {
    toggleSave(post.id);
    toast({
      title: isPostSaved ? 'Removido dos salvos' : 'Salvo para depois',
      description: isPostSaved 
        ? 'Post foi removido dos seus salvos.'
        : 'Post foi salvo para visualização posterior.'
    });
    onUpdate?.();
  };

  const handleGoToCalendar = () => {
    if (!user?.role) {
      toast({
        title: "Erro de autenticação",
        description: "Usuário não autenticado.",
        variant: "destructive",
      });
      return;
    }

    try {
      openInCalendar(post);
    } catch (error) {
      console.error('Error navigating to calendar:', error);
      toast({
        title: "Erro na navegação",
        description: "Não foi possível abrir o calendário.",
        variant: "destructive",
      });
    }
  };

  const handleEntregaSuccess = () => {
    onUpdate?.();
  };

  const handleConfirmAction = (action: 'archive' | 'delete', postData: { id: string; title: string }) => {
    setConfirmDialog({
      isOpen: true,
      action,
      title: action === 'archive' ? 'Arquivar post' : 'Excluir post definitivamente?',
      description: action === 'archive' 
        ? `Tem certeza que deseja arquivar "${postData.title}"? Ele não aparecerá mais no feed principal.`
        : `Esta ação não pode ser desfeita. O post "${postData.title}" será removido permanentemente do sistema.`,
      postId: postData.id
    });
  };

  const executeConfirmAction = async () => {
    if (!confirmDialog.action || !confirmDialog.postId) return;
    
    let success = false;
    if (confirmDialog.action === 'archive') {
      success = await archivePost(confirmDialog.postId, { onSuccess: onUpdate });
    } else if (confirmDialog.action === 'delete') {
      success = await deletePost(confirmDialog.postId, { onSuccess: onUpdate });
    }
    
    if (success) {
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    }
  };

  // Check if post is overdue
  const isPostOverdue = post.dueAt ? new Date() > new Date(post.dueAt) : false;

  // Check if post is marked as important
  const isImportant = post.meta?.important === true;

  return (
    <>
      <Card 
        className={cn(
          "glass-card border-border/50 hover:border-primary/30 transition-all duration-300 group hover:shadow-lg hover:shadow-primary/10",
          isNewPost && "ring-2 ring-primary/50",
          isImportant && [
            "relative overflow-hidden",
            "border-[hsl(var(--golden))] bg-[hsl(var(--golden))]/5",
            "shadow-[var(--golden-silhouette)]",
            "hover:shadow-[var(--golden-glow)] hover:border-[hsl(var(--golden-light))]",
            "before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-[hsl(var(--golden))]/10 before:to-transparent before:pointer-events-none"
          ]
        )}
        role="article"
        aria-labelledby={`post-title-${post.id}`}
        tabIndex={0}
        data-post-id={post.id}
        id={`post-${post.id}`}
        data-important={isImportant}
      >
        <CardHeader className="pb-3" role="banner">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`${getTypeColor(post.type)} font-medium`}>
                <span className="mr-1">{getTypeIcon(post.type)}</span>
                {post.type}
              </Badge>
              <Badge variant="outline" className={getStatusColor(post.status)}>
                {getStatusLabel(post.status)}
              </Badge>
              {isNewPost && (
                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                  Novo
                </Badge>
              )}
              {isImportant && (
                <Badge className="bg-[hsl(var(--golden))]/20 text-[hsl(var(--golden-light))] border-[hsl(var(--golden))]/60 text-xs font-medium shadow-[var(--golden-glow)] backdrop-blur-sm">
                  <Star className="h-3 w-3 mr-1 fill-[hsl(var(--golden-light))]" />
                  Importante
                </Badge>
              )}
              {isPostSaved && (
                <Badge variant="secondary" className="text-xs">
                  <Bookmark className="h-3 w-3 mr-1" />
                  Salvo
                </Badge>
              )}
              {delivery && (
                <Badge variant={delivery.reviewStatus === 'APROVADA' ? 'default' : 'secondary'} className="text-xs">
                  {delivery.reviewStatus === 'AGUARDANDO' && 'Aguardando revisão'}
                  {delivery.reviewStatus === 'APROVADA' && 'Aprovada'}
                  {delivery.reviewStatus === 'DEVOLVIDA' && 'Devolvida'}
                  {delivery.isLate && ' (Atrasada)'}
                </Badge>
              )}
              {isActivity && !delivery && isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  Atrasada
                </Badge>
              )}
            </div>
          </div>

          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Opções do post"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-card border-border/50">
                <PostActionsUnified
                  post={post}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onRefresh={onUpdate}
                  onConfirmAction={handleConfirmAction}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <h3 
          id={`post-title-${post.id}`}
          className="text-lg font-semibold text-foreground leading-tight group-hover:text-primary transition-colors"
          data-post-title
        >
          {post.title}
        </h3>
      </CardHeader>

      <CardContent className="space-y-4" role="main">
        {/* Body preview */}
        {post.body && (
          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
            {post.body}
          </p>
        )}

        {/* Event details */}
        {post.type === 'EVENTO' && (post.eventStartAt || post.eventLocation) && (
          <div className="space-y-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            {post.eventStartAt && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-purple-400" />
                <span className="text-purple-300">
                  {formatEventDate(post.eventStartAt)}
                  {post.eventEndAt && ` - ${formatEventDate(post.eventEndAt)}`}
                </span>
              </div>
            )}
            {post.eventLocation && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-purple-400" />
                <span className="text-purple-300">{post.eventLocation}</span>
              </div>
            )}
          </div>
        )}

        {/* Contact Phone */}
        {post.meta?.contactPhone && (
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-blue-400" />
              <span className="text-blue-300 font-medium">Contato:</span>
              <a 
                href={`tel:+55${post.meta.contactPhone.replace(/\D/g, '')}`}
                className="text-blue-300 hover:text-blue-200 underline transition-colors"
                title="Clique para ligar"
              >
                {post.meta.contactPhone}
              </a>
            </div>
          </div>
        )}

        {/* 🔍 DEBUG TEMPORÁRIO - REMOVER DEPOIS */}
        {post.type === 'EVENTO' && (
          <div className="p-2 bg-gray-800 rounded text-xs font-mono space-y-1">
            <div>🔍 DEBUG - Botão Convidar:</div>
            <div>• type: {post.type}</div>
            <div>• allowInvitations: {String(post.allowInvitations)}</div>
            <div>• user.role: {user?.role}</div>
            <div>• hasOnInviteFriend: {String(!!onInviteFriend)}</div>
            <div className={`font-bold ${
              post.type === 'EVENTO' && 
              post.allowInvitations && 
              user?.role === 'aluno' && 
              onInviteFriend 
                ? 'text-green-400' 
                : 'text-red-400'
            }`}>
              → Botão deveria aparecer? {
                post.type === 'EVENTO' && 
                post.allowInvitations && 
                user?.role === 'aluno' && 
                onInviteFriend 
                  ? '✅ SIM' 
                  : '❌ NÃO'
              }
            </div>
          </div>
        )}

        {/* Invite Friends CTA - Student View for Events */}}
        {post.type === 'EVENTO' && post.allowInvitations && user?.role === 'aluno' && onInviteFriend && (
          <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/10 border-2 border-purple-500/40 shadow-md shadow-purple-500/10">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-purple-500/30 ring-2 ring-purple-400/50 flex-shrink-0">
                <Users className="h-4 w-4 text-purple-200" />
              </div>
              <div className="flex-1 space-y-2">
                <h4 className="font-bold text-sm text-purple-100 flex items-center gap-1.5">
                  🎉 Convide seus amigos!
                </h4>
                <p className="text-xs text-purple-100/90 leading-snug">
                  Traga amigos para este evento e ajude a escola a crescer.
                </p>
                <Button
                  onClick={() => {
                    console.log('🔍 DEBUG Invite Button:', {
                      postId: post.id,
                      type: post.type,
                      allowInvitations: post.allowInvitations,
                      userRole: user?.role,
                      hasOnInviteFriend: !!onInviteFriend
                    });
                    onInviteFriend(post);
                  }}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md hover:shadow-lg hover:shadow-purple-500/30 transition-all text-xs font-semibold h-9"
                  size="sm"
                >
                  <Users className="h-3.5 w-3.5 mr-1.5" />
                  Convidar Amigo
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Attachments */}
        {post.attachments && post.attachments.length > 0 && (
          <AttachmentGrid 
            attachments={post.attachments}
            postTitle={post.title}
          />
        )}

        {/* Scheduled publish info */}
        {post.status === 'SCHEDULED' && post.publishAt && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-yellow-400" />
              <span className="text-yellow-300">
                Será publicado em: {formatEventDate(post.publishAt)}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {user && (
          <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-border/50">
            {/* Mark as Read - for AVISO/COMUNICADO */}
            {['AVISO', 'COMUNICADO'].includes(post.type) && isNewPost && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleMarkAsRead}
                className="text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Marcar como lido"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Marcar como lido
              </Button>
            )}

            {/* Activity Actions - Only for students */}
            {isActivity && user.role === 'aluno' && (
              <>
                {!delivery ? (
                  <Button
                    size="xs"
                    onClick={() => setIsDrawerEntregaOpen(true)}
                    className="text-xs bg-green-600 hover:bg-green-700 text-white focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 min-w-0 max-w-[6rem] sm:max-w-[8rem]"
                    aria-label="Marcar entregue"
                  >
                    <Upload className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate text-xs">Entregar</span>
                  </Button>
                ) : delivery.reviewStatus === 'DEVOLVIDA' ? (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setIsDrawerEntregaOpen(true)}
                    className="text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label="Reenviar atividade"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Reenviar
                  </Button>
                ) : null}
                
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => {
                    if (user) {
                      recordPostView(post.id, user, 'feed', post.classIds?.[0] || post.classId);
                    }
                    setIsDetailDrawerOpen(true);
                  }}
                  className="text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label="Ver instruções da atividade"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Ver instruções
                </Button>
                
                {/* Go to Calendar - for activities */}
                {post.dueAt && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleGoToCalendar}
                    className="text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label="Ir para calendário na data de entrega"
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Ir para calendário
                  </Button>
                )}
              </>
            )}

            {/* Go to Calendar - for events */}
            {post.type === 'EVENTO' && post.eventStartAt && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleGoToCalendar}
                className="text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Ir para calendário na data do evento"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Ir para calendário
              </Button>
            )}
            

            {/* Invite Friends - for EVENTO with invitations enabled (Student only) */}
            {post.type === 'EVENTO' && post.allowInvitations && user?.role === 'aluno' && onInviteFriend && (
              <Button 
                size="sm" 
                variant="default"
                onClick={() => onInviteFriend(post)}
                className="text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all font-semibold"
                aria-label="Convidar amigos para o evento"
              >
                <Users className="h-3 w-3 mr-1" />
                🎉 Convidar Amigos
              </Button>
            )}

            {/* Save/Unsave Toggle */}
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleSaveToggle}
              className={`text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${isPostSaved ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              aria-label={isPostSaved ? "Remover dos salvos" : "Salvar para depois"}
            >
              {isPostSaved ? <BookmarkCheck className="h-3 w-3 mr-1" /> : <Bookmark className="h-3 w-3 mr-1" />}
              {isPostSaved ? 'Salvo' : 'Salvar'}
            </Button>

            {/* Go to Calendar - generic */}
            {!isActivity && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleGoToCalendar}
                className="text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Ver no calendário"
              >
                <CalendarPlus className="h-3 w-3 mr-1" />
                Ver no Calendário
              </Button>
            )}
            
            {/* View Invitations - for EVENTO with invitations enabled (Secretaria only) */}
            {post.type === 'EVENTO' && post.allowInvitations && canEdit && onViewInvitations && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onViewInvitations(post)}
                className="text-xs text-purple-400 border-purple-500/50 hover:bg-purple-500/10 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                aria-label="Ver convites recebidos"
              >
                <Users className="h-3 w-3 mr-1" />
                Ver Convites
              </Button>
            )}

            {/* Read Toggle - for read posts */}
            {!isNewPost && ['AVISO', 'COMUNICADO'].includes(post.type) && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleMarkAsRead} // This will toggle back to unread in a real implementation
                className="text-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Marcar como não lido"
              >
                <Eye className="h-3 w-3 mr-1" />
                Lido
              </Button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{post.authorName}</span>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(post.createdAt)}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {user && <PostReadInsights post={post} currentUser={user} />}
            {renderAudienceInfo()}
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Drawers */}
    {isActivity && (
      <DrawerEntrega
        isOpen={isDrawerEntregaOpen}
        onClose={() => setIsDrawerEntregaOpen(false)}
        activity={post}
        classId={post.classIds?.[0] || post.classId || ''}
        onSuccess={handleEntregaSuccess}
      />
    )}

    <PostDetailDrawer
      isOpen={isDetailDrawerOpen}
      onClose={() => setIsDetailDrawerOpen(false)}
      post={post}
      onInviteFriend={onInviteFriend}
    />

    {/* Confirmation Dialog */}
    <AlertDialog 
      open={confirmDialog.isOpen} 
      onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, isOpen: open }))}
    >
      <AlertDialogContent className="glass-card border-border/50">
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {confirmDialog.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={executeConfirmAction}
            className={cn(
              confirmDialog.action === 'delete' &&
              "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            )}
          >
            {confirmDialog.action === 'delete' ? 'Excluir' : 'Arquivar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}