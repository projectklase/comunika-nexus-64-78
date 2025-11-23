import { z } from 'zod';

/**
 * Schema para validar o JSON armazenado em student_notes
 */
export const StudentNotesSchema = z.object({
  document: z.string().optional(), // CPF para validação de duplicatas
  programId: z.string().uuid().optional(),
  levelId: z.string().uuid().optional(),
  additionalInfo: z.string().optional(),
  address: z.any().optional(), // Endereço completo
  healthNotes: z.string().optional(), // Observações de saúde
  consents: z.any().optional(), // Consentimentos
  
  // ✨ Registro de relacionamentos familiares (Student ↔ Student)
  familyRelationships: z.array(z.object({
    relatedStudentId: z.string().uuid(),
    relatedStudentName: z.string(),
    relationshipType: z.enum([
      'SIBLING',           // Irmão/Irmã
      'COUSIN',            // Primo/Prima
      'UNCLE_NEPHEW',      // Tio-Sobrinho
      'OTHER'              // Outro (com descrição customizada)
    ]),
    customRelationship: z.string().optional(), // Para quando escolher "Outro"
    createdAt: z.string(), // ISO timestamp
  })).optional(),

  // ✨ FASE 3: Relacionamentos com Responsáveis (Guardian → Student)
  guardianRelationships: z.array(z.object({
    guardianId: z.string(),              // ID do Guardian (UUID)
    guardianName: z.string(),            // Nome do Guardian
    guardianOf: z.string().uuid(),       // ID do aluno que TEM esse guardian
    relationshipType: z.enum([
      'GODPARENT',         // Padrinho/Madrinha
      'EXTENDED_FAMILY',   // Família estendida
      'OTHER'              // Outro
    ]),
    customRelationship: z.string().optional(),
    createdAt: z.string(), // ISO timestamp
  })).optional(),
}).passthrough(); // Permite campos adicionais

export type StudentNotes = z.infer<typeof StudentNotesSchema>;

/**
 * Parse seguro de student_notes com validação
 */
export function parseStudentNotes(jsonString: string | null | undefined): StudentNotes | null {
  if (!jsonString || jsonString.trim() === '') {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonString);
    const validated = StudentNotesSchema.parse(parsed);
    return validated;
  } catch (error) {
    console.error('Erro ao parsear student_notes:', error);
    return null;
  }
}

/**
 * Converte StudentNotes para string JSON válida
 */
export function stringifyStudentNotes(notes: StudentNotes | null): string {
  if (!notes) {
    return '';
  }

  try {
    const validated = StudentNotesSchema.parse(notes);
    return JSON.stringify(validated);
  } catch (error) {
    console.error('Erro ao validar student_notes:', error);
    return '';
  }
}

/**
 * Atualiza student_notes de forma segura preservando campos existentes
 */
export function updateStudentNotes(
  currentNotes: string | null | undefined,
  updates: Partial<StudentNotes>
): string {
  const parsed = parseStudentNotes(currentNotes) || {};
  const merged = { ...parsed, ...updates };
  return stringifyStudentNotes(merged);
}
