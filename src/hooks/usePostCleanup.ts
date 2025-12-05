import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSchool } from '@/contexts/SchoolContext';

interface ExpiredPostPreview {
  id: string;
  title: string;
  type: string;
  created_at: string;
  due_at: string | null;
  event_start_at: string | null;
  event_end_at: string | null;
}

export function usePostCleanup() {
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<ExpiredPostPreview[]>([]);
  const { toast } = useToast();
  const { currentSchool } = useSchool();

  const fetchPreview = async () => {
    if (!currentSchool?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('preview_expired_posts', { p_school_id: currentSchool.id });

      if (error) throw error;
      setPreview(data || []);
    } catch (error) {
      console.error('Error fetching preview:', error);
      toast({
        title: 'Erro ao carregar preview',
        description: 'Não foi possível verificar posts expirados.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const archiveExpiredPosts = async () => {
    if (!currentSchool?.id) return 0;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('auto_archive_expired_posts', { p_school_id: currentSchool.id });

      if (error) throw error;

      const count = data || 0;
      
      toast({
        title: count > 0 ? '✅ Posts arquivados' : 'Nenhum post para arquivar',
        description: count > 0 
          ? `${count} post${count > 1 ? 's' : ''} expirado${count > 1 ? 's' : ''} arquivado${count > 1 ? 's' : ''} com sucesso.`
          : 'Todos os posts já estão atualizados.',
      });

      setPreview([]);
      return count;
    } catch (error) {
      console.error('Error archiving posts:', error);
      toast({
        title: 'Erro ao arquivar posts',
        description: 'Não foi possível arquivar os posts expirados.',
        variant: 'destructive',
      });
      return 0;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    preview,
    fetchPreview,
    archiveExpiredPosts,
    clearPreview: () => setPreview([]),
  };
}
