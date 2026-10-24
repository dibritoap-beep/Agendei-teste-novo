import React from 'react';
import { Bell } from 'lucide-react';
import { Appointment } from '../types';

interface AlertsTabProps {
  appointments: Appointment[];
}

export const AlertsTab: React.FC<AlertsTabProps> = ({ appointments }) => {
  const alerts = appointments.filter(a => a.potentialConflict || a.callAlert);

  return (
    <main className="flex-1 flex flex-col pt-8 pb-20 px-2 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <Bell size={24} className="text-[#FDD835]" />
        <h2 className="text-xl font-black text-white uppercase tracking-widest">Central de Avisos</h2>
      </div>
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <p className="text-white/50 text-xs font-bold uppercase text-center py-10">Nenhum aviso pendente</p>
        ) : (
          alerts.map(app => (
            <div key={app.id} className="bg-[#112240] border-l-4 border-l-[#EF5350] p-4 rounded-xl flex items-start gap-4">
              <div className="bg-[#EF5350]/20 p-2 rounded-lg">
                <Bell size={20} className="text-[#EF5350]" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white uppercase">{app.title}</h4>
                <p className="text-[10px] text-white/50 uppercase">{app.date} às {app.time}</p>
                {app.potentialConflict && <p className="text-[11px] text-[#EF5350] font-bold mt-1">⚠️ Conflito de Horário Potencial</p>}
                {app.callAlert && <p className="text-[11px] text-[#FDD835] font-bold mt-1">📞 Lembrete de Ligação Ativo</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
};
