export const formatDate = (d: Date, opts?: Intl.DateTimeFormatOptions, lang = 'pt-BR', tz?: string) =>
  new Intl.DateTimeFormat(lang, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: tz, ...opts }).format(d);

export const formatTime = (d: Date, lang = 'pt-BR', tz?: string, hour12 = false) =>
  new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit', hour12, timeZone: tz }).format(d);

export const formatDateTime = (d: Date, lang = 'pt-BR', tz?: string) => {
  const date = formatDate(d, undefined, lang, tz);
  const time = formatTime(d, lang, tz);
  return `${date} ${time}`;
};

// helpers dias/horários já existentes:
export const shortDays = (days: string[] = []) => days.map(s =>
  ({ Segunda: 'Seg', Terça: 'Ter', Quarta: 'Qua', Quinta: 'Qui', Sexta: 'Sex', Sábado: 'Sáb', Domingo: 'Dom' } as any)[s] || s
).join(', ');

export const timeRange = (start?: string, end?: string) => (start && end) ? `${start}–${end}` : '';

// Parse dd/mm/yyyy HH:mm format
export const parseDateTime = (dateTimeStr: string): Date | null => {
  const match = dateTimeStr.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  
  const [, day, month, year, hour, minute] = match;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
  
  return isNaN(date.getTime()) ? null : date;
};

// Format Date to dd/mm/yyyy HH:mm
export const formatToDateTimeInput = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hour}:${minute}`;
};