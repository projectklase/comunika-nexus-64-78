import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AttachmentGrid } from '@/components/attachments/AttachmentGrid';
import { PostInsights } from './PostInsights';
import { PostReadInsights } from './PostReadInsights';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Globe,
  FileText,
  Weight,
  Phone
} from 'lucide-react';
import { useWeightsEnabled } from '@/hooks/useWeightsEnabled';
import { Post, PostType } from '@/types/post';
import { useClassStore } from '@/stores/class-store';
import { getClassDisplayInfo, resolveSubjectNames } from '@/utils/class-helpers';
import { usePostActionsUnified } from '@/hooks/usePostActionsUnified';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePostViews } from '@/stores/post-views.store';
import { useEffect } from 'react';
import { useLevels } from '@/hooks/useLevels';
import { useModalities } from '@/hooks/useModalities';
import { useSubjects } from '@/hooks/useSubjects';

interface PostDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
}

export function PostDetailDrawer({ isOpen, onClose, post }: PostDetailDrawerProps) {
  const { getClass } = useClassStore();
  const { openInCalendar } = usePostActionsUnified();
  const { toast } = useToast();
  const { user } = useAuth();
  const { recordPostView } = usePostViews();
  const { levels } = useLevels();
  const { modalities } = useModalities();
  const { subjects } = useSubjects();

  // Record post view when drawer opens
  useEffect(() => {
    if (isOpen && post && user) {
      recordPostView(post.id, user, 'feed');
    }
  }, [isOpen, post, user, recordPostView]);

  if (!post) return null;
  
  const isActivity = ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type);
  
  const handleGoToCalendar = () => {
    try {
      openInCalendar(post);
      onClose();
      
      // Add extra success feedback
      setTimeout(() => {
        toast({
          title: "Navegando para o calendário",
          description: "Abrindo o post na data específica.",
        });
      }, 100);
    } catch (error) {
      console.error('Error navigating to calendar:', error);
      toast({
        title: "Erro na navegação",
        description: "Não foi possível abrir o calendário.",
        variant: "destructive",
      });
    }
  };

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

  const formatEventDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ptBR
    });
  };

  const renderAudienceInfo = () => {
    if (post.audience === 'GLOBAL') {
      return (
        <div className="flex items-center gap-2 text-blue-400">
          <Globe className="h-4 w-4" />
          <span>Toda a escola</span>
        </div>
      );
    }

    // Get class names for CLASS audience
    const classIds = post.classIds || (post.classId ? [post.classId] : []);
    
    if (classIds.length === 0) {
      return (
        <div className="flex items-center gap-2 text-orange-400">
          <Users className="h-4 w-4" />
          <span>Turmas específicas</span>
        </div>
      );
    }

    if (classIds.length === 1) {
      const cls = getClass(classIds[0]);
      if (cls) {
        const displayInfo = getClassDisplayInfo(cls, levels, modalities);
        const subjectNames = resolveSubjectNames(cls.subjectIds, subjects);
        
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-orange-400">
              <Users className="h-4 w-4" />
              <span className="font-medium">Turma:</span>
            </div>
            <div className="text-sm text-muted-foreground pl-6">
              <div className="font-medium">{cls.name}</div>
              <div>{displayInfo.levelModality}</div>
              <div>{displayInfo.schedule}</div>
              {subjectNames.length > 0 && (
                <div className="mt-1">
                  <span className="text-xs">Matérias: </span>
                  {subjectNames.join(', ')}
                </div>
              )}
            </div>
          </div>
        );
      }
    }

    // Multiple classes
    const classNames = classIds
      .map(id => getClass(id)?.name)
      .filter(Boolean);

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-orange-400">
          <Users className="h-4 w-4" />
          <span className="font-medium">Turmas:</span>
        </div>
        <div className="text-sm text-muted-foreground pl-6">
          {classNames.join(', ')}
        </div>
      </div>
    );
  };

  const weightsEnabled = useWeightsEnabled();

  const renderActivityMeta = () => {
    if (!post.activityMeta) return null;
    const meta = post.activityMeta;

    return (
      <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
        <h4 className="font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Detalhes da Atividade
        </h4>
        
        <div className="space-y-3 text-sm">
          {/* Weight */}
          {weightsEnabled && meta.usePeso && meta.peso !== undefined && (
            <div className="flex items-center gap-2">
              <Weight className="h-4 w-4 text-muted-foreground" />
              <span>Peso: {meta.peso}</span>
            </div>
          )}

          {/* Activity rubric */}
          {meta.rubrica && (
            <div className="space-y-1">
              <div className="font-medium">Critérios de Avaliação:</div>
              <div className="text-muted-foreground">{meta.rubrica}</div>
            </div>
          )}

          {/* Work delivery formats */}
          {meta.formatosEntrega && meta.formatosEntrega.length > 0 && (
            <div className="space-y-1">
              <div className="font-medium">Formatos de Entrega:</div>
              <div className="flex flex-wrap gap-1">
                {meta.formatosEntrega.map(format => (
                  <Badge key={format} variant="secondary" className="text-xs">
                    {format}
                  </Badge>
                ))}
                {meta.formatoCustom && (
                  <Badge variant="secondary" className="text-xs">
                    {meta.formatoCustom}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Group work */}
          {meta.permitirGrupo !== undefined && (
            <div className="flex items-center gap-2">
              <span>Trabalho em grupo: {meta.permitirGrupo ? 'Permitido' : 'Individual'}</span>
            </div>
          )}

          {/* Test details */}
          {meta.duracao && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Duração: {meta.duracao} minutos</span>
            </div>
          )}

          {meta.local && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>Local: {meta.local}</span>
            </div>
          )}

          {meta.tipoProva && (
            <div className="flex items-center gap-2">
              <span>Tipo: {meta.tipoProva}</span>
            </div>
          )}

          {meta.bloquearAnexosAluno && (
            <div className="text-orange-400 text-xs">
              ⚠️ Anexos de alunos não permitidos durante a prova
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[95vh]" role="dialog" aria-labelledby="post-detail-title">
        <DrawerHeader>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={`${getTypeColor(post.type)} font-medium`}>
                <span className="mr-1">{getTypeIcon(post.type)}</span>
                {post.type}
              </Badge>
              {user && (
                <div className="flex items-center gap-2">
                  <PostInsights post={post} currentUser={user} />
                  <PostReadInsights post={post} currentUser={user} />
                </div>
              )}
            </div>
            
            {/* Calendar Navigation Button */}
            {((post.type === 'EVENTO' && post.eventStartAt) || (isActivity && post.dueAt)) && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGoToCalendar}
                className="flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={post.type === 'EVENTO' ? "Ir para calendário na data do evento" : "Ir para calendário na data de entrega"}
              >
                <Calendar className="h-4 w-4" />
                Ir para calendário
              </Button>
            )}
          </div>
          
          <DrawerTitle id="post-detail-title" className="text-left text-xl leading-tight">
            {post.title}
          </DrawerTitle>
          <DrawerDescription className="text-left">
            Por {post.authorName} • {formatDate(post.createdAt)}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-6 flex-1 overflow-y-auto space-y-6" role="main">
          {/* Body */}
          {post.body && (
            <div className="prose prose-sm max-w-none">
              <div className="text-foreground whitespace-pre-wrap leading-relaxed">
                {post.body}
              </div>
            </div>
          )}

          {/* Event details */}
          {post.type === 'EVENTO' && (post.eventStartAt || post.eventLocation) && (
            <div className="space-y-3 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <h4 className="font-medium text-purple-300">Detalhes do Evento</h4>
              {post.eventStartAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-purple-400" />
                  <span className="text-purple-200">
                    {formatEventDate(post.eventStartAt)}
                    {post.eventEndAt && ` - ${formatEventDate(post.eventEndAt)}`}
                  </span>
                </div>
              )}
              {post.eventLocation && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-purple-400" />
                  <span className="text-purple-200">{post.eventLocation}</span>
                </div>
              )}
            </div>
          )}

          {/* Contact Phone */}
          {post.meta?.contactPhone && (
            <div className="space-y-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <h4 className="font-medium text-blue-300">Contato</h4>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-blue-400" />
                <a 
                  href={`tel:+55${post.meta.contactPhone.replace(/\D/g, '')}`}
                  className="text-blue-200 hover:text-blue-100 underline transition-colors"
                  title="Clique para ligar"
                >
                  {post.meta.contactPhone}
                </a>
              </div>
            </div>
          )}

          {/* Due date for activities */}
          {post.dueAt && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-yellow-400" />
                <span className="text-yellow-300">
                  Prazo: {formatEventDate(post.dueAt)}
                </span>
              </div>
            </div>
          )}

          {/* Activity metadata */}
          {renderActivityMeta()}

          {/* Audience info */}
          <div className="space-y-2">
            {renderAudienceInfo()}
          </div>

          {/* Attachments */}
          {post.attachments && post.attachments.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Anexos</h4>
              <AttachmentGrid 
                attachments={post.attachments}
                postTitle={post.title}
              />
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}