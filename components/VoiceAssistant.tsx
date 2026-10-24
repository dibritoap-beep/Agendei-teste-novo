
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { VoiceState, Appointment } from '../src/types';
import { Mic, MicOff, Loader2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface VoiceAssistantProps {
  onAddAppointment: (app: Omit<Appointment, 'id'>) => void;
  onFillForm?: (app: Partial<Omit<Appointment, 'id'>>) => void;
  appointments: Appointment[];
  currentSelectedDate: Date;
  selectedLanguage: { id: string; label: string; name: string; locale: any };
  isInsideModal?: boolean;
  isDesktopStandalone?: boolean;
}

const localParseText = (text: string, defaultDate: Date) => {
  // Tentar encontrar horário
  let timeStr = '09:00';
  const timeRegex = /(?:às|as|à|a)\s*(\d{1,2})(?:h|:(\d{2})|(?:\s*horas?))/i;
  const timeMatch = text.match(timeRegex);
  if (timeMatch) {
    const hours = timeMatch[1].padStart(2, '0');
    const minutes = (timeMatch[2] || '00').padStart(2, '0');
    timeStr = `${hours}:${minutes}`;
  } else {
    // Tentar correspondência simples de tempo como "14:30" ou "14h"
    const simpleTimeMatch = text.match(/(\d{1,2})h(\d{2})?|(\d{1,2}):(\d{2})/i);
    if (simpleTimeMatch) {
      if (simpleTimeMatch[1]) {
        const hours = simpleTimeMatch[1].padStart(2, '0');
        const minutes = (simpleTimeMatch[2] || '00').padStart(2, '0');
        timeStr = `${hours}:${minutes}`;
      } else if (simpleTimeMatch[3]) {
        const hours = simpleTimeMatch[3].padStart(2, '0');
        const minutes = (simpleTimeMatch[4] || '00').padStart(2, '0');
        timeStr = `${hours}:${minutes}`;
      }
    }
  }

  // Tentar encontrar local
  let locationStr = '';
  const locRegex = /(?:no|na|em|local|sala)\s+([^,.\n]+?)(?=\s+(?:às|as|sobre|pauta|assunto|para|de|com)\b|$)/i;
  const locMatch = text.match(locRegex);
  if (locMatch) {
    locationStr = locMatch[1].trim();
  }

  // Tentar encontrar pauta/descrição
  let descriptionStr = '';
  const descRegex = /(?:sobre|assunto|pauta|para)\s+([^,.\n]+)/i;
  const descMatch = text.match(descRegex);
  if (descMatch) {
    descriptionStr = descMatch[1].trim();
  }

  // Encontrar título (parte da string antes de quaisquer palavras-chave)
  let titleStr = text;
  const keywords = [/\s+(?:às|as|à|a)\s+\d+/i, /\s+(?:no|na|em|local|sala)\s+/i, /\s+(?:sobre|assunto|pauta|para)\s+/i];
  for (const kw of keywords) {
    const matchIndex = titleStr.search(kw);
    if (matchIndex !== -1) {
      titleStr = titleStr.substring(0, matchIndex);
    }
  }
  titleStr = titleStr.trim();
  if (!titleStr) {
    titleStr = 'Novo Compromisso';
  }

  return {
    title: titleStr,
    date: format(defaultDate, 'yyyy-MM-dd'),
    time: timeStr,
    duration: 30,
    description: descriptionStr,
    location: locationStr,
    category: 'Geral',
    reminders: [10, 30, 60, 120, 1440],
    callAlert: true
  };
};

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onAddAppointment, onFillForm, currentSelectedDate, selectedLanguage, isInsideModal, isDesktopStandalone }) => {
  const [voiceState, setVoiceState] = useState<VoiceState>(VoiceState.IDLE);
  const [transcription, setTranscription] = useState<string>('');
  const [lastActionStatus, setLastActionStatus] = useState<'success' | 'error' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const accumulatedTranscriptRef = useRef<string>('');

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  const stopAssistant = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    setVoiceState(VoiceState.IDLE);
    setIsProcessing(false);
  }, []);

  const processCommand = async (text: string) => {
    setIsProcessing(true);
    setVoiceState(VoiceState.PROCESSING);
    
    if (!navigator.onLine) {
      console.log("Offline. Usando fallback de inteligência local.");
      const parsed = localParseText(text, currentSelectedDate);
      if (onFillForm) {
        onFillForm(parsed);
        setTranscription("Offline. Preenchido via inteligência local!");
        setLastActionStatus('success');
        setTimeout(() => {
          setLastActionStatus(null);
          setVoiceState(VoiceState.IDLE);
          stopAssistant();
        }, 2500);
      } else {
        onAddAppointment(parsed);
        setTranscription("Offline. Agendado via inteligência local!");
        setLastActionStatus('success');
        setTimeout(() => {
          setLastActionStatus(null);
          setVoiceState(VoiceState.IDLE);
          stopAssistant();
        }, 2500);
      }
      return;
    }

    try {
      const response = await fetch('/api/voice-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text, 
          history,
          selectedDate: currentSelectedDate ? currentSelectedDate.toISOString() : undefined
        })
      });

      if (!response.ok) throw new Error("Erro ao processar comando de voz");

      const data = await response.json();
      
      if (data.fallback) {
        throw new Error("Local fallback triggered by server");
      }

      // Update local history
      setHistory(prev => [
        ...prev, 
        { role: 'user', parts: [{ text }] },
        { role: 'model', parts: [{ text: data.text || "Comando recebido." }] }
      ]);

      // Handle tool calls (scheduling)
      if (data.toolCalls && data.toolCalls.length > 0) {
        for (const call of data.toolCalls) {
          if (call.name === 'create_appointment') {
            const args = call.args;
            
            let startDate = new Date();
            if (args.data_inicio) {
              // Fix for LLMs generating DD/MM/YYYY
              if (args.data_inicio.match(/^\d{2}\/\d{2}\/\d{4}/)) {
                const parts = args.data_inicio.split(/[\/\sT:]+/);
                if (parts.length >= 3) {
                  const d = parseInt(parts[0], 10);
                  const m = parseInt(parts[1], 10) - 1;
                  const y = parseInt(parts[2], 10);
                  const h = parts.length > 3 ? parseInt(parts[3], 10) : 9;
                  const min = parts.length > 4 ? parseInt(parts[4], 10) : 0;
                  startDate = new Date(y, m, d, h, min);
                }
              } else if (args.data_inicio.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // If only YYYY-MM-DD is provided without time, append T12:00:00 to avoid timezone shift
                startDate = new Date(args.data_inicio + 'T12:00:00');
              } else {
                startDate = new Date(args.data_inicio);
              }
            }
            if (isNaN(startDate.getTime())) startDate = new Date();
            
            const dateStr = format(startDate, 'yyyy-MM-dd');
            const timeStr = format(startDate, 'HH:mm');

            if (onFillForm) {
              onFillForm({
                title: args.titulo || '',
                date: dateStr,
                time: timeStr,
                duration: args.duration || 30,
                description: args.descricao || '',
                location: args.local || '',
                category: args.categoria || 'Geral',
                potentialConflict: false,
                callAlert: args.me_ligar_antes !== undefined ? args.me_ligar_antes : true
              });
            } else {
              onAddAppointment({
                title: args.titulo || 'Novo Compromisso',
                date: dateStr,
                time: timeStr,
                duration: 60,
                description: args.descricao || '',
                location: args.local || 'Não informado',
                category: args.categoria || 'Geral',
                potentialConflict: false,
                reminders: [10, 30, 60, 120, 1440],
                callAlert: args.me_ligar_antes !== undefined ? args.me_ligar_antes : true
              });
            }
            
            setLastActionStatus('success');
            setTimeout(() => {
              setLastActionStatus(null);
              stopAssistant();
            }, 2500);
          }
        }
      } else {
        // If no tool call, check if user said scheduling words and we can fallback, otherwise just conversational
        const schedulingKeywords = ['agendar', 'marcar', 'reunião', 'compromisso', 'consulta', 'encontro', 'almoço', 'jantar', 'aula'];
        const isSchedulingIntent = schedulingKeywords.some(kw => text.toLowerCase().includes(kw));
        
        if (isSchedulingIntent) {
          console.log("Intenção de agendamento detectada no texto, mas sem toolCalls. Usando fallback local.");
          const parsed = localParseText(text, currentSelectedDate);
          if (onFillForm) {
            onFillForm(parsed);
            setTranscription("Preenchido via assistente local!");
          } else {
            onAddAppointment(parsed);
            setTranscription("Agendado via assistente local!");
          }
          setLastActionStatus('success');
          setTimeout(() => {
            setLastActionStatus(null);
            stopAssistant();
          }, 2500);
        } else {
          setTranscription(data.text);
          setIsProcessing(false);
          setVoiceState(VoiceState.IDLE);
        }
      }

    } catch (error) {
      console.warn("Erro no Assistente (usando fallback de inteligência local):", error);
      
      // Fallback local robusto para não deixar o usuário sem resposta
      const parsed = localParseText(text, currentSelectedDate);
      
      if (onFillForm) {
        onFillForm(parsed);
        setTranscription("Preenchido via inteligência local!");
        setLastActionStatus('success');
        setTimeout(() => {
          setLastActionStatus(null);
          setVoiceState(VoiceState.IDLE);
          stopAssistant();
        }, 2000);
      } else {
        onAddAppointment(parsed);
        setTranscription("Agendado via inteligência local!");
        setLastActionStatus('success');
        setTimeout(() => {
          setLastActionStatus(null);
          setVoiceState(VoiceState.IDLE);
          stopAssistant();
        }, 2000);
      }
    }
  };

  const startAssistant = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    accumulatedTranscriptRef.current = '';

    setLastActionStatus(null);
    setVoiceState(VoiceState.LISTENING);
    setTranscription('');

    const recognition = new SpeechRecognition();
    recognition.lang = selectedLanguage.locale?.code || 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;

    let accumulatedFinal = '';

    recognition.onresult = (event: any) => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      let interimPiece = '';
      let finalPiece = '';

      for (let i = 0; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalPiece += transcript + ' ';
        } else {
          interimPiece += transcript;
        }
      }

      if (finalPiece) {
        accumulatedFinal = (accumulatedFinal + ' ' + finalPiece).trim();
      }
      const fullText = (accumulatedFinal + ' ' + interimPiece).trim();
      accumulatedTranscriptRef.current = accumulatedFinal;
      setTranscription(fullText);

      silenceTimerRef.current = setTimeout(() => {
        if (fullText) {
          recognition.stop();
          processCommand(fullText);
        }
      }, 2500); // 2.5 seconds of silence
    };

    recognition.onerror = (event: any) => {
      console.error("Erro Recognition:", event.error);
      setVoiceState(VoiceState.ERROR);
    };

    recognition.onend = () => {
      if (voiceState === VoiceState.LISTENING && !isProcessing) {
        setVoiceState(VoiceState.IDLE);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className={`${isInsideModal ? 'relative mt-4 mb-8' : isDesktopStandalone ? 'relative mx-auto mt-4 mb-2 z-[40]' : 'fixed bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-[400]'} flex flex-col items-center gap-3 sm:gap-5 w-full max-w-xs px-4 sm:px-6`}>
      
      {lastActionStatus === 'success' && (
        <div className="px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-[#0F52BA] text-[var(--text-main)] shadow-2xl flex items-center gap-2 sm:gap-3 animate-in slide-in-from-bottom-3">
          <CheckCircle2 size={16} className="sm:w-[18px] sm:h-[18px]" />
          <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide">
            {onFillForm ? 'Preenchido com Sucesso!' : 'Agendado com Sucesso!'}
          </span>
        </div>
      )}

      {voiceState !== VoiceState.IDLE && (
        <div className="glass-panel p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] w-full animate-in zoom-in duration-300 shadow-2xl border-2 border-[#FFD700]">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full animate-pulse ${voiceState === VoiceState.PROCESSING ? 'bg-blue-400' : 'bg-[#D4AF37]'}`}></div>
            <span className="text-[8px] sm:text-[9px] font-semibold text-[var(--text-main)] uppercase tracking-wide sm:tracking-[0.3em]">
              {voiceState === VoiceState.PROCESSING ? 'IA Processando...' : 'IA Ouvindo...'}
            </span>
          </div>
          <p className="text-[var(--text-main)] text-[11px] sm:text-[12px] font-semibold italic opacity-80 leading-snug line-clamp-2">
            {isProcessing ? "Finalizando agendamento..." : (transcription || "Pode falar, estou ouvindo...")}
          </p>
        </div>
      )}

      <button 
        onClick={voiceState === VoiceState.IDLE ? startAssistant : stopAssistant} 
        disabled={isProcessing}
        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[1.8rem] sm:rounded-[2.2rem] flex items-center justify-center transition-all duration-500 shadow-2xl border-4 border-[#FFD700] btn-press voice-pulse
        ${voiceState === VoiceState.IDLE ? 'bg-[#FFD700] text-black' : (isProcessing ? 'bg-blue-600 text-[var(--text-main)]' : 'bg-red-500 text-[var(--text-main)]')} ${isProcessing ? 'animate-pulse' : ''}`}>
        {voiceState === VoiceState.CONNECTING || isProcessing ? <Loader2 size={28} className="animate-spin sm:w-8 sm:h-8" /> : 
         voiceState === VoiceState.IDLE ? <Mic size={28} strokeWidth={2.5} className="sm:w-8 sm:h-8" /> : <MicOff size={28} strokeWidth={2.5} className="sm:w-8 sm:h-8" />}
      </button>
    </div>
  );
};

export default VoiceAssistant;
