import { useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClassStore } from '@/stores/class-store';

export function useStudentClass() {
  const { user } = useAuth();
  const { getClassesByStudent, loadClasses } = useClassStore();

  // Ensure data is loaded
  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const studentClass = useMemo(() => {
    if (!user || user.role !== 'aluno') return null;

    const classes = getClassesByStudent(user.id);
    const primaryClass = classes.find(c => c.status === 'ATIVA') || classes[0];
    
    if (!primaryClass) {
      return null;
    }

    // Format days of week in Portuguese
    const dayNames: Record<string, string> = {
      'Segunda': 'Seg',
      'Terça': 'Ter', 
      'Quarta': 'Qua',
      'Quinta': 'Qui',
      'Sexta': 'Sex',
      'Sábado': 'Sáb',
      'Domingo': 'Dom',
      'segunda': 'Seg',
      'terça': 'Ter', 
      'quarta': 'Qua',
      'quinta': 'Qui',
      'sexta': 'Sex',
      'sábado': 'Sáb',
      'domingo': 'Dom'
    };

    const formattedDays = primaryClass.daysOfWeek
      .map(day => dayNames[day] || day.substring(0, 3))
      .join(', ');

    return {
      name: primaryClass.name,
      code: primaryClass.code,
      days: formattedDays,
      startTime: primaryClass.startTime,
      endTime: primaryClass.endTime,
      schedule: `${formattedDays} • ${primaryClass.startTime} - ${primaryClass.endTime}`
    };
  }, [user, getClassesByStudent]);

  return studentClass;
}