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
  
  // ✨ Relacionamentos ALUNO ↔ ALUNO (horizontais)
  familyRelationships: z.array(z.object({
    relatedStudentId: z.string().uuid(),
    relatedStudentName: z.string(),
    relationshipType: z.enum([
      'SIBLING',           // Irmão/Irmã
      'COUSIN',            // Primo/Prima
      'UNCLE_NEPHEW',      // Tio-Sobrinho
      'OTHER'              // Outro (com descrição customizada)
      // ❌ REMOVIDO: GODPARENT_GODCHILD (agora em guardianRelationships)
    ]),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(), // ✨ NOVO: Nível de confiança da inferência
    inferredFrom: z.string().optional(), // ✨ NOVO: De onde foi inferido (ex: "Helena Maria (MÃE)")
    customRelationship: z.string().optional(), // Para quando escolher "Outro"
    createdAt: z.string(), // ISO timestamp
  })).optional(),
  
  // ✨ NOVO: Relacionamentos RESPONSÁVEL → ALUNO (verticais)
  guardianRelationships: z.array(z.object({
    guardianId: z.string().uuid().optional(), // ID do guardian na tabela guardians
    guardianName: z.string(), // Nome do responsável
    guardianOf: z.string().uuid(), // ID do aluno que TEM esse responsável
    relationshipType: z.enum([
      'PADRINHO',          // Padrinho do aluno atual
      'MADRINHA',          // Madrinha do aluno atual
      'EXTENDED_FAMILY',   // Família estendida (avós, tios que são responsáveis de outro aluno)
      'OTHER'              // Outro tipo
    ]),
    customRelationship: z.string().optional(), // Para quando escolher "Outro"
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
