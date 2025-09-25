
import { useState } from 'react';
import { Post, PostInput } from '@/types/post';
import { postStore } from '@/stores/post-store';
import { useToast } from '@/hooks/use-toast';

export function usePostActions() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const createPost = async (postInput: PostInput, authorName: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      postStore.create(postInput, authorName);
      toast({
        title: "Post criado",
        description: "O post foi criado com sucesso.",
      });
      return true;
    } catch (error) {
      toast({
        title: "Erro ao criar post",
        description: error instanceof Error ? error.message : "Erro desconhecido ao criar post.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePost = async (id: string, postInput: PostInput): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = postStore.update(id, postInput);
      if (result) {
        toast({
          title: "Post atualizado",
          description: "O post foi atualizado com sucesso.",
        });
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
      setIsLoading(false);
    }
  };

  const archivePost = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const success = postStore.archive(id);
      if (success) {
        toast({
          title: "Post arquivado",
          description: "O post foi arquivado com sucesso.",
        });
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
      setIsLoading(false);
    }
  };

  const deletePost = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const success = postStore.delete(id);
      if (success) {
        toast({
          title: "Post excluído",
          description: "O post foi removido definitivamente do sistema.",
        });
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
      setIsLoading(false);
    }
  };

  const duplicatePost = async (id: string, authorName: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const duplicateData = postStore.duplicate(id);
      if (duplicateData) {
        postStore.create(duplicateData, authorName);
        toast({
          title: "Post duplicado",
          description: "Uma cópia do post foi criada com sucesso.",
        });
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
      setIsLoading(false);
    }
  };

  const getPostForEdit = (id: string): (PostInput & { originalId: string }) | null => {
    try {
      console.log('getPostForEdit called with id:', id);
      const post = postStore.getById(id);
      console.log('Post found:', post);
      
      if (!post) {
        console.log('No post found with id:', id);
        return null;
      }

      // Create edit data with correct types based on Post interface
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
      
      console.log('Generated edit data:', editData);
      return editData;
    } catch (error) {
      console.error('Error in getPostForEdit:', error);
      toast({
        title: "Erro ao carregar post",
        description: "Não foi possível carregar o post para edição.",
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    createPost,
    updatePost,
    archivePost,
    deletePost,
    duplicatePost,
    getPostForEdit,
    isLoading
  };
}
