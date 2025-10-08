import { z } from 'zod';

/**
 * Schema para validar o JSON armazenado em student_notes
 */
export const StudentNotesSchema = z.object({
  programId: z.string().uuid().optional(),
  levelId: z.string().uuid().optional(),
  additionalInfo: z.string().optional(),
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
