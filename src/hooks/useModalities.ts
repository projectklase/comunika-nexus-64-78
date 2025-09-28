import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Modality {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModalityFilters {
  search?: string;
  is_active?: boolean;
}

export function useModalities() {
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadModalities = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('modalities')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setModalities(data || []);
    } catch (error) {
      console.error('Error loading modalities:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar modalidades",
        description: "Não foi possível carregar a lista de modalidades."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createModality = async (modalityData: Omit<Modality, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('modalities')
        .insert([modalityData])
        .select()
        .single();

      if (error) throw error;

      setModalities(prev => [...prev, data]);
      toast({
        title: "Modalidade criada",
        description: "A modalidade foi criada com sucesso."
      });
      return data;
    } catch (error) {
      console.error('Error creating modality:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar modalidade",
        description: "Não foi possível criar a modalidade."
      });
      throw error;
    }
  };

  const updateModality = async (id: string, updates: Partial<Modality>) => {
    try {
      const { data, error } = await supabase
        .from('modalities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setModalities(prev => prev.map(modality => modality.id === id ? data : modality));
      toast({
        title: "Modalidade atualizada",
        description: "A modalidade foi atualizada com sucesso."
      });
      return data;
    } catch (error) {
      console.error('Error updating modality:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar modalidade",
        description: "Não foi possível atualizar a modalidade."
      });
      throw error;
    }
  };

  const deleteModality = async (id: string) => {
    try {
      const { error } = await supabase
        .from('modalities')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setModalities(prev => prev.filter(modality => modality.id !== id));
      toast({
        title: "Modalidade excluída",
        description: "A modalidade foi excluída com sucesso."
      });
    } catch (error) {
      console.error('Error deleting modality:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir modalidade",
        description: "Não foi possível excluir a modalidade."
      });
      throw error;
    }
  };

  const getFilteredModalities = (filters: ModalityFilters) => {
    return modalities.filter(modality => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          modality.name.toLowerCase().includes(searchLower) ||
          (modality.code && modality.code.toLowerCase().includes(searchLower)) ||
          (modality.description && modality.description.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }
      
      if (filters.is_active !== undefined && modality.is_active !== filters.is_active) {
        return false;
      }

      return true;
    });
  };

  useEffect(() => {
    loadModalities();
  }, []);

  return {
    modalities,
    isLoading,
    createModality,
    updateModality,
    deleteModality,
    getFilteredModalities,
    refetch: loadModalities
  };
}