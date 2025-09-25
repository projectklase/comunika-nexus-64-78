import React from 'react';
import { Post } from '@/types/post';
import { NormalizedCalendarEvent } from '@/utils/calendar-events';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendarActions } from '@/hooks/useCalendarActions';
import { toast } from 'sonner';
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
import { Button } from '@/components/ui/button';
import {
  Archive,
  Copy,
  Edit,
  Trash2,
  Calendar,
  ExternalLink,
  PlayCircle,
  Eye,
  CheckCircle,
  FileText,
  Plus,
  Download,
  MoreHorizontal
} from 'lucide-react';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface UnifiedCalendarActionsProps {
  event: NormalizedCalendarEvent | Post;
  children?: React.ReactNode;
  showLabels?: boolean;
  variant?: 'dropdown' | 'buttons';
  className?: string;
  buttonSize?: 'sm' | 'default' | 'lg';
}

export function UnifiedCalendarActions({ 
  event, 
  children, 
  showLabels = true,
  variant = 'dropdown',
  className,
  buttonSize = 'sm'
}: UnifiedCalendarActionsProps) {
  const { user } = useAuth();
  const actions = useCalendarActions();
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: 'archive' | 'delete' | null;
    title: string;
    description: string;
    postId: string;
    postTitle: string;
  }>({ 
    isOpen: false, 
    action: null, 
    title: '', 
    description: '', 
    postId: '', 
    postTitle: '' 
  });

  if (!user) return null;

  // Extract post data for easier access
  const post = 'meta' in event ? {
    id: event.postId,
    type: event.subtype,
    title: event.meta.title,
    status: event.status,
  } : {
    id: event.id,
    type: event.type,
    title: event.title,
    status: event.status,
  };

  // Helper to open confirmation dialog
  const openConfirmDialog = (action: 'archive' | 'delete') => {
    const actionText = action === 'archive' ? 'arquivar' : 'excluir';
    const actionTitle = action === 'archive' ? 'Arquivar Post' : 'Excluir Post';
    const actionDescription = action === 'archive' 
      ? `Tem certeza que deseja arquivar "${post.title}"? O post será movido para o arquivo e ficará oculto para os usuários.`
      : `Tem certeza que deseja excluir "${post.title}"? Esta ação não pode ser desfeita.`;
    
    setConfirmDialog({
      isOpen: true,
      action,
      title: actionTitle,
      description: actionDescription,
      postId: post.id,
      postTitle: post.title
    });
  };

  // Helper to execute confirmed action
  const executeConfirmedAction = () => {
    if (confirmDialog.action) {
      actions.confirmAction(confirmDialog.action, {
        id: confirmDialog.postId,
        title: confirmDialog.postTitle
      });
    }
    setConfirmDialog({ 
      isOpen: false, 
      action: null, 
      title: '', 
      description: '', 
      postId: '', 
      postTitle: '' 
    });
  };


  // Build menu items based on user role and permissions
  const menuItems = [];

  // View details (always available for clickable events)
  if (actions.shouldShowEvent(event) && ('clickable' in event ? event.clickable : true)) {
    menuItems.push({
      key: 'details',
      icon: Eye,
      label: 'Ver detalhes',
      onClick: () => actions.openDetails(event),
      disabled: false
    });
  }

  // Edit action
  if (actions.canPerformAction('edit', event)) {
    menuItems.push({
      key: 'edit',
      icon: Edit,
      label: 'Editar',
      onClick: () => actions.editPost(event),
      disabled: actions.isLoading === 'update'
    });
  }

  // Publish now (for SCHEDULED posts)
  if (actions.canPerformAction('publishNow', event)) {
    menuItems.push({
      key: 'publish',
      icon: PlayCircle,
      label: 'Publicar agora',
      onClick: () => actions.publishNow(event),
      disabled: actions.isLoading === 'publish',
      className: 'text-green-600 focus:text-green-600'
    });
  }

  // Duplicate action
  if (actions.canPerformAction('duplicate', event)) {
    menuItems.push({
      key: 'duplicate',
      icon: Copy,
      label: 'Duplicar',
      onClick: () => actions.duplicatePost(event),
      disabled: actions.isLoading === 'duplicate'
    });
  }

  // Role-specific actions
  if (user.role === 'aluno') {
    // Student actions - show "Entregar" for activities
    if (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type)) {
      menuItems.push({
        key: 'mark-delivered',
        icon: CheckCircle,
        label: 'Entregar',
        onClick: () => actions.markDelivered(event),
        disabled: false,
        className: 'text-green-600 focus:text-green-600'
      });
    }

    if (post.type === 'EVENTO') {
      menuItems.push({
        key: 'add-calendar',
        icon: Plus,
        label: 'Adicionar',
        onClick: () => actions.addToMyCalendar(event),
        disabled: false
      });
    }
  } else if (user.role === 'professor') {
    // Professor actions
    if (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type)) {
      menuItems.push({
        key: 'deliveries',
        icon: FileText,
        label: 'Ver entregas',
        onClick: () => actions.openDeliveries(event),
        disabled: false
      });
    }
  }

  // Open in calendar
  menuItems.push({
    key: 'calendar',
    icon: Calendar,
    label: 'Ir para calendário',
    onClick: () => actions.openInCalendar(event),
    disabled: false
  });

  // Attachments
  const hasAttachments = ('meta' in event && event.meta.attachments?.length) || 
                        ('attachments' in event && event.attachments?.length);
  if (hasAttachments) {
    menuItems.push({
      key: 'attachments',
      icon: Download,
      label: 'Ver anexos',
      onClick: () => actions.openAttachments(event),
      disabled: false
    });
  }

  // Share actions
  menuItems.push({
    key: 'copy',
    icon: ExternalLink,
    label: 'Copiar link',
    onClick: () => actions.copyLink(event),
    disabled: false
  });


  // Administrative actions (separator before)
  const adminActions = [];

  // Archive action (not for already archived posts)
  if (actions.canPerformAction('archive', event) && post.status !== 'ARCHIVED') {
    adminActions.push({
      key: 'archive',
      icon: Archive,
      label: 'Arquivar',
      onClick: () => openConfirmDialog('archive'),
      disabled: actions.isLoading === 'archive',
      className: 'text-orange-600 focus:text-orange-600'
    });
  }

  // Delete action (destructive)
  if (actions.canPerformAction('delete', event)) {
    adminActions.push({
      key: 'delete',
      icon: Trash2,
      label: 'Excluir',
      onClick: () => openConfirmDialog('delete'),
      disabled: actions.isLoading === 'delete',
      className: 'text-destructive focus:text-destructive'
    });
  }

  const allItems = [...menuItems, ...(adminActions.length > 0 ? [null, ...adminActions] : [])];

  if (variant === 'buttons') {
    // Render as button group
    return (
      <>
        <div className={cn('flex items-center gap-1 flex-wrap', className)}>
          {menuItems.slice(0, 3).map((item) => (
            item && (
                <Button
                key={item.key}
                variant="outline"
                size={buttonSize}
                onClick={item.onClick}
                disabled={item.disabled}
                className={cn('h-8 min-w-0 max-w-[5rem] sm:max-w-[7rem]', item.className)}
              >
                <item.icon className="h-3 w-3 flex-shrink-0" />
                {showLabels && (
                  <span className="hidden sm:inline truncate text-xs ml-1">
                    {item.label}
                  </span>
                )}
              </Button>
            )
          ))}
          
          {allItems.length > 3 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size={buttonSize} className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {allItems.slice(3).map((item, index) => 
                  item === null ? (
                    <DropdownMenuSeparator key={`sep-${index}`} />
                  ) : (
                    <DropdownMenuItem
                      key={item.key}
                      onClick={item.onClick}
                      disabled={item.disabled}
                      className={cn('cursor-pointer', item.className)}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <AlertDialog 
          open={confirmDialog.isOpen} 
          onOpenChange={(open) => !open && setConfirmDialog({ 
            isOpen: false, 
            action: null, 
            title: '', 
            description: '', 
            postId: '', 
            postTitle: '' 
          })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={executeConfirmedAction}
                className={confirmDialog.action === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
              >
                {confirmDialog.action === 'archive' ? 'Arquivar' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Default: dropdown menu
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {children || (
            <Button variant="ghost" size="sm" className={cn('h-8 w-8 p-0', className)}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {allItems.map((item, index) => 
            item === null ? (
              <DropdownMenuSeparator key={`sep-${index}`} />
            ) : (
              <DropdownMenuItem
                key={item.key}
                onClick={item.onClick}
                disabled={item.disabled}
                className={cn('cursor-pointer', item.className)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {showLabels && item.label}
                {item.disabled && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    Carregando...
                  </span>
                )}
              </DropdownMenuItem>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog 
        open={confirmDialog.isOpen} 
        onOpenChange={(open) => !open && setConfirmDialog({ 
          isOpen: false, 
          action: null, 
          title: '', 
          description: '', 
          postId: '', 
          postTitle: '' 
        })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeConfirmedAction}
              className={confirmDialog.action === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {confirmDialog.action === 'archive' ? 'Arquivar' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}