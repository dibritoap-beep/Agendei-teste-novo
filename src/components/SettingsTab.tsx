import React from 'react';
import { Settings } from 'lucide-react';
import { LANGUAGES } from '../constants';

interface SettingsTabProps {
  isPro: boolean;
  setIsSubscriptionModalOpen: (open: boolean) => void;
  theme: string;
  setTheme: (theme: string) => void;
  selectedLang: typeof LANGUAGES[0];
  setSelectedLang: (lang: typeof LANGUAGES[0]) => void;
  setDeleteConfirmation: (conf: {type: 'all_data', id: 'global'}) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  isPro,
  setIsSubscriptionModalOpen,
  theme,
  setTheme,
  selectedLang,
  setSelectedLang,
  setDeleteConfirmation
}) => {
  return (
    <main className="flex-1 flex flex-col pt-8 pb-20 px-2 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <Settings size={24} className="text-[#FDD835]" />
        <h2 className="text-xl font-black text-white uppercase tracking-widest">Ajustes</h2>
      </div>
      
      <div className="space-y-6">
        <div className="glass-panel p-5 rounded-2xl border-2 border-white/5">
          <h3 className="text-[11px] font-black text-[#FDD835] uppercase mb-4 tracking-widest">Conta</h3>
          <div className="flex justify-between items-center bg-[#112240] p-4 rounded-xl">
            <div>
              <p className="text-sm font-bold text-white uppercase">Plano Pro</p>
              <p className="text-[10px] text-white/50 uppercase">{isPro ? 'Ativo' : 'Não Assinante'}</p>
            </div>
            {!isPro && (
              <button onClick={() => setIsSubscriptionModalOpen(true)} className="px-4 py-2 bg-[#FDD835] text-black text-[10px] font-black uppercase rounded-lg">Assinar</button>
            )}
          </div>
        </div>
        
        <div className="glass-panel p-5 rounded-2xl border-2 border-white/5">
          <h3 className="text-[11px] font-black text-[#FDD835] uppercase mb-4 tracking-widest">Preferências</h3>
          
          <div className="flex justify-between items-center bg-[#112240] p-4 rounded-xl mb-3">
            <div>
              <p className="text-sm font-bold text-white uppercase">Aparência</p>
            </div>
            <select 
              value={theme} 
              onChange={e => setTheme(e.target.value)}
              className="bg-[#0A1526] text-white text-xs p-2 uppercase font-bold tracking-widest rounded border border-[#233559]"
            >
              <option value="default">Padrão</option>
              <option value="obsidian">Obsidian</option>
              <option value="forest">Forest</option>
              <option value="wine">Wine</option>
              <option value="light">Claro</option>
            </select>
          </div>
          
          <div className="bg-[var(--bg-card)] p-5 rounded-3xl border border-[var(--border-subtle)] hover:border-[var(--brand)] transition-colors mb-3">
             <div className="flex justify-between items-center mb-3">
               <h4 className="text-[var(--text-main)] font-semibold uppercase">Exemplo de Tema</h4>
               <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold bg-[var(--bg-panel-alt)] px-2 py-1 rounded-md border border-[var(--border-subtle)]">
                 09:00
               </span>
             </div>
             <p className="text-[var(--text-muted)] text-[11px] mt-1">Pré-visualização do tema atual selecionado.</p>
             <button className="mt-4 w-full bg-[var(--brand)] text-[var(--text-inv)] font-semibold uppercase py-2 rounded-xl">
               Ver Detalhes
             </button>
          </div>
          
          <div className="flex justify-between items-center bg-[#112240] p-4 rounded-xl mb-3">
            <div>
              <p className="text-sm font-bold text-white uppercase">Idioma Base</p>
            </div>
            <select 
              value={selectedLang.id} 
              onChange={e => setSelectedLang(LANGUAGES.find(l => l.id === e.target.value) || LANGUAGES[0])}
              className="bg-[#0A1526] text-white text-xs p-2 uppercase font-bold tracking-widest rounded border border-[#233559]"
            >
              {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>
        
        <div className="glass-panel p-5 rounded-2xl border-2 border-red-500/20">
          <h3 className="text-[11px] font-black text-red-500 uppercase mb-4 tracking-widest">Zona de Perigo</h3>
          <button onClick={() => setDeleteConfirmation({ type: 'all_data', id: 'global' })} className="w-full py-4 bg-red-500/10 text-red-500 border border-red-500/30 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
            Apagar Todos os Dados
          </button>
        </div>
      </div>
    </main>
  );
};
