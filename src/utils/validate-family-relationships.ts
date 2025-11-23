/**
 * FASE 4: Validação de Relacionamentos Familiares
 * 
 * Valida e limpa relacionamentos inválidos, prevenindo erros de dados.
 */

import { parseStudentNotes, stringifyStudentNotes, StudentNotes } from './student-notes-helpers';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  cleanedNotes?: StudentNotes;
}

/**
 * ⚠️ Valida se um relacionamento student-to-student é válido
 */
export function validateStudentRelationship(relationshipType: string): boolean {
  const validTypes = ['SIBLING', 'COUSIN', 'UNCLE_NEPHEW', 'OTHER'];
  return validTypes.includes(relationshipType);
}

/**
 * ⚠️ Valida e limpa student_notes, removendo relacionamentos inválidos
 */
export function validateAndCleanStudentNotes(
  studentNotesJson: string | null | undefined,
  studentName: string = 'Desconhecido'
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!studentNotesJson) {
    return result;
  }

  const notes = parseStudentNotes(studentNotesJson);
  if (!notes) {
    result.errors.push('JSON inválido em student_notes');
    result.isValid = false;
    return result;
  }

  let needsCleaning = false;
  const cleanedNotes: StudentNotes = { ...notes };

  // Validar familyRelationships (Student ↔ Student)
  if (notes.familyRelationships && Array.isArray(notes.familyRelationships)) {
    const validRelationships = notes.familyRelationships.filter(rel => {
      // Verificar se é um tipo válido de relacionamento student-to-student
      if (!validateStudentRelationship(rel.relationshipType)) {
        result.warnings.push(
          `Relacionamento inválido encontrado em ${studentName} → ${rel.relatedStudentName}: ${rel.relationshipType}. ` +
          `Este tipo de relacionamento não é válido entre alunos.`
        );
        needsCleaning = true;
        return false; // Remove este relacionamento
      }
      return true;
    });

    if (needsCleaning) {
      cleanedNotes.familyRelationships = validRelationships;
    }
  }

  // Validar guardianRelationships (Guardian → Student)
  if (notes.guardianRelationships && Array.isArray(notes.guardianRelationships)) {
    const validGuardianRels = notes.guardianRelationships.filter(rel => {
      const validTypes = ['GODPARENT', 'EXTENDED_FAMILY', 'OTHER'];
      if (!validTypes.includes(rel.relationshipType)) {
        result.warnings.push(
          `Tipo de relacionamento Guardian inválido: ${rel.relationshipType} em ${studentName}`
        );
        needsCleaning = true;
        return false;
      }
      return true;
    });

    if (needsCleaning) {
      cleanedNotes.guardianRelationships = validGuardianRels;
    }
  }

  if (needsCleaning) {
    result.cleanedNotes = cleanedNotes;
    result.warnings.push(`${studentName}: Relacionamentos inválidos foram detectados e removidos`);
  }

  return result;
}

/**
 * ⚠️ Migra relacionamentos inválidos de familyRelationships
 * (Usado para limpar dados legados)
 */
export function migrateInvalidRelationships(
  studentNotesJson: string | null | undefined
): { needsMigration: boolean; migratedNotes?: string } {
  const notes = parseStudentNotes(studentNotesJson);
  if (!notes || !notes.familyRelationships?.length) {
    return { needsMigration: false };
  }

  const invalidRelationships = notes.familyRelationships.filter(
    rel => !validateStudentRelationship(rel.relationshipType)
  );

  if (invalidRelationships.length === 0) {
    return { needsMigration: false };
  }

  // Remove relacionamentos inválidos
  const cleanedFamilyRelationships = notes.familyRelationships.filter(
    rel => validateStudentRelationship(rel.relationshipType)
  );

  const migratedNotes: StudentNotes = {
    ...notes,
    familyRelationships: cleanedFamilyRelationships
  };

  console.warn(
    `⚠️ MIGRAÇÃO: ${invalidRelationships.length} relacionamento(s) inválido(s) removido(s). ` +
    `Tipos inválidos: ${invalidRelationships.map(r => r.relationshipType).join(', ')}`
  );

  return {
    needsMigration: true,
    migratedNotes: stringifyStudentNotes(migratedNotes)
  };
}
