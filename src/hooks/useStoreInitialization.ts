import { useEffect } from 'react';
import { useClassStore } from '@/stores/class-store';
import { usePeopleStore } from '@/stores/people-store';
import { useSchool } from '@/contexts/SchoolContext';

export function useStoreInitialization() {
  const { currentSchool } = useSchool();
  const loadClasses = useClassStore(state => state.loadClasses);
  const loadPeople = usePeopleStore(state => state.loadPeople);
  
  useEffect(() => {
    // ✅ Carregar dados apenas quando currentSchool estiver definido
    if (!currentSchool?.id) {
      console.warn('⚠️ [useStoreInitialization] currentSchool não definido - aguardando...');
      return;
    }

    console.log('🔵 [useStoreInitialization] Inicializando stores para escola:', currentSchool.name);
    loadClasses(currentSchool.id); // ✅ Passar school_id
    loadPeople();
  }, [currentSchool, loadClasses, loadPeople]);
}