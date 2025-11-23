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

// ✨ FASE 3: Interface para relacionamentos Guardian → Student
interface GuardianRelationship {
  guardianId: string;
  guardianName: string;
  guardianOf: string; // ID do aluno que tem esse guardian
  relationshipType: 'GODPARENT' | 'EXTENDED_FAMILY' | 'OTHER';
  studentId: string; // ID do aluno afilhado/relacionado
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
 * ✨ FASE 3: Buscar relacionamentos Guardian → Student
 */
async function fetchGuardianRelationships(
  studentIds: string[]
): Promise<GuardianRelationship[]> {
  if (studentIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, student_notes')
    .in('id', studentIds);

  if (!profiles) return [];

  const guardianRelationships: GuardianRelationship[] = [];

  for (const profile of profiles) {
    const notes = parseStudentNotes(profile.student_notes);
    if (!notes?.guardianRelationships) continue;

    for (const rel of notes.guardianRelationships) {
      guardianRelationships.push({
        guardianId: rel.guardianId,
        guardianName: rel.guardianName,
        guardianOf: rel.guardianOf,
        relationshipType: rel.relationshipType as 'GODPARENT' | 'EXTENDED_FAMILY' | 'OTHER',
        studentId: profile.id, // Aluno que tem este guardian relationship
        customRelationship: rel.customRelationship,
      });
    }
  }

  return guardianRelationships;
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
        stroke: 'hsl(var(--chart-3))', // Laranja para primos
        strokeWidth: 1.5,
        strokeDasharray: '10,5',
      },
    },
    UNCLE_NEPHEW: {
      style: {
        stroke: 'hsl(var(--chart-4))', // Verde para tio-sobrinho
        strokeWidth: 1.5,
        strokeDasharray: '3,3',
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

  return styles[type] || styles.OTHER;
}

export async function buildFamilyTree(families: FamilyGroup[]): Promise<FamilyTreeData> {
  const nodes: FamilyNode[] = [];
  const edges: FamilyEdge[] = [];
  
  // Coletar todos os IDs de alunos
  const allStudentIds = families.flatMap(f => f.students.map(s => s.id));
  
  // ✅ Buscar relacionamentos reais (Student ↔ Student)
  const realRelationships = await fetchStudentRelationships(allStudentIds);
  
  // ✨ FASE 3: Buscar relacionamentos Guardian → Student
  const guardianRelationships = await fetchGuardianRelationships(allStudentIds);
  
  console.log('🌳 [Family Tree Debug] Relacionamentos Student ↔ Student:', realRelationships.length);
  console.log('🌳 [Family Tree Debug] Relacionamentos Guardian → Student:', guardianRelationships.length);
  
  // Criar um Map para acesso rápido, validando os tipos de relacionamento
  const relationshipMap = new Map<string, RelationshipType>();
  const validTypes: RelationshipType[] = ['SIBLING', 'COUSIN', 'UNCLE_NEPHEW', 'OTHER'];
  
  realRelationships.forEach(rel => {
    // ⚠️ FASE 4 VALIDAÇÃO: Filtrar relacionamentos inválidos
    if (!validTypes.includes(rel.relationshipType)) {
      console.error(
        `❌ FASE 4 VALIDAÇÃO: Relacionamento inválido detectado!\n` +
        `   Tipo: ${rel.relationshipType}\n` +
        `   Entre: ${rel.studentId} ↔ ${rel.relatedStudentId}\n` +
        `   ⚠️ Este relacionamento será ignorado.`
      );
      return; // Ignora relacionamento inválido
    }
    
    const key = [rel.studentId, rel.relatedStudentId].sort().join('-');
    relationshipMap.set(key, rel.relationshipType);
    console.log(`  ├─ ${key} → ${rel.relationshipType}`);
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
        
        // ✅ Buscar relacionamento REAL do banco
        const key = [student1Id, student2Id].sort().join('-');
        const relationshipType = relationshipMap.get(key);
        
        // Se não houver relacionamento cadastrado, pular este par de alunos
        if (!relationshipType) {
          console.log(`  ⚠️  Sem relacionamento cadastrado entre ${family.students[i].name} ↔ ${family.students[j].name} - pulando edge`);
          continue;
        }
        
        // Estilos por tipo de relacionamento
        const edgeStyles = getEdgeStyleByRelationship(relationshipType);
        
        // ✅ TODOS os alunos estão no mesmo nível hierárquico
        // Usar handles laterais independente do tipo de relacionamento
        // A distinção visual vem da COR e do TRAÇADO, não da direção
        const sourceHandle = i < j ? 'right' : 'left';
        const targetHandle = i < j ? 'left' : 'right';
        
        console.log(`  ├─ Edge: ${family.students[i].name} ↔ ${family.students[j].name}`);
        console.log(`  │  └─ Tipo: ${relationshipType} (${RELATIONSHIP_LABELS[relationshipType]})`);
        console.log(`  │  └─ Handles: ${sourceHandle} → ${targetHandle}`);
        console.log(`  │  └─ Estilo:`, edgeStyles.style);
        
        edges.push({
          id: `relationship-${student1Id}-${student2Id}`,
          source: `student-${student1Id}`,
          target: `student-${student2Id}`,
          sourceHandle,
          targetHandle,
          type: 'smoothstep',
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
  
  // 5. ✨ FASE 3: CONECTAR RELACIONAMENTOS Guardian → Student (padrinhos/madrinhas)
  console.log('🌳 [Family Tree Debug] Criando edges Guardian → Student...');
  
  guardianRelationships.forEach(gRel => {
    const guardianNodeId = `guardian-${families.find(f => 
      f.students.some(s => s.id === gRel.guardianOf)
    )?.family_key}`;
    const studentNodeId = `student-${gRel.studentId}`;
    
    // Verificar se ambos os nós existem
    const guardianExists = nodes.some(n => n.id === guardianNodeId);
    const studentExists = nodes.some(n => n.id === studentNodeId);
    
    if (!guardianExists || !studentExists) {
      console.warn(`  ⚠️  Nós não encontrados para Guardian → Student: ${guardianNodeId} → ${studentNodeId}`);
      return;
    }
    
    const relationshipLabel = gRel.relationshipType === 'GODPARENT' 
      ? 'Padrinho/Madrinha' 
      : gRel.relationshipType === 'EXTENDED_FAMILY'
      ? 'Família Estendida'
      : gRel.customRelationship || 'Outro';
    
    console.log(`  ├─ Guardian → Student: ${gRel.guardianName} → ${studentNodeId}`);
    console.log(`  │  └─ Tipo: ${gRel.relationshipType} (${relationshipLabel})`);
    
    edges.push({
      id: `godparent-${gRel.guardianId}-${gRel.studentId}`,
      source: guardianNodeId,
      target: studentNodeId,
      sourceHandle: 'bottom',
      targetHandle: 'top',
      type: 'smoothstep',
      animated: true,
      style: {
        stroke: 'hsl(var(--chart-5))', // Azul para padrinhos
        strokeWidth: 3,
        strokeDasharray: '8,4',
      },
      data: {
        relationshipType: gRel.relationshipType,
        relationshipLabel,
      },
    });
  });
  
  // 6. ✨ CONECTAR RELACIONAMENTOS ENTRE FAMÍLIAS DIFERENTES (primos, tios, etc.)
  console.log('🌳 [Family Tree Debug] Criando edges cross-family...');
  
  // Criar Set de edges já criadas para evitar duplicatas
  const existingEdges = new Set(edges.map(e => e.id));
  
  // Criar Map de student ID → node info para acesso rápido
  const studentNodeMap = new Map<string, { nodeId: string, familyIndex: number }>();
  families.forEach((family, familyIndex) => {
    family.students.forEach(student => {
      studentNodeMap.set(student.id, {
        nodeId: `student-${student.id}`,
        familyIndex,
      });
    });
  });
  
  // Iterar sobre TODOS os relacionamentos encontrados
  realRelationships.forEach(rel => {
    const student1Info = studentNodeMap.get(rel.studentId);
    const student2Info = studentNodeMap.get(rel.relatedStudentId);
    
    if (!student1Info || !student2Info) return; // Alunos não estão na árvore
    
    // Verificar se é um relacionamento ENTRE famílias diferentes
    const isCrossFamily = student1Info.familyIndex !== student2Info.familyIndex;
    
    if (!isCrossFamily) return; // Já foi criado no loop principal
    
    // Criar ID da edge (normalizado para evitar duplicatas A-B vs B-A)
    const edgeId = `relationship-${[rel.studentId, rel.relatedStudentId].sort().join('-')}`;
    
    if (existingEdges.has(edgeId)) return; // Já existe
    
    // Obter estilo baseado no tipo de relacionamento
    const edgeStyles = getEdgeStyleByRelationship(rel.relationshipType);
    
    // Handles inteligentes para relacionamentos cross-family
    // Usar handles verticais (bottom → top) para conexões entre famílias
    // Isso evita sobreposições com conexões laterais (irmãos)
    const sourceHandle = 'bottom'; // Sai pela parte inferior
    const targetHandle = 'top';    // Chega pela parte superior
    
    console.log(`  ├─ Cross-family: ${rel.studentId.slice(0,8)} ↔ ${rel.relatedStudentId.slice(0,8)}`);
    console.log(`  │  └─ Tipo: ${rel.relationshipType} (${RELATIONSHIP_LABELS[rel.relationshipType]})`);
    
    edges.push({
      id: edgeId,
      source: student1Info.nodeId,
      target: student2Info.nodeId,
      sourceHandle,
      targetHandle,
      type: 'smoothstep',
      style: edgeStyles.style,
      data: {
        relationshipType: rel.relationshipType,
        relationshipLabel: RELATIONSHIP_LABELS[rel.relationshipType],
      },
    });
    
    existingEdges.add(edgeId);
  });
  
  console.log(`🌳 [Family Tree Debug] Árvore construída:`);
  console.log(`  ├─ ${nodes.length} nós criados`);
  console.log(`  ├─ ${edges.filter(e => e.data?.relationshipType).length} edges de relacionamento Student ↔ Student`);
  console.log(`  ├─ ${edges.filter(e => e.id.startsWith('godparent-')).length} edges Guardian → Student`);
  console.log(`  └─ ${edges.length} conexões totais`);
  
  return { nodes, edges };
}
