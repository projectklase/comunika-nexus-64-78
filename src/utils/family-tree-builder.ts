import { FamilyTreeData, FamilyNode, FamilyEdge } from '@/types/family-tree';
import { FamilyGroup } from '@/types/family-metrics';

export function buildFamilyTree(families: FamilyGroup[]): FamilyTreeData {
  const nodes: FamilyNode[] = [];
  const edges: FamilyEdge[] = [];
  
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
    
    // 4. CONECTAR ALUNOS ENTRE SI (irmãos)
    for (let i = 0; i < family.students.length; i++) {
      for (let j = i + 1; j < family.students.length; j++) {
        edges.push({
          id: `sibling-${family.students[i].id}-${family.students[j].id}`,
          source: `student-${family.students[i].id}`,
          target: `student-${family.students[j].id}`,
          type: 'straight',
          style: { 
            stroke: 'hsl(var(--chart-2))', 
            strokeWidth: 1.5,
            strokeDasharray: '5,5'
          },
          data: {
            relationshipType: 'SIBLING',
            relationshipLabel: 'Irmãos',
          },
        });
      }
    }
    
    yOffset += FAMILY_SPACING;
  });
  
  return { nodes, edges };
}
