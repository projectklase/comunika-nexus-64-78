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
  return isEmail(v) ? null : 'Email inválido';
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