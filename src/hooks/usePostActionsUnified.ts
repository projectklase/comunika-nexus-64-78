import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Post, PostInput } from '@/types/post';
import { postStore } from '@/stores/post-store';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { PostLinkBuilder } from '@/utils/post-links';
import { ROUTES } from '@/constants/routes';

interface PostActionOptions {
  onSuccess?: () => void;
  updateUrl?: boolean;
}

export function usePostActionsUnified() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  // Removed unused calendar navigation import
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // RBAC helper to check permissions
  const canPerformAction = (action: string, post: Post): boolean => {
    if (!user) return false;

    switch (action) {
      case 'edit':
      case 'duplicate':
      case 'archive':
      case 'delete':
        return user.role === 'secretaria' || 
               (user.role === 'professor' && ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type));
      case 'publishNow':
        return (user.role === 'secretaria' || user.role === 'professor') && post.status === 'SCHEDULED';
      case 'viewInCalendar':
        return true; // Everyone can view in calendar
      case 'markDelivered':
        return user.role === 'aluno' && ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type);
      default:
        return false;
    }
  };

  // Check if post should be visible to current user
  const shouldShowPost = (post: Post): boolean => {
    if (!user) return false;

    // SCHEDULED posts should not appear for students
    if (post.status === 'SCHEDULED' && user.role === 'aluno') {
      return false;
    }

    // DRAFT and ARCHIVED should not appear for students
    if (['DRAFT', 'ARCHIVED'].includes(post.status) && user.role === 'aluno') {
      return false;
    }

    return true;
  };

  const createPost = async (postInput: PostInput, authorName: string, options?: PostActionOptions): Promise<boolean> => {
    if (isLoading) return false;
    
    setIsLoading('create');
    try {
      await postStore.create(postInput, authorName, user?.id || '');
      toast({
        title: "Post criado",
        description: "O post foi criado com sucesso.",
      });
      options?.onSuccess?.();
      return true;
    } catch (error) {
      toast({
        title: "Erro ao criar post",
        description: error instanceof Error ? error.message : "Erro desconhecido ao criar post.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(null);
    }
  };

  const updatePost = async (id: string, postInput: PostInput, options?: PostActionOptions): Promise<boolean> => {
    if (isLoading) return false;
    
    const post = await postStore.getById(id);
    if (!post || !canPerformAction('edit', post)) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para editar este post.",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading('update');
    try {
      const result = postStore.update(id, postInput);
      if (result) {
        toast({
          title: "Post atualizado",
          description: "O post foi atualizado com sucesso.",
        });
        options?.onSuccess?.();
        return true;
      } else {
        throw new Error('Post não encontrado ou não pôde ser atualizado');
      }
    } catch (error) {
      toast({
        title: "Erro ao atualizar post",
        description: error instanceof Error ? error.message : "Erro desconhecido ao atualizar post.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(null);
    }
  };

  const archivePost = async (id: string, options?: PostActionOptions): Promise<boolean> => {
    if (isLoading) return false;
    
    const post = await postStore.getById(id);
    if (!post || !canPerformAction('archive', post)) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para arquivar este post.",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading('archive');
    try {
      const success = postStore.archive(id);
      if (success) {
        toast({
          title: "Post arquivado",
          description: "O post foi arquivado com sucesso.",
        });
        options?.onSuccess?.();
        return true;
      } else {
        throw new Error('Falha ao arquivar post');
      }
    } catch (error) {
      toast({
        title: "Erro ao arquivar post",
        description: error instanceof Error ? error.message : "Erro desconhecido ao arquivar post.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(null);
    }
  };

  const deletePost = async (id: string, options?: PostActionOptions): Promise<boolean> => {
    if (isLoading) return false;
    
    const post = await postStore.getById(id);
    if (!post || !canPerformAction('delete', post)) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para excluir este post.",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading('delete');
    try {
      const success = postStore.delete(id);
      if (success) {
        toast({
          title: "Post excluído",
          description: "O post foi removido definitivamente do sistema.",
        });
        options?.onSuccess?.();
        return true;
      } else {
        throw new Error('Falha ao excluir post');
      }
    } catch (error) {
      toast({
        title: "Erro ao excluir post",
        description: error instanceof Error ? error.message : "Erro desconhecido ao excluir post.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(null);
    }
  };

  const duplicatePost = async (id: string, authorName: string, options?: PostActionOptions): Promise<boolean> => {
    if (isLoading) return false;
    
    const post = await postStore.getById(id);
    if (!post || !canPerformAction('duplicate', post)) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para duplicar este post.",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading('duplicate');
    try {
      const duplicateData = await postStore.duplicate(id);
      if (duplicateData) {
        await postStore.create(duplicateData, authorName, user?.id || '');
        toast({
          title: "Post duplicado",
          description: "Uma cópia do post foi criada com sucesso.",
        });
        options?.onSuccess?.();
        return true;
      } else {
        throw new Error('Post não encontrado para duplicação');
      }
    } catch (error) {
      toast({
        title: "Erro ao duplicar post",
        description: error instanceof Error ? error.message : "Erro desconhecido ao duplicar post.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(null);
    }
  };

  const publishNow = async (id: string, options?: PostActionOptions): Promise<boolean> => {
    if (isLoading) return false;
    
    const post = await postStore.getById(id);
    if (!post || !canPerformAction('publishNow', post)) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para publicar este post.",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading('publish');
    try {
      const success = postStore.update(id, { 
        status: 'PUBLISHED', 
        publishAt: undefined 
      });
      if (success) {
        toast({
          title: "Post publicado",
          description: "O post foi publicado imediatamente.",
        });
        options?.onSuccess?.();
        return true;
      } else {
        throw new Error('Falha ao publicar post');
      }
    } catch (error) {
      toast({
        title: "Erro ao publicar post",
        description: error instanceof Error ? error.message : "Erro desconhecido ao publicar post.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(null);
    }
  };

  const openInCalendar = (post: Post, options?: PostActionOptions) => {
    if (!user?.role) {
      toast({
        title: "Erro de autenticação",
        description: "Usuário não autenticado.",
        variant: "destructive",
      });
      return;
    }

    // Check if post has date - if not, redirect to feed with focus
    if (!PostLinkBuilder.hasDate(post)) {
      const feedUrl = PostLinkBuilder.buildPostUrl(post, user.role);
      navigate(feedUrl);
      
      toast({
        title: "Redirecionando para o feed",
        description: "Este post não possui data - abrindo no feed.",
      });
      return;
    }

    try {
      const calendarUrl = PostLinkBuilder.buildPostUrl(post, user.role);
      navigate(calendarUrl);
      
      toast({
        title: "Redirecionando para o calendário",
        description: `Abrindo no dia específico.`,
      });
    } catch (error) {
      console.error('Error navigating to calendar:', error);
      toast({
        title: "Erro na navegação",
        description: "Não foi possível abrir o calendário.",
        variant: "destructive",
      });
    }
  };

  const editPost = (post: Post) => {
    if (!canPerformAction('edit', post)) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para editar este post.",
        variant: "destructive",
      });
      return;
    }

    // Navigate to correct edit route based on user role and post type
    if (user?.role === 'professor' && ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type)) {
      // For professor activities, open the nova atividade page with edit mode
      navigate(`/professor/atividades/nova?edit=${post.id}`);
    } else if (user?.role === 'secretaria') {
      // For secretaria, always use feed composer with edit mode
      navigate(`${ROUTES.SECRETARIA.FEED}?edit=${post.id}`);
    }
  };

  const copyLink = async (post: Post) => {
    try {
      const canonicalUrl = PostLinkBuilder.buildCanonicalUrl(post, user?.role || 'aluno');
      await navigator.clipboard.writeText(canonicalUrl);
      toast({
        title: "Link copiado!",
        description: "O link do post foi copiado para a área de transferência.",
      });
    } catch {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link.",
        variant: "destructive"
      });
    }
  };



  const getPostForEdit = async (id: string): Promise<(PostInput & { originalId: string }) | null> => {
    try {
      const post = await postStore.getById(id);
      
      if (!post) {
        return null;
      }

      if (!canPerformAction('edit', post)) {
        toast({
          title: "Sem permissão",
          description: "Você não tem permissão para editar este post.",
          variant: "destructive",
        });
        return null;
      }

      const editData: PostInput & { originalId: string } = {
        originalId: id,
        type: post.type,
        title: post.title,
        body: post.body,
        attachments: post.attachments,
        classId: post.classId,
        classIds: post.classIds,
        dueAt: post.dueAt,
        eventStartAt: post.eventStartAt,
        eventEndAt: post.eventEndAt,
        eventLocation: post.eventLocation,
        audience: post.audience,
        status: post.status,
        publishAt: post.publishAt,
        activityMeta: post.activityMeta
      };
      
      return editData;
    } catch (error) {
      toast({
        title: "Erro ao carregar post",
        description: "Não foi possível carregar o post para edição.",
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    // Core actions
    createPost,
    updatePost,
    archivePost,
    deletePost,
    duplicatePost,
    publishNow,
    
    // Navigation actions
    openInCalendar,
    editPost,
    copyLink,
    
    // Utility actions
    getPostForEdit,
    
    // RBAC helpers
    canPerformAction,
    shouldShowPost,
    
    // Post link utilities
    hasDateForCalendar: (post: Post) => PostLinkBuilder.hasDate(post),
    
    // State
    isLoading,
  };
}