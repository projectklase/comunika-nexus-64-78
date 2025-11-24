/**
 * Utilitário para Propagação Transitiva de Relacionamentos Familiares
 * 
 * Aplica inferência transitiva para criar relacionamentos familiares
 * que não foram registrados diretamente mas podem ser deduzidos.
 */

import { getTransitiveRelationship, validateTransitiveRelationship, getTransitiveConfidence } from './transitive-relationship-rules';
import { parseStudentNotes, type StudentNotes } from './student-notes-helpers';

interface Student {
  id: string;
  name: string;
  student_notes: string | null;
}

interface FamilyRelationship {
  relatedStudentId: string;
  relatedStudentName: string;
  relationshipType: 'SIBLING' | 'COUSIN' | 'UNCLE_NEPHEW' | 'OTHER';
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  inferredFrom?: string;
  customRelationship?: string;
  createdAt: string;
}

interface PropagationResult {
  newRelationships: Map<string, FamilyRelationship[]>;
  count: number;
  details: Array<{
    studentA: string;
    studentC: string;
    viaStudent: string;
    relationship: string;
  }>;
}

/**
 * Verifica se um relacionamento já existe para evitar duplicatas
 */
function relationshipExists(
  studentRelationships: any[],
  targetStudentId: string
): boolean {
  return studentRelationships.some(
    rel => rel.relatedStudentId === targetStudentId
  );
}

/**
 * Propaga relacionamentos transitivamente para todos os alunos de uma escola
 * 
 * @param students - Array de alunos com seus student_notes
 * @returns Mapa de novos relacionamentos a serem adicionados e contagem total
 */
export function propagateRelationships(students: Student[]): PropagationResult {
  const newRelationships = new Map<string, FamilyRelationship[]>();
  const details: PropagationResult['details'] = [];
  
  console.log(`[Propagate] Iniciando propagação transitiva para ${students.length} alunos`);
  
  // Parsear todos os student_notes
  const parsedStudents = students.map(s => ({
    ...s,
    familyRelationships: parseStudentNotes(s.student_notes)?.familyRelationships || []
  }));
  
  // Para cada aluno A
  for (const studentA of parsedStudents) {
    const newRelsForA: FamilyRelationship[] = [];
    
    // Para cada relacionamento A→B
    for (const relAB of studentA.familyRelationships) {
      const studentB = parsedStudents.find(s => s.id === relAB.relatedStudentId);
      
      if (!studentB) {
        console.warn(`[Propagate] Aluno B não encontrado: ${relAB.relatedStudentId}`);
        continue;
      }
      
      // Para cada relacionamento B→C
      for (const relBC of studentB.familyRelationships) {
        // Aplicar regra transitiva
        const transitiveType = getTransitiveRelationship(
          relAB.relationshipType,
          relBC.relationshipType
        );
        
        if (!transitiveType) continue;
        
        // Validar relacionamento
        if (!validateTransitiveRelationship(studentA.id, relBC.relatedStudentId, transitiveType)) {
          continue;
        }
        
        // Verificar se A→C já existe
        if (relationshipExists(studentA.familyRelationships, relBC.relatedStudentId)) {
          console.log(
            `[Propagate] Relacionamento A→C já existe: ${studentA.name} → ${relBC.relatedStudentName}`
          );
          continue;
        }
        
        // Verificar se já foi adicionado nesta iteração
        if (newRelsForA.some(r => r.relatedStudentId === relBC.relatedStudentId)) {
          continue;
        }
        
        // Criar novo relacionamento transitivo
        const newRelationship: FamilyRelationship = {
          relatedStudentId: relBC.relatedStudentId,
          relatedStudentName: relBC.relatedStudentName,
          relationshipType: transitiveType,
          confidence: getTransitiveConfidence(),
          inferredFrom: `Transitivo via ${studentB.name}`,
          createdAt: new Date().toISOString(),
        };
        
        newRelsForA.push(newRelationship);
        
        details.push({
          studentA: studentA.name,
          studentC: relBC.relatedStudentName,
          viaStudent: studentB.name,
          relationship: transitiveType,
        });
        
        console.log(
          `[Propagate] ✨ Novo relacionamento: ${studentA.name} → ${relBC.relatedStudentName} (${transitiveType}) via ${studentB.name}`
        );
      }
    }
    
    if (newRelsForA.length > 0) {
      newRelationships.set(studentA.id, newRelsForA);
    }
  }
  
  const totalCount = Array.from(newRelationships.values())
    .reduce((sum, rels) => sum + rels.length, 0);
  
  console.log(`[Propagate] ✅ Propagação concluída: ${totalCount} novos relacionamentos inferidos`);
  
  return {
    newRelationships,
    count: totalCount,
    details,
  };
}

/**
 * Propaga relacionamentos para um aluno específico
 * Útil para executar após o cadastro de um novo aluno
 * 
 * @param allStudents - Todos os alunos da escola
 * @param targetStudentId - ID do aluno para o qual propagar relacionamentos
 * @returns Array de novos relacionamentos para o aluno
 */
export function propagateForStudent(
  allStudents: Student[],
  targetStudentId: string
): FamilyRelationship[] {
  console.log(`[Propagate] Propagando relacionamentos para aluno ${targetStudentId}`);
  
  const result = propagateRelationships(allStudents);
  const studentRelationships = result.newRelationships.get(targetStudentId) || [];
  
  console.log(`[Propagate] ${studentRelationships.length} relacionamentos transitivos para este aluno`);
  
  return studentRelationships;
}
