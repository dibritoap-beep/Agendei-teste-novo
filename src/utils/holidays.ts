import { Appointment } from '../types';
import { format } from 'date-fns';

export interface NationalHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  description: string;
  isMovable?: boolean;
}

/**
 * Computes Easter Sunday for a given year using Meeus/Jones/Butcher algorithm.
 */
function getEasterSunday(year: number): Date {
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
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDaysToDate(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns all Brazilian National Holidays for a given year.
 */
export function getNationalHolidays(year: number): NationalHoliday[] {
  const easter = getEasterSunday(year);
  const carnival = addDaysToDate(easter, -47);
  const goodFriday = addDaysToDate(easter, -2);
  const corpusChristi = addDaysToDate(easter, 60);

  const holidays: NationalHoliday[] = [
    {
      date: `${year}-01-01`,
      name: 'Confraternização Universal',
      description: 'Ano Novo e Dia da Paz Mundial.',
    },
    {
      date: formatDateISO(carnival),
      name: 'Carnaval',
      description: 'Ponto facultativo / Celebração tradicional nacional.',
      isMovable: true,
    },
    {
      date: formatDateISO(goodFriday),
      name: 'Sexta-feira Santa (Paixão de Cristo)',
      description: 'Feriado Nacional religioso que antecede o Domingo de Páscoa.',
      isMovable: true,
    },
    {
      date: formatDateISO(easter),
      name: 'Páscoa',
      description: 'Celebração da Páscoa.',
      isMovable: true,
    },
    {
      date: `${year}-04-21`,
      name: 'Tiradentes',
      description: 'Homenagem a Joaquim José da Silva Xavier, mártir da Inconfidência Mineira.',
    },
    {
      date: `${year}-05-01`,
      name: 'Dia do Trabalhador',
      description: 'Dia Mundial do Trabalho.',
    },
    {
      date: formatDateISO(corpusChristi),
      name: 'Corpus Christi',
      description: 'Celebração religiosa nacional.',
      isMovable: true,
    },
    {
      date: `${year}-09-07`,
      name: 'Independência do Brasil',
      description: 'Declaração da Independência do Brasil por D. Pedro I em 1822.',
    },
    {
      date: `${year}-10-12`,
      name: 'Nossa Senhora Aparecida',
      description: 'Padroeira do Brasil e Dia das Crianças.',
    },
    {
      date: `${year}-11-02`,
      name: 'Finados',
      description: 'Dia de memória e homenagem aos entes falecidos.',
    },
    {
      date: `${year}-11-15`,
      name: 'Proclamação da República',
      description: 'Proclamação da República Federativa do Brasil em 1889.',
    },
    {
      date: `${year}-11-20`,
      name: 'Consciência Negra',
      description: 'Dia Nacional de Zumbi e da Consciência Negra (Lei nº 14.759/2023).',
    },
    {
      date: `${year}-12-25`,
      name: 'Natal',
      description: 'Celebração do Natal e fraternidade.',
    },
  ];

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Checks if a specific date is a national holiday.
 */
export function getHolidayForDate(date: Date | string): NationalHoliday | null {
  const dateStr = typeof date === 'string' ? date.slice(0, 10) : format(date, 'yyyy-MM-dd');
  const year = parseInt(dateStr.split('-')[0], 10);
  if (isNaN(year)) return null;

  const list = getNationalHolidays(year);
  return list.find((h) => h.date === dateStr) || null;
}

/**
 * Converts national holidays of years into standard Appointment format for Agenda do Dia.
 */
export function generateHolidayAppointments(years: number[]): Appointment[] {
  const appointments: Appointment[] = [];

  for (const year of years) {
    const list = getNationalHolidays(year);
    for (const h of list) {
      appointments.push({
        id: `feriado_${h.date}`,
        title: `🇧🇷 Feriado: ${h.name}`,
        date: h.date,
        time: '08:00',
        duration: 60,
        category: 'Feriado',
        description: `${h.description} (Feriado Nacional Brasileiro)`,
        location: 'Brasil',
        potentialConflict: false,
        hasReport: false,
        reminders: [1440, 120, 60],
        callAlert: false,
      });
    }
  }

  return appointments;
}

/**
 * Ensures that holidays for the current and adjacent years are present in appointments.
 */
export function syncHolidaysWithAppointments(currentAppointments: Appointment[]): Appointment[] {
  const currentYear = new Date().getFullYear();
  const targetYears = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
  const holidayAppointments = generateHolidayAppointments(targetYears);

  const existingIds = new Set(currentAppointments.map((a) => a.id));
  const existingHolidayDates = new Set(
    currentAppointments
      .filter((a) => a.id.startsWith('feriado_') || a.category === 'Feriado')
      .map((a) => a.date)
  );

  const toAdd: Appointment[] = [];
  for (const hApp of holidayAppointments) {
    if (!existingIds.has(hApp.id) && !existingHolidayDates.has(hApp.date)) {
      toAdd.push(hApp);
    }
  }

  if (toAdd.length === 0) {
    return currentAppointments;
  }

  return [...currentAppointments, ...toAdd];
}
