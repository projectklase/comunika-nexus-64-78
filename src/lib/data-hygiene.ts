import { normalizePhone, isBRPhone, required, clampLen, normalizeSpaces } from '@/lib/validation';
import { isPast, isBefore } from '@/lib/validation';

export interface ValidationError {
  field: string;
  message: string;
  value: any;
}

export interface ValidationResult<T> {
  isValid: boolean;
  data: T;
  errors: ValidationError[];
  adjustments: { field: string; reason: string; old: any; new: any }[];
}

export interface HygieneReport {
  phonesFixed: number;
  phonesInvalid: number;
  datesAdjusted: number;
  titlesTrimmed: number;
  textsClipped: number;
  totalErrors: number;
  timestamp: string;
}

// Core validation functions
export const sanitizeText = (text: string = '', maxLength: number = 2000): string => {
  return clampLen(text.trim(), maxLength);
};

export const validateAndSanitizePhone = (phone: string = ''): { 
  phone: string; 
  isValid: boolean; 
  wasNormalized: boolean;
} => {
  const normalized = normalizePhone(phone);
  const isValid = isBRPhone(normalized);
  const wasNormalized = phone !== normalized;
  
  return {
    phone: normalized,
    isValid,
    wasNormalized
  };
};

export const validateDate = (
  dateStr: string | undefined, 
  context: 'due' | 'event_start' | 'event_end' | 'publish',
  compareDate?: string,
  allowPastOverride = false
): {
  isValid: boolean;
  date: string;
  wasAdjusted: boolean;
  error?: string;
} => {
  if (!dateStr) return { isValid: true, date: '', wasAdjusted: false };

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return { isValid: false, date: dateStr, wasAdjusted: false, error: 'Data inválida' };
    }

    const now = new Date();
    let wasAdjusted = false;
    let resultDate = dateStr;

    // Handle past dates based on context
    if (context === 'due' && isPast(date, now) && !allowPastOverride) {
      return { isValid: false, date: dateStr, wasAdjusted: false, error: 'Prazo não pode estar no passado' };
    }

    if (context === 'publish' && isPast(date, now)) {
      resultDate = now.toISOString();
      wasAdjusted = true;
    }

    // Validate event end after start
    if (context === 'event_end' && compareDate) {
      const startDate = new Date(compareDate);
      if (!isNaN(startDate.getTime()) && isBefore(date, startDate)) {
        return { isValid: false, date: dateStr, wasAdjusted: false, error: 'Data de fim deve ser posterior ao início' };
      }
    }

    return { isValid: true, date: resultDate, wasAdjusted };
  } catch {
    return { isValid: false, date: dateStr, wasAdjusted: false, error: 'Data inválida' };
  }
};

// Person validation
export const validatePersonData = (data: any): ValidationResult<any> => {
  const errors: ValidationError[] = [];
  const adjustments: { field: string; reason: string; old: any; new: any }[] = [];
  
  const sanitized = { ...data };

  // Name validation
  if (!data.name?.trim()) {
    errors.push({ field: 'name', message: 'Nome é obrigatório', value: data.name });
  } else {
    const trimmedName = sanitizeText(data.name, 120);
    if (trimmedName !== data.name) {
      adjustments.push({ 
        field: 'name', 
        reason: 'Nome aparado para 120 caracteres', 
        old: data.name, 
        new: trimmedName 
      });
      sanitized.name = trimmedName;
    }
  }

  // Email validation (if provided)
  if (data.email && !data.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    errors.push({ field: 'email', message: 'Email inválido', value: data.email });
  }

  // Phone validation for students/teachers
  if (data.student?.phones || data.teacher?.phones) {
    const phones = data.student?.phones || data.teacher?.phones || [];
    const validatedPhones: string[] = [];
    
    phones.forEach((phone: string, index: number) => {
      const result = validateAndSanitizePhone(phone);
      if (result.isValid) {
        validatedPhones.push(result.phone);
        if (result.wasNormalized) {
          adjustments.push({
            field: `phone_${index}`,
            reason: 'Telefone normalizado',
            old: phone,
            new: result.phone
          });
        }
      } else {
        errors.push({ 
          field: `phone_${index}`, 
          message: 'Telefone inválido', 
          value: phone 
        });
      }
    });

    if (data.student) {
      sanitized.student = { ...sanitized.student, phones: validatedPhones };
    } else if (data.teacher) {
      sanitized.teacher = { ...sanitized.teacher, phones: validatedPhones };
    }
  }

  return {
    isValid: errors.length === 0,
    data: sanitized,
    errors,
    adjustments
  };
};

