import { supabase } from '@/integrations/supabase/client';
import { parseStudentNotes, stringifyStudentNotes } from './student-notes-helpers';

/**
 * Interface para o resultado de cada correção aplicada
 */
export interface FixResult {
  studentId: string;
  studentName: string;
  invalidType: string;
  action: string;
}

/**
 * Remove relacionamentos GODPARENT_GODCHILD inválidos do campo familyRelationships
 * 
 * IMPORTANTE: GODPARENT_GODCHILD é exclusivo para Guardian → Student (guardianRelationships)
 * Este campo NÃO deve existir em familyRelationships (Student ↔ Student)
 * 
 * @param schoolId - ID da escola para filtrar alunos
 * @returns Array com detalhes das correções aplicadas
 */
export async function cleanInvalidRelationships(schoolId: string): Promise<FixResult[]> {
  console.log('🔧 [Fix Family Relationships] Iniciando limpeza de relacionamentos inválidos...');
  
  // Buscar todos os alunos da escola
  const { data: students, error } = await supabase
    .from('profiles')
    .select('id, name, student_notes')
    .eq('current_school_id', schoolId);

  if (error) {
    console.error('❌ Erro ao buscar alunos:', error);
    throw new Error('Falha ao buscar alunos para limpeza');
  }

  if (!students || students.length === 0) {
    console.log('ℹ️ Nenhum aluno encontrado para processar');
    return [];
  }

  const fixes: FixResult[] = [];
  let studentsUpdated = 0;

  for (const student of students) {
    try {
      const notes = parseStudentNotes(student.student_notes);
      
      // Se não há relacionamentos, pular
      if (!notes?.familyRelationships || notes.familyRelationships.length === 0) {
        continue;
      }

      // Filtrar relacionamentos válidos (remover GODPARENT_GODCHILD)
      const validRelationships = notes.familyRelationships.filter(rel => {
        // Type assertion necessária pois o schema Zod não inclui GODPARENT_GODCHILD
        // mas dados antigos podem conter esse tipo inválido
        const relType = rel.relationshipType as string;
        
        if (relType === 'GODPARENT_GODCHILD') {
          fixes.push({
            studentId: student.id,
            studentName: student.name,
            invalidType: 'GODPARENT_GODCHILD',
            action: 'REMOVIDO (tipo exclusivo Guardian→Student)'
          });
          
          console.log(`  ⚠️ Removendo GODPARENT_GODCHILD de ${student.name} → ${rel.relatedStudentName}`);
          return false; // Remove este relacionamento
        }
        return true; // Mantém relacionamentos válidos
      });

      // Atualizar apenas se houve mudança
      if (validRelationships.length !== notes.familyRelationships.length) {
        const cleanedNotes = {
          ...notes,
          familyRelationships: validRelationships
        };

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ student_notes: stringifyStudentNotes(cleanedNotes) })
          .eq('id', student.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar ${student.name}:`, updateError);
          continue;
        }

        studentsUpdated++;
        console.log(`  ✅ ${student.name} atualizado (${validRelationships.length} relacionamentos válidos)`);
      }
    } catch (parseError) {
      console.error(`⚠️ Erro ao processar ${student.name}:`, parseError);
      // Continua processando outros alunos mesmo se um falhar
    }
  }

  console.log(`🎉 Limpeza concluída: ${fixes.length} relacionamentos removidos de ${studentsUpdated} alunos`);
  
  return fixes;
}

/**
 * Valida se um relacionamento é válido para Student ↔ Student
 */
export function isValidStudentRelationship(relationshipType: string): boolean {
  const validTypes = ['SIBLING', 'COUSIN', 'UNCLE_NEPHEW', 'OTHER'];
  return validTypes.includes(relationshipType);
}
