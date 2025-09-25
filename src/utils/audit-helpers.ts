import { AuditAction, AuditEntity } from '@/types/audit';

// Mapear ações para labels em português
export const getActionLabel = (action: AuditAction): string => {
  const labels: Record<AuditAction, string> = {
    CREATE: 'Criou',
    UPDATE: 'Editou', 
    DELETE: 'Removeu',
    ARCHIVE: 'Arquivou',
    PUBLISH: 'Publicou',
    SCHEDULE: 'Agendou',
    DELIVER: 'Entregou',
    ASSIGN: 'Atribuiu',
    REMOVE: 'Removeu',
    IMPORT: 'Importou',
    EXPORT: 'Exportou',
    READ: 'Visualizou',
  };
  return labels[action] || action;
};

// Mapear entidades para labels em português
export const getEntityLabel = (entity: AuditEntity): string => {
  const labels: Record<AuditEntity, string> = {
    POST: 'Post',
    CLASS: 'Turma',
    STUDENT: 'Aluno',
    TEACHER: 'Professor',
    USER: 'Usuário',
    MEMBERSHIP: 'Vínculo',
    SUBJECT: 'Matéria',
    LEVEL: 'Nível',
    MODALIDADE: 'Modalidade',
    PROGRAM: 'Programa',
    ATTACHMENT: 'Anexo',
  };
  return labels[entity] || entity;
};

// Gerar chip de ação com cor
export const getActionChipClass = (action: AuditAction): string => {
  const classes: Record<AuditAction, string> = {
    CREATE: 'bg-green-500/20 text-green-400 border-green-500/30',
    UPDATE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
    ARCHIVE: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    PUBLISH: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    SCHEDULE: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    DELIVER: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    ASSIGN: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    REMOVE: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    IMPORT: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    EXPORT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    READ: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  return classes[action] || 'bg-muted text-muted-foreground border-border';
};

// Gerar chip de entidade com cor  
export const getEntityChipClass = (entity: AuditEntity): string => {
  const classes: Record<AuditEntity, string> = {
    POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    CLASS: 'bg-green-500/20 text-green-400 border-green-500/30',
    STUDENT: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    TEACHER: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    USER: 'bg-red-500/20 text-red-400 border-red-500/30',
    MEMBERSHIP: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    SUBJECT: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    LEVEL: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    MODALIDADE: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    PROGRAM: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    ATTACHMENT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };
  return classes[entity] || 'bg-muted text-muted-foreground border-border';
};

// Formatar tempo relativo
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) return 'Agora';
  if (diffMinutes < 60) return `${diffMinutes}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  
  return date.toLocaleDateString('pt-BR');
};

// Comparar objetos para gerar diff
export const generateDiff = (before: any, after: any): Record<string, { before: any; after: any }> => {
  const diff: Record<string, { before: any; after: any }> = {};
  
  // Combinar todas as chaves dos dois objetos
  const allKeys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {})
  ]);
  
  allKeys.forEach(key => {
    const beforeValue = before?.[key];
    const afterValue = after?.[key];
    
    // Comparar arrays
    if (Array.isArray(beforeValue) || Array.isArray(afterValue)) {
      const beforeArray = beforeValue || [];
      const afterArray = afterValue || [];
      
      if (JSON.stringify(beforeArray) !== JSON.stringify(afterArray)) {
        diff[key] = { before: beforeArray, after: afterArray };
      }
    }
    // Comparar valores primitivos
    else if (beforeValue !== afterValue) {
      diff[key] = { before: beforeValue, after: afterValue };
    }
  });
  
  return diff;
};

// Mapear campos técnicos para nomes amigáveis
export const getFieldLabel = (fieldName: string): string => {
  const fieldLabels: Record<string, string> = {
    // Campos de posts/eventos
    title: 'Título',
    content: 'Conteúdo',
    eventStartAt: 'Data/Hora de Início',
    eventEndAt: 'Data/Hora de Fim',
    eventDate: 'Data do Evento',
    eventTime: 'Horário do Evento',
    postType: 'Tipo de Post',
    status: 'Status',
    publishedAt: 'Data de Publicação',
    scheduledFor: 'Agendado Para',
    
    // Campos de pessoas
    name: 'Nome',
    email: 'E-mail',
    phone: 'Telefone',
    cpf: 'CPF',
    birthDate: 'Data de Nascimento',
    role: 'Função',
    
    // Campos de turmas
    className: 'Nome da Turma',
    year: 'Ano',
    semester: 'Semestre',
    maxStudents: 'Máximo de Alunos',
    isActive: 'Ativa',
    
    // Campos de matérias/currículo
    subjectName: 'Nome da Matéria',
    levelName: 'Nome do Nível',
    modalityName: 'Nome da Modalidade',
    programName: 'Nome do Programa',
    description: 'Descrição',
    
    // Campos gerais
    createdAt: 'Data de Criação',
    updatedAt: 'Última Atualização',
    deletedAt: 'Data de Remoção',
    isDeleted: 'Removido',
    isArchived: 'Arquivado',
  };
  
  return fieldLabels[fieldName] || fieldName;
};

// Formatar valor para exibição
export const formatDisplayValue = (value: any): string => {
  if (value === null || value === undefined) return '-';
  
  // Booleanos
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  
  // Arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return 'Nenhum';
    return value.map(item => {
      if (typeof item === 'object' && item.name) return item.name;
      if (typeof item === 'object' && item.title) return item.title;
      return String(item);
    }).join(', ');
  }
  
  // Datas ISO
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
      });
    }
  }
  
  // Datas simples (YYYY-MM-DD)
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const date = new Date(value + 'T00:00:00');
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('pt-BR');
    }
  }
  
  // E-mails
  if (typeof value === 'string' && value.includes('@')) {
    return value;
  }
  
  // CPF
  if (typeof value === 'string' && value.match(/^\d{11}$/)) {
    return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  
  // Telefone
  if (typeof value === 'string' && value.match(/^\d{10,11}$/)) {
    if (value.length === 11) {
      return value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else {
      return value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
  }
  
  // Objetos complexos
  if (typeof value === 'object') {
    if (value.name) return value.name;
    if (value.title) return value.title;
    if (value.label) return value.label;
    
    // Para objetos pequenos, mostrar as propriedades principais
    const keys = Object.keys(value);
    if (keys.length <= 3) {
      return keys.map(key => `${key}: ${value[key]}`).join(', ');
    }
    
    return 'Dados complexos';
  }
  
  return String(value);
};