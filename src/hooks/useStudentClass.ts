import { useMemo, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SchoolClass } from '@/types/class';

export function useStudentClass() {
  const { user } = useAuth();
  const [studentClasses, setStudentClasses] = useState<SchoolClass[]>([]);

  // Load student's classes directly from Supabase
  useEffect(() => {
    if (!user || user.role !== 'aluno') return;

    const loadStudentClasses = async () => {
      try {
        // Get class IDs where student is enrolled
        const { data: enrollments, error: enrollError } = await (supabase as any)
          .from('class_students')
          .select('class_id')
          .eq('student_id', user.id);

        if (enrollError) throw enrollError;

        if (!enrollments || enrollments.length === 0) {
          setStudentClasses([]);
          return;
        }

        const classIds = enrollments.map((e: any) => e.class_id);

        // Get full class data
        const { data: classesData, error: classError } = await (supabase as any)
          .from('classes')
          .select('*')
          .in('id', classIds);

        if (classError) throw classError;

        const classes: SchoolClass[] = (classesData || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          code: row.code || undefined,
          grade: row.series || undefined,
          year: row.year,
          status: row.status === 'Ativa' ? 'ATIVA' : 'ARQUIVADA',
          levelId: row.level_id || undefined,
          modalityId: row.modality_id || undefined,
          subjectIds: [],
          daysOfWeek: row.week_days || [],
          startTime: row.start_time || '',
          endTime: row.end_time || '',
          teachers: row.main_teacher_id ? [row.main_teacher_id] : [],
          students: [],
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at || new Date().toISOString(),
        }));

        setStudentClasses(classes);
      } catch (error) {
        console.error('Error loading student classes:', error);
        setStudentClasses([]);
      }
    };

    loadStudentClasses();
  }, [user]);

  const studentClass = useMemo(() => {
    if (!user || user.role !== 'aluno') return null;

    const primaryClass = studentClasses.find(c => c.status === 'ATIVA') || studentClasses[0];
    
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
  }, [user, studentClasses]);

  return studentClass;
}