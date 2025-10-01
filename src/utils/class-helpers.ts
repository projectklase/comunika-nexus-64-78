import { SchoolClass } from '@/types/class';

// Helper functions for resolving names - now receive the data as parameters
export function resolveLevelName(id: string | undefined, levels: Array<{ id: string; name: string }>): string {
  if (!id) return 'Sem nível';
  const level = levels.find(l => l.id === id);
  return level?.name || 'Nível não encontrado';
}

export function resolveModalityName(id: string | undefined, modalities: Array<{ id: string; name: string }>): string {
  if (!id) return 'Sem modalidade';
  const modality = modalities.find(m => m.id === id);
  return modality?.name || 'Modalidade não encontrada';
}

export function resolveSubjectNames(ids: string[] | undefined, subjects: Array<{ id: string; name: string }>): string[] {
  if (!ids || ids.length === 0) return [];
  return ids.map(id => {
    const subject = subjects.find(s => s.id === id);
    return subject?.name || 'Matéria não encontrada';
  }).filter(name => name !== 'Matéria não encontrada');
}

// Days of week formatting
const DAY_ABBREVIATIONS: Record<string, string> = {
  'segunda': 'Seg',
  'segunda-feira': 'Seg',
  'terca': 'Ter',
  'terça': 'Ter',
  'terca-feira': 'Ter',
  'terça-feira': 'Ter',
  'quarta': 'Qua',
  'quarta-feira': 'Qua',
  'quinta': 'Qui',
  'quinta-feira': 'Qui',
  'sexta': 'Sex',
  'sexta-feira': 'Sex',
  'sabado': 'Sáb',
  'sábado': 'Sáb',
  'sabado-feira': 'Sáb',
  'sábado-feira': 'Sáb',
  'domingo': 'Dom',
  'domingo-feira': 'Dom',
};

export function formatDaysOfWeek(days?: string[]): string {
  if (!days || days.length === 0) return 'Sem dias';
  
  return days.map(day => {
    const normalized = day.toLowerCase().trim();
    return DAY_ABBREVIATIONS[normalized] || day;
  }).join(', ');
}

// Time formatting
export function formatClassTime(start?: string, end?: string): string {
  if (!start || !end) return 'Sem horário';
  return `${start}–${end}`;
}

// Day order for sorting (Sunday = 0, Monday = 1, ..., Saturday = 6)
const DAY_ORDER: Record<string, number> = {
  'domingo': 0,
  'segunda': 1,
  'segunda-feira': 1,
  'terca': 2,
  'terça': 2,
  'terca-feira': 2,
  'terça-feira': 2,
  'quarta': 3,
  'quarta-feira': 3,
  'quinta': 4,
  'quinta-feira': 4,
  'sexta': 5,
  'sexta-feira': 5,
  'sabado': 6,
  'sábado': 6,
  'sabado-feira': 6,
  'sábado-feira': 6,
};

function getDayOrder(day: string): number {
  const normalized = day.toLowerCase().trim();
  return DAY_ORDER[normalized] ?? 7; // Unknown days go to the end
}

function getMinDayOrder(days: string[]): number {
  if (!days || days.length === 0) return 7;
  return Math.min(...days.map(getDayOrder));
}

function parseTime(timeStr: string): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0); // Convert to minutes
}

// Class ordering by schedule
export function orderClassesBySchedule(classes: SchoolClass[]): SchoolClass[] {
  return [...classes].sort((a, b) => {
    // First, sort by earliest day of week
    const aDayOrder = getMinDayOrder(a.daysOfWeek);
    const bDayOrder = getMinDayOrder(b.daysOfWeek);
    
    if (aDayOrder !== bDayOrder) {
      return aDayOrder - bDayOrder;
    }
    
    // If same day, sort by start time
    const aTime = parseTime(a.startTime);
    const bTime = parseTime(b.startTime);
    
    if (aTime !== bTime) {
      return aTime - bTime;
    }
    
    // If same time, sort by name as fallback
    return a.name.localeCompare(b.name);
  });
}

// Generate class display info
export function getClassDisplayInfo(
  schoolClass: SchoolClass,
  levels: Array<{ id: string; name: string }>,
  modalities: Array<{ id: string; name: string }>
) {
  const level = resolveLevelName(schoolClass.levelId, levels);
  const modality = resolveModalityName(schoolClass.modalityId, modalities);
  const days = formatDaysOfWeek(schoolClass.daysOfWeek);
  const time = formatClassTime(schoolClass.startTime, schoolClass.endTime);
  
  return {
    level,
    modality,
    days,
    time,
    levelModality: `${level} / ${modality}`,
    schedule: `${days} ${time}`,
    fullInfo: `${schoolClass.name} — ${level} / ${modality} — ${days} ${time}`,
  };
}
