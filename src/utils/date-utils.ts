export function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const month = Math.floor((h + L - 7 * m + 114) / 31);
  const day = ((h + L - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function getBrazilianHoliday(dateStr: string): string | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  
  const dateKey = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  const fixedHolidays: Record<string, string> = {
    '01-01': 'Confraternização Universal (Ano Novo)',
    '04-21': 'Tiradentes',
    '05-01': 'Dia do Trabalho',
    '09-07': 'Independência do Brasil',
    '10-12': 'Nossa Senhora Aparecida',
    '11-02': 'Finados',
    '11-15': 'Proclamação da República',
    '11-20': 'Dia Nacional de Zumbi e da Consciência Negra',
    '12-25': 'Natal',
  };
  
  if (fixedHolidays[dateKey]) {
    return fixedHolidays[dateKey];
  }
  
  const easter = getEasterDate(year);
  
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
    
  const carnival = new Date(easter);
  carnival.setDate(easter.getDate() - 47);
  
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 60);
  
  const checkDate = new Date(year, month - 1, day);
  
  const isSameDay = (d1: Date, d2: Date) => 
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
    
  if (isSameDay(checkDate, carnival)) return 'Carnaval (Terça-feira)';
  if (isSameDay(checkDate, goodFriday)) return 'Sexta-feira Santa (Paixão de Cristo)';
  if (isSameDay(checkDate, corpusChristi)) return 'Corpus Christi';
  
  return null;
}
