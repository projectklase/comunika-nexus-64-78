import { FamilyTreeData, FamilyNode, FamilyEdge } from '@/types/family-tree';
import { FamilyGroup, RelationshipType, RELATIONSHIP_LABELS } from '@/types/family-metrics';
import { supabase } from '@/integrations/supabase/client';
import { parseStudentNotes } from './student-notes-helpers';

interface StudentRelationship {
  studentId: string;
  relatedStudentId: string;
  relationshipType: RelationshipType;
  customRelationship?: string;
}

/**
 * Buscar relacionamentos reais cadastrados em student_notes
 */
async function fetchStudentRelationships(
  studentIds: string[]
): Promise<StudentRelationship[]> {
  if (studentIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, student_notes')
    .in('id', studentIds);

  if (!profiles) return [];

  const relationships: StudentRelationship[] = [];

  for (const profile of profiles) {
    const notes = parseStudentNotes(profile.student_notes);
    if (!notes?.familyRelationships) continue;

    for (const rel of notes.familyRelationships) {
      relationships.push({
        studentId: profile.id,
        relatedStudentId: rel.relatedStudentId,
        relationshipType: rel.relationshipType as RelationshipType,
        customRelationship: rel.customRelationship,
      });
    }
  }

  return relationships;
}

/**
 * Retorna estilo de edge baseado no tipo de relacionamento
 */
function getEdgeStyleByRelationship(type: RelationshipType) {
  const styles: Record<RelationshipType, { style: any }> = {
    SIBLING: {
      style: {
        stroke: 'hsl(var(--chart-2))',
        strokeWidth: 2,
        strokeDasharray: '5,5',
      },
    },
    COUSIN: {
      style: {
        stroke: 'hsl(var(--chart-3))',
        strokeWidth: 1.5,
        strokeDasharray: '10,5',
      },
    },
    UNCLE_NEPHEW: {
      style: {
        stroke: 'hsl(var(--chart-4))',
        strokeWidth: 1.5,
        strokeDasharray: '3,3',
      },
    },
    GODPARENT_GODCHILD: {
      style: {
        stroke: 'hsl(var(--chart-5))',
        strokeWidth: 1.5,
        strokeDasharray: '8,4,2,4',
      },
    },
    OTHER: {
      style: {
        stroke: 'hsl(var(--muted-foreground))',
        strokeWidth: 1,
        strokeDasharray: '2,2',
      },
    },
    NOT_REGISTERED: {
      style: {
        stroke: 'hsl(var(--muted-foreground) / 0.3)',
        strokeWidth: 1,
        strokeDasharray: '5,5',
      },
    },
  };

  return styles[type] || styles.SIBLING;
}

export async function buildFamilyTree(families: FamilyGroup[]): Promise<FamilyTreeData> {
  const nodes: FamilyNode[] = [];
  const edges: FamilyEdge[] = [];
  
  // Coletar todos os IDs de alunos
  const allStudentIds = families.flatMap(f => f.students.map(s => s.id));
  
  // ✅ Buscar relacionamentos reais
  const realRelationships = await fetchStudentRelationships(allStudentIds);
  
  // Criar um Map para acesso rápido
  const relationshipMap = new Map<string, RelationshipType>();
  realRelationships.forEach(rel => {
    const key = [rel.studentId, rel.relatedStudentId].sort().join('-');
    relationshipMap.set(key, rel.relationshipType);
  });
  
  let yOffset = 0;
  const FAMILY_SPACING = 250;
  const STUDENT_SPACING_X = 200;
  
  families.forEach((family) => {
    // 1. Criar nó do RESPONSÁVEL (centro da família)
    const guardianNodeId = `guardian-${family.family_key}`;
    
    nodes.push({
      id: guardianNodeId,
      type: 'guardianNode',
      position: { 
        x: 0, 
        y: yOffset 
      },
      data: {
        id: guardianNodeId,
        name: family.guardian_name,
        isGuardian: true,
        email: family.guardian_email || undefined,
        phone: family.guardian_phone || undefined,
        studentCount: family.student_count,
      },
    });
    
    // 2. Criar nós dos ALUNOS (distribuídos horizontalmente abaixo do responsável)
    const studentCount = family.students.length;
    const totalWidth = (studentCount - 1) * STUDENT_SPACING_X;
    const startX = -totalWidth / 2;
    
    family.students.forEach((student, studentIndex) => {
      const studentNodeId = `student-${student.id}`;
      
      nodes.push({
        id: studentNodeId,
        type: 'studentNode',
        position: { 
          x: startX + (studentIndex * STUDENT_SPACING_X), 
          y: yOffset + 120 
        },
        data: {
          id: student.id,
          name: student.name,
          avatar: student.avatar,
          isGuardian: false,
          guardianName: family.guardian_name,
        },
      });
      
      // 3. Criar EDGE (conexão) entre responsável e aluno
      edges.push({
        id: `edge-${guardianNodeId}-${studentNodeId}`,
        source: guardianNodeId,
        target: studentNodeId,
        type: 'smoothstep',
        animated: true,
        style: { 
          stroke: 'hsl(var(--chart-1))', 
          strokeWidth: 2 
        },
        data: {
          relationshipLabel: 'Responsável',
        },
      });
    });
    
    // 4. ✨ CONECTAR ALUNOS COM RELACIONAMENTOS REAIS
    for (let i = 0; i < family.students.length; i++) {
      for (let j = i + 1; j < family.students.length; j++) {
        const student1Id = family.students[i].id;
        const student2Id = family.students[j].id;
        const key = [student1Id, student2Id].sort().join('-');
        
        const relationshipType = relationshipMap.get(key) || 'SIBLING';
        
        // Estilos por tipo de relacionamento
        const edgeStyles = getEdgeStyleByRelationship(relationshipType);
        
        edges.push({
          id: `relationship-${student1Id}-${student2Id}`,
          source: `student-${student1Id}`,
          target: `student-${student2Id}`,
          type: 'straight',
          style: edgeStyles.style,
          data: {
            relationshipType,
            relationshipLabel: RELATIONSHIP_LABELS[relationshipType],
          },
        });
      }
    }
    
    yOffset += FAMILY_SPACING;
  });
  
  return { nodes, edges };
}
