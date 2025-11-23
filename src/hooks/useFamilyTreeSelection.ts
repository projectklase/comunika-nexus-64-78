import { useState, useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import { FamilyGroup } from '@/types/family-metrics';

interface SelectedFamily {
  guardianId: string;
  guardianName: string;
  guardianEmail?: string;
  guardianPhone?: string;
  students: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  relationshipsCount: number;
}

export function useFamilyTreeSelection(families: FamilyGroup[]) {
  const [selectedFamily, setSelectedFamily] = useState<SelectedFamily | null>(null);
  const { fitView, setNodes, setEdges } = useReactFlow();

  const selectFamily = useCallback((guardianId: string) => {
    // Encontrar família pelo family_key (que está no guardianId)
    // O guardianId tem formato "guardian-{family_key}"
    const familyKey = guardianId.replace('guardian-', '');
    const family = families.find(f => f.family_key === familyKey);

    if (!family) {
      setSelectedFamily(null);
      resetSelection();
      return;
    }

    const selected: SelectedFamily = {
      guardianId,
      guardianName: family.guardian_name,
      guardianEmail: family.guardian_email || undefined,
      guardianPhone: family.guardian_phone || undefined,
      students: family.students.map(s => ({
        id: s.id,
        name: s.name,
        avatar: s.avatar || undefined,
      })),
      relationshipsCount: family.registered_relationships,
    };

    setSelectedFamily(selected);

    // ✅ Highlight nodes da família selecionada
    setNodes((nodes) =>
      nodes.map((node) => {
        const isGuardian = node.id === guardianId;
        const isStudent = node.id.startsWith('student-') && 
          selected.students.some(s => `student-${s.id}` === node.id);
        const isSelected = isGuardian || isStudent;

        return {
          ...node,
          data: {
            ...node.data,
            isSelected,
            isDimmed: !isSelected,
          },
          className: isSelected 
            ? 'selected-node animate-pulse-once'
            : 'dimmed-node',
        };
      })
    );

    // ✅ Highlight edges da família selecionada
    setEdges((edges) =>
      edges.map((edge) => {
        const sourceIsSelected = edge.source === guardianId || 
          selected.students.some(s => `student-${s.id}` === edge.source);
        const targetIsSelected = edge.target === guardianId || 
          selected.students.some(s => `student-${s.id}` === edge.target);
        const isSelected = sourceIsSelected && targetIsSelected;

        return {
          ...edge,
          style: {
            ...edge.style,
            opacity: isSelected ? 1 : 0.1,
          },
          animated: isSelected,
        };
      })
    );

    // ✅ Zoom para a família selecionada
    setTimeout(() => {
      fitView({
        nodes: [{ id: guardianId }],
        duration: 800,
        padding: 0.3,
        maxZoom: 1.2,
      });
    }, 100);
  }, [families, setNodes, setEdges, fitView]);

  const resetSelection = useCallback(() => {
    setSelectedFamily(null);

    // Remover estados de seleção/dimmed
    setNodes((nodes) =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isSelected: false,
          isDimmed: false,
        },
        className: '',
      }))
    );

    setEdges((edges) =>
      edges.map((edge) => ({
        ...edge,
        style: {
          ...edge.style,
          opacity: 1,
        },
        animated: false,
      }))
    );

    // Resetar zoom
    setTimeout(() => {
      fitView({ duration: 800, padding: 0.1 });
    }, 100);
  }, [setNodes, setEdges, fitView]);

  const selectNextFamily = useCallback(() => {
    if (!selectedFamily) {
      if (families.length > 0) {
        selectFamily(`guardian-${families[0].family_key}`);
      }
      return;
    }

    const familyKey = selectedFamily.guardianId.replace('guardian-', '');
    const currentIndex = families.findIndex(f => f.family_key === familyKey);

    const nextIndex = (currentIndex + 1) % families.length;
    const nextFamily = families[nextIndex];
    selectFamily(`guardian-${nextFamily.family_key}`);
  }, [selectedFamily, families, selectFamily]);

  const selectPreviousFamily = useCallback(() => {
    if (!selectedFamily) {
      if (families.length > 0) {
        selectFamily(`guardian-${families[families.length - 1].family_key}`);
      }
      return;
    }

    const familyKey = selectedFamily.guardianId.replace('guardian-', '');
    const currentIndex = families.findIndex(f => f.family_key === familyKey);

    const prevIndex = currentIndex === 0 ? families.length - 1 : currentIndex - 1;
    const prevFamily = families[prevIndex];
    selectFamily(`guardian-${prevFamily.family_key}`);
  }, [selectedFamily, families, selectFamily]);

  return {
    selectedFamily,
    selectFamily,
    resetSelection,
    selectNextFamily,
    selectPreviousFamily,
  };
}
