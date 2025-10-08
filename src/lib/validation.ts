export const isEmail = (v = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export const onlyDigits = (v = '') => v.replace(/\D+/g, '');

export const isBRPhone = (v = '') => {
  const d = onlyDigits(v);
  return /^(?:\d{10}|\d{11})$/.test(d); // fixo 10, celular 11
};

export const normalizePhone = (v = '') => {
  const d = onlyDigits(v).slice(0, 11);
  // (11) 98765-4321 ou (11) 3456-7890
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
};

export const isPast = (date: Date, now = new Date()) => +date < +now;

export const isBefore = (a: Date, b: Date) => +a < +b;

export const clampLen = (v = '', max = 2000) => v.slice(0, max).trim();

export const clampLenNoTrim = (v = '', max = 2000) => v.slice(0, max);

export const normalizeSpaces = (v = '') => v.trim().replace(/\s+/g, ' ');

export const required = (v: any) => (v === null || v === undefined || String(v).trim() === '' ? 'Obrigatório' : null);

// Field-specific validators
export const validateTitle = (v = '') => {
  const req = required(v);
  if (req) return req;
  return v.length > 120 ? 'Máximo 120 caracteres' : null;
};

export const validateDescription = (v = '') => {
  return v.length > 1000 ? 'Máximo 1.000 caracteres' : null;
};

export const validateBio = (v = '') => {
  return v.length > 1000 ? 'Máximo 1.000 caracteres' : null;
};

export const validateEmail = (v = '') => {
  const req = required(v);
  if (req) return req;
  
  // Validação mais rigorosa de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(v)) return 'Email inválido';
  
  // Verificar caracteres perigosos
  if (/[<>\"'`]/.test(v)) return 'Email contém caracteres inválidos';
  
  if (v.length > 254) return 'Email muito longo (máximo 254 caracteres)';
  
  return null;
};

export const validatePhone = (v = '') => {
  const req = required(v);
  if (req) return req;
  return isBRPhone(v) ? null : 'Telefone inválido';
};

export const validatePastDate = (v = '', allowPast = false) => {
  const req = required(v);
  if (req) return req;
  
  try {
    const date = new Date(v);
    if (isNaN(date.getTime())) return 'Data inválida';
    
    if (!allowPast && isPast(date)) {
      return 'Data não pode estar no passado';
    }
    
    return null;
  } catch {
    return 'Data inválida';
  }
};

export const validateEventDates = (startDate = '', endDate = '') => {
  const startError = validatePastDate(startDate, true); // Events can be in past for historical records
  if (startError) return { startError, endError: null };
  
  const endError = validatePastDate(endDate, true);
  if (endError) return { startError: null, endError };
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isBefore(end, start)) {
      return { startError: null, endError: 'Data de fim deve ser posterior ao início' };
    }
    
    return { startError: null, endError: null };
  } catch {
    return { startError: null, endError: 'Erro ao validar datas' };
  }
};

// Validações específicas para estudantes
export const validateName = (v = '') => {
  const req = required(v);
  if (req) return req;
  
  const trimmed = normalizeSpaces(v);
  if (trimmed.length < 3) return 'Nome deve ter no mínimo 3 caracteres';
  if (trimmed.length > 100) return 'Nome deve ter no máximo 100 caracteres';
  
  // Verificar caracteres perigosos (XSS prevention)
  if (/[<>\"'`]/.test(trimmed)) return 'Nome contém caracteres inválidos';
  
  // Validar se tem pelo menos um sobrenome
  const parts = trimmed.split(' ').filter(p => p.length > 0);
  if (parts.length < 2) return 'Digite o nome completo (nome e sobrenome)';
  
  return null;
};

export const validateCPF = (cpf = '') => {
  if (!cpf) return null; // CPF é opcional
  
  const digits = onlyDigits(cpf);
  if (digits.length !== 11) return 'CPF deve ter 11 dígitos';
  
  // Validar CPFs inválidos conhecidos
  if (/^(\d)\1{10}$/.test(digits)) return 'CPF inválido';
  
  // Validação do dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(9))) return 'CPF inválido';
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(10))) return 'CPF inválido';
  
  return null;
};

export const validatePassword = (v = '') => {
  const req = required(v);
  if (req) return req;
  
  if (v.length < 6) return 'Senha deve ter no mínimo 6 caracteres';
  if (v.length > 100) return 'Senha muito longa (máximo 100 caracteres)';
  
  return null;
};

export const validateEnrollmentNumber = (v = '') => {
  if (!v) return null; // Matrícula é opcional
  
  const trimmed = v.trim();
  if (trimmed.length < 3) return 'Matrícula muito curta';
  if (trimmed.length > 20) return 'Matrícula muito longa (máximo 20 caracteres)';
  
  // Apenas letras, números e hífens
  if (!/^[A-Za-z0-9-]+$/.test(trimmed)) return 'Matrícula deve conter apenas letras, números e hífens';
  
  return null;
};

export const sanitizeString = (v = '', maxLength = 1000) => {
  // Remove apenas caracteres perigosos, preserva espaços durante digitação
  return v
    .replace(/[<>]/g, '')
    .slice(0, maxLength);
};

export const validateZipCode = (v = '') => {
  if (!v) return null; // CEP é opcional
  
  const digits = onlyDigits(v);
  if (digits.length !== 8) return 'CEP deve ter 8 dígitos';
  
  return null;
};