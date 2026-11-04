import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { format, addDays, subDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import Markdown from 'react-markdown';
import { 
  NotebookPen, Sparkles, Calendar as CalendarIcon, 
  ChevronLeft, ChevronRight, Info, RefreshCw, LayoutGrid, List, FileText,
  Home, Share2, X, Smartphone, Download, Check, HelpCircle, ArrowUpRight
} from 'lucide-react';

const RarbCodingLogo = () => (
  <div className="flex flex-col items-center opacity-40 hover:opacity-100 transition-opacity pt-24 pb-24 w-full mt-auto">
    <div className="flex items-center space-x-3 group transform scale-75 origin-top">
      <svg className="w-12 h-12 transition-transform duration-300 group-hover:scale-105" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 12 L10 88 L52 88 C72 88 84 74 84 50 C84 26 72 12 52 12 Z" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinejoin="round" />
        <path d="M17 42 C12 42 12 49 8 50 C12 51 12 58 17 58" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
        <path d="M30 64 L30 36 L54 36 C64 36 68 42 68 49 C68 56 61 60 52 60 L30 60" fill="none" stroke="#00F2FE" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M48 58 L72 90 L108 34" fill="none" stroke="#00F2FE" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <polygon points="108,24 94,40 116,44" fill="#FFFFFF" />
      </svg>
      <div className="flex flex-col text-left">
        <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.3em] mb-0.5">Desenvolvido por</span>
        <span className="text-xl font-extrabold tracking-wider font-mono text-[var(--text-main)] leading-none">
          Rar<span className="text-[#00F2FE]">b</span><span className="relative inline-block border-b-2 border-[#00F2FE] pb-0.5">_CODING</span>
        </span>
        <span className="text-[8px] tracking-[0.25em] uppercase text-[var(--text-muted)] font-mono font-semibold mt-1">Software Development</span>
      </div>
    </div>
  </div>
);

