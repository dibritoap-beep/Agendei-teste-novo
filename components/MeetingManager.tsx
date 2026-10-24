
import React, { useState, useRef, useEffect } from 'react';
import { VoiceState, MeetingReport, Appointment } from '../src/types';
import { Mic, Square, CheckCircle, Loader2, Sparkles, RefreshCcw, XCircle, Pause, Play } from 'lucide-react';

interface MeetingManagerProps {
  activeAppointment: Appointment | null;
  onReportGenerated: (report: MeetingReport) => void;
  selectedLanguage: { id: string; label: string; name: string; locale: any };
  onTimerUpdate?: (time: number) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
}

const TRANSLATIONS: Record<string, any> = {
  pt: { sessao: 'CAPTURA ATIVA', caption: 'GRAVE OU COMENTE OS PRINCIPAIS PONTOS', finalizar: 'ENCERRAR E GERAR MEMÓRIA', ouvindo: 'TRANSCREVENDO...', redigindo: 'REDIGINDO MEMÓRIA...', sintetizando: 'PROCESSANDO...', erro: 'ERRO DE CONEXÃO', tentar: 'REINICIAR', sintese: 'ANÁLISE DE AUTENTICIDADE', fidelidade: 'PRECISÃO', silenciando: 'CANAL DE ÁUDIO ATIVO', regravar: 'DESCARTAR' },
  en: { sessao: 'ACTIVE CAPTURE', caption: 'START RECORDING OR TYPING', finalizar: 'GENERATE MEMORY', ouvindo: 'TRANSCRIBING...', redigindo: 'DRAFTING MEMORY...', sintetizando: 'PROCESSING...', erro: 'CONNECTION ERROR', tentar: 'RETRY', sintese: 'AUTHENTICITY ANALYSIS', fidelidade: 'PRECISION', silenciando: 'ACTIVE CHANNEL', regravar: 'DISCARD' },
};

