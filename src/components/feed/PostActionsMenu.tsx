import { useState } from 'react';
import { Post } from '@/types/post';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MoreVertical, Edit, Copy, Archive, Trash2, Calendar, ExternalLink, PlayCircle } from 'lucide-react';
import { usePostActionsUnified } from '@/hooks/usePostActionsUnified';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface PostActionsMenuProps {
  post: Post;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onRefresh?: () => void;
  onConfirmAction?: (action: 'archive' | 'delete', postData: { id: string; title: string }) => void;
}

export function PostActionsMenu({ 
  post, 
  onEdit, 
  onDuplicate, 
  onRefresh, 
  onConfirmAction 
}: PostActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const {
    duplicatePost,
    publishNow,
    openInCalendar,
    editPost,
    copyLink,
    canPerformAction,
    isLoading
  } = usePostActionsUnified();

  if (!user) return null;

  const handleAction = (action: () => void) => {
    action();
    setOpen(false);
  };

  const actions = [
    canPerformAction('edit', post) && {
      icon: Edit,
      label: 'Editar',
      onClick: () => onEdit ? onEdit(post.id) : editPost(post)
    },
    canPerformAction('publishNow', post) && {
      icon: PlayCircle,
      label: 'Publicar agora',
      onClick: () => publishNow(post.id, { onSuccess: onRefresh }),
      className: 'text-green-600 hover:text-green-600'
    },
    canPerformAction('duplicate', post) && {
      icon: Copy,
      label: 'Duplicar',
      onClick: () => onDuplicate ? onDuplicate(post.id) : duplicatePost(post.id, user.name, { onSuccess: onRefresh })
    },
    (post.type === 'EVENTO' || ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type)) && {
      icon: Calendar,
      label: 'Ir para calendário',
      onClick: () => openInCalendar(post)
    },
    {
      icon: ExternalLink,
      label: 'Copiar link',
      onClick: () => copyLink(post)
    },
    canPerformAction('archive', post) && post.status !== 'ARCHIVED' && {
      icon: Archive,
      label: 'Arquivar',
      onClick: () => onConfirmAction?.('archive', { id: post.id, title: post.title }),
      className: 'text-orange-600 hover:text-orange-600'
    },
    canPerformAction('delete', post) && {
      icon: Trash2,
      label: 'Excluir',
      onClick: () => onConfirmAction?.('delete', { id: post.id, title: post.title }),
      className: 'text-destructive hover:text-destructive'
    },
  ].filter(Boolean) as Array<{
    icon: typeof Edit;
    label: string;
    onClick: () => void;
    className?: string;
  }>;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={(e) => e.stopPropagation()}
          aria-label="Opções do post"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-48 p-1 glass-card border-border/50"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col">
          {isLoading ? (
            <div className="px-2 py-3 text-sm text-muted-foreground text-center">
              Carregando...
            </div>
          ) : (
            actions.map((action, i) => (
              <Button
                key={i}
                variant="ghost"
                size="sm"
                className={cn(
                  "justify-start h-9 px-2 font-normal",
                  action.className
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(action.onClick);
                }}
              >
                <action.icon className="mr-2 h-4 w-4" />
                {action.label}
              </Button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
