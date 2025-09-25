export interface Holiday {
  date: string; // YYYY-MM-DD format
  name: string;
  type: 'national' | 'religious' | 'civic';
}

export function getBrHolidays(year: number): Holiday[] {
  return [
    {
      date: `${year}-01-01`,
      name: 'Confraternização Universal',
      type: 'national'
    },
    {
      date: `${year}-04-21`,
      name: 'Tiradentes',
      type: 'civic'
    },
    {
      date: `${year}-05-01`,
      name: 'Dia do Trabalhador',
      type: 'civic'
    },
    {
      date: `${year}-09-07`,
      name: 'Independência do Brasil',
      type: 'national'
    },
    {
      date: `${year}-10-12`,
      name: 'Nossa Senhora Aparecida',
      type: 'religious'
    },
    {
      date: `${year}-11-02`,
      name: 'Finados',
      type: 'religious'
    },
    {
      date: `${year}-11-15`,
      name: 'Proclamação da República',
      type: 'civic'
    },
    {
      date: `${year}-12-25`,
      name: 'Natal',
      type: 'religious'
    }
  ];
}

export function isHoliday(date: Date, year?: number): Holiday | null {
  const targetYear = year || date.getFullYear();
  const holidays = getBrHolidays(targetYear);
  // Compare using local date to avoid timezone shifts
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;
  
  return holidays.find(h => h.date === dateStr) || null;
}