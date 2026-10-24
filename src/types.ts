
export interface Appointment {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  description?: string;
  location?: string;
  category?: 'Trabalho' | 'Pessoal' | 'Urgente' | 'Reunião' | string;
  potentialConflict?: boolean;
  hasReport?: boolean;
  reminders?: number[]; // Array of minutes before the event
  callAlert?: boolean;
}

export interface MeetingReport {
  id: string;
  appointmentId: string;
  timestamp: string;
  markdownReport: string;
  fullTranscript?: string;
}

export enum VoiceState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  LISTENING = 'LISTENING',
  SPEAKING = 'SPEAKING',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  ERROR = 'ERROR'
}