// Post validation
export const validatePostData = (data: any, allowPastOverride = false): ValidationResult<any> => {
  const errors: ValidationError[] = [];
  const adjustments: { field: string; reason: string; old: any; new: any }[] = [];
  
  const sanitized = { ...data };

  // Title validation
  if (!data.title?.trim()) {
    errors.push({ field: 'title', message: 'Título é obrigatório', value: data.title });
  } else {
    const trimmedTitle = sanitizeText(data.title, 120);
    if (trimmedTitle !== data.title) {
      adjustments.push({
        field: 'title',
        reason: 'Título aparado para 120 caracteres',
        old: data.title,
        new: trimmedTitle
      });
      sanitized.title = trimmedTitle;
    }
  }

  // Body validation
  if (data.body) {
    const normalizedBody = normalizeSpaces(data.body);
    const trimmedBody = sanitizeText(normalizedBody, 1000);
    if (trimmedBody !== data.body) {
      adjustments.push({
        field: 'body',
        reason: 'Descrição normalizada e aparada para 1000 caracteres',
        old: data.body,
        new: trimmedBody
      });
      sanitized.body = trimmedBody;
    }
  }

  // Date validations
  if (data.dueAt) {
    const dueResult = validateDate(data.dueAt, 'due', undefined, allowPastOverride);
    if (!dueResult.isValid) {
      errors.push({ field: 'dueAt', message: dueResult.error!, value: data.dueAt });
    } else {
      sanitized.dueAt = dueResult.date;
      if (dueResult.wasAdjusted) {
        adjustments.push({
          field: 'dueAt',
          reason: 'Data ajustada para o presente',
          old: data.dueAt,
          new: dueResult.date
        });
      }
    }
  }

  if (data.publishAt) {
    const publishResult = validateDate(data.publishAt, 'publish');
    sanitized.publishAt = publishResult.date;
    if (publishResult.wasAdjusted) {
      adjustments.push({
        field: 'publishAt',
        reason: 'Data de publicação ajustada para agora (estava no passado)',
        old: data.publishAt,
        new: publishResult.date
      });
      // Mark for UI feedback
      sanitized._meta = { ...sanitized._meta, publishAtAdjusted: true };
    }
  }

  if (data.eventStartAt && data.eventEndAt) {
    const startResult = validateDate(data.eventStartAt, 'event_start');
    const endResult = validateDate(data.eventEndAt, 'event_end', data.eventStartAt);
    
    if (!startResult.isValid) {
      errors.push({ field: 'eventStartAt', message: startResult.error!, value: data.eventStartAt });
    }
    if (!endResult.isValid) {
      errors.push({ field: 'eventEndAt', message: endResult.error!, value: data.eventEndAt });
    }
    
    sanitized.eventStartAt = startResult.date;
    sanitized.eventEndAt = endResult.date;
  }

  // Event location validation
  if (data.eventLocation) {
    const trimmedLocation = sanitizeText(data.eventLocation, 200);
    if (trimmedLocation !== data.eventLocation) {
      adjustments.push({
        field: 'eventLocation',
        reason: 'Local do evento aparado para 200 caracteres',
        old: data.eventLocation,
        new: trimmedLocation
      });
      sanitized.eventLocation = trimmedLocation;
    }
  }

  return {
    isValid: errors.length === 0,
    data: sanitized,
    errors,
    adjustments
  };
};