const MirrorView: React.FC = () => {
  const { mirrorId } = useParams<{ mirrorId: string }>();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('home');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedReportApp, setSelectedReportApp] = useState<any | null>(null);
  
  // PWA & Shortcut state for mirror screen
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
    };
    checkStandalone();

    // Store mirror ID for direct standalone access
    if (mirrorId) {
      localStorage.setItem('agendei_standalone_mirror_id', mirrorId.trim());
      localStorage.setItem('agendei_mirror_only_mode', 'true');
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [mirrorId]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error("Erro ao solicitar instalação PWA:", err);
        setIsInstallModalOpen(true);
      }
    } else {
      setIsInstallModalOpen(true);
    }
  };

  const copyDirectMirrorLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setIsCopiedLink(true);
      setTimeout(() => setIsCopiedLink(false), 2500);
    } catch (e) {
      console.error("Clipboard error:", e);
    }
  };

  const handleShare = async (e: React.MouseEvent, app: any) => {
    e.stopPropagation();
    let text = '';
    const dateFormatted = app.date ? app.date.split('-').reverse().join('/') : '';

    if (app.hasReport && app.markdownReport) {
      text = `📌 *MEMÓRIA DO REGISTRO EXECUTIVO DA REUNIÃO: ${(app.title || 'REUNIÃO').toUpperCase()}*\n📅 Data: ${dateFormatted} às ${app.time}\n📍 Local: ${app.location || 'Não especificado'}\n\n${app.markdownReport}\n\n_Enviado via AGENDEI IA_`.trim();
    } else {
      text = `📌 *COMPROMISSO EXECUTIVO: ${(app.title || 'REUNIÃO').toUpperCase()}*\n📅 Data: ${dateFormatted}\n⏰ Horário: ${app.time} (Duração: ${app.duration} min)\n📍 Local: ${app.location || 'Não especificado'}\n${app.description ? `📋 Pautas: ${app.description}` : ''}\n\n_Enviado via AGENDEI IA_`.trim();
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: app.hasReport ? `Memória Executiva: ${app.title}` : `AGENDA: ${app.title}`,
          text: text,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Erro ao compartilhar", err);
          try {
            await navigator.clipboard.writeText(text);
            setCopiedId(app.id);
            setTimeout(() => setCopiedId(null), 2500);
            alert('Memória do registro executivo da reunião copiada para a área de transferência!');
          } catch (e) {
            console.error("Clipboard error:", e);
          }
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedId(app.id);
        setTimeout(() => setCopiedId(null), 2500);
        alert('Memória do registro executivo da reunião copiada para a área de transferência!');
      } catch (err) {
        console.error("Clipboard error:", err);
      }
    }
  };

  // Date Navigation Handlers
  const handlePrevDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handlePrevEventDate = () => {
    for (let i = 1; i <= 365; i++) {
      const prevD = subDays(selectedDate, i);
      const prevStr = format(prevD, 'yyyy-MM-dd');
      const hasApp = appointments.some(a => a.date === prevStr);
      if (hasApp) {
        setSelectedDate(prevD);
        return;
      }
    }
  };

  const handleNextEventDate = () => {
    for (let i = 1; i <= 365; i++) {
      const nextD = addDays(selectedDate, i);
      const nextStr = format(nextD, 'yyyy-MM-dd');
      const hasApp = appointments.some(a => a.date === nextStr);
      if (hasApp) {
        setSelectedDate(nextD);
        return;
      }
    }
  };

  useEffect(() => {
    console.log("MirrorView: Conectando ao mirrorId:", mirrorId);
    if (!mirrorId) {
      setError("ID de espelhamento não fornecido.");
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, 'appointments'),
        where('mirrorId', '==', mirrorId.trim())
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log(`MirrorView: ${snapshot.size} compromissos recebidos.`);
        const apps = snapshot.docs.map(doc => {
          const data = doc.data();
          let start: Date;
          if (data.data_inicio?.toDate) {
            start = data.data_inicio.toDate();
          } else if (data.data_inicio instanceof Date) {
            start = data.data_inicio;
          } else if (typeof data.data_inicio === 'string') {
            start = new Date(data.data_inicio);
          } else if (data.data_inicio?.seconds) {
            start = new Date(data.data_inicio.seconds * 1000);
          } else {
            start = new Date();
          }

          return {
            id: doc.id,
            title: data.titulo || 'Sem Título',
            date: data.date_string || format(start, 'yyyy-MM-dd'),
            time: data.time_string || format(start, 'HH:mm'),
            duration: data.duration || 60,
            description: data.descricao,
            location: data.local,
            category: data.categoria,
            status: data.status,
            hasReport: data.hasReport || false,
            markdownReport: data.markdownReport,
            callAlert: data.callAlert || false,
            potentialConflict: data.potentialConflict || false,
            data_inicio_raw: start
          };
        });

        const sortedApps = apps.sort((a, b) => a.data_inicio_raw.getTime() - b.data_inicio_raw.getTime());
        console.log("MirrorView: Compromissos sincronizados com sucesso.");
        setAppointments(sortedApps);
        setLoading(false);
        setError(null);
      }, (err) => {
        console.error("MirrorView: Erro de assinatura:", err);
        setError(`Erro de conexão: ${err.message}`);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e: any) {
      console.error("MirrorView: Erro de configuração:", e);
      setError(`Erro de configuração: ${e.message}`);
      setLoading(false);
    }
  }, [mirrorId]);

  const filteredAppointments = useMemo(() => {
    const todayStr = format(selectedDate, 'yyyy-MM-dd');
    const now = new Date();

    if (activeTab === 'home') {
      return appointments.filter(app => app.date === todayStr);
    } else if (activeTab === 'agenda') {
      return appointments.filter(app => {
        const appDate = new Date(app.date + 'T' + app.time);
        return appDate >= now && !app.hasReport;
      });
    } else if (activeTab === 'reports') {
      return appointments.filter(app => app.hasReport);
    }
    return [];
  }, [appointments, selectedDate, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1931] flex flex-col items-center justify-center p-8">
        <RefreshCw size={48} className="text-[var(--brand)] animate-spin mb-4" />
        <p className="text-[var(--text-main)] font-bold uppercase tracking-widest animate-pulse">Sincronizando Agenda Executiva...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A1931] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border-2 border-red-500/50">
          <Info size={40} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-red-500 uppercase mb-2">Acesso Restrito</h2>
        <p className="text-[var(--text-muted)] uppercase text-xs tracking-widest">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1931] flex flex-col text-[var(--text-main)] selection:bg-[var(--brand)] selection:text-black">
      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 md:px-8 pb-24">
        {/* Header Oficial do Painel */}
        <header className="pt-8 pb-4 flex flex-col items-center relative w-full">
          <div className="mb-3 relative">
            <div className="w-[72px] h-[72px] bg-[#112240] border-2 border-[var(--brand)] rounded-full flex items-center justify-center text-[var(--text-main)] shadow-[0_0_20px_rgba(253,216,53,0.4)]">
              <NotebookPen size={36} strokeWidth={2.5} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[var(--brand)] rounded-full flex items-center justify-center border-2 border-[#112240]">
              <Sparkles size={14} className="text-black" />
            </div>
          </div>
          
          <h1 className="text-[46px] sm:text-[58px] font-black logo-executive leading-none tracking-tighter text-center mt-2 text-[var(--brand)]">AGENDEI</h1>
          <p className="text-[10.5px] sm:text-[11.5px] font-black text-white uppercase tracking-[0.3em] sm:tracking-[0.4em] mt-1.5 text-center">Visualização Executiva</p>
          
          <div className="mt-4 flex items-center gap-2 px-3 py-1 bg-[var(--brand)]/10 border border-[var(--brand)]/30 rounded-full">
            <div className="w-2 h-2 bg-[var(--brand)] rounded-full animate-pulse"></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--brand)]">Espelhamento em Tempo Real</span>
          </div>
        </header>

        {/* Banner do Instalador / Atalho de Espelhamento no Celular */}
        {!isStandalone ? (
          <div className="w-full bg-[#112240] border-2 border-[var(--brand)]/40 rounded-2xl p-3 sm:p-4 mb-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand)]/15 border border-[var(--brand)]/50 flex items-center justify-center text-[var(--brand)] flex-shrink-0">
                <Smartphone size={22} />
              </div>
              <div className="text-left flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-black uppercase text-white tracking-wider">
                    Atalho na Tela do Celular
                  </h4>
                  <span className="text-[8.5px] bg-[var(--brand)] text-black font-black px-1.5 py-0.2 rounded uppercase">
                    Exclusivo
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-white/70 font-medium">
                  Instale no seu aparelho para abrir sempre direto neste espelhamento
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleInstallClick}
                className="flex-1 sm:flex-none px-3.5 py-2.5 bg-[var(--brand)] hover:brightness-110 text-black font-black uppercase text-[10px] tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Download size={14} /> Instalar Atalho
              </button>
              <button
                onClick={() => setIsInstallModalOpen(true)}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
                title="Instruções de instalação para iPhone e Android"
              >
                <HelpCircle size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400">
              <Check size={14} className="font-bold" />
              <span className="text-[9px] font-black uppercase tracking-wider">Modo Aplicativo Dedicado Ativo</span>
            </div>
            <span className="text-[8.5px] text-emerald-300 font-bold uppercase tracking-widest">Painel Direto</span>
          </div>
        )}

        {/* Tabs Principais */}
        <div className="flex bg-[#112240] p-1.5 rounded-2xl border border-[var(--border-subtle)] mb-6 shadow-inner relative z-10">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 font-black text-[10px] tracking-[0.2em] uppercase cursor-pointer ${activeTab === 'home' ? 'bg-[var(--brand)] text-black shadow-lg scale-[1.02]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
            <Home size={14} strokeWidth={2.5} />
            HOJE
          </button>
          <button 
            onClick={() => setActiveTab('agenda')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 font-black text-[10px] tracking-[0.2em] uppercase cursor-pointer ${activeTab === 'agenda' ? 'bg-[var(--brand)] text-black shadow-lg scale-[1.02]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
            <List size={14} strokeWidth={2.5} />
            PRÓXIMOS
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 font-black text-[10px] tracking-[0.2em] uppercase cursor-pointer ${activeTab === 'reports' ? 'bg-[var(--brand)] text-black shadow-lg scale-[1.02]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
            <FileText size={14} strokeWidth={2.5} />
            RELATÓRIOS
          </button>
        </div>

        {/* Navegação de Data com Rolagem Temporal Completa (Adiantar e Retardar) */}
        {activeTab === 'home' && (
          <div className="mb-6 space-y-3">
            {/* Cabeçalho do Bloco */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#112240] border border-[var(--brand)]/40 rounded-2xl flex items-center justify-center text-[var(--brand)] shadow-lg">
                  <CalendarIcon size={20} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-lg sm:text-xl font-bold uppercase text-[var(--text-main)] tracking-tight leading-tight">Compromissos do Dia</h3>
                  <span className="text-[11px] font-black uppercase tracking-wider text-[var(--brand)]">
                    {format(selectedDate, "dd/MM/yyyy")}
                  </span>
                </div>
              </div>

              {!isToday(selectedDate) && (
                <button
                  onClick={handleToday}
                  className="px-3 py-1.5 bg-[var(--brand)] text-black rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                  title="Voltar para Hoje"
                >
                  Hoje
                </button>
              )}
            </div>

            {/* Barra de Navegação Temporal Unificada (Anterior, Próximo, Pulos de Evento) */}
            <div className="bg-[#112240] border border-[#233559] rounded-2xl p-2 sm:p-2.5 flex items-center justify-between gap-1.5 shadow-lg">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <button
                  onClick={handlePrevEventDate}
                  className="p-2 sm:px-2.5 sm:py-2 bg-[#1A2B4C] hover:bg-[#233559] text-white/80 hover:text-white rounded-xl border border-white/5 transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 active:scale-95 cursor-pointer"
                  title="Pular para compromisso anterior"
                >
                  <ChevronLeft size={14} />
                  <span className="hidden sm:inline">Evento Ant.</span>
                  <span className="sm:hidden text-[9px]">Ant.</span>
                </button>
                <button
                  onClick={handlePrevDay}
                  className="p-2 sm:px-3 sm:py-2 bg-[#1A2B4C] hover:bg-[var(--brand)] hover:text-black text-white rounded-xl border border-white/10 flex items-center gap-1.5 transition-all text-xs font-black uppercase shadow-sm group active:scale-95 cursor-pointer"
                  title="Dia Anterior (Retardar)"
                >
                  <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                  <span className="hidden xs:inline sm:inline">Anterior</span>
                </button>
              </div>

              {/* Indicador Central da Data Selecionada */}
              <div 
                onClick={handleToday}
                className="flex flex-col items-center text-center cursor-pointer px-1.5 py-1 rounded-xl hover:bg-white/5 transition-all"
                title="Clique para voltar para Hoje"
              >
                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
                  <span className="text-[12px] sm:text-[14px] font-black text-white uppercase tracking-tight">
                    {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                  {isToday(selectedDate) && (
                    <span className="text-[8px] sm:text-[8.5px] bg-[var(--brand)] text-black font-black px-1.5 py-0.5 rounded uppercase">
                      Hoje
                    </span>
                  )}
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold text-white/60 uppercase tracking-wider mt-0.5">
                  {format(selectedDate, "EEEE, yyyy", { locale: ptBR })}
                </span>
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5">
                <button
                  onClick={handleNextDay}
                  className="p-2 sm:px-3 sm:py-2 bg-[#1A2B4C] hover:bg-[var(--brand)] hover:text-black text-white rounded-xl border border-white/10 flex items-center gap-1.5 transition-all text-xs font-black uppercase shadow-sm group active:scale-95 cursor-pointer"
                  title="Próximo Dia (Adiantar)"
                >
                  <span className="hidden xs:inline sm:inline">Próximo</span>
                  <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={handleNextEventDate}
                  className="p-2 sm:px-2.5 sm:py-2 bg-[#1A2B4C] hover:bg-[#233559] text-white/80 hover:text-white rounded-xl border border-white/5 transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 active:scale-95 cursor-pointer"
                  title="Pular para próximo compromisso"
                >
                  <span className="hidden sm:inline">Próx. Evento</span>
                  <span className="sm:hidden text-[9px]">Próx.</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de Cards */}
        <main className="space-y-4">
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map((app) => (
              <div 
                key={app.id} 
                onClick={() => app.hasReport && setSelectedReportApp(app)}
                className={`group rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all border-l-4 sm:border-l-6 border-l-[#FDD835] relative shadow-sm w-full overflow-hidden bg-[#FEF9C3] border border-yellow-300 ${app.hasReport ? 'cursor-pointer hover:shadow-md' : ''}`}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <h4 className="text-[14px] sm:text-[15px] font-bold text-black uppercase tracking-tight leading-tight">
                      · {app.time} - {app.title} ({app.duration} min)
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 px-2 py-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-black/50 uppercase tracking-wider">Status:</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${app.hasReport ? 'text-green-800 bg-green-600/20' : 'text-black/70 bg-black/5'}`}>
                        {app.hasReport ? 'CONCLUÍDO' : 'PENDENTE'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-black/50 uppercase tracking-wider">Categoria:</span>
                      <span className="text-[9px] font-bold text-black/90 uppercase">{app.category || 'Geral'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-black/50 uppercase tracking-wider">Local:</span>
                      <span className="text-[9px] font-bold text-black/90 uppercase">{app.location || 'Não Definido'}</span>
                    </div>

                    {app.description && (
                      <div className="flex items-start gap-2 sm:col-span-2">
                        <span className="text-[9px] font-semibold text-black/50 uppercase tracking-wider whitespace-nowrap">Pautas:</span>
                        <span className="text-[9px] font-semibold text-black/80 uppercase line-clamp-2">{app.description}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-1 pt-3 border-t border-black/10">
                    <div className="flex items-center gap-2">
                      {app.potentialConflict && (
                        <span className="text-[8px] text-red-600 font-semibold uppercase flex items-center gap-1">
                          <Info size={10} /> Conflito
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleShare(e, app)}
                        title="Compartilhar Compromisso / Memória Executiva"
                        className="px-3 py-1.5 bg-black/10 hover:bg-[#0A1931] hover:text-[var(--brand)] border border-black/20 rounded-lg text-black font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                      >
                        <Share2 size={13} />
                        <span className="text-[9px] font-black uppercase tracking-wider">
                          {copiedId === app.id ? 'Copiado!' : 'Compartilhar'}
                        </span>
                      </button>

                      {app.hasReport ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReportApp(app);
                          }}
                          title="Ver Memória da Reunião"
                          className="px-3 py-1.5 bg-[#0A1931] text-[var(--brand)] hover:bg-black hover:text-white border border-black/20 rounded-lg font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                        >
                          <FileText size={13} />
                          <span className="text-[9px] font-black uppercase tracking-wider">Ver Memória</span>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => handleShare(e, app)}
                          title="Detalhes"
                          className="p-1.5 bg-black/5 hover:bg-black/10 border border-black/10 rounded-lg text-black/60 transition-all cursor-pointer"
                        >
                          <LayoutGrid size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 bg-[#FEF9C3] rounded-[2.5rem] flex flex-col items-center justify-center border-dashed border-2 border-yellow-300 shadow-xl text-center px-6">
              <LayoutGrid size={40} className="mb-4 text-[#FDD835]/40" />
              <h3 className="text-sm font-bold text-black/40 uppercase tracking-[0.4em] mb-2">Nada Agendado</h3>
              <p className="text-[10px] text-black/30 uppercase tracking-widest leading-relaxed max-w-[200px]">Não há registros para exibição neste período.</p>
            </div>
          )}
        </main>

        {/* Modal de Instalação e Atalho do Espelhamento */}
        {isInstallModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-0 sm:pb-8 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsInstallModalOpen(false)}></div>
            <div className="w-full max-w-md bg-[#0A1931] border-2 border-[var(--brand)]/50 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-7 relative shadow-2xl z-10 text-white animate-in slide-in-from-bottom-10">
              <button
                onClick={() => setIsInstallModalOpen(false)}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[var(--brand)]/20 border border-[var(--brand)] flex items-center justify-center text-[var(--brand)]">
                  <Smartphone size={24} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black uppercase text-[var(--brand)] tracking-tight">
                    Instalar Painel no Celular
                  </h3>
                  <p className="text-[10px] uppercase tracking-wider text-white/60">
                    Acesso rápido exclusivo para a tela espelhada
                  </p>
                </div>
              </div>

              <p className="text-[11.5px] text-white/80 leading-relaxed mb-4">
                Ao adicionar este atalho à tela de início do seu aparelho, você terá um aplicativo independente que abre <strong>apenas o painel de espelhamento em tempo real</strong>, sem barras de navegador.
              </p>

              <div className="space-y-3.5 mb-5 text-[11px] text-blue-100 font-medium">
                <div className="bg-[#112240] p-3.5 rounded-2xl border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-[var(--brand)] font-bold text-[10px] uppercase tracking-wider">
                    <span>🍎 No iPhone (Safari):</span>
                  </div>
                  <div className="flex items-start gap-2 text-white/80">
                    <span className="w-5 h-5 rounded-full bg-[var(--brand)]/20 text-[var(--brand)] flex items-center justify-center font-bold flex-shrink-0 text-[10px]">1</span>
                    <span>Toque no botão <strong>Compartilhar</strong> (quadrado com seta para cima) na barra inferior do Safari.</span>
                  </div>
                  <div className="flex items-start gap-2 text-white/80">
                    <span className="w-5 h-5 rounded-full bg-[var(--brand)]/20 text-[var(--brand)] flex items-center justify-center font-bold flex-shrink-0 text-[10px]">2</span>
                    <span>Role a tela e toque em <strong>"Adicionar à Tela de Início"</strong> (+).</span>
                  </div>
                  <div className="flex items-start gap-2 text-white/80">
                    <span className="w-5 h-5 rounded-full bg-[var(--brand)]/20 text-[var(--brand)] flex items-center justify-center font-bold flex-shrink-0 text-[10px]">3</span>
                    <span>Toque em <strong>Adicionar</strong> no canto superior direito para fixar o atalho.</span>
                  </div>
                </div>

                <div className="bg-[#112240] p-3.5 rounded-2xl border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-[var(--brand)] font-bold text-[10px] uppercase tracking-wider">
                    <span>🤖 No Android (Chrome / Samsung):</span>
                  </div>
                  <div className="flex items-start gap-2 text-white/80">
                    <span className="w-5 h-5 rounded-full bg-[var(--brand)]/20 text-[var(--brand)] flex items-center justify-center font-bold flex-shrink-0 text-[10px]">1</span>
                    <span>Toque no menu de <strong>3 pontinhos (⋮)</strong> no canto superior direito do navegador.</span>
                  </div>
                  <div className="flex items-start gap-2 text-white/80">
                    <span className="w-5 h-5 rounded-full bg-[var(--brand)]/20 text-[var(--brand)] flex items-center justify-center font-bold flex-shrink-0 text-[10px]">2</span>
                    <span>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {deferredPrompt && (
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-3.5 bg-[var(--brand)] hover:brightness-110 text-black font-black uppercase text-xs tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <Download size={16} /> Instalar Diretamente Agora
                  </button>
                )}
                <button
                  onClick={copyDirectMirrorLink}
                  className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-black uppercase text-[10px] tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  {isCopiedLink ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
                  <span>{isCopiedLink ? 'Link Copiado com Sucesso!' : 'Copiar Link Direto do Espelhamento'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Memória da Reunião no Espelhamento */}
        {selectedReportApp && (
          <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-0 sm:p-4 pb-0 sm:pb-8 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setSelectedReportApp(null)}></div>
            <div className="w-full max-w-xl bg-[#0A1931] rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 max-h-[85vh] overflow-y-auto custom-scrollbar relative shadow-2xl border-2 border-[var(--brand)]/40 text-white z-10 flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <FileText size={20} className="text-[var(--brand)]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--brand)]">
                    Memória do Registro Executivo
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleShare(e, selectedReportApp)}
                    className="px-3 py-2 bg-[var(--brand)] text-black rounded-xl hover:scale-105 transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider shadow-lg active:scale-95 cursor-pointer"
                    title="Compartilhar"
                  >
                    <Share2 size={14} />
                    <span>{copiedId === selectedReportApp.id ? 'Copiado!' : 'Compartilhar'}</span>
                  </button>
                  <button
                    onClick={() => setSelectedReportApp(null)}
                    className="p-2 bg-white/10 rounded-xl text-white hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                    title="Fechar"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <h2 className="text-xl sm:text-2xl font-bold uppercase text-[var(--brand)] leading-tight mb-1">
                  {selectedReportApp.title}
                </h2>
                <p className="text-[11px] font-semibold uppercase text-white/60 tracking-wider">
                  📅 {selectedReportApp.date ? selectedReportApp.date.split('-').reverse().join('/') : ''} às {selectedReportApp.time}
                  {selectedReportApp.location ? ` | 📍 ${selectedReportApp.location}` : ''}
                </p>
              </div>

              <div id="mirror-report-content-word" className="bg-[#112240] p-5 sm:p-6 rounded-2xl border border-white/10 text-[13px] sm:text-[14px] text-slate-200 leading-relaxed space-y-3 markdown-body overflow-y-auto max-h-[50vh]">
                <Markdown>{selectedReportApp.markdownReport || 'Nenhum relatório disponível.'}</Markdown>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                     const htmlContent = document.getElementById('mirror-report-content-word')?.innerHTML || `<p>${(selectedReportApp.markdownReport || '').replace(/\n/g, '<br/>')}</p>`;
                     const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Memoria</title><style>body { font-family: Arial, sans-serif; }</style></head><body>`;
                     const footer = "</body></html>";
                     const sourceHTML = header + htmlContent + footer;
                     const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
                     const fileDownload = document.createElement("a");
                     document.body.appendChild(fileDownload);
                     fileDownload.href = source;
                     fileDownload.download = `Memoria_Executiva.doc`;
                     fileDownload.click();
                     document.body.removeChild(fileDownload);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider shadow-lg active:scale-95 cursor-pointer"
                >
                  <FileText size={14} /> Exportar Word
                </button>
              </div>
            </div>
          </div>
        )}

        <RarbCodingLogo />
      </div>
    </div>
  );
};

export default MirrorView;
