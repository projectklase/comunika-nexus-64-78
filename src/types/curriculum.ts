// Programas/Modalidades (ex.: Inglês, Futebol, Piano, Ensino Fundamental)
export type CurriculumMode = 'SUBJECTS' | 'MODALITIES';

export interface Program {
  id: string;
  name: string;
  code?: string;
  description?: string;
  curriculumMode: CurriculumMode; // default 'SUBJECTS'
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Níveis (ex.: A1, Intermediário, Sub-13, 7º ano)
export interface Level {
  id: string;
  programId: string;
  name: string;
  order?: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Matérias/Disciplinas (ex.: Gramática, Conversação, Defesa, Teoria Musical)
export interface Subject {
  id: string;
  programId: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Modalidades (ex.: Regular, Intensivo, Extensivo)
export interface Modality {
  id: string;
  programId: string;   // pertence a um Programa
  name: string;        // ex.: Regular, Intensivo, Extensivo
  code?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Ligação Turma ↔ Subjects (com professor por matéria, se houver)
export interface ClassSubject {
  id: string;
  classId: string;
  subjectId: string;
  teacherId?: string;
  createdAt: string;
  updatedAt: string;
}

// Filters
export interface ProgramFilters {
  search: string;
  isActive?: boolean;
}

export interface LevelFilters {
  search: string;
  programId?: string;
  isActive?: boolean;
}

export interface SubjectFilters {
  search: string;
  programId?: string;
  isActive?: boolean;
}

export interface ModalityFilters {
  search: string;
  programId?: string;
  isActive?: boolean;
}