// Class validation
export const validateClassData = (data: any): ValidationResult<any> => {
  const errors: ValidationError[] = [];
  const adjustments: { field: string; reason: string; old: any; new: any }[] = [];
  
  const sanitized = { ...data };

  // Name validation
  if (!data.name?.trim()) {
    errors.push({ field: 'name', message: 'Nome da turma é obrigatório', value: data.name });
  } else {
    const trimmedName = sanitizeText(data.name, 120);
    if (trimmedName !== data.name) {
      adjustments.push({
        field: 'name',
        reason: 'Nome aparado para 120 caracteres',
        old: data.name,
        new: trimmedName
      });
      sanitized.name = trimmedName;
    }
  }

  // Code validation
  if (data.code) {
    const trimmedCode = sanitizeText(data.code, 20);
    if (trimmedCode !== data.code) {
      adjustments.push({
        field: 'code',
        reason: 'Código aparado para 20 caracteres',
        old: data.code,
        new: trimmedCode
      });
      sanitized.code = trimmedCode;
    }
  }

  return {
    isValid: errors.length === 0,
    data: sanitized,
    errors,
    adjustments
  };
};

// Data migration functions
export const runDataHygiene = (): HygieneReport => {
  const report: HygieneReport = {
    phonesFixed: 0,
    phonesInvalid: 0,
    datesAdjusted: 0,
    titlesTrimmed: 0,
    textsClipped: 0,
    totalErrors: 0,
    timestamp: new Date().toISOString()
  };

  try {
    // Clean people data
    const peopleData = localStorage.getItem('comunika_people_v2');
    if (peopleData) {
      const people = JSON.parse(peopleData);
      const cleanedPeople = people.map((person: any) => {
        const result = validatePersonData(person);
        if (result.adjustments.length > 0) {
          result.adjustments.forEach(adj => {
            if (adj.field.includes('phone')) report.phonesFixed++;
            if (adj.field === 'name') report.titlesTrimmed++;
          });
        }
        report.totalErrors += result.errors.length;
        return result.data;
      });
      localStorage.setItem('comunika_people_v2', JSON.stringify(cleanedPeople));
    }

    // Clean posts data
    const postsData = localStorage.getItem('comunika_posts');
    if (postsData) {
      const posts = JSON.parse(postsData);
      const cleanedPosts = posts.map((post: any) => {
        const result = validatePostData(post, true); // Allow past override during cleanup
        if (result.adjustments.length > 0) {
          result.adjustments.forEach(adj => {
            if (adj.field.includes('At')) report.datesAdjusted++;
            if (adj.field === 'title') report.titlesTrimmed++;
            if (adj.field === 'body') report.textsClipped++;
          });
        }
        report.totalErrors += result.errors.length;
        return result.data;
      });
      localStorage.setItem('comunika_posts', JSON.stringify(cleanedPosts));
    }

    // Clean classes data
    const classesData = localStorage.getItem('comunika_classes');
    if (classesData) {
      const classes = JSON.parse(classesData);
      const cleanedClasses = classes.map((schoolClass: any) => {
        const result = validateClassData(schoolClass);
        if (result.adjustments.length > 0) {
          result.adjustments.forEach(adj => {
            if (adj.field === 'name') report.titlesTrimmed++;
          });
        }
        report.totalErrors += result.errors.length;
        return result.data;
      });
      localStorage.setItem('comunika_classes', JSON.stringify(cleanedClasses));
    }

    // Save hygiene report
    localStorage.setItem('hygiene_report', JSON.stringify(report));
    
    return report;
  } catch (error) {
    console.error('Error during data hygiene:', error);
    return { ...report, totalErrors: -1 };
  }
};

export const getLastHygieneReport = (): HygieneReport | null => {
  try {
    const reportData = localStorage.getItem('hygiene_report');
    return reportData ? JSON.parse(reportData) : null;
  } catch {
    return null;
  }
};