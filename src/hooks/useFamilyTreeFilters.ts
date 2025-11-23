import { useState, useMemo } from 'react';
import { FamilyGroup } from '@/types/family-metrics';

export interface FamilyTreeFilters {
  minStudents: number;
  maxStudents: number | null;
  searchTerm: string;
}

export function useFamilyTreeFilters(families: FamilyGroup[]) {
  const [filters, setFilters] = useState<FamilyTreeFilters>({
    minStudents: 2,
    maxStudents: null,
    searchTerm: '',
  });

  const filteredFamilies = useMemo(() => {
    return families.filter((family) => {
      // Filtro de número de alunos
      if (family.student_count < filters.minStudents) return false;
      if (filters.maxStudents && family.student_count > filters.maxStudents) return false;

      // Filtro de busca por nome
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesGuardian = family.guardian_name.toLowerCase().includes(searchLower);
        const matchesStudent = family.students.some(s => 
          s.name.toLowerCase().includes(searchLower)
        );
        if (!matchesGuardian && !matchesStudent) return false;
      }

      return true;
    });
  }, [families, filters]);

  return {
    filters,
    setFilters,
    filteredFamilies,
    totalFamilies: families.length,
    filteredCount: filteredFamilies.length,
  };
}
