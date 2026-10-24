
import { Appointment } from '../src/types';
import { isAfter, parse, addMinutes, startOfMinute } from 'date-fns';

/**
 * Interface para representar o intervalo de tempo de um agendamento
 */
export interface TimeRange {
  date: string; // yyyy-MM-dd
  time: string; // HH:mm
  duration: number; // minutos
}

/**
 * Valida se um novo agendamento possui conflitos com os existentes
 * e se a data é futura.
 * 
 * @param newApp Dados do novo agendamento
 * @param existingApps Lista de agendamentos atuais
 * @param excludeId ID a ser excluído da verificação (útil para edições)
 * @returns { success: boolean; error?: string }
 */
export const validateAppointment = (
  newApp: TimeRange,
  existingApps: Appointment[],
  excludeId?: string
): { success: boolean; error?: string } => {
  
  // 1. Validar se a data/hora é futura
  const now = startOfMinute(new Date());
  const newStart = parse(`${newApp.date} ${newApp.time}`, 'yyyy-MM-dd HH:mm', new Date());
  
  if (!isAfter(newStart, now)) {
    return { 
      success: false, 
      error: 'O agendamento deve ser para uma data e hora futura.' 
    };
  }

  const newEnd = addMinutes(newStart, newApp.duration);

  // 2. Filtrar compromissos do mesmo dia para otimizar a performance
  const sameDayApps = existingApps.filter(app => 
    app.date === newApp.date && app.id !== excludeId
  );

  // 3. Verificar sobreposição (Overlap Logic)
  // Dois intervalos se sobrepõem se: (StartA < EndB) AND (StartB < EndA)
  for (const app of sameDayApps) {
    const appStart = parse(`${app.date} ${app.time}`, 'yyyy-MM-dd HH:mm', new Date());
    const appEnd = addMinutes(appStart, app.duration);

    const hasOverlap = newStart < appEnd && appStart < newEnd;

    if (hasOverlap) {
      return {
        success: false,
        error: `Conflito de horário: Já existe um compromisso ("${app.title}") das ${app.time} às ${formatTime(appEnd)}.`
      };
    }
  }

  return { success: true };
};

/**
 * Helper para formatar Date em HH:mm
 */
const formatTime = (date: Date): string => {
  return date.getHours().toString().padStart(2, '0') + ':' + 
         date.getMinutes().toString().padStart(2, '0');
};
