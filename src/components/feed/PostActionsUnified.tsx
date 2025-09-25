import { useState } from 'react';
import { Post } from '@/types/post';
import { usePostActionsUnified } from '@/hooks/usePostActionsUnified';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Archive,
  Copy,
  Edit,
  Trash2,
  Calendar,
  ExternalLink,
  PlayCircle
} from 'lucide-react';

interface PostActionsUnifiedProps {
  post: Post;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onRefresh?: () => void;
  showLabels?: boolean;
  onConfirmAction?: (action: 'archive' | 'delete', postData: { id: string; title: string }) => void;
}

export function PostActionsUnified({ 
  post, 
  onEdit, 
  onDuplicate, 
  onRefresh,
  showLabels = true,
  onConfirmAction
}: PostActionsUnifiedProps) {
  const { user } = useAuth();
  const {
    archivePost,
    deletePost,
    duplicatePost,
    publishNow,
    openInCalendar,
    editPost,
    copyLink,
    canPerformAction,
    isLoading
  } = usePostActionsUnified();
  
  // Removed local confirmDialog state - now handled by parent

  if (!user) return null;

  // Actions now trigger parent confirmation dialog
  const handleArchive = () => {
    onConfirmAction?.('archive', { id: post.id, title: post.title });
  };

  const handleDelete = () => {
    onConfirmAction?.('delete', { id: post.id, title: post.title });
  };

  const handleDuplicateClick = async () => {
    if (onDuplicate) {
      onDuplicate(post.id);
    } else {
      // Fallback to direct duplication
      if (user) {
        await duplicatePost(post.id, user.name, { onSuccess: onRefresh });
      }
    }
  };

  const handlePublishNow = async () => {
    await publishNow(post.id, { onSuccess: onRefresh });
  };

  const handleEditClick = () => {
    if (onEdit) {
      onEdit(post.id);
    } else {
      // Fallback to unified edit handler
      editPost(post);
    }
  };


  // Simplified action handlers
  const openArchiveDialog = handleArchive;
  const openDeleteDialog = handleDelete;

  const isActionLoading = (action: string) => {
    return isLoading === action;
  };

  // Menu items based on user role and permissions
  const menuItems = [];

  // Edit action
  if (canPerformAction('edit', post)) {
    menuItems.push({
      key: 'edit',
      icon: Edit,
      label: 'Editar',
      onClick: handleEditClick,
      disabled: isActionLoading('update')
    });
  }

  // Publish now (for SCHEDULED posts)
  if (canPerformAction('publishNow', post)) {
    menuItems.push({
      key: 'publish',
      icon: PlayCircle,
      label: 'Publicar agora',
      onClick: handlePublishNow,
      disabled: isActionLoading('publish'),
      className: 'text-green-600 focus:text-green-600'
    });
  }

  // Duplicate action
  if (canPerformAction('duplicate', post)) {
    menuItems.push({
      key: 'duplicate',
      icon: Copy,
      label: 'Duplicar',
      onClick: handleDuplicateClick,
      disabled: isActionLoading('duplicate')
    });
  }

  // Open in calendar
  if ((post.type === 'EVENTO' && post.eventStartAt) || 
      (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type) && post.dueAt)) {
    menuItems.push({
      key: 'calendar',
      icon: Calendar,
      label: 'Ir para calendário',
      onClick: () => {
        try {
          openInCalendar(post);
        } catch (error) {
          console.error('Error navigating to calendar from post actions:', error);
        }
      },
      disabled: false
    });
  }

  // Share actions
  menuItems.push({
    key: 'copy',
    icon: ExternalLink,
    label: 'Copiar link',
    onClick: () => copyLink(post),
    disabled: false
  });


  // Archive action (not for already archived posts)
  if (canPerformAction('archive', post) && post.status !== 'ARCHIVED') {
    menuItems.push({
      key: 'archive',
      icon: Archive,
      label: 'Arquivar',
      onClick: openArchiveDialog,
      disabled: isActionLoading('archive'),
      className: 'text-orange-600 focus:text-orange-600'
    });
  }

  // Delete action (destructive)
  if (canPerformAction('delete', post)) {
    menuItems.push({
      key: 'delete',
      icon: Trash2,
      label: 'Excluir',
      onClick: openDeleteDialog,
      disabled: isActionLoading('delete'),
      className: 'text-destructive focus:text-destructive'
    });
  }

  return (
    <>
      {menuItems.map((item) => (
        <DropdownMenuItem
          key={item.key}
          onClick={item.onClick}
          disabled={item.disabled}
          className={item.className || 'cursor-pointer'}
        >
          <item.icon className="mr-2 h-4 w-4" />
          {showLabels && item.label}
          {item.disabled && (
            <span className="ml-auto text-xs text-muted-foreground">
              Carregando...
            </span>
          )}
        </DropdownMenuItem>
      ))}
    </>
  );
}