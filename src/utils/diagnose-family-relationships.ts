import { supabase } from '@/integrations/supabase/client';
import { parseStudentNotes } from './student-notes-helpers';

/**
 * Tipos de severidade das inconsistências detectadas
 */
export type IssueSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Interface para problemas de relacionamento detectados
 */
export interface RelationshipIssue {
  id: string;
  severity: IssueSeverity;
  student1Id: string;
  student1Name: string;
  student2Id: string;
  student2Name: string;
  currentRelationship: string;
  expectedRelationship: string;
  reason: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  guardianEvidence?: {
    guardianName: string;
    guardianRole: string;
    sharedBy: 'both' | 'parent-uncle';
  };
}

/**
 * Resultado do diagnóstico completo
 */
export interface DiagnosisResult {
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  issues: RelationshipIssue[];
  timestamp: string;
}

/**
 * Diagnostica inconsistências nos relacionamentos familiares comparando
 * os relacionamentos cadastrados com a estrutura inferida dos guardians compartilhados
 */
export async function diagnoseInconsistentRelationships(
  schoolId: string
): Promise<DiagnosisResult> {
  console.log('🔍 [Diagnóstico] Iniciando análise de inconsistências familiares...');

  // 1. Buscar todos os alunos da escola com seus student_notes
  const { data: students, error: studentsError } = await supabase
    .from('profiles')
    .select('id, name, student_notes')
    .eq('current_school_id', schoolId);

  if (studentsError) {
    console.error('❌ Erro ao buscar alunos:', studentsError);
    throw new Error('Falha ao buscar alunos para diagnóstico');
  }

  if (!students || students.length === 0) {
    console.log('ℹ️ Nenhum aluno encontrado');
    return {
      totalIssues: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
      issues: [],
      timestamp: new Date().toISOString()
    };
  }

  // 2. Buscar todos os guardians dos alunos
  const studentIds = students.map(s => s.id);
  const { data: guardians, error: guardiansError } = await supabase
    .from('guardians')
    .select('*')
    .in('student_id', studentIds);

  if (guardiansError) {
    console.error('❌ Erro ao buscar guardians:', guardiansError);
    throw new Error('Falha ao buscar guardians');
  }

  const issues: RelationshipIssue[] = [];

  // 3. Para cada aluno, verificar relacionamentos
  for (const student of students) {
    const notes = parseStudentNotes(student.student_notes);
    if (!notes?.familyRelationships || notes.familyRelationships.length === 0) {
      continue;
    }

    const studentGuardians = guardians?.filter(g => g.student_id === student.id) || [];

    for (const rel of notes.familyRelationships) {
      const relatedStudent = students.find(s => s.id === rel.relatedStudentId);
      if (!relatedStudent) continue;

      const relatedStudentGuardians = guardians?.filter(
        g => g.student_id === rel.relatedStudentId
      ) || [];

      // ✅ VERIFICAÇÃO 1: Compartilham MÃE ou PAI → Devem ser IRMÃOS (SIBLING)
      const sharedParent = studentGuardians.find(sg =>
        (sg.relation === 'MAE' || sg.relation === 'PAI' || sg.relation === 'IRMAO') &&
        relatedStudentGuardians.some(rg =>
          rg.relation === sg.relation &&
          ((sg.email && rg.email === sg.email) || (sg.phone && rg.phone === sg.phone))
        )
      );

      if (sharedParent && rel.relationshipType !== 'SIBLING') {
        issues.push({
          id: `${student.id}-${rel.relatedStudentId}-sibling`,
          severity: 'CRITICAL',
          student1Id: student.id,
          student1Name: student.name,
          student2Id: rel.relatedStudentId,
          student2Name: rel.relatedStudentName,
          currentRelationship: rel.relationshipType,
          expectedRelationship: 'SIBLING',
          reason: `Ambos compartilham o mesmo responsável "${sharedParent.name}" (${sharedParent.relation})`,
          confidence: 'HIGH',
          guardianEvidence: {
            guardianName: sharedParent.name,
            guardianRole: sharedParent.relation,
            sharedBy: 'both'
          }
        });
        console.log(`  🚨 CRITICAL: ${student.name} ↔ ${rel.relatedStudentName} devem ser SIBLING (compartilham ${sharedParent.relation})`);
      }

      // ✅ VERIFICAÇÃO 2: Um tem como PAI/MÃE e outro como TIO → Devem ser PRIMOS (COUSIN)
      const parentOfStudent1 = studentGuardians.find(sg =>
        sg.relation === 'MAE' || sg.relation === 'PAI'
      );
      
      const uncleOfStudent2 = relatedStudentGuardians.find(rg =>
        rg.relation === 'TIO' &&
        parentOfStudent1 &&
        ((parentOfStudent1.email && rg.email === parentOfStudent1.email) ||
         (parentOfStudent1.phone && rg.phone === parentOfStudent1.phone))
      );

      if (parentOfStudent1 && uncleOfStudent2 && rel.relationshipType !== 'COUSIN') {
        issues.push({
          id: `${student.id}-${rel.relatedStudentId}-cousin`,
          severity: 'HIGH',
          student1Id: student.id,
          student1Name: student.name,
          student2Id: rel.relatedStudentId,
          student2Name: rel.relatedStudentName,
          currentRelationship: rel.relationshipType,
          expectedRelationship: 'COUSIN',
          reason: `"${uncleOfStudent2.name}" é ${parentOfStudent1.relation} de ${student.name} e TIO de ${rel.relatedStudentName}`,
          confidence: 'HIGH',
          guardianEvidence: {
            guardianName: uncleOfStudent2.name,
            guardianRole: 'TIO',
            sharedBy: 'parent-uncle'
          }
        });
        console.log(`  ⚠️ HIGH: ${student.name} ↔ ${rel.relatedStudentName} devem ser COUSIN (relação tio-sobrinho)`);
      }

      // ✅ VERIFICAÇÃO 3 (inversa): Um tem como TIO e outro como PAI/MÃE → Devem ser PRIMOS
      const uncleOfStudent1 = studentGuardians.find(sg => sg.relation === 'TIO');
      const parentOfStudent2 = relatedStudentGuardians.find(rg =>
        (rg.relation === 'MAE' || rg.relation === 'PAI') &&
        uncleOfStudent1 &&
        ((uncleOfStudent1.email && rg.email === uncleOfStudent1.email) ||
         (uncleOfStudent1.phone && rg.phone === uncleOfStudent1.phone))
      );

      if (uncleOfStudent1 && parentOfStudent2 && rel.relationshipType !== 'COUSIN') {
        issues.push({
          id: `${student.id}-${rel.relatedStudentId}-cousin-inverse`,
          severity: 'HIGH',
          student1Id: student.id,
          student1Name: student.name,
          student2Id: rel.relatedStudentId,
          student2Name: rel.relatedStudentName,
          currentRelationship: rel.relationshipType,
          expectedRelationship: 'COUSIN',
          reason: `"${uncleOfStudent1.name}" é TIO de ${student.name} e ${parentOfStudent2.relation} de ${rel.relatedStudentName}`,
          confidence: 'HIGH',
          guardianEvidence: {
            guardianName: uncleOfStudent1.name,
            guardianRole: 'TIO',
            sharedBy: 'parent-uncle'
          }
        });
      }

      // ✅ VERIFICAÇÃO 4: Relacionamento UNCLE_NEPHEW quando deveriam ser SIBLING ou COUSIN
      if (rel.relationshipType === 'UNCLE_NEPHEW') {
        // Se compartilham PAI/MÃE, está errado
        if (sharedParent) {
          issues.push({
            id: `${student.id}-${rel.relatedStudentId}-uncle-wrong`,
            severity: 'CRITICAL',
            student1Id: student.id,
            student1Name: student.name,
            student2Id: rel.relatedStudentId,
            student2Name: rel.relatedStudentName,
            currentRelationship: 'UNCLE_NEPHEW',
            expectedRelationship: 'SIBLING',
            reason: `Cadastrado como TIO-SOBRINHO mas compartilham o mesmo ${sharedParent.relation}: "${sharedParent.name}"`,
            confidence: 'HIGH',
            guardianEvidence: {
              guardianName: sharedParent.name,
              guardianRole: sharedParent.relation,
              sharedBy: 'both'
            }
          });
        }
      }
    }
  }

  // Remover duplicatas (relacionamentos bidirecionais)
  const uniqueIssues = Array.from(
    new Map(issues.map(issue => [issue.id, issue])).values()
  );

  // Contar por severidade
  const criticalIssues = uniqueIssues.filter(i => i.severity === 'CRITICAL').length;
  const highIssues = uniqueIssues.filter(i => i.severity === 'HIGH').length;
  const mediumIssues = uniqueIssues.filter(i => i.severity === 'MEDIUM').length;
  const lowIssues = uniqueIssues.filter(i => i.severity === 'LOW').length;

  console.log(`🎯 Diagnóstico concluído: ${uniqueIssues.length} inconsistências encontradas`);
  console.log(`   ├─ 🚨 CRÍTICAS: ${criticalIssues}`);
  console.log(`   ├─ ⚠️  ALTAS: ${highIssues}`);
  console.log(`   ├─ ℹ️  MÉDIAS: ${mediumIssues}`);
  console.log(`   └─ 💡 BAIXAS: ${lowIssues}`);

  return {
    totalIssues: uniqueIssues.length,
    criticalIssues,
    highIssues,
    mediumIssues,
    lowIssues,
    issues: uniqueIssues.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
    timestamp: new Date().toISOString()
  };
}
