import React from 'react';
import { Home, Calendar as CalendarIcon, Clock, Bell, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--bg-panel)] border-t border-[var(--border-subtle)] pb-6 pt-3 px-8 flex justify-between items-center z-50 max-w-7xl mx-auto">
      <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-[var(--brand)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
        <Home size={28} strokeWidth={2.5} />
        <span className="text-[11px] font-bold">Início</span>
      </button>
      <button onClick={() => setActiveTab('agenda')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'agenda' ? 'text-[var(--brand)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
        <CalendarIcon size={28} strokeWidth={2.5} />
        <span className="text-[11px] font-bold">Agenda</span>
      </button>
      <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'history' ? 'text-[var(--brand)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
        <Clock size={28} strokeWidth={2.5} />
        <span className="text-[11px] font-bold">Histórico</span>
      </button>
      <button onClick={() => setActiveTab('alerts')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'alerts' ? 'text-[var(--brand)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
        <Bell size={28} strokeWidth={2.5} />
        <span className="text-[11px] font-bold">Avisos</span>
      </button>
      <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'settings' ? 'text-[var(--brand)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
        <Settings size={28} strokeWidth={2.5} />
        <span className="text-[11px] font-bold">Ajustes</span>
      </button>
    </nav>
  );
};
