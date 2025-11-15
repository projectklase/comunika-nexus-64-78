import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSchool } from '@/contexts/SchoolContext';

export interface Subject {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubjectFilters {
  search?: string;
  is_active?: boolean;
}

export function useSubjects() {
  const { currentSchool } = useSchool();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadSubjects = async () => {
    // Bloquear se não tiver escola
    if (!currentSchool) {
      setSubjects([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from('subjects')
        .select('*')
        .eq('school_id', currentSchool.id)  // ✅ FILTRO CRÍTICO
        .order('name', { ascending: true });

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error loading subjects:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar matérias",
        description: "Não foi possível carregar a lista de matérias."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createSubject = async (subjectData: Omit<Subject, 'id' | 'created_at' | 'updated_at'>) => {
    // Validar se há escola selecionada
    if (!currentSchool) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nenhuma escola selecionada."
      });
      throw new Error('Nenhuma escola selecionada');
    }

    try {
      const { data, error } = await supabase
        .from('subjects')
        .insert([{ ...subjectData, school_id: currentSchool.id }])  // ✅ ADICIONAR SCHOOL_ID
        .select()
        .single();

      if (error) throw error;

      setSubjects(prev => [...prev, data]);
      toast({
        title: "Matéria criada",
        description: "A matéria foi criada com sucesso."
      });
      return data;
    } catch (error) {
      console.error('Error creating subject:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar matéria",
        description: "Não foi possível criar a matéria."
      });
      throw error;
    }
  };

  const updateSubject = async (id: string, updates: Partial<Subject>) => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setSubjects(prev => prev.map(subject => subject.id === id ? data : subject));
      toast({
        title: "Matéria atualizada",
        description: "A matéria foi atualizada com sucesso."
      });
      return data;
    } catch (error) {
      console.error('Error updating subject:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar matéria",
        description: "Não foi possível atualizar a matéria."
      });
      throw error;
    }
  };

  const deleteSubject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSubjects(prev => prev.filter(subject => subject.id !== id));
      toast({
        title: "Matéria excluída",
        description: "A matéria foi excluída com sucesso."
      });
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir matéria",
        description: "Não foi possível excluir a matéria."
      });
      throw error;
    }
  };

  const getFilteredSubjects = (filters: SubjectFilters) => {
    return subjects.filter(subject => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          subject.name.toLowerCase().includes(searchLower) ||
          (subject.code && subject.code.toLowerCase().includes(searchLower)) ||
          (subject.description && subject.description.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }
      
      if (filters.is_active !== undefined && subject.is_active !== filters.is_active) {
        return false;
      }

      return true;
    });
  };

  useEffect(() => {
    loadSubjects();
  }, [currentSchool?.id]);  // ✅ Recarregar quando escola mudar

  return {
    subjects,
    isLoading,
    createSubject,
    updateSubject,
    deleteSubject,
    getFilteredSubjects,
    refetch: loadSubjects
  };
}