import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Level {
  id: string;
  name: string;
  code?: string | null;
  display_order?: number | null;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LevelFilters {
  search?: string;
  is_active?: boolean;
}

export function useLevels() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadLevels = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('levels')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setLevels(data || []);
    } catch (error) {
      console.error('Error loading levels:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar níveis",
        description: "Não foi possível carregar a lista de níveis."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createLevel = async (levelData: Omit<Level, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('levels')
        .insert([levelData])
        .select()
        .single();

      if (error) throw error;

      setLevels(prev => [...prev, data]);
      toast({
        title: "Nível criado",
        description: "O nível foi criado com sucesso."
      });
      return data;
    } catch (error) {
      console.error('Error creating level:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar nível",
        description: "Não foi possível criar o nível."
      });
      throw error;
    }
  };

  const updateLevel = async (id: string, updates: Partial<Level>) => {
    try {
      const { data, error } = await supabase
        .from('levels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setLevels(prev => prev.map(level => level.id === id ? data : level));
      toast({
        title: "Nível atualizado",
        description: "O nível foi atualizado com sucesso."
      });
      return data;
    } catch (error) {
      console.error('Error updating level:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar nível",
        description: "Não foi possível atualizar o nível."
      });
      throw error;
    }
  };

  const deleteLevel = async (id: string) => {
    try {
      const { error } = await supabase
        .from('levels')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLevels(prev => prev.filter(level => level.id !== id));
      toast({
        title: "Nível excluído",
        description: "O nível foi excluído com sucesso."
      });
    } catch (error) {
      console.error('Error deleting level:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir nível",
        description: "Não foi possível excluir o nível."
      });
      throw error;
    }
  };

  const getFilteredLevels = (filters: LevelFilters) => {
    return levels.filter(level => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          level.name.toLowerCase().includes(searchLower) ||
          (level.code && level.code.toLowerCase().includes(searchLower)) ||
          (level.description && level.description.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }
      
      if (filters.is_active !== undefined && level.is_active !== filters.is_active) {
        return false;
      }

      return true;
    });
  };

  useEffect(() => {
    loadLevels();
  }, []);

  return {
    levels,
    isLoading,
    createLevel,
    updateLevel,
    deleteLevel,
    getFilteredLevels,
    refetch: loadLevels
  };
}