import { useState, useMemo, useEffect } from "react";
import { formatDistanceToNow, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AttachmentGrid } from "@/components/attachments/AttachmentGrid";
import { PostInsights } from "./PostInsights";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MoreVertical, Calendar, Clock, MapPin, Archive, Copy, Edit, Trash2, Paperclip, Users, Globe, CheckCircle, Upload, FileText, Bookmark, BookmarkCheck, CalendarPlus, Eye, Phone, Star, UserPlus } from "lucide-react";
import { Post, PostType } from "@/types/post";
import { useClassStore } from "@/stores/class-store";
import { getClassDisplayInfo, resolveSubjectNames } from "@/utils/class-helpers";
import { useLevels } from "@/hooks/useLevels";
import { useModalities } from "@/hooks/useModalities";
import { useSubjects } from "@/hooks/useSubjects";
import { useAuth } from "@/contexts/AuthContext";
import { useReads } from "@/hooks/useReads";
import { usePostViews } from "@/stores/post-views.store";
import { useSaved } from "@/hooks/useSaved";
import { deliveryStore } from "@/stores/delivery-store";
import { DrawerEntrega } from "./DrawerEntrega";
import { PostDetailDrawer } from "./PostDetailDrawer";
import { PostActionHandler } from "./PostActionHandler";
import { PostActionsUnified } from "./PostActionsUnified";
import { PostReadInsights } from "./PostReadInsights";
import { EventConfirmationManager } from "@/components/student/EventConfirmationManager";
import { InviteFriendsSection } from "./InviteFriendsSection";
import { toast } from "@/hooks/use-toast";
import { useCalendarNavigation } from "@/hooks/useCalendarNavigation";
import { usePostActionsUnified } from "@/hooks/usePostActionsUnified";
import { cn } from "@/lib/utils";
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
  compact?: boolean; // FASE 2: Modo compacto para mobile
}
export function PostCard({
  post,
  canEdit = false,
  onArchive,
  onDuplicate,
  onEdit,
  onDelete,
  onUpdate,
  onInviteFriend,
  onViewInvitations,
  compact = false // FASE 2: Modo compacto para mobile
}: PostCardProps) {
  const {
    user
  } = useAuth();
  const {
    getClass
  } = useClassStore();
  const {
    markAsRead,
    isRead
  } = useReads();
  const {
    toggleSave,
    isSaved
  } = useSaved();
  const {
    recordPostView
  } = usePostViews();
  const {
    archivePost,
    deletePost,
    openInCalendar
  } = usePostActionsUnified();
  const {
    levels
  } = useLevels();
  const {
    modalities
  } = useModalities();
  const {
    subjects
  } = useSubjects();
  const [isDrawerEntregaOpen, setIsDrawerEntregaOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: "archive" | "delete" | null;
    title: string;
    description: string;
    postId: string;
  }>({
    isOpen: false,
    action: null,
    title: "",
    description: "",
    postId: ""
  });
  // Memoize expensive computations
  const [delivery, setDelivery] = useState<any>(null);
  useEffect(() => {
    const isActivity = ["ATIVIDADE", "TRABALHO", "PROVA"].includes(post.type);
    if (isActivity && user) {
      deliveryStore.getByStudentAndPost(user.id, post.id).then(setDelivery);
    }
  }, [post.type, user, post.id]);
  const memoizedData = useMemo(() => {
    const isActivity = ["ATIVIDADE", "TRABALHO", "PROVA"].includes(post.type);
    const isNewPost = !isRead(post.id);
    const isPostSaved = isSaved(post.id);
    const isOverdue = post.dueAt ? new Date() > new Date(post.dueAt) : false;
    return {
      isActivity,
      isNewPost,
      isPostSaved,
      isOverdue
    };
  }, [post.type, post.id, post.dueAt, isRead, isSaved]);
  const {
    isActivity,
    isNewPost,
    isPostSaved,
    isOverdue
  } = memoizedData;

  // Check if post is today
  const isPostToday = useMemo(() => {
    switch (post.type) {
      case 'EVENTO':
        return post.eventStartAt ? isToday(parseISO(post.eventStartAt)) : false;
      case 'ATIVIDADE':
      case 'TRABALHO':
      case 'PROVA':
        return post.dueAt ? isToday(parseISO(post.dueAt)) : false;
      default:
        return false;
    }
  }, [post.type, post.eventStartAt, post.dueAt]);
  const getTypeColor = (type: PostType) => {
    switch (type) {
      case "AVISO":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "COMUNICADO":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "EVENTO":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "ATIVIDADE":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "TRABALHO":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "PROVA":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };
  const getTypeIcon = (type: PostType) => {
    switch (type) {
      case "AVISO":
        return "📢";
      case "COMUNICADO":
        return "📋";
      case "EVENTO":
        return "📅";
      case "ATIVIDADE":
        return "📝";
      case "TRABALHO":
        return "📚";
      case "PROVA":
        return "📄";
      default:
        return "📄";
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "SCHEDULED":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "ARCHIVED":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "Publicado";
      case "SCHEDULED":
        return "Agendado";
      case "ARCHIVED":
        return "Arquivado";
      default:
        return status;
    }
  };
  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ptBR
    });
  };
  const formatEventDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  const renderAudienceInfo = () => {
    if (post.audience === "GLOBAL") {
      return <div className="flex items-center gap-1 text-blue-400">
          <Globe className="h-3 w-3" />
          <span>Global</span>
        </div>;
    }

    // Get class names for CLASS audience
    const classIds = post.classIds || (post.classId ? [post.classId] : []);
    if (classIds.length === 0) {
      return <div className="flex items-center gap-1 text-orange-400">
          <Users className="h-3 w-3" />
          <span>Turmas</span>
        </div>;
    }
    if (classIds.length === 1) {
      const cls = getClass(classIds[0]);
      if (cls) {
        const displayInfo = getClassDisplayInfo(cls, levels, modalities);
        const subjectNames = resolveSubjectNames(cls.subjectIds, subjects);
        const subjectText = subjectNames.length > 0 ? ` (+${subjectNames.length} matérias)` : "";
        return <div className="flex flex-col gap-0.5 text-orange-400 text-xs max-w-xs">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 shrink-0" />
              <span className="font-medium">Audiência:</span>
            </div>
            <div className="text-xs text-muted-foreground leading-tight">
              {cls.name} — {displayInfo.levelModality} — {displayInfo.schedule}
              {subjectText}
            </div>
          </div>;
      }
    }

    // Multiple classes
    const classNames = classIds.map(id => getClass(id)?.name).filter(Boolean);
    const displayText = classNames.length <= 2 ? classNames.join(", ") : `${classNames.slice(0, 2).join(", ")} (+${classNames.length - 2})`;
    return <div className="flex items-center gap-1 text-orange-400" title={classNames.join(", ")}>
        <Users className="h-3 w-3" />
        <span className="text-xs">{displayText}</span>
      </div>;
  };
  // ✅ Função removida: Marcar como lido agora só acontece ao abrir o drawer
  // Isso previne exploits onde alunos marcavam como lido sem ler de fato
  const handleSaveToggle = () => {
    toggleSave(post.id);
    toast({
      title: isPostSaved ? "Removido dos salvos" : "Salvo para depois",
      description: isPostSaved ? "Post foi removido dos seus salvos." : "Post foi salvo para visualização posterior."
    });
    onUpdate?.();
  };
  const handleGoToCalendar = () => {
    if (!user?.role) {
      toast({
        title: "Erro de autenticação",
        description: "Usuário não autenticado.",
        variant: "destructive"
      });
      return;
    }
    try {
      openInCalendar(post);
    } catch (error) {
      console.error("Error navigating to calendar:", error);
      toast({
        title: "Erro na navegação",
        description: "Não foi possível abrir o calendário.",
        variant: "destructive"
      });
    }
  };
  const handleEntregaSuccess = () => {
    onUpdate?.();
  };
  const handleConfirmAction = (action: "archive" | "delete", postData: {
    id: string;
    title: string;
  }) => {
    setConfirmDialog({
      isOpen: true,
      action,
      title: action === "archive" ? "Arquivar post" : "Excluir post definitivamente?",
      description: action === "archive" ? `Tem certeza que deseja arquivar "${postData.title}"? Ele não aparecerá mais no feed principal.` : `Esta ação não pode ser desfeita. O post "${postData.title}" será removido permanentemente do sistema.`,
      postId: postData.id
    });
  };
  const executeConfirmAction = async () => {
    if (!confirmDialog.action || !confirmDialog.postId) return;
    let success = false;
    if (confirmDialog.action === "archive") {
      success = await archivePost(confirmDialog.postId, {
        onSuccess: onUpdate
      });
    } else if (confirmDialog.action === "delete") {
      success = await deletePost(confirmDialog.postId, {
        onSuccess: onUpdate
      });
    }
    if (success) {
      setConfirmDialog(prev => ({
        ...prev,
        isOpen: false
      }));
    }
  };

  // Check if post is overdue
  const isPostOverdue = post.dueAt ? new Date() > new Date(post.dueAt) : false;

  // Check if post is marked as important
  const isImportant = post.meta?.important === true;
  
  // FASE 5: Borda lateral colorida por tipo de post
  const getTypeBorderColor = (type: PostType) => {
    switch (type) {
      case "AVISO": return "border-l-orange-500";
      case "COMUNICADO": return "border-l-blue-500";
      case "EVENTO": return "border-l-purple-500";
      case "ATIVIDADE": return "border-l-green-500";
      case "TRABALHO": return "border-l-yellow-500";
      case "PROVA": return "border-l-red-500";
      default: return "border-l-gray-500";
    }
  };
  
  return <>
    <Card className={cn(
      "w-full max-w-full overflow-hidden box-border transition-all duration-300 border",
      // Borda lateral colorida por tipo
      !isNewPost && !isImportant && `border-l-4 ${getTypeBorderColor(post.type)}`,
      isNewPost && "border-l-4 border-l-primary",
      isPostToday && "border-2 border-yellow-500/50 bg-yellow-500/5 shadow-yellow-500/20 shadow-lg",
      "border-border/50",
      // Efeito hover apenas em desktop
      !compact && "hover:shadow-xl",
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
      data-today={isPostToday}>
        <CardHeader className={cn("p-2 sm:p-4 pb-2", compact && "pb-2 pt-2")} role="banner">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Badges - Flex wrap em todos os tamanhos */}
              <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-2">
                <Badge variant="outline" className={`shrink-0 text-[10px] sm:text-xs px-1.5 py-0.5 ${getTypeColor(post.type)}`}>
                  <span className="mr-0.5 sm:mr-1">{getTypeIcon(post.type)}</span>
                  {/* Mobile: abreviação */}
                  <span className="sm:hidden">
                    {post.type === 'ATIVIDADE' ? 'Ativ.' : 
                     post.type === 'TRABALHO' ? 'Trab.' : 
                     post.type === 'COMUNICADO' ? 'Com.' : post.type}
                  </span>
                  {/* Desktop: nome completo */}
                  <span className="hidden sm:inline">{post.type}</span>
                </Badge>
                {/* Ocultar status em mobile, exceto se for agendado */}
                {post.status === 'SCHEDULED' && (
                  <Badge variant="outline" className={`${getStatusColor(post.status)} text-[10px] sm:text-xs px-1.5 py-0.5`}>
                    ⏰ Agend.
                  </Badge>
                )}
                {isNewPost && <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] sm:text-xs px-1.5 py-0.5">Novo</Badge>}
                {isPostToday && (
                  <Badge className="bg-yellow-500 text-black border-0 shadow-lg shadow-yellow-500/50 animate-pulse text-[10px] sm:text-xs px-1.5 py-0.5">
                    <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                    HOJE
                  </Badge>
                )}
                {isImportant && <Badge className="bg-[hsl(var(--golden))]/20 text-[hsl(var(--golden-light))] border-[hsl(var(--golden))]/60 text-[10px] sm:text-xs px-1.5 py-0.5 font-medium">
                    <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 fill-[hsl(var(--golden-light))]" />
                    Imp.
                  </Badge>}
                {/* Desktop only badges */}
                <div className="hidden sm:contents">
                  {post.status !== 'SCHEDULED' && (
                    <Badge variant="outline" className={`${getStatusColor(post.status)} text-xs`}>
                      {getStatusLabel(post.status)}
                    </Badge>
                  )}
                  {isPostSaved && <Badge variant="secondary" className="text-xs">
                      <Bookmark className="h-3 w-3 mr-1" />
                      Salvo
                    </Badge>}
                  {delivery && delivery.reviewStatus && (
                    <Badge variant={delivery.reviewStatus === "APROVADA" ? "default" : "secondary"} className="text-xs">
                      {delivery.reviewStatus === "AGUARDANDO" ? "Aguardando revisão" :
                       delivery.reviewStatus === "APROVADA" ? "Aprovada" :
                       delivery.reviewStatus === "DEVOLVIDA" ? "Devolvida" : null}
                      {delivery.isLate && " (Atrasada)"}
                    </Badge>
                  )}
                  {isActivity && !delivery && isOverdue && <Badge variant="destructive" className="text-xs">
                      Atrasada
                    </Badge>}
                  {post.type === "EVENTO" && post.eventCapacityEnabled && (
                    <Badge variant="outline" className="text-xs gap-1 bg-purple-500/10 text-purple-300 border-purple-500/30">
                      {post.eventCapacityType === 'PER_STUDENT' ? (
                        <>
                          <UserPlus className="h-3 w-3" />
                          Limite: {post.eventMaxGuestsPerStudent} por aluno
                        </>
                      ) : (
                        <>
                          <Users className="h-3 w-3" />
                          Capacidade: {post.eventMaxParticipants}
                        </>
                      )}
                    </Badge>
                  )}
                </div>
                {/* Mobile only: badges críticos resumidos */}
                <div className="contents sm:hidden">
                  {isPostSaved && <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                      <Bookmark className="h-2.5 w-2.5" />
                    </Badge>}
                  {delivery && delivery.reviewStatus && (
                    <Badge variant={delivery.reviewStatus === "APROVADA" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0.5">
                      {delivery.reviewStatus === "AGUARDANDO" ? "⏳" :
                       delivery.reviewStatus === "APROVADA" ? "✓" :
                       delivery.reviewStatus === "DEVOLVIDA" ? "↩" : null}
                    </Badge>
                  )}
                  {isActivity && !delivery && isOverdue && <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                      Atraso
                    </Badge>}
                </div>
              </div>
            </div>

            {canEdit && <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Opções do post">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-card border-border/50">
                  <PostActionsUnified post={post} onEdit={onEdit} onDuplicate={onDuplicate} onRefresh={onUpdate} onConfirmAction={handleConfirmAction} />
                </DropdownMenuContent>
              </DropdownMenu>}
          </div>

          <h3 id={`post-title-${post.id}`} className={cn(
            "font-semibold text-foreground leading-tight transition-colors line-clamp-2 break-words",
            compact ? "text-base mt-2" : "text-lg group-hover:text-primary"
          )} data-post-title>
            {post.title}
          </h3>
        </CardHeader>

        <CardContent className={cn("p-2 sm:p-4 pt-0 space-y-3 sm:space-y-4", compact && "space-y-2")} role="main">
          {/* Body preview - mais curto em mobile */}
          {post.body && (
            <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed line-clamp-2 sm:line-clamp-3">{post.body}</p>
          )}

          {/* Event details */}
          {post.type === "EVENTO" && (post.eventStartAt || post.eventLocation) && <div className="space-y-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 w-full max-w-full overflow-hidden">
              {post.eventStartAt && <div className="flex items-start gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <span className="text-purple-300 break-words">
                    {formatEventDate(post.eventStartAt)}
                    {post.eventEndAt && <span className="block sm:inline"> até {formatEventDate(post.eventEndAt)}</span>}
                  </span>
                </div>}
              {post.eventLocation && <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <span className="text-purple-300 break-words">{post.eventLocation}</span>
                </div>}
            </div>}

          {/* Activity Due Date - Para ATIVIDADE, TRABALHO, PROVA */}
          {isActivity && post.dueAt && (
            <div className={cn(
              "p-3 rounded-lg border flex items-center gap-3",
              // Cores por tipo de atividade
              post.type === "PROVA" && "bg-red-500/10 border-red-500/20",
              post.type === "TRABALHO" && "bg-yellow-500/10 border-yellow-500/20",
              post.type === "ATIVIDADE" && "bg-green-500/10 border-green-500/20",
              // Destaque adicional se vencido
              isOverdue && "bg-red-500/20 border-red-500/40"
            )}>
              <div className={cn(
                "flex items-center justify-center h-10 w-10 rounded-full shrink-0",
                post.type === "PROVA" && "bg-red-500/20",
                post.type === "TRABALHO" && "bg-yellow-500/20", 
                post.type === "ATIVIDADE" && "bg-green-500/20",
                isOverdue && "bg-red-500/30"
              )}>
                <Clock className={cn(
                  "h-5 w-5",
                  post.type === "PROVA" && "text-red-400",
                  post.type === "TRABALHO" && "text-yellow-400",
                  post.type === "ATIVIDADE" && "text-green-400",
                  isOverdue && "text-red-400"
                )} />
              </div>
              
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  {isOverdue ? "Prazo Encerrado" : "Prazo de Entrega"}
                </span>
                <span className={cn(
                  "text-sm font-semibold",
                  post.type === "PROVA" && "text-red-300",
                  post.type === "TRABALHO" && "text-yellow-300",
                  post.type === "ATIVIDADE" && "text-green-300",
                  isOverdue && "text-red-400 line-through"
                )}>
                  {formatEventDate(post.dueAt)}
                </span>
                {/* Tempo restante (se não vencido) */}
                {!isOverdue && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(post.dueAt), { addSuffix: true, locale: ptBR })}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Contact Phone */}
          {post.meta?.contactPhone && <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-blue-400" />
                <span className="text-blue-300 font-medium">Contato:</span>
                <a href={`tel:+55${post.meta.contactPhone.replace(/\D/g, "")}`} className="text-blue-300 hover:text-blue-200 underline transition-colors" title="Clique para ligar">
                  {post.meta.contactPhone}
                </a>
              </div>
            </div>}


          {/* Event Confirmation - Student View */}
          {post.type === "EVENTO" && user?.role === "aluno" && user?.id && (
            <div className="px-4 pb-3">
              <EventConfirmationManager 
                event={post} 
                studentId={user.id}
                onConfirmationChange={onUpdate}
              />
            </div>
          )}

          {/* Invite Friends Section - Student View for Events */}
          {post.type === "EVENTO" && post.allowInvitations && user?.role === "aluno" && onInviteFriend && (
            <InviteFriendsSection 
              post={post} 
              studentId={user.id}
              onInviteFriend={onInviteFriend}
            />
          )}

          {/* Attachments */}
          {post.attachments && post.attachments.length > 0 && <AttachmentGrid attachments={post.attachments} postTitle={post.title} />}

          {/* Scheduled publish info */}
          {post.status === "SCHEDULED" && post.publishAt && <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-yellow-400" />
                <span className="text-yellow-300">Será publicado em: {formatEventDate(post.publishAt)}</span>
              </div>
            </div>}

          {/* Action Buttons - Compacto em mobile */}
          {user && <div className="flex items-center gap-1 sm:gap-2 pt-2 sm:pt-3 border-t border-border/50 w-full">
            {/* Botão de leitura */}
            <Button 
              size="sm" 
              variant={isNewPost ? "default" : "ghost"}
              onClick={() => setIsDetailDrawerOpen(true)}
              className={cn(
                "h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3",
                isNewPost && "bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              )}
              aria-label={isNewPost ? "Ler post completo" : "Post já lido"}
            >
              {isNewPost ? <Eye className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline sm:ml-1">{isNewPost ? "Ler" : "Lido"}</span>
            </Button>

            {/* Activity Actions - Only for students */}
            {isActivity && user.role === "aluno" && <>
              {!delivery ? (
                <Button size="sm" onClick={() => setIsDrawerEntregaOpen(true)} className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3 bg-green-600 hover:bg-green-700 text-white" aria-label="Entregar">
                  <Upload className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline sm:ml-1">Entregar</span>
                </Button>
              ) : delivery.reviewStatus === "DEVOLVIDA" ? (
                <Button size="sm" variant="outline" onClick={() => setIsDrawerEntregaOpen(true)} className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3" aria-label="Reenviar">
                  <Upload className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline sm:ml-1">Reenviar</span>
                </Button>
              ) : null}

              <Button size="sm" variant="ghost" onClick={() => {
                if (user) recordPostView(post.id, user, "feed", post.classIds?.[0] || post.classId);
                setIsDetailDrawerOpen(true);
              }} className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3" aria-label="Instruções">
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline sm:ml-1">Instruções</span>
              </Button>

              {/* Calendário - desktop only */}
              {post.dueAt && <Button size="sm" variant="outline" onClick={handleGoToCalendar} className="hidden sm:flex h-9 px-3 text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                Calendário
              </Button>}
            </>}

            {/* Calendário eventos - desktop only */}
            {post.type === "EVENTO" && post.eventStartAt && (
              <Button size="sm" variant="outline" onClick={handleGoToCalendar} className="hidden sm:flex h-9 px-3 text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                Calendário
              </Button>
            )}

            {/* Save Toggle */}
            <Button size="sm" variant="ghost" onClick={handleSaveToggle} className={cn("h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3 ml-auto", isPostSaved ? "text-primary" : "text-muted-foreground")} aria-label={isPostSaved ? "Remover" : "Salvar"}>
              {isPostSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline sm:ml-1">{isPostSaved ? "Salvo" : "Salvar"}</span>
            </Button>

            {/* Ver Convites - desktop only */}
            {post.type === "EVENTO" && post.allowInvitations && canEdit && onViewInvitations && (
              <Button size="sm" variant="outline" onClick={() => onViewInvitations(post)} className="hidden sm:flex h-9 px-3 text-xs text-purple-400 border-purple-500/50 hover:bg-purple-500/10">
                <Users className="h-3 w-3 mr-1" />
                Ver Convites
              </Button>
            )}
          </div>}

          {/* Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border/50 mt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span className="truncate max-w-[150px]">{post.authorName}</span>
              <span className="shrink-0">•</span>
              <span className="shrink-0">{formatDate(post.createdAt)}</span>
            </div>

            <div className="flex items-center gap-2 text-xs shrink-0">
              {user && <PostReadInsights post={post} currentUser={user} />}
              {renderAudienceInfo()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drawers */}
      {isActivity && <DrawerEntrega isOpen={isDrawerEntregaOpen} onClose={() => setIsDrawerEntregaOpen(false)} activity={post} classId={post.classIds?.[0] || post.classId || ""} onSuccess={handleEntregaSuccess} />}

      <PostDetailDrawer isOpen={isDetailDrawerOpen} onClose={() => setIsDetailDrawerOpen(false)} post={post} onInviteFriend={onInviteFriend} />

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.isOpen} onOpenChange={open => setConfirmDialog(prev => ({
      ...prev,
      isOpen: open
    }))}>
        <AlertDialogContent className="glass-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeConfirmAction} className={cn(confirmDialog.action === "delete" && "bg-destructive hover:bg-destructive/90 text-destructive-foreground")}>
              {confirmDialog.action === "delete" ? "Excluir" : "Arquivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
}