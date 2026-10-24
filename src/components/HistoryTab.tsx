import React from 'react';
import { Clock } from 'lucide-react';
import { Appointment } from '../types';

interface HistoryTabProps {
  appointments: Appointment[];
  renderAppCard: (app: Appointment) => React.ReactNode;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ appointments, renderAppCard }) => {
  const historyApps = appointments.filter(a => a.hasReport).sort((a,b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());

  return (
    <main className="flex-1 flex flex-col pt-8 pb-20 px-2 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <Clock size={24} className="text-[#FDD835]" />
        <h2 className="text-xl font-black text-white uppercase tracking-widest">Histórico de Atas</h2>
      </div>
      <div className="space-y-4">
        {historyApps.map(renderAppCard)}
        {historyApps.length === 0 && (
          <p className="text-white/50 text-xs font-bold uppercase text-center py-10">Nenhuma ata gerada ainda.</p>
        )}
      </div>
    </main>
  );
};
