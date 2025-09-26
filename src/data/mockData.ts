import { UserRole } from '@/types/auth';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  authorRole: UserRole;
  createdAt: Date;
  type: 'aviso' | 'comunicado' | 'evento';
  attachments?: string[];
  urgent?: boolean;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  subject: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  attachments?: string[];
  status: 'pending' | 'submitted' | 'graded';
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'evento' | 'prazo' | 'reuniao';
  description?: string;
}

export interface Class {
  id: string;
  name: string;
  year: string;
  studentsCount: number;
  teacherId?: string;
}

export const mockAnnouncements: Announcement[] = [
  {
    id: '1',
    title: 'Reunião de Pais - 3º Bimestre',
    content: 'Convocamos todos os pais para reunião de apresentação das notas do 3º bimestre. A reunião acontecerá no auditório principal.',
    author: 'Maria Silva',
    authorRole: 'secretaria',
    createdAt: new Date('2024-01-15'),
    type: 'evento',
    urgent: true
  },
  {
    id: '2',
    title: 'Recesso Escolar',
    content: 'Informamos que teremos recesso escolar de 20 a 24 de janeiro. As aulas retornam normalmente no dia 25.',
    author: 'Maria Silva',
    authorRole: 'secretaria',
    createdAt: new Date('2024-01-12'),
    type: 'comunicado'
  },
  {
    id: '3',
    title: 'Feira de Ciências 2024',
    content: 'Está aberta as inscrições para a Feira de Ciências 2024. Os projetos devem ser entregues até 30 de janeiro.',
    author: 'João Santos',
    authorRole: 'professor',
    createdAt: new Date('2024-01-10'),
    type: 'evento'
  }
];

export const mockActivities: Activity[] = [
  {
    id: '1',
    title: 'Relatório de Física - Movimento Retilíneo',
    description: 'Elaborar um relatório completo sobre os experimentos de movimento retilíneo realizados em laboratório.',
    dueDate: new Date('2024-01-25'),
    subject: 'Física',
    teacherId: '2',
    teacherName: 'João Santos',
    classId: '1',
    className: '3º A',
    status: 'pending'
  },
  {
    id: '2',
    title: 'Redação - Meio Ambiente',
    description: 'Redação dissertativa sobre os impactos ambientais na região metropolitana. Mínimo 25 linhas.',
    dueDate: new Date('2024-01-22'),
    subject: 'Português',
    teacherId: '4',
    teacherName: 'Ana Oliveira',
    classId: '1',
    className: '3º A',
    status: 'pending'
  },
  {
    id: '3',
    title: 'Exercícios de Matemática - Cap. 5',
    description: 'Resolver todos os exercícios do capítulo 5 do livro didático (páginas 85 a 92).',
    dueDate: new Date('2024-01-20'),
    subject: 'Matemática',
    teacherId: '5',
    teacherName: 'Carlos Mendes',
    classId: '1',
    className: '3º A',
    status: 'submitted'
  }
];

export const mockCalendarEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Reunião de Pais',
    date: new Date('2024-01-20'),
    type: 'evento',
    description: 'Reunião geral de pais e responsáveis'
  },
  {
    id: '2',
    title: 'Entrega Relatório Física',
    date: new Date('2024-01-25'),
    type: 'prazo'
  },
  {
    id: '3',
    title: 'Conselho de Classe',
    date: new Date('2024-01-30'),
    type: 'reuniao'
  },
  {
    id: '4',
    title: 'Feira de Ciências',
    date: new Date('2024-02-15'),
    type: 'evento',
    description: 'Apresentação dos projetos científicos dos alunos'
  }
];

export const mockClasses: Class[] = [
  { id: '1', name: '3º A', year: '2024', studentsCount: 32 },
  { id: '2', name: '3º B', year: '2024', studentsCount: 28 },
  { id: '3', name: '2º A', year: '2024', studentsCount: 35 },
  { id: '4', name: '2º B', year: '2024', studentsCount: 30 },
  { id: '5', name: '1º A', year: '2024', studentsCount: 33 },
];