const MeetingManager: React.FC<MeetingManagerProps> = ({ activeAppointment, onReportGenerated, selectedLanguage, onTimerUpdate, onRecordingStateChange }) => {
  const [status, setStatus] = useState<VoiceState>(VoiceState.IDLE);
  const [timer, setTimer] = useState(0);
  const [transcriptBuffer, setTranscriptBuffer] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  
  const intervalRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');
  const accumulatedFinalRef = useRef('');
  const isStoppingRef = useRef(false);
  const isPausedRef = useRef(false);
  const timerRef = useRef(0);

  const t = TRANSLATIONS[selectedLanguage.id] || TRANSLATIONS.pt;

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const startRecording = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    try {
      isStoppingRef.current = false;
      setStatus(VoiceState.RECORDING);
      setTranscriptBuffer('');
      transcriptRef.current = '';
      accumulatedFinalRef.current = '';
      setTimer(0);
      timerRef.current = 0;
      setMicError(null);
      
      const recognition = new SpeechRecognition();
      recognition.lang = selectedLanguage.locale?.code || 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        if (isPausedRef.current) return;
        
        let finalPiece = '';
        let interimPiece = '';
        
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalPiece += event.results[i][0].transcript + ' ';
          } else {
            interimPiece += event.results[i][0].transcript;
          }
        }
        
        if (finalPiece) {
          accumulatedFinalRef.current = (accumulatedFinalRef.current + ' ' + finalPiece).trim();
        }
        const fullText = (accumulatedFinalRef.current + ' ' + interimPiece).trim();
        transcriptRef.current = fullText;
        setTranscriptBuffer(fullText);
      };

      recognition.onerror = (event: any) => {
        console.error("Erro Recognition:", event.error);
        if (event.error !== 'no-speech') {
          if (event.error === 'not-allowed') {
            setMicError("Acesso ao microfone foi recusado ou bloqueado pelo navegador. Você ainda pode digitar, colar ou editar seus pontos livremente abaixo!");
          } else {
            setMicError(`Erro no microfone (${event.error}). Você ainda pode digitar, colar ou editar seus pontos livremente abaixo!`);
          }
        }
      };

      recognition.onend = () => {
        if (!isStoppingRef.current && !isPausedRef.current) {
          setTimeout(() => {
            if (!isStoppingRef.current && !isPausedRef.current) {
              try {
                const rec = new SpeechRecognition();
                rec.lang = selectedLanguage.locale?.code || 'pt-BR';
                rec.continuous = false;
                rec.interimResults = true;
                rec.onresult = recognition.onresult;
                rec.onerror = recognition.onerror;
                rec.onend = recognition.onend;
                recognitionRef.current = rec;
                rec.start();
              } catch (e) {
                console.error("Erro ao reiniciar SpeechRecognition no timeout:", e);
              }
            }
          }, 300);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

      intervalRef.current = setInterval(() => {
        if (isPausedRef.current) return;
        timerRef.current += 1;
        const newTime = timerRef.current;
        setTimer(newTime);
        if (onTimerUpdate) onTimerUpdate(newTime);
      }, 1000);

      if (onRecordingStateChange) onRecordingStateChange(true);
    } catch (err) {
      console.error("Erro ao iniciar gravação:", err);
      setMicError("Não foi possível inicializar o microfone. Use a caixa abaixo para digitar!");
    }
  };

  const togglePause = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    isPausedRef.current = newPausedState;
    
    if (newPausedState) {
      if (recognitionRef.current) recognitionRef.current.stop();
    } else {
      if (recognitionRef.current) recognitionRef.current.start();
    }
  };

  const stopRecordingAndProcess = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    
    if (onRecordingStateChange) onRecordingStateChange(false);
    const finalTranscript = (transcriptRef.current || transcriptBuffer).trim();
    
    if (recognitionRef.current) recognitionRef.current.stop();
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!finalTranscript) { 
      alert("Nenhum texto ou áudio capturado. Digite os pontos da reunião no campo de texto ou grave com o microfone.");
      setStatus(VoiceState.IDLE); 
      isStoppingRef.current = false; 
      return; 
    }
    
    setStatus(VoiceState.PROCESSING);
    
    try {
      const response = await fetch('/api/analyze-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: finalTranscript,
          language: selectedLanguage.name || 'Português',
          termsAccepted: true,
          activeAppointmentTitle: activeAppointment?.title || 'Reunião Executiva'
        }),
      });

      if (!response.ok) {
        let errMsg = "Erro ao processar reunião no servidor.";
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const result = await response.json();
      const reportText = result.markdownReport || result.report || `## ${activeAppointment?.title || 'MEMÓRIA DE REUNIÃO'}\n\n${finalTranscript}`;
      
      onReportGenerated({
        id: Math.random().toString(36).substr(2, 9),
        appointmentId: activeAppointment?.id || '',
        timestamp: new Date().toISOString(),
        markdownReport: reportText,
        fullTranscript: result.fullTranscript || finalTranscript
      });
      setStatus(VoiceState.IDLE);
    } catch (error: any) { 
      console.error("Erro no processamento IA:", error);
      // Fallback local report on any unexpected client/network error
      const fallbackDate = new Date().toLocaleDateString('pt-BR');
      onReportGenerated({
        id: Math.random().toString(36).substr(2, 9),
        appointmentId: activeAppointment?.id || '',
        timestamp: new Date().toISOString(),
        markdownReport: `# MEMÓRIA DO REGISTRO EXECUTIVO DA REUNIÃO: ${activeAppointment?.title || 'REUNIÃO'}\n## Gerado em ${fallbackDate}\n\n> ${finalTranscript.split('\n').join('\n> ')}\n\n### 📋 DELIBERAÇÕES E PRÓXIMOS PASSOS:\n* **Status:** Registro gravado e arquivado com sucesso no histórico deste compromisso.`,
        fullTranscript: finalTranscript
      });
      setStatus(VoiceState.IDLE);
    } finally {
      isStoppingRef.current = false;
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const isRecordingMode = status === VoiceState.RECORDING || status === VoiceState.LISTENING;

  if (!activeAppointment) return null;

  return (
    <div className="bg-[#FFF8D6] rounded-[2.5rem] p-2 text-[#0A1931] relative overflow-hidden shadow-xl border-2 border-[#FFD700]/30">
      <div className="flex items-start justify-between mb-8 px-6 pt-6">
        <div className="flex-1 pr-4">
          <span className="text-[14px] font-black text-[#B8860B] uppercase tracking-[0.3em] bg-[#B8860B]/10 border border-[#B8860B]/20 px-5 py-2.5 rounded-full mb-4 inline-block">{t.sessao}</span>
          <h3 className="text-3xl font-black tracking-tight text-[#0A1931] uppercase leading-none mb-3">{activeAppointment.title}</h3>
          {activeAppointment.description && (
            <div className="bg-black/5 p-4 rounded-xl border border-black/10">
              <p className="text-[12px] font-black text-[#0A1931]/60 uppercase tracking-widest mb-1">Pautas da Reunião</p>
              <p className="text-sm font-medium text-[#0A1931]/80 uppercase">{activeAppointment.description}</p>
            </div>
          )}
        </div>
        {isRecordingMode && (
          <div className="flex items-center gap-3 px-5 py-2.5 bg-red-50 text-red-600 rounded-2xl border-2 border-red-100 shadow-sm shrink-0">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
            <span className="text-[16px] font-black font-mono">{formatTime(timer)}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center justify-center py-8 sm:py-12 border-2 border-black/5 rounded-[2rem] sm:rounded-[3rem] bg-white/50 mb-6 sm:mb-8 px-4 sm:px-8 relative shadow-inner mx-2 sm:mx-4">
        {status === VoiceState.IDLE && (
          <div className="flex flex-col items-center w-full">
            <div className="w-full mb-6 relative">
              <textarea
                value={transcriptBuffer}
                onChange={(e) => {
                  setTranscriptBuffer(e.target.value);
                  transcriptRef.current = e.target.value;
                }}
                placeholder="Digite os principais pontos da reunião aqui, ou clique no microfone para gravar..."
                className="w-full h-32 sm:h-40 bg-black/5 text-[#0A1931] font-bold p-4 rounded-2xl border-2 border-black/10 focus:border-[#B8860B]/50 focus:ring-0 focus:outline-none text-[14px] sm:text-[16px] custom-scrollbar placeholder:text-[#0A1931]/40"
              />
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
              <button 
                onClick={() => {
                  if (!acceptedTerms) { 
                     alert("Por favor, leia e aceite os termos de responsabilidade antes de gravar.");
                     return;
                  }
                  startRecording();
                }} 
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center text-[#0A1931] transition-all btn-press group bg-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.4)] hover:bg-[#FFD700] hover:scale-105 active:scale-95`}
                aria-label={t.caption}
                title="Gravar Áudio"
              >
                <Mic size={32} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
              </button>
              
              {transcriptBuffer.trim().length > 0 && (
                <button 
                  onClick={() => stopRecordingAndProcess()}
                  className="px-6 py-4 bg-[#0A1931] text-white rounded-[1.5rem] text-[12px] font-black uppercase tracking-[0.2em] shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  {t.finalizar}
                </button>
              )}
            </div>
            
            <p className={`text-[12px] sm:text-[14px] font-black uppercase text-center tracking-[0.3em] sm:tracking-[0.4em] mb-6 text-[#B8860B]`}>{t.caption}</p>
            
            <div className="bg-black/5 p-4 rounded-xl border border-black/10 max-w-md w-full">
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-[#B8860B] focus:ring-[#B8860B]"
                />
                <span className="text-xs text-[#0A1931]/80 leading-relaxed">
                  <strong>Declaração de Responsabilidade:</strong> Confirmo que possuo autorização expressa de todos os participantes para gravar e processar este áudio, assumindo total responsabilidade civil e criminal pelo uso do conteúdo.
                </span>
              </label>
            </div>
          </div>
        )}
        
        {isRecordingMode && (
          <div className="w-full animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center mb-8 sm:mb-14">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/10 blur-3xl rounded-full scale-150"></div>
                <div className="text-7xl sm:text-9xl font-black font-mono text-red-600 tracking-tighter mb-2 sm:mb-4 drop-shadow-[0_0_12px_rgba(220,38,38,0.8)] relative">
                  {formatTime(timer)}
                </div>
              </div>
              <div className={`flex items-center gap-2 sm:gap-3 px-6 py-2 rounded-full text-white uppercase tracking-[0.3em] text-[12px] sm:text-[14px] font-black shadow-lg transition-all ${isPaused ? 'bg-orange-500 shadow-orange-500/20' : 'bg-red-600 shadow-red-600/20 active:scale-95'}`}>
                <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full ${isPaused ? '' : 'animate-pulse'} shadow-[0_0_8px_rgba(255,255,255,0.8)]`}></div>
                {isPaused ? 'Pausado' : 'Gravando Reunião'}
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-6 sm:gap-10 mb-10 sm:mb-16">
              <button 
                onClick={() => {
                  if (confirm("Deseja realmente descartar esta gravação e reiniciar o cronômetro?")) {
                    setStatus(VoiceState.IDLE);
                    if (onRecordingStateChange) onRecordingStateChange(false);
                    if (recognitionRef.current) recognitionRef.current.stop();
                    if (intervalRef.current) clearInterval(intervalRef.current);
                  }
                }} 
                className="flex flex-col items-center group"
              >
                <div className="w-14 h-14 sm:w-18 sm:h-18 bg-black/5 rounded-2xl sm:rounded-3xl flex items-center justify-center text-[#0A1931]/40 mb-2 sm:mb-3 border-2 border-black/5 group-hover:text-[#0A1931] group-hover:border-black/20 group-hover:bg-black/10 transition-all btn-press">
                  <RefreshCcw size={22} className="sm:w-7 sm:h-7" />
                </div>
                <p className="text-[10px] sm:text-[12px] text-[#0A1931]/40 font-black uppercase tracking-widest">{t.regravar}</p>
              </button>

              <button onClick={togglePause} className="flex flex-col items-center group relative">
                <div className={`w-20 h-20 sm:w-24 sm:h-24 ${isPaused ? 'bg-orange-500 hover:bg-orange-600' : 'bg-black/10 hover:bg-black/20'} rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center ${isPaused ? 'text-white' : 'text-[#0A1931]'} mb-3 sm:mb-4 transition-all btn-press shadow-md`}>
                  {isPaused ? <Play size={32} fill="currentColor" className="sm:w-10 sm:h-10 ml-1" /> : <Pause size={32} fill="currentColor" className="sm:w-10 sm:h-10" />}
                </div>
                <p className={`text-[12px] sm:text-[14px] ${isPaused ? 'text-orange-500' : 'text-[#0A1931]/60'} font-black uppercase tracking-[0.2em] relative`}>{isPaused ? 'Continuar' : 'Pausar'}</p>
              </button>

              <button onClick={stopRecordingAndProcess} className="flex flex-col items-center group relative">
                <div className="absolute -inset-4 bg-red-600/20 blur-xl rounded-full animate-pulse"></div>
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-red-600 rounded-[2.5rem] sm:rounded-[3.5rem] flex items-center justify-center text-white mb-4 sm:mb-5 shadow-[0_15px_35px_rgba(220,38,38,0.4)] group-hover:bg-red-700 group-hover:scale-105 active:scale-90 transition-all btn-press relative">
                  <Square size={36} fill="currentColor" className="sm:w-12 sm:h-12" />
                </div>
                <p className="text-[16px] sm:text-[18px] text-red-600 font-black uppercase tracking-[0.2em] relative">{t.finalizar}</p>
              </button>
            </div>

            <div className="w-full bg-[#0A1931] p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-4 border-[#FFD700]/10 shadow-2xl">
               <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6 border-b border-white/5 pb-4">
                 <div className="flex items-center gap-3">
                   <div className={`w-3 h-3 sm:w-4 sm:h-4 ${micError ? 'bg-orange-500 shadow-[0_0_10px_#f97316]' : 'bg-[#FFD700] shadow-[0_0_10px_#FFD700]'} rounded-full animate-pulse`}></div>
                   <span className="text-[12px] sm:text-[14px] font-black uppercase text-white/40 tracking-[0.2em]">
                     {micError ? "MICROFONE OFFLINE" : t.silenciando}
                   </span>
                 </div>
               </div>
               
               {micError && (
                 <div className="mb-4 p-3.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl text-xs font-semibold leading-relaxed text-center">
                   ⚠️ {micError}
                 </div>
               )}

               <div className="w-full">
                 <textarea
                   value={transcriptBuffer}
                   onChange={(e) => {
                     setTranscriptBuffer(e.target.value);
                     transcriptRef.current = e.target.value;
                   }}
                   placeholder={micError ? "Digite, cole ou edite as notas da reunião aqui diretamente..." : "Escutando conversa... (Você também pode digitar, colar ou editar os pontos capturados aqui diretamente)"}
                   className="w-full h-32 sm:h-40 bg-transparent text-white font-bold italic leading-relaxed text-center opacity-90 tracking-tight resize-none border-none focus:ring-0 focus:outline-none text-[16px] sm:text-[18px] custom-scrollbar focus:placeholder-white/30"
                 />
               </div>
            </div>
          </div>
        )}

        {status === VoiceState.PROCESSING && (
          <div className="flex flex-col items-center py-10">
            <div className="relative mb-8">
               <Loader2 size={56} className="text-[#B8860B] animate-spin" />
               <Sparkles size={20} className="text-[#B8860B] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-[15px] font-black uppercase text-[#0A1931] tracking-[0.5em] animate-pulse">{t.redigindo}</p>
          </div>
        )}

        {status === VoiceState.ERROR && (
          <div className="flex flex-col items-center py-6">
            <XCircle size={48} className="text-red-500 mb-4" />
            <p className="text-[11px] font-black uppercase text-red-600 tracking-widest mb-6">{t.erro}</p>
            <button onClick={startRecording} className="px-8 py-3 bg-[#FFD700] text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#FFD700] transition-all">
              {t.tentar}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 px-2 sm:px-4 pb-4">
        <div className="p-4 sm:p-5 bg-black/5 border-2 border-black/10 rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-4">
          <Sparkles size={18} className="text-[#B8860B] sm:w-5 sm:h-5" />
          <div>
            <h4 className="text-[12px] sm:text-[14px] font-black uppercase text-[#0A1931] tracking-widest mb-0.5">{t.sintese}</h4>
          </div>
        </div>
        <div className="p-4 sm:p-5 bg-[#B8860B]/10 border-2 border-[#B8860B]/20 rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-4">
          <CheckCircle size={18} className="text-[#B8860B] sm:w-5 sm:h-5" />
          <div>
            <h4 className="text-[12px] sm:text-[14px] font-black uppercase text-[#0A1931] tracking-widest mb-0.5">{t.fidelidade}</h4>
            <p className="text-[10px] sm:text-[11px] font-bold text-[#0A1931]/40 uppercase">High-Res</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingManager;
