/**
 * Hook para Executar Inferência Transitiva de Relacionamentos Familiares
 * 
 * Permite que administradores executem a propagação transitiva de relacionamentos
 * para todos os alunos de uma escola ou para um aluno específico.
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { propagateRelationships, propagateForStudent } from '@/utils/propagate-relationships';
import { parseStudentNotes, updateStudentNotes } from '@/utils/student-notes-helpers';
import { toast } from 'sonner';

interface TransitiveInferenceProgress {
  current: number;
  total: number;
  currentStudent?: string;
}

export function useTransitiveInference() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<TransitiveInferenceProgress>({ 
    current: 0, 
    total: 0 
  });

  /**
   * Executa propagação transitiva para todos os alunos de uma escola
   * 
   * @param schoolId - ID da escola
   * @returns Número de relacionamentos criados
   */
  const runTransitiveInference = async (schoolId: string): Promise<number> => {
    setIsProcessing(true);
    setProgress({ current: 0, total: 0 });
    
    try {
      console.log(`[useTransitiveInference] Iniciando inferência transitiva para escola ${schoolId}`);
      
      // 1. Buscar todos os alunos da escola com seus relacionamentos
      const { data: students, error: fetchError } = await supabase
        .from('profiles')
        .select('id, name, student_notes')
        .eq('current_school_id', schoolId);
      
      if (fetchError) {
        console.error('[useTransitiveInference] Erro ao buscar alunos:', fetchError);
        throw fetchError;
      }
      
      if (!students || students.length === 0) {
        toast.info('Nenhum aluno encontrado nesta escola');
        return 0;
      }
      
      console.log(`[useTransitiveInference] ${students.length} alunos encontrados`);
      setProgress({ current: 0, total: students.length });
      
      // 2. Executar propagação transitiva
      const { newRelationships, count, details } = propagateRelationships(students);
      
      if (count === 0) {
        toast.info('Nenhum novo relacionamento transitivo encontrado', {
          description: 'Todos os relacionamentos possíveis já estão registrados.'
        });
        return 0;
      }
      
      console.log(`[useTransitiveInference] ${count} novos relacionamentos a serem salvos`);
      
      // 3. Salvar no banco (batch update)
      let savedCount = 0;
      const errors: string[] = [];
      
      for (const [studentId, relationships] of newRelationships) {
        try {
          const student = students.find(s => s.id === studentId);
          if (!student) continue;
          
          setProgress(prev => ({ 
            ...prev, 
            current: prev.current + 1,
            currentStudent: student.name
          }));
          
      // Buscar relacionamentos atuais
          const currentNotes = parseStudentNotes(student.student_notes);
          const currentRelationships = currentNotes?.familyRelationships || [];
          
          // Adicionar novos relacionamentos (com type assertion para compatibilidade)
          const updatedNotes = updateStudentNotes(student.student_notes, {
            familyRelationships: [
              ...currentRelationships,
              ...relationships as any[]
            ]
          });
          
          // Salvar no banco
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ student_notes: updatedNotes })
            .eq('id', studentId);
          
          if (updateError) {
            console.error(`[useTransitiveInference] Erro ao atualizar ${student.name}:`, updateError);
            errors.push(`${student.name}: ${updateError.message}`);
          } else {
            savedCount += relationships.length;
            console.log(`[useTransitiveInference] ✅ ${relationships.length} relacionamentos salvos para ${student.name}`);
          }
        } catch (error) {
          console.error('[useTransitiveInference] Erro no loop:', error);
          errors.push(`Erro inesperado: ${error}`);
        }
      }
      
      // 4. Exibir resultado
      if (errors.length > 0) {
        console.error('[useTransitiveInference] Erros durante propagação:', errors);
        toast.warning(`Propagação parcialmente concluída`, {
          description: `${savedCount} relacionamentos criados com ${errors.length} erro(s).`
        });
      } else {
        toast.success(`✨ Inferência Transitiva Concluída!`, {
          description: `${savedCount} novos relacionamentos familiares foram criados automaticamente.`
        });
      }
      
      // 5. Log detalhado para debug
      console.table(details.slice(0, 10)); // Mostrar primeiros 10 para não poluir console
      
      return savedCount;
      
    } catch (error) {
      console.error('[useTransitiveInference] Erro fatal:', error);
      toast.error('Erro ao processar relacionamentos', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      throw error;
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  /**
   * Executa propagação transitiva para um aluno específico
   * Útil após criar um novo aluno
   * 
   * @param schoolId - ID da escola
   * @param studentId - ID do aluno
   * @returns Número de relacionamentos criados para este aluno
   */
  const fixStudentRelationships = async (
    schoolId: string,
    studentId: string
  ): Promise<number> => {
    try {
      console.log(`[useTransitiveInference] Corrigindo relacionamentos para aluno ${studentId}`);
      
      // Buscar todos os alunos da escola
      const { data: students, error } = await supabase
        .from('profiles')
        .select('id, name, student_notes')
        .eq('current_school_id', schoolId);
      
      if (error || !students) {
        console.error('[useTransitiveInference] Erro ao buscar alunos:', error);
        return 0;
      }
      
      // Executar propagação apenas para este aluno
      const newRelationships = propagateForStudent(students, studentId);
      
      if (newRelationships.length === 0) {
        console.log('[useTransitiveInference] Nenhum relacionamento transitivo para este aluno');
        return 0;
      }
      
      // Buscar student_notes atual
      const targetStudent = students.find(s => s.id === studentId);
      if (!targetStudent) return 0;
      
      const currentNotes = parseStudentNotes(targetStudent.student_notes);
      const currentRelationships = currentNotes?.familyRelationships || [];
      
      // Adicionar novos relacionamentos (com type assertion para compatibilidade)
      const updatedNotes = updateStudentNotes(targetStudent.student_notes, {
        familyRelationships: [
          ...currentRelationships,
          ...newRelationships as any[]
        ]
      });
      
      // Salvar
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ student_notes: updatedNotes })
        .eq('id', studentId);
      
      if (updateError) {
        console.error('[useTransitiveInference] Erro ao salvar:', updateError);
        return 0;
      }
      
      console.log(`[useTransitiveInference] ✅ ${newRelationships.length} relacionamentos transitivos criados`);
      return newRelationships.length;
      
    } catch (error) {
      console.error('[useTransitiveInference] Erro ao corrigir relacionamentos:', error);
      return 0;
    }
  };

  return {
    runTransitiveInference,
    fixStudentRelationships,
    isProcessing,
    progress,
  };
}
