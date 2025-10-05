import { useState } from 'react';
import { Post, PostInput } from '@/types/post';
import { postStore } from '@/stores/post-store';
import { useToast } from '@/hooks/use-toast';
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
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Archive,
  Copy,
  Edit,
  Trash2,
} from 'lucide-react';

interface PostActionHandlerProps {
  post: Post;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onRefresh?: () => void;
}

export function PostActionHandler({ post, onEdit, onDuplicate, onRefresh }: PostActionHandlerProps) {
  const { toast } = useToast();
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleArchive = async () => {
    try {
      const success = postStore.archive(post.id);
      if (success) {
        toast({
          title: "Post arquivado",
          description: "O post foi arquivado com sucesso.",
        });
        onRefresh?.();
      } else {
        throw new Error('Falha ao arquivar post');
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível arquivar o post.",
        variant: "destructive",
      });
    } finally {
      setIsArchiveDialogOpen(false);
    }
  };

  const handleDelete = async () => {
    try {
      const success = postStore.delete(post.id);
      if (success) {
        toast({
          title: "Post excluído",
          description: "O post foi removido definitivamente do sistema.",
        });
        onRefresh?.();
      } else {
        throw new Error('Falha ao excluir post');
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o post.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const handleDuplicateClick = async () => {
    if (onDuplicate) {
      onDuplicate(post.id);
    } else {
      // Fallback: create duplicate directly
      try {
        const duplicateData = await postStore.duplicate(post.id);
        if (duplicateData) {
          await postStore.create(duplicateData, post.authorName, post.authorId || '');
          toast({
            title: "Post duplicado",
            description: "Uma cópia do post foi criada com sucesso.",
          });
          onRefresh?.();
        }
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível duplicar o post.",
          variant: "destructive",
        });
      }
    }
  };

  const handleEditClick = () => {
    if (onEdit) {
      onEdit(post.id);
    }
  };

  return (
    <>
      {onEdit && (
        <DropdownMenuItem onClick={handleEditClick} className="cursor-pointer">
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
      )}
      
      <DropdownMenuItem onClick={handleDuplicateClick} className="cursor-pointer">
        <Copy className="mr-2 h-4 w-4" />
        Duplicar
      </DropdownMenuItem>
      
      {post.status !== 'ARCHIVED' && (
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setIsArchiveDialogOpen(true);
          }}
          className="cursor-pointer text-orange-600 focus:text-orange-600"
        >
          <Archive className="mr-2 h-4 w-4" />
          Arquivar
        </DropdownMenuItem>
      )}
      
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault();
          setIsDeleteDialogOpen(true);
        }}
        className="cursor-pointer text-destructive focus:text-destructive"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Apagar
      </DropdownMenuItem>

      {/* Archive Dialog */}
      <AlertDialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <AlertDialogContent className="glass-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar post</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja arquivar este post? Ele não aparecerá mais no feed principal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="glass-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir post definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O post será removido do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground hover:shadow-lg hover:shadow-destructive/20"
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}