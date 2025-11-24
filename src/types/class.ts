export type ClassStatus = 'ATIVA' | 'ARQUIVADA';

export interface SchoolClass {
  id: string;            // uuid
  name: string;          // ex: "7ºA"
  code?: string;         // ex: "7A-2025" (único por escola)
  grade?: string;        // ex: "7º ano"
  year?: number;         // ex: 2025
  status: ClassStatus;   // ATIVA/ARQUIVADA
  programId?: string;    // Programa/Modalidade
  levelId?: string;      // Global - from catalog
  modalityId?: string;   // Global - from catalog  
  subjectIds?: string[]; // Global - from catalog (optional)
  daysOfWeek: string[];  // Dias da semana
  startTime: string;     // Horário inicial (HH:MM)
  endTime: string;       // Horário final (HH:MM)
  teachers: string[];    // userIds (role=PROFESSOR)
  students: string[];    // userIds (role=ALUNO)
  createdAt: string;
  updatedAt: string;
}

export interface Guardian {
  id: string;
  name: string;
  relation: 'MAE' | 'PAI' | 'RESPONSAVEL' | 'TUTOR' | 'OUTRO';
  document?: string;     // CPF/RG
  phone?: string;
  email?: string;
  address?: string;
  isPrimary?: boolean;   // um por aluno
}

export interface TeacherExtra {
  document?: string;
  phones?: string[];        // >=0 (recomendado >=1)
  email?: string;
  address?: { 
    street?: string; 
    number?: string; 
    district?: string; 
    city?: string; 
    state?: string; 
    zip?: string; 
  };
  photoUrl?: string;
  bio?: string;
  qualifications?: string[]; // formações/certificações
  specialties?: string[];    // sugerir Subjects globais
  workloadHours?: number;
  availability?: { 
    daysOfWeek?: string[]; 
    startTime?: string; 
    endTime?: string; 
  };
  consents?: { 
    image?: boolean; 
    whatsapp?: boolean; 
  };
  classIds?: string[];       // turmas atribuídas (opcional)
  hiredAt?: string;
  notes?: string;
}

export interface StudentExtra {
  dob?: string;           // YYYY-MM-DD
  document?: string;      // CPF/RG/passaporte
  enrollmentNumber?: string; // Número de matrícula
  phones?: string[];      // [celular, fixo...]
  email?: string;
  address?: {
    street?: string; 
    number?: string; 
    district?: string;
    city?: string; 
    state?: string; 
    zip?: string;
  };
  programId?: string;     // se usar Program/Level
  levelId?: string;
  classIds?: string[];    // turmas vinculadas
  healthNotes?: string;   // alergias, observações
  consents?: { 
    image?: boolean; 
    fieldTrip?: boolean; 
    whatsapp?: boolean; 
  };
  guardians?: Guardian[]; // obrigatório se menor
  notes?: {               // Dados adicionais em JSONB
    familyRelationships?: Array<{
      relatedStudentId: string;
      relatedStudentName: string;
      relationshipType: 'SIBLING' | 'COUSIN' | 'UNCLE_NEPHEW' | 'OTHER';
      confidence?: 'HIGH' | 'MEDIUM' | 'LOW'; // ✨ Nível de confiança da inferência
      inferredFrom?: string; // ✨ De onde foi inferido (ex: "Helena Maria (MÃE)")
      customRelationship?: string;
      createdAt: string;
    }>;
    // ✨ NOVO: Relacionamentos Guardian→Student (verticais)
    guardianRelationships?: Array<{
      guardianId?: string; // ID do guardian na tabela guardians
      guardianName: string; // Nome do responsável
      guardianOf: string; // ID do aluno que TEM esse responsável
      relationshipType: 'PADRINHO' | 'MADRINHA' | 'EXTENDED_FAMILY' | 'OTHER';
      customRelationship?: string;
      createdAt: string;
    }>;
  };
}

export interface Person { 
  id: string; 
  name: string; 
  email?: string; 
  role: 'PROFESSOR' | 'ALUNO';
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  passwordHash?: string;
  mustChangePassword?: boolean;
  student?: StudentExtra; // presente quando role='ALUNO'
  teacher?: TeacherExtra; // presente quando role='PROFESSOR'
  preferences?: { // Dados extras armazenados em preferences
    ui?: any;
    notifications?: any;
    teacher?: any;
    student?: any;
  };
}

export interface ClassFilters {
  search: string;
  year?: number;
  grade?: string;
  teacher?: string;
  status?: ClassStatus;
  levelId?: string;
  modalityId?: string;
}

export interface TeacherLoad {
  teacherId: string;
  classCount: number;
}