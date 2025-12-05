import { useEffect } from 'react';
import { useClassStore } from '@/stores/class-store';
import { usePeopleStore } from '@/stores/people-store';
import { useSchool } from '@/contexts/SchoolContext';
import { useAuth } from '@/contexts/AuthContext';

export function useStoreInitialization() {
  const { currentSchool } = useSchool();
  const { user } = useAuth();
  const loadClasses = useClassStore(state => state.loadClasses);
  const loadPeople = usePeopleStore(state => state.loadPeople);
  
  useEffect(() => {
    // ✅ Carregar dados apenas quando currentSchool e user estiverem definidos
    if (!currentSchool?.id || !user) {
      console.warn('⚠️ [useStoreInitialization] currentSchool ou user não definido - aguardando...');
      return;
    }

    console.log('🔵 [useStoreInitialization] Inicializando stores para escola:', currentSchool.name);
    loadClasses(currentSchool.id);
    loadPeople(currentSchool.id, user.id, user.role);
  }, [currentSchool, user, loadClasses, loadPeople]);
}