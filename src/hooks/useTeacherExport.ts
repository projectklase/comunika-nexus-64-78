import { usePeopleStore } from '@/stores/people-store';
import { useClassStore } from '@/stores/class-store';
import { Person } from '@/types/class';

export const useTeacherExport = () => {
  const { people } = usePeopleStore();
  const { classes } = useClassStore();

  const exportTeachersCSV = (filteredTeachers: Person[]) => {
    const headers = [
      'teacher_id',
      'nome', 
      'email',
      'telefones',
      'documento',
      'especialidades',
      'turmas',
      'disponibilidade_dias',
      'disponibilidade_hora'
    ];

    const rows = filteredTeachers.map(teacher => {
      const teacherData = teacher.teacher || {};
      
      // Get classes for this teacher
      const teacherClasses = classes
        .filter(c => c.teachers.includes(teacher.id) && c.status === 'ATIVA')
        .map(c => `${c.name}${c.code ? ` (${c.code})` : ''}`)
        .join(',');

      // Format availability
      const availability = teacherData.availability;
      const availabilityDays = availability?.daysOfWeek?.join(',') || '';
      const availabilityHours = availability?.startTime && availability?.endTime 
        ? `${availability.startTime}-${availability.endTime}` 
        : '';

      return [
        teacher.id,
        teacher.name,
        teacherData.email || teacher.email || '',
        teacherData.phones?.join(',') || '',
        teacherData.document || '',
        teacherData.specialties?.join(',') || '',
        teacherClasses,
        availabilityDays,
        availabilityHours
      ];
    });

    // Create CSV content with UTF-8 BOM
    const csvContent = '\uFEFF' + [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    // Generate filename with timestamp
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/:/g, '-')
      .replace(/\..+/, '')
      .replace('T', '_');
    const filename = `professores_${timestamp}.csv`;

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);

    return filename;
  };

  return { exportTeachersCSV };
};