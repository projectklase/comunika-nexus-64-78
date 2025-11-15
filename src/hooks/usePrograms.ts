import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Program, ProgramFilters } from '@/types/curriculum';
import { toast } from 'sonner';
import { useSchool } from '@/contexts/SchoolContext';

export function usePrograms() {
  const { currentSchool } = useSchool();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrograms = useCallback(async () => {
    // Bloquear se não tiver escola
    if (!currentSchool) {
      setPrograms([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await (supabase as any)
        .from('programs')
        .select('*')
        .eq('school_id', currentSchool.id)  // ✅ FILTRO CRÍTICO
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Transform data to match expected format
      const transformedData = data?.map(program => ({
        id: program.id,
        name: program.name,
        code: program.code,
        description: program.description,
        curriculumMode: program.curriculum_mode as 'SUBJECTS' | 'MODALITIES',
        isActive: program.is_active,
        createdAt: program.created_at,
        updatedAt: program.updated_at,
      })) || [];

      setPrograms(transformedData);
    } catch (error) {
      console.error('Error fetching programs:', error);
      setError('Erro ao carregar programas');
      toast.error('Erro ao carregar programas');
    } finally {
      setLoading(false);
    }
  }, []);

  const createProgram = useCallback(async (programData: Omit<Program, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Validar se há escola selecionada
    if (!currentSchool) {
      toast.error('Nenhuma escola selecionada');
      throw new Error('Nenhuma escola selecionada');
    }

    try {
      setError(null);

      const { data, error: createError } = await supabase
        .from('programs')
        .insert({
          name: programData.name,
          code: programData.code,
          description: programData.description,
          curriculum_mode: programData.curriculumMode,
          is_active: programData.isActive,
          school_id: currentSchool.id,  // ✅ ADICIONAR SCHOOL_ID
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Transform response to match expected format
      const newProgram: Program = {
        id: data.id,
        name: data.name,
        code: data.code,
        description: data.description,
        curriculumMode: data.curriculum_mode as 'SUBJECTS' | 'MODALITIES',
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setPrograms(prev => [newProgram, ...prev]);
      return newProgram;
    } catch (error) {
      console.error('Error creating program:', error);
      throw new Error('Erro ao criar programa');
    }
  }, []);

  const updateProgram = useCallback(async (id: string, updates: Partial<Program>) => {
    try {
      setError(null);

      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.code !== undefined) updateData.code = updates.code;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.curriculumMode !== undefined) updateData.curriculum_mode = updates.curriculumMode;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { data, error: updateError } = await supabase
        .from('programs')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Transform response and update local state
      const updatedProgram: Program = {
        id: data.id,
        name: data.name,
        code: data.code,
        description: data.description,
        curriculumMode: data.curriculum_mode as 'SUBJECTS' | 'MODALITIES',
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setPrograms(prev => prev.map(program => 
        program.id === id ? updatedProgram : program
      ));
    } catch (error) {
      console.error('Error updating program:', error);
      throw new Error('Erro ao atualizar programa');
    }
  }, []);

  const deleteProgram = useCallback(async (id: string) => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('programs')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      setPrograms(prev => prev.filter(program => program.id !== id));
    } catch (error) {
      console.error('Error deleting program:', error);
      throw new Error('Erro ao excluir programa');
    }
  }, []);

  const getFilteredPrograms = useCallback((filters: ProgramFilters) => {
    return programs.filter(program => {
      if (filters.search && !program.name.toLowerCase().includes(filters.search.toLowerCase()) && 
          !program.code?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.isActive !== undefined && program.isActive !== filters.isActive) {
        return false;
      }
      return true;
    });
  }, [programs]);

  const getActivePrograms = useCallback(() => {
    return programs.filter(program => program.isActive);
  }, [programs]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms, currentSchool?.id]);  // ✅ Recarregar quando escola mudar

  return {
    programs,
    loading,
    error,
    fetchPrograms,
    createProgram,
    updateProgram,
    deleteProgram,
    getFilteredPrograms,
    getActivePrograms,
  };
}