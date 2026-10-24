import React from 'react';
import { Calendar as CalendarIcon, Monitor, RefreshCw, Download, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { Appointment, MeetingReport } from '../types';

interface AgendaTabProps {
  agendaListRef: React.RefObject<HTMLDivElement | null>;
  selectedDate: Date;
  selectedDayAppointments: Appointment[];
  setIsMirrorModalOpen: (open: boolean) => void;
  syncAllToFirestore: () => void;
  downloadDayAgendaJpeg: () => void;
  shareDayAgenda: () => void;
  reports: MeetingReport[];
  setSelectedReport: (report: MeetingReport | null) => void;
  setActiveAppointmentId: (id: string | null) => void;
}

export const AgendaTab: React.FC<AgendaTabProps> = ({
  agendaListRef,
  selectedDate,
  selectedDayAppointments,
  setIsMirrorModalOpen,
  syncAllToFirestore,
  downloadDayAgendaJpeg,
  shareDayAgenda,
  reports,
  setSelectedReport,
  setActiveAppointmentId
}) => {
  return (
    <main className="flex-1 flex flex-col pt-8 pb-20 px-2 animate-in fade-in duration-500">
      <div ref={agendaListRef} className="bg-[#0A1931] p-4 sm:p-6 -mx-2 sm:-mx-4 rounded-[2.5rem]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CalendarIcon size={24} className="text-[#FDD835]" />
            <div className="flex flex-col">
              <h2 className="text-xl font-black text-white uppercase tracking-widest leading-none">Compromissos do Dia</h2>
              <span className="text-[11.5px] font-black text-[#FDD835] uppercase tracking-wider mt-1.5">
                {format(selectedDate, 'dd/MM/yyyy')}
              </span>
            </div>
          </div>
          {selectedDayAppointments.length > 0 && (
            <div className="flex items-center gap-2" data-exclude-download="true">
              <button onClick={() => setIsMirrorModalOpen(true)} className="w-10 h-10 bg-[#1A2B4C] border border-[#FDD835]/30 rounded-xl flex items-center justify-center text-[#FDD835] hover:bg-[#FDD835] hover:text-black shadow-sm transition-all flex-shrink-0" title="Espelhamento Executivo">
                <Monitor size={16} />
              </button>
              <button onClick={syncAllToFirestore} className="w-10 h-10 bg-[#1A2B4C] border border-[#233559] rounded-xl flex items-center justify-center text-blue-400 hover:text-white hover:bg-[#233559] shadow-sm transition-all flex-shrink-0" title="Sincronizar com a Base">
                <RefreshCw size={16} />
              </button>
              <button onClick={downloadDayAgendaJpeg} className="w-10 h-10 bg-[#1A2B4C] border border-[#233559] rounded-xl flex items-center justify-center text-blue-300 hover:text-white hover:bg-[#233559] shadow-sm transition-all flex-shrink-0" title="Baixar Agenda em Imagem">
                <Download size={16} />
              </button>
              <button onClick={shareDayAgenda} className="w-10 h-10 bg-[#1A2B4C] border border-[#233559] rounded-xl flex items-center justify-center text-blue-300 hover:text-white hover:bg-[#233559] shadow-sm transition-all flex-shrink-0" title="Compartilhar Agenda do Dia">
                <Share2 size={16} />
              </button>
            </div>
          )}
        </div>
        
        <div className="w-full bg-[#112240] rounded-[2rem] border-t-4 border-[#0F52BA] border-[#233559] shadow-xl overflow-hidden">
          {selectedDayAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <p className="text-white/40 text-xs font-bold uppercase text-center tracking-wider">Nenhum compromisso marcado para este dia.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {selectedDayAppointments.map((app, index, arr) => {
                const isReport = app.hasReport;
                return (
                  <div key={app.id}
                    onClick={() => isReport ? setSelectedReport(reports.find(r => r.appointmentId === app.id) || null) : setActiveAppointmentId(app.id)}
                    className={`p-5 sm:p-6 cursor-pointer hover:bg-[#1A2B4C]/40 transition-colors ${index !== arr.length - 1 ? 'border-b border-white/5' : ''}`}>
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <h4 className="text-[16px] sm:text-[18px] font-black text-white uppercase tracking-tight leading-tight">
                          · {app.time} - {app.title} ({app.duration} min)
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 gap-2.5">
                        <div className="flex items-center gap-3">
                          <span className="text-[10.5px] font-black text-white/30 uppercase tracking-[0.1em] min-w-[70px]">Status:</span>
                          <span className={`text-[10.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${isReport ? 'bg-[#FDD835]/20 text-[#FDD835]' : 'bg-white/5 text-white/50'}`}>
                            {isReport ? 'DOCUMENTADO' : 'AGENDADO'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10.5px] font-black text-white/30 uppercase tracking-[0.1em] min-w-[70px]">Categoria:</span>
                          <span className="text-[10.5px] font-black text-white/80 uppercase tracking-wide">{app.category || 'Geral'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10.5px] font-black text-white/30 uppercase tracking-[0.1em] min-w-[70px]">Local:</span>
                          <span className="text-[10.5px] font-black text-white/80 uppercase tracking-wide">{app.location || 'Não Definido'}</span>
                        </div>
                        {app.description && (
                          <div className="flex items-start gap-3 mt-1">
                            <span className="text-[10.5px] font-black text-white/30 uppercase tracking-[0.1em] min-w-[70px] mt-0.5">Assuntos:</span>
                            <p className="text-[10.5px] text-white/60 font-medium uppercase leading-relaxed">
                              {app.description}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
