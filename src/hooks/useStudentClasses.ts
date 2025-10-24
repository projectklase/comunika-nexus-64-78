import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getStudentClasses } from '@/utils/student-helpers';
import { SchoolClass } from '@/types/class';

/**
 * Hook para carregar turmas do aluno logado
 * Retorna array de turmas e estado de carregamento
 */
export function useStudentClasses() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'aluno') {
      setClasses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    getStudentClasses(user.id)
      .then(setClasses)
      .catch(error => {
        console.error('Error loading student classes:', error);
        setClasses([]);
      })
      .finally(() => setLoading(false));
  }, [user]);

  return { classes, loading };
}
