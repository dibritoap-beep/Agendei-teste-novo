import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Appointment, MeetingReport } from './src/types';
import CalendarView from './components/CalendarView';
import VoiceAssistant from './components/VoiceAssistant';
import MeetingManager from './components/MeetingManager';
import AdBanner from './components/AdBanner';
import { format, addDays, subDays, isToday, isSameDay } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import Markdown from 'react-markdown';
import { db } from './src/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc, serverTimestamp, onSnapshot, query, where } from 'firebase/firestore';
import { 
  Globe, NotebookPen, Sparkles, Clock, X, Plus, ChevronRight, ChevronLeft, Target, Check, Edit2, Trash2, LayoutGrid, Share2, Download, Bell, Home, Calendar as CalendarIcon, Settings, PhoneCall, Monitor, Info, RefreshCw, Flag, Palette
} from 'lucide-react';
import { getHolidayForDate, syncHolidaysWithAppointments } from './src/utils/holidays';
import { 
  registerPushNotifications, 
  scheduleServerPushReminder, 
  sendTestPushNotification, 
  requestNotificationPermission 
} from './src/utils/pushNotifications';
import { ThemeId, getSavedTheme, applyTheme } from './src/utils/theme';
import { ThemeSelector } from './src/components/ThemeSelector';

const LANGUAGES = [
  { id: 'pt', label: 'BR', flag: '🇧🇷', name: 'Portugues', locale: ptBR },
  { id: 'en', label: 'EN', flag: '🇺🇸', name: 'English', locale: enUS },
];

const RarbCodingLogo = () => (
  <div className="flex flex-col items-center opacity-50 hover:opacity-100 transition-opacity pb-8 mt-12 mb-4">
    <div className="flex items-center space-x-3 group transform scale-75 origin-top">
      <svg className="w-12 h-12 transition-transform duration-300 group-hover:scale-105" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 12 L10 88 L52 88 C72 88 84 74 84 50 C84 26 72 12 52 12 Z" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinejoin="round" />
        <path d="M17 42 C12 42 12 49 8 50 C12 51 12 58 17 58" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
        <path d="M30 64 L30 36 L54 36 C64 36 68 42 68 49 C68 56 61 60 52 60 L30 60" fill="none" stroke="#00F2FE" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M48 58 L72 90 L108 34" fill="none" stroke="#00F2FE" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <polygon points="108,24 94,40 116,44" fill="#FFFFFF" />
      </svg>
      <div className="flex flex-col text-left">
        <span className="text-[9px] text-white/80 uppercase tracking-[0.3em] mb-0.5">Desenvolvido por</span>
        <span className="text-xl font-extrabold tracking-wider font-mono text-white leading-none">
          Rar<span className="text-[#00F2FE]">b</span><span className="relative inline-block border-b-2 border-[#00F2FE] pb-0.5">_CODING</span>
        </span>
        <span className="text-[8px] tracking-[0.25em] uppercase text-gray-400 font-mono font-bold mt-1">Software Development</span>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const saved = localStorage.getItem('agendavoz_appointments');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const loaded = parsed.map((app: Appointment) => ({
            ...app,
            reminders: app.reminders || [1440, 60]
          }));
          return syncHolidaysWithAppointments(loaded);
        }
      }
    } catch (e) {
      console.error('Error parsing appointments from localStorage:', e);
    }
    return syncHolidaysWithAppointments([]);
  });

  const [activeReminder, setActiveReminder] = useState<{title: string, timeStr: string} | null>(null);

  const [reports, setReports] = useState<MeetingReport[]>(() => {
    try {
        const saved = localStorage.getItem('agendavoz_reports');
        if (saved) {
             const parsed = JSON.parse(saved);
             if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {
        console.error('Error parsing reports from localStorage', e);
    }
    return [];
  });

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedReport, setSelectedReport] = useState<MeetingReport | null>(null);
  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [manualForm, setManualForm] = useState<{title: string, date: string, time: string, duration: number, description: string, reminders: number[], callAlert: boolean, location: string, category: string}>({ title: '', date: format(selectedDate, 'yyyy-MM-dd'), time: '09:00', duration: 30, description: '', reminders: [1440, 60], callAlert: false, location: '', category: 'Geral' });
  const [deleteConfirmation, setDeleteConfirmation] = useState<{type: 'appointment' | 'report' | 'all_data' | 'mirror', id: string} | null>(null);
  const [isPro, setIsPro] = useState(false); // Simulando estado de usuário free/pro
  const [recordingTimer, setRecordingTimer] = useState<{id: string, time: number, isRecording: boolean} | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [mirrorId, setMirrorId] = useState<string | null>(() => {
    return localStorage.getItem('agendavoz_mirror_id');
  });
  const [isMirrorModalOpen, setIsMirrorModalOpen] = useState(false);

  // Auto-sync appointments to Firestore if mirroring is active
  useEffect(() => {
    if (!mirrorId) return;
    
    const sync = async () => {
      for (const app of appointments) {
        try {
          const start = new Date(`${app.date}T${app.time}`);
          const report = reports.find(r => r.appointmentId === app.id);
          await setDoc(doc(db, 'appointments', app.id), {
            titulo: app.title.toUpperCase(),
            data_inicio: start,
            data_fim: new Date(start.getTime() + app.duration * 60000),
            descricao: app.description || '',
            local: app.location || '',
            categoria: app.category || 'Geral',
            status: app.hasReport ? 'CONCLUÍDO' : 'PENDENTE',
            mirrorId: mirrorId,
            duration: app.duration,
            hasReport: app.hasReport,
            callAlert: app.callAlert || false,
            potentialConflict: app.potentialConflict || false,
            markdownReport: report ? report.markdownReport : null,
            updatedAt: serverTimestamp()
          });
        } catch (e) {
          console.error("Auto-sync error for", app.title, e);
        }
      }
    };

    // Debounce sync slightly to avoid excessive writes
    const timeout = setTimeout(sync, 2000);
    return () => clearTimeout(timeout);
  }, [appointments, mirrorId]);

  const enableMirroring = async () => {
    const newId = Math.random().toString(36).substring(2, 10);
    setMirrorId(newId);
    localStorage.setItem('agendavoz_mirror_id', newId);
    console.log("Habilitando espelhamento com ID:", newId);
    
    // Sync existing appointments to Firestore
    for (const app of appointments) {
      try {
        const start = new Date(`${app.date}T${app.time}`);
        const report = reports.find(r => r.appointmentId === app.id);
        await setDoc(doc(db, 'appointments', app.id), {
          titulo: app.title.toUpperCase(),
          data_inicio: start,
          data_fim: new Date(start.getTime() + app.duration * 60000),
          descricao: app.description || '',
          local: app.location || '',
          categoria: app.category || 'Geral',
          status: app.hasReport ? 'CONCLUÍDO' : 'PENDENTE',
          mirrorId: newId,
          duration: app.duration,
          hasReport: app.hasReport,
          callAlert: app.callAlert || false,
          potentialConflict: app.potentialConflict || false,
          markdownReport: report ? report.markdownReport : null,
          createdAt: serverTimestamp()
        });
        console.log("Sincronizado:", app.title);
      } catch (e) {
        console.error("Erro na sincronização inicial:", e);
      }
    }
    alert("Espelhamento ativado e agenda sincronizada!");
  };

  const syncAllToFirestore = async () => {
    if (!mirrorId) {
      alert("Ative o espelhamento primeiro!");
      return;
    }
    console.log("Iniciando sincronização forçada com ID:", mirrorId);
    if (appointments.length === 0) {
      alert("Nenhum compromisso local para sincronizar.");
      return;
    }
    
    let successCount = 0;
    for (const app of appointments) {
      try {
        const start = new Date(`${app.date}T${app.time}`);
        const report = reports.find(r => r.appointmentId === app.id);
        await setDoc(doc(db, 'appointments', app.id), {
          titulo: app.title.toUpperCase(),
          data_inicio: start,
          data_fim: new Date(start.getTime() + app.duration * 60000),
          descricao: app.description || '',
          local: app.location || '',
          categoria: app.category || 'Geral',
          status: app.hasReport ? 'CONCLUÍDO' : 'PENDENTE',
          mirrorId: mirrorId,
          duration: app.duration,
          hasReport: app.hasReport,
          callAlert: app.callAlert || false,
          potentialConflict: app.potentialConflict || false,
          markdownReport: report ? report.markdownReport : null,
          updatedAt: serverTimestamp()
        });
        successCount++;
      } catch (e) {
        console.error("Erro no SyncAll:", e);
      }
    }
    alert(`Sincronização concluída! ${successCount} compromissos enviados.`);
  };
  const [incomingCall, setIncomingCall] = useState<{app: Appointment, timeStr: string} | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOSModalOpen, setIsIOSModalOpen] = useState(false);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => getSavedTheme());
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  const handleSelectTheme = (themeId: ThemeId) => {
    setCurrentTheme(themeId);
    applyTheme(themeId);
  };

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);
  const agendaListRef = useRef<HTMLDivElement>(null);
  const [isPushSubscribed, setIsPushSubscribed] = useState<boolean>(() => {
    return localStorage.getItem('agendei_push_subscribed') === 'true';
  });

  // Handle incoming call triggered from notification click (?call=true)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('call') === 'true') {
      const callTitle = params.get('title') || 'Compromisso Agendado';
      setIncomingCall({
        app: {
          id: 'push_call',
          title: callTitle,
          date: format(new Date(), 'yyyy-MM-dd'),
          time: format(new Date(), 'HH:mm'),
          duration: 30,
          callAlert: true
        },
        timeStr: 'Agora'
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Auto-register push if permission is already granted
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      registerPushNotifications().then(res => {
        if (res.success) setIsPushSubscribed(true);
      }).catch(() => {});
    }
  }, []);

  // Sync future appointment reminders to backend push scheduler
  useEffect(() => {
    const now = Date.now();
    appointments.forEach(app => {
      if (!app.reminders || app.reminders.length === 0) return;
      const appTimestamp = new Date(`${app.date}T${app.time}`).getTime();

      app.reminders.forEach(reminderMinutes => {
        const targetTimestamp = appTimestamp - (reminderMinutes * 60000);
        if (targetTimestamp > now) {
          let timeStr = `${reminderMinutes} minutos`;
          if (reminderMinutes === 1440) timeStr = '24 horas';
          else if (reminderMinutes === 120) timeStr = '2 horas';
          else if (reminderMinutes === 60) timeStr = '1 hora';

          scheduleServerPushReminder({
            id: `${app.id}_${app.date}_${app.time}_${reminderMinutes}`,
            targetTimestamp,
            title: app.callAlert ? `📞 CHAMADA: ${app.title}` : `AGENDEI - ${app.title}`,
            body: `Lembrete: seu compromisso começa em ${timeStr}!`,
            callAlert: app.callAlert,
            appointmentId: app.id
          });
        }
      });
    });
  }, [appointments]);

  const handleEnablePushNotifications = async () => {
    const res = await registerPushNotifications();
    if (res.success) {
      setIsPushSubscribed(true);
      alert('Notificações no topo do celular ativadas com sucesso!');
    } else {
      alert(res.message || 'Não foi possível ativar as notificações.');
    }
  };

  const handleTestBackgroundPush = async (callAlert = false) => {
    const res = await sendTestPushNotification(5, callAlert);
    if (res.success) {
      alert(res.message);
    } else {
      alert(res.message || 'Erro ao enviar teste');
    }
  };

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    const hasDismissed = localStorage.getItem('agendavoz_install_dismissed');

    if (isMobile && !isStandalone && !hasDismissed) {
      const timer = setTimeout(() => {
        setShowInstallBanner(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleInstallClick = async () => {
    if (installPromptEvent) {
      try {
        await installPromptEvent.prompt();
        const { outcome } = await installPromptEvent.userChoice;
        if (outcome === 'accepted') {
          setShowInstallBanner(false);
        }
      } catch (e) {
        console.error("Erro ao instalar:", e);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        if (isIOS) {
          setIsIOSModalOpen(true);
        } else {
          setIsAndroidModalOpen(true);
        }
      }
      setInstallPromptEvent(null);
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        setIsIOSModalOpen(true);
      } else {
        setIsAndroidModalOpen(true);
      }
    }
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('agendavoz_install_dismissed', 'true');
  };

  useEffect(() => {
    let interval: any;
    let ctx: AudioContext | null = null;
    if (incomingCall) {
      if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification('ALERTA: ' + incomingCall.app.title, {
              body: `Começa em ${incomingCall.timeStr}`,
              icon: '/icon-192.png',
              badge: '/favicon.png',
              vibrate: [500, 200, 500, 200, 500],
            } as any);
          }).catch(e => console.error("Notification error:", e));
      }

      try {
        const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtor) {
          ctx = new AudioCtor();
          const playRing = () => {
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            // Standard ringtone frequency
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, ctx!.currentTime);
            osc.frequency.setValueAtTime(480, ctx!.currentTime + 0.05); // slight trill
            
            gain.gain.setValueAtTime(0, ctx!.currentTime);
            gain.gain.linearRampToValueAtTime(0.1, ctx!.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx!.currentTime + 1.5);
            gain.gain.linearRampToValueAtTime(0, ctx!.currentTime + 1.6);
            
            osc.start(ctx!.currentTime);
            osc.stop(ctx!.currentTime + 1.6);
          };
          
          playRing();
          interval = setInterval(playRing, 3000);
        }
      } catch (e) {
        console.error("Audio blocked:", e);
      }
    }
    
    return () => {
      if (interval) clearInterval(interval);
      if (ctx) ctx.close().catch(e => console.error(e));
    };
  }, [incomingCall]);

  useEffect(() => {
    localStorage.setItem('agendavoz_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('agendavoz_reports', JSON.stringify(reports));
  }, [reports]);

  // Request notification permission and check for reminders
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const playNotificationSound = () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        // First beep
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain1.gain.setValueAtTime(0.1, ctx.currentTime);
        osc1.start();
        gain1.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
        osc1.stop(ctx.currentTime + 0.3);
        
        // Second beep
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1046.50, ctx.currentTime); // C6
          gain2.gain.setValueAtTime(0.1, ctx.currentTime);
          osc2.start();
          gain2.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
          osc2.stop(ctx.currentTime + 0.3);
        }, 150);
      } catch (e) {
        console.error("Audio play blocked:", e);
      }
    };

    const checkReminders = () => {
      const now = new Date();
      const notifiedKey = 'agendavoz_notified_reminders';
      let notified: Record<string, boolean> = {};
      try {
        notified = JSON.parse(localStorage.getItem(notifiedKey) || '{}');
      } catch (e) {
        console.error('Error parsing notified from localStorage', e);
      }
      let updated = false;

      appointments.forEach(app => {
        if (!app.reminders) return;
        
        const appDate = new Date(`${app.date}T${app.time}`);
        const diffMinutes = Math.round((appDate.getTime() - now.getTime()) / 60000);
        
        app.reminders.forEach(reminderMinutes => {
          // Include date and time in ID so if the user edits the appointment, the reminder resets
          const reminderId = `${app.id}_${app.date}_${app.time}_${reminderMinutes}`;
          
          // Check if we are within a 15-minute window of the reminder time (to catch up if app was closed)
          if (diffMinutes <= reminderMinutes && diffMinutes > reminderMinutes - 15 && !notified[reminderId]) {
            let timeStr = '';
            if (reminderMinutes === 1440) timeStr = '24 horas';
            else if (reminderMinutes === 120) timeStr = '2 horas';
            else if (reminderMinutes === 60) timeStr = '1 hora';
            else timeStr = `${reminderMinutes} minutos`;
            
            const message = `Lembrete: ${app.title} começa em ${timeStr}!`;
            
            if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then(registration => {
                registration.showNotification('AGENDEI - Lembrete', {
                  body: message,
                  icon: '/icon-192.png',
                  badge: '/favicon.png',
                  vibrate: [200, 100, 200],
                  tag: reminderId,
                  renotify: true,
                  data: {
                    url: window.location.origin
                  }
                } as any);
              }).catch(e => console.error("Notification reminder error:", e));
            }
            
            // Trigger in-app modal and sound
            if (app.callAlert) {
              setIncomingCall({ app, timeStr });
              // Start ringtone logic will be handled inside the IncomingCall component
            } else {
              setActiveReminder({ title: app.title, timeStr });
              playNotificationSound();
            }
            
            notified[reminderId] = true;
            updated = true;
          }
        });
      });

      if (updated) {
        localStorage.setItem(notifiedKey, JSON.stringify(notified));
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [appointments]);

  const handleAddAppointment = (appData: Omit<Appointment, 'id'>) => {
    const newApp: Appointment = {
      ...appData,
      id: Math.random().toString(36).substr(2, 9),
      hasReport: false,
      title: appData.title.toUpperCase(),
      description: appData.description?.toUpperCase() || '',
      reminders: appData.reminders || [1440, 60],
      callAlert: appData.callAlert || false
    };
    
    setAppointments(prev => [...prev, newApp]);
    
    // Sync to Firestore if mirroring is active
    if (mirrorId) {
      const start = new Date(`${newApp.date}T${newApp.time}`);
      setDoc(doc(db, 'appointments', newApp.id), {
        titulo: newApp.title,
        data_inicio: start,
        data_fim: new Date(start.getTime() + newApp.duration * 60000),
        descricao: newApp.description || '',
        local: newApp.location || '',
        categoria: newApp.category || 'Geral',
        status: 'PENDENTE',
        mirrorId: mirrorId,
        duration: newApp.duration,
        hasReport: false,
        callAlert: newApp.callAlert || false,
        potentialConflict: newApp.potentialConflict || false,
        createdAt: serverTimestamp()
      }).catch(e => console.error("Firestore sync error:", e));
    }
    
    // Auto-select the date of the new appointment so the user sees it immediately
    if (appData.date) {
      setSelectedDate(new Date(appData.date + 'T12:00:00')); // Use T12:00:00 to avoid timezone shifts
    }
  };

  const handleUpdateAppointment = (id: string, appData: Partial<Appointment>) => {
    setAppointments(prev => prev.map(app => 
      app.id === id ? { ...app, ...appData, title: appData.title?.toUpperCase() || app.title } : app
    ));

    // Sync to Firestore if mirroring is active
    if (mirrorId) {
      const app = appointments.find(a => a.id === id);
      if (app) {
        const updatedApp = { ...app, ...appData };
        const start = new Date(`${updatedApp.date}T${updatedApp.time}`);
        updateDoc(doc(db, 'appointments', id), {
          titulo: updatedApp.title.toUpperCase(),
          data_inicio: start,
          data_fim: new Date(start.getTime() + updatedApp.duration * 60000),
          descricao: updatedApp.description?.toUpperCase() || '',
          local: updatedApp.location || '',
          categoria: updatedApp.category || 'Geral',
          duration: updatedApp.duration,
          hasReport: updatedApp.hasReport,
          callAlert: updatedApp.callAlert || false,
          potentialConflict: updatedApp.potentialConflict || false
        }).catch(e => console.error("Firestore update error:", e));
      }
    }
  };

  const handleDeleteAppointment = (e: React.MouseEvent | null, id: string) => {
    if (e) e.stopPropagation();
    setDeleteConfirmation({ type: 'appointment', id });
  };

  const handleDeleteReport = (e: React.MouseEvent | null, appointmentId: string) => {
    if (e) e.stopPropagation();
    setDeleteConfirmation({ type: 'report', id: appointmentId });
  };

  const confirmDeletion = () => {
    if (!deleteConfirmation) return;
    
    if (deleteConfirmation.type === 'appointment') {
      const idToDelete = deleteConfirmation.id;
      setAppointments(prev => prev.filter(app => app.id !== idToDelete));
      setReports(prev => prev.filter(rep => rep.appointmentId !== idToDelete));
      
      // Sync to Firestore if mirroring is active
      if (mirrorId) {
        deleteDoc(doc(db, 'appointments', idToDelete)).catch(e => console.error("Firestore delete error:", e));
      }
      
      setIsManualModalOpen(false);
      setEditingAppointment(null);
      setSelectedReport(null);
      setActiveAppointmentId(null);
    } else if (deleteConfirmation.type === 'report') {
      setReports(prev => prev.filter(rep => rep.appointmentId !== deleteConfirmation.id));
      setAppointments(prev => prev.map(app => 
        app.id === deleteConfirmation.id ? { ...app, hasReport: false } : app
      ));
      setSelectedReport(null);
    } else if (deleteConfirmation.type === 'mirror') {
      setMirrorId(null);
      localStorage.removeItem('agendavoz_mirror_id');
      setIsMirrorModalOpen(false);
    } else if (deleteConfirmation.type === 'all_data') {
      localStorage.clear();
      window.location.reload();
      return;
    }
    
    setDeleteConfirmation(null);
  };

  const openEditModal = (e: React.MouseEvent, app: Appointment) => {
    e.stopPropagation();
    setEditingAppointment(app);
    setManualForm({
      title: app.title,
      date: app.date,
      time: app.time,
      duration: app.duration,
      description: app.description || '',
      reminders: app.reminders || [1440, 60],
      callAlert: app.callAlert || false,
      location: app.location || '',
      category: app.category || 'Geral'
    });
    setIsManualModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingAppointment(null);
    setManualForm({ title: '', date: format(selectedDate, 'yyyy-MM-dd'), time: '09:00', duration: 30, description: '', reminders: [1440, 60], callAlert: false, location: '', category: 'Geral' });
    setIsManualModalOpen(true);
  };

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.title.trim()) return;

    if (editingAppointment) {
      handleUpdateAppointment(editingAppointment.id, {
        title: manualForm.title.toUpperCase(),
        date: manualForm.date,
        time: manualForm.time,
        duration: manualForm.duration,
        description: manualForm.description.toUpperCase(),
        reminders: manualForm.reminders,
        callAlert: manualForm.callAlert,
        location: manualForm.location.toUpperCase(),
        category: manualForm.category
      });
    } else {
      handleAddAppointment({
        title: manualForm.title.toUpperCase(),
        date: manualForm.date,
        time: manualForm.time,
        duration: manualForm.duration,
        description: manualForm.description.toUpperCase(),
        reminders: manualForm.reminders,
        callAlert: manualForm.callAlert,
        location: manualForm.location.toUpperCase(),
        category: manualForm.category
      });
    }
    
    setIsManualModalOpen(false);
    setEditingAppointment(null);
  };

  const handleReportGenerated = (report: MeetingReport) => {
    setReports(prev => [...prev, report]);
    setAppointments(prev => prev.map(app => 
      app.id === report.appointmentId ? { ...app, hasReport: true } : app
    ));

    // Sync to Firestore if mirroring is active
    if (mirrorId) {
      updateDoc(doc(db, 'appointments', report.appointmentId), {
        hasReport: true,
        status: 'CONCLUÍDO',
        markdownReport: report.markdownReport
      }).catch(e => console.error("Firestore report status update error:", e));
    }
    setSelectedReport(report);
    setActiveAppointmentId(null);
  };

  const handleShareReport = async (report: MeetingReport) => {
    const appTitle = appointments.find(a => a.id === report.appointmentId)?.title || 'REUNIÃO';
    const text = `
📌 *ATA DE REUNIÃO: ${appTitle}*
📅 Data: ${format(new Date(report.timestamp), "dd/MM/yyyy 'às' HH:mm")}

${report.markdownReport}

_Enviado via AGENDEI IA_
    `.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ata: ${appTitle}`,
          text: text
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Erro ao compartilhar", err);
        }
      }
    } else {
      navigator.clipboard.writeText(text).catch(e => console.error("Clipboard error:", e));
      alert('Ata completa copiada para a área de transferência!');
    }
  };

  const handleShareAppointment = (e: React.MouseEvent, app: Appointment) => {
    e.stopPropagation();
    const text = `Agenda: ${app.title}\nData: ${app.date.split('-').reverse().join('/')}\nHorário: ${app.time} (Duração: ${app.duration} min)\n${app.description ? `Pautas: ${app.description}` : ''}`;
    
    if (navigator.share) {
      navigator.share({
        title: app.title,
        text: text,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text).catch(e => console.error("Clipboard error:", e));
      alert('Informações copiadas!');
    }
  };

  const shareDayAgenda = () => {
    const holiday = getHolidayForDate(selectedDate);
    if (selectedDayRegularAppointments.length === 0 && !holiday) {
      alert("Não há compromissos neste dia.");
      return;
    }
    let header = `Agenda do Dia - ${format(selectedDate, 'dd/MM/yyyy')}\n`;
    if (holiday) {
      header += `🇧🇷 FERIADO NACIONAL: ${holiday.name} (${holiday.description})\n`;
    }
    const text = header + (selectedDayRegularAppointments.length > 0 ? `\n` + selectedDayRegularAppointments.map(a => {
      let desc = `• ${a.time} - ${a.title} (${a.duration} min)`;
      if (a.description) desc += `\n  PAUTAS: ${a.description}`;
      desc += `\n  STATUS: ${a.hasReport ? 'DOCUMENTADO' : 'PENDENTE'}`;
      if (a.category) desc += `\n  CATEGORIA: ${a.category}`;
      if (a.location) desc += `\n  LOCAL: ${a.location}`;
      return desc;
    }).join('\n\n') : '');
    
    if (navigator.share) {
      navigator.share({
        title: `Agenda do Dia - ${format(selectedDate, 'dd/MM/yyyy')}`,
        text: text,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text).catch(e => console.error("Clipboard error:", e));
      alert('Agenda do dia copiada!');
    }
  };

  const downloadDayAgendaJpeg = async () => {
    if (!agendaListRef.current) return;
    try {
      const { toJpeg } = await import('html-to-image');
      const filter = (node: HTMLElement) => {
        return node.dataset ? !node.dataset.excludeDownload : true;
      };
      const dataUrl = await toJpeg(agendaListRef.current, { quality: 0.95, backgroundColor: '#0A1931', filter });
      const link = document.createElement('a');
      link.download = `Agenda_${format(selectedDate, 'dd_MM_yyyy')}.jpeg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      alert('Não foi possível gerar a imagem.');
    }
  };

  const shareAllAgenda = () => {
    const sortedApps = [...appointments].filter(a => !a.hasReport && !a.id.startsWith('feriado_') && a.category !== 'Feriado').sort((a,b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
    if (sortedApps.length === 0) {
      alert("Não há compromissos agendados.");
      return;
    }
    
    let text = `Relação de Compromissos\n\n`;
    
    // Group by date
    const grouped = sortedApps.reduce((acc, curr) => {
      if (!acc[curr.date]) acc[curr.date] = [];
      acc[curr.date].push(curr);
      return acc;
    }, {} as Record<string, Appointment[]>);
    
    for (const [date, apps] of Object.entries(grouped)) {
       text += `\n📅 ${date}:\n` + (apps as Appointment[]).map(a => `   - ${a.time}: ${a.title}`).join('\n') + `\n`;
    }
    
    if (navigator.share) {
      navigator.share({
        title: `Relação de Compromissos`,
        text: text,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text).catch(e => console.error("Clipboard error:", e));
      alert('Relação copiada!');
    }
  };

  const handleDownloadPDF = (report: MeetingReport) => {
    const appTitle = appointments.find(a => a.id === report.appointmentId)?.title || 'REUNIÃO';
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;

    const checkPageBreak = (neededSpace: number) => {
      if (yPos + neededSpace > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
        return true;
      }
      return false;
    };

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(10, 25, 49); // #0A1931
    const titleLines = doc.splitTextToSize(`ATA DE REUNIÃO: ${appTitle}`, contentWidth);
    doc.text(titleLines, margin, yPos);
    yPos += (titleLines.length * 8) + 2;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Data: ${format(new Date(report.timestamp), "dd/MM/yyyy 'às' HH:mm")}`, margin, yPos);
    yPos += 15;
    
    // Line separator
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5);
    
    // Report Content
    checkPageBreak(30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    
    // Strip simple markdown like ** and # for PDF, or just print it as is
    const cleanText = report.markdownReport.replace(/\*\*/g, '').replace(/## /g, '');
    const splitLines = doc.splitTextToSize(cleanText, contentWidth);
    
    splitLines.forEach((line: string) => {
      checkPageBreak(7);
      doc.text(line, margin, yPos);
      yPos += 6;
    });
    
    yPos += 15;
    
    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Gerado por Agendei IA - Página ${i} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
    
    doc.save(`Ata_${appTitle.replace(/\s+/g, '_')}.pdf`);
  };

  const selectedDayAppointments = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return appointments
      .filter(app => app.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDate]);

  const selectedDayHoliday = useMemo(() => getHolidayForDate(selectedDate), [selectedDate]);

  const selectedDayRegularAppointments = useMemo(() => {
    return selectedDayAppointments.filter(app => !app.id.startsWith('feriado_') && app.category !== 'Feriado');
  }, [selectedDayAppointments]);

  const dateStripRef = useRef<HTMLDivElement>(null);

  // Generates 31 days (-15 to +15) around selectedDate for smooth horizontal day browsing
  const dateStrip = useMemo(() => {
    const days: Date[] = [];
    for (let i = -15; i <= 15; i++) {
      days.push(addDays(selectedDate, i));
    }
    return days;
  }, [selectedDate]);

  const scrollDateStrip = (direction: 'left' | 'right') => {
    if (dateStripRef.current) {
      dateStripRef.current.scrollBy({ left: direction === 'left' ? -220 : 220, behavior: 'smooth' });
    }
  };

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
      const hasApp = appointments.some(a => a.date === prevStr && !a.id.startsWith('feriado_') && a.category !== 'Feriado');
      const hasHol = !!getHolidayForDate(prevD);
      if (hasApp || hasHol) {
        setSelectedDate(prevD);
        return;
      }
    }
  };

  const handleNextEventDate = () => {
    for (let i = 1; i <= 365; i++) {
      const nextD = addDays(selectedDate, i);
      const nextStr = format(nextD, 'yyyy-MM-dd');
      const hasApp = appointments.some(a => a.date === nextStr && !a.id.startsWith('feriado_') && a.category !== 'Feriado');
      const hasHol = !!getHolidayForDate(nextD);
      if (hasApp || hasHol) {
        setSelectedDate(nextD);
        return;
      }
    }
  };

  const activeAppointment = appointments.find(a => a.id === activeAppointmentId) || null;

  const renderAppCard = (app: Appointment) => {
    if (app.category === 'Feriado' || app.id.startsWith('feriado_')) {
      return null;
    }
    const isReport = app.hasReport;
    return (
      <div key={app.id} 
        onClick={() => isReport ? setSelectedReport(reports.find(r => r.appointmentId === app.id) || null) : setActiveAppointmentId(app.id)}
        className={`group rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all hover:translate-x-1 cursor-pointer border-l-4 sm:border-l-6 relative shadow-sm w-full overflow-hidden ${
          isReport 
            ? 'border-l-[#0F52BA] bg-[#112240]/80 border border-[#0F52BA]/30' 
            : 'border-l-[#0F52BA] bg-[#112240] hover:bg-[#1A2B4C] border border-[#0F52BA]/50'
        }`}>
        
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <h4 className="text-[14px] sm:text-[15px] font-black text-white uppercase tracking-tight group-hover:text-[#FDD835] transition-colors leading-tight">
              · {app.time} - {app.title} ({app.duration} min)
            </h4>
            {app.reminders && app.reminders.length > 0 && (
              <div className="flex items-center gap-1 text-[#FDD835] flex-shrink-0 ml-2" title={`Lembretes ativados!`} >
                <Bell size={12} className="animate-pulse" />
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 px-2 py-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-wider">Status:</span>
              {isReport ? (
                <span className="text-[9px] font-black text-[#FDD835] uppercase bg-[#FDD835]/10 px-1.5 py-0.5 rounded">DOCUMENTADO</span>
              ) : recordingTimer?.id === app.id && recordingTimer.isRecording ? (
                <span className="text-[9px] font-black text-[#EF5350] uppercase bg-[#EF5350]/10 px-1.5 py-0.5 rounded animate-pulse">GRAVANDO</span>
              ) : (
                <span className="text-[9px] font-black text-white/60 uppercase bg-white/5 px-1.5 py-0.5 rounded">AGENDADO</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-wider">Categoria:</span>
              <span className="text-[9px] font-black text-white/80 uppercase">{app.category || 'Geral'}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-wider">Local:</span>
              <span className="text-[9px] font-black text-white/80 uppercase">{app.location || 'Não Definido'}</span>
            </div>

            {app.description && (
              <div className="flex items-start gap-2 sm:col-span-2">
                <span className="text-[9px] font-black text-white/40 uppercase tracking-wider whitespace-nowrap">Assuntos:</span>
                <span className="text-[9px] font-black text-white/60 uppercase line-clamp-1">{app.description}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-1 pt-3 border-t border-white/5">
            <div className="flex items-center gap-2">
              {app.potentialConflict && (
                <span className="text-[8px] text-[#EF5350] font-black uppercase flex items-center gap-1">
                  <Info size={10} /> Conflito
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={(e) => handleShareAppointment(e, app)} title="Compartilhar" className="p-2 bg-[#0A1526] border border-[#233559] rounded-lg text-blue-300 hover:text-white hover:bg-[#1A2B4C] transition-all shadow-sm"><Share2 size={13}/></button>
              <button onClick={(e) => openEditModal(e, app)} className="p-2 bg-[#0A1526] border border-[#233559] rounded-lg text-white hover:bg-[#1A2B4C] transition-all shadow-sm"><Edit2 size={13}/></button>
              <button onClick={(e) => handleDeleteAppointment(e, app.id)} className="p-2 bg-[#0A1526] border border-[#233559] rounded-lg text-[#EF5350] hover:bg-[#EF5350]/20 transition-all shadow-sm"><Trash2 size={13}/></button>
              <ChevronRight size={14} className="text-white/20 group-hover:text-[#FDD835] ml-1 transition-colors" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {showInstallBanner && (
        <div className="fixed top-0 left-0 right-0 z-[2000] p-4 animate-in slide-in-from-top-full duration-500">
          <div className="bg-[#112240] border-2 border-[#FDD835] rounded-2xl shadow-2xl p-4 flex items-center gap-4 relative max-w-2xl mx-auto">
            <button onClick={dismissInstallBanner} className="absolute -top-2 -right-2 w-8 h-8 bg-[#1A2B4C] border border-[#233559] rounded-full flex items-center justify-center text-white hover:bg-red-500 hover:text-white transition-all shadow-md z-10">
              <X size={16} />
            </button>
            <div className="flex-shrink-0 relative">
              <img src="/logo.svg" alt="Logo" className="w-[52px] h-[52px] rounded-full border-2 border-[#FDD835] shadow-[0_0_15px_rgba(253,216,53,0.3)] object-cover bg-[#1A2B4C]" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#FDD835] rounded-full flex items-center justify-center border-2 border-[#112240]">
                <Sparkles size={10} className="text-black" />
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Instalar Agendei</h4>
              <p className="text-[10px] text-white/70 uppercase">Tenha acesso rápido direto na sua tela inicial.</p>
            </div>
            <button onClick={handleInstallClick} className="px-4 py-2 bg-[#FDD835] text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md">
              Instalar
            </button>
          </div>
        </div>
      )}

      {isIOSModalOpen && (
        <div className="fixed inset-0 z-[3000] flex flex-col justify-end p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsIOSModalOpen(false)}></div>
          <div className="bg-[#112240] rounded-[2rem] p-6 w-full max-w-sm mx-auto relative shadow-2xl border-t-8 border-t-[#FDD835] mb-4 animate-in slide-in-from-bottom-10">
            <button onClick={() => setIsIOSModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white">
              <X size={24} />
            </button>
            <h3 className="text-xl font-black uppercase text-white mb-6 text-center">Instalar no iOS (iPhone)</h3>
            <div className="space-y-4 text-sm font-medium text-blue-100">
              <p className="flex items-center gap-3 bg-white/5 p-4 rounded-xl">
                <span className="bg-[#1A2B4C] text-[#FDD835] w-6 h-6 rounded-full flex items-center justify-center font-black flex-shrink-0">1</span>
                <span>Toque no botão de <strong>Compartilhar</strong> <Share2 size={16} className="inline mx-1 align-text-bottom" /> na barra do Safari.</span>
              </p>
              <p className="flex items-center gap-3 bg-white/5 p-4 rounded-xl">
                <span className="bg-[#1A2B4C] text-[#FDD835] w-6 h-6 rounded-full flex items-center justify-center font-black flex-shrink-0">2</span>
                <span>Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong> <Plus size={16} className="inline mx-1 align-text-bottom" />.</span>
              </p>
              <p className="text-[11px] text-white/60 text-center">O Agendei abrirá como app independente com sua logo oficial na tela.</p>
            </div>
          </div>
        </div>
      )}

      {isAndroidModalOpen && (
        <div className="fixed inset-0 z-[3000] flex flex-col justify-end p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAndroidModalOpen(false)}></div>
          <div className="bg-[#112240] rounded-[2rem] p-6 w-full max-w-sm mx-auto relative shadow-2xl border-t-8 border-t-[#FDD835] mb-4 animate-in slide-in-from-bottom-10">
            <button onClick={() => setIsAndroidModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white">
              <X size={24} />
            </button>
            <h3 className="text-xl font-black uppercase text-white mb-6 text-center">Instalar Aplicativo</h3>
            <div className="space-y-4 text-sm font-medium text-blue-100">
              <p className="flex items-center gap-3 bg-white/5 p-4 rounded-xl">
                <span className="bg-[#1A2B4C] text-[#FDD835] w-6 h-6 rounded-full flex items-center justify-center font-black flex-shrink-0">1</span>
                <span>No Google Chrome, toque no menu de <strong>3 pontos (⋮)</strong> no canto superior direito.</span>
              </p>
              <p className="flex items-center gap-3 bg-white/5 p-4 rounded-xl">
                <span className="bg-[#1A2B4C] text-[#FDD835] w-6 h-6 rounded-full flex items-center justify-center font-black flex-shrink-0">2</span>
                <span>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</span>
              </p>
              <p className="flex items-center gap-3 bg-white/5 p-4 rounded-xl">
                <span className="bg-[#1A2B4C] text-[#FDD835] w-6 h-6 rounded-full flex items-center justify-center font-black flex-shrink-0">3</span>
                <span>Confirme para fixar o ícone oficial do <strong>AGENDEI</strong> e executá-lo sem a barra do navegador.</span>
              </p>
            </div>
            <button
              onClick={() => setIsAndroidModalOpen(false)}
              className="mt-5 w-full py-3 bg-[#FDD835] text-black font-black uppercase text-xs tracking-wider rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {isThemeModalOpen && (
        <div className="fixed inset-0 z-[3000] flex flex-col justify-end p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsThemeModalOpen(false)}></div>
          <div className="bg-[#112240] rounded-[2rem] p-6 w-full max-w-lg mx-auto relative shadow-2xl border-t-8 border-t-[#FDD835] mb-4 animate-in slide-in-from-bottom-10 max-h-[88vh] overflow-y-auto">
            <button onClick={() => setIsThemeModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white">
              <X size={24} />
            </button>
            <div className="mb-4">
              <h3 className="text-xl font-black uppercase text-white">Aparência do Aplicativo</h3>
              <p className="text-xs text-white/60 uppercase mt-0.5">Alterne entre os tons de realce em tempo real</p>
            </div>
            
            <ThemeSelector currentTheme={currentTheme} onSelectTheme={handleSelectTheme} />

            <button
              onClick={() => setIsThemeModalOpen(false)}
              className="mt-5 w-full py-3 bg-[#FDD835] text-black font-black uppercase text-xs tracking-wider rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
            >
              Concluir
            </button>
          </div>
        </div>
      )}

    <div className="min-h-screen flex flex-col pb-44 px-4 sm:px-6 md:px-8 max-w-2xl mx-auto w-full">
      <header className="pt-8 pb-4 flex flex-col items-center relative w-full">
        <div className="mb-3 relative">
          <div className="w-[72px] h-[72px] bg-[#1A2B4C] border-2 border-[#FDD835] rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(253,216,53,0.4)]">
            <NotebookPen size={36} strokeWidth={2.5} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#FDD835] rounded-full flex items-center justify-center border-2 border-[#112240]">
            <Sparkles size={14} className="text-black" />
          </div>
        </div>
        
        <h1 className="text-[46px] sm:text-[58px] font-black logo-executive leading-none tracking-tighter text-center mt-2 text-[#FDD835]">AGENDEI</h1>
        <p className="text-[10.5px] sm:text-[11.5px] font-black text-white uppercase tracking-[0.3em] sm:tracking-[0.4em] mt-1.5 text-center">Agendamento Inteligente</p>

        {!isPro && (
          <button 
            onClick={() => setIsSubscriptionModalOpen(true)}
            className="absolute top-4 left-0 sm:left-2 flex items-center gap-1 sm:gap-1.5 px-3 py-2 bg-[#FDD835] rounded-full text-[9px] font-black text-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_15px_rgba(253,216,53,0.5)] animate-pulse"
          >
            <Sparkles size={14} /> Assinar Agora
          </button>
        )}

        <div className="absolute top-4 right-0 sm:right-2 flex items-center gap-1.5 sm:gap-2">
          <button 
            onClick={() => setIsThemeModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 glass-panel rounded-full text-[9px] sm:text-[10px] font-black text-white uppercase tracking-widest hover:border-[#FDD835] hover:text-[#FDD835] transition-all group"
            title="Alterar Realce de Cores"
          >
            <Palette size={13} className="text-[#FDD835] group-hover:rotate-45 transition-transform" />
            <span className="hidden xs:inline">Cores</span>
          </button>

          <button 
            onClick={() => setSelectedLang(prev => prev.id === 'pt' ? LANGUAGES[1] : LANGUAGES[0])}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 glass-panel rounded-full text-[9px] sm:text-[10px] font-black text-white uppercase tracking-widest hover:bg-[#FDD835] hover:text-black transition-colors"
            title="Alternar Idioma"
          >
            <Globe size={13} /> {selectedLang.label}
          </button>
        </div>
      </header>

      {activeTab === 'home' ? (
        <main className="space-y-4 animate-in fade-in duration-500">
          {!isPro && (
            <section className="animate-in fade-in slide-in-from-top-4 duration-700">
              <AdBanner />
            </section>
          )}

          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <CalendarView 
              appointments={appointments} 
              selectedDate={selectedDate} 
              onDateSelect={setSelectedDate} 
              onDelete={() => {}} 
              selectedLanguage={selectedLang} 
            />
          </section>

          <section className="space-y-3 w-full">
            <div className="flex items-center justify-between px-1 sm:px-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-2 h-5 bg-[#FDD835] rounded-full shadow-[0_0_15px_rgba(253,216,53,0.3)]"></div>
                <h3 className="text-[11.5px] sm:text-[13px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-white">Agenda do Dia</h3>
              </div>
              <div className="flex items-center gap-2">
                {(selectedDayRegularAppointments.length > 0 || selectedDayHoliday) && (
                  <>
                    <button onClick={syncAllToFirestore} className="w-[38px] h-[38px] sm:w-[46px] sm:h-[46px] bg-[#1A2B4C] border border-[#233559] rounded-xl flex items-center justify-center text-white hover:bg-[#233559] shadow-sm transition-all" title="Sincronizar com a Base">
                      <RefreshCw size={18} className="sm:w-5 sm:h-5 text-blue-400" />
                    </button>
                    <button onClick={shareDayAgenda} className="w-[38px] h-[38px] sm:w-[46px] sm:h-[46px] bg-[#1A2B4C] border border-[#233559] rounded-xl flex items-center justify-center text-white hover:bg-[#233559] shadow-sm transition-all" title="Compartilhar Agenda do Dia">
                      <Share2 size={18} className="sm:w-5 sm:h-5 text-blue-300" />
                    </button>
                  </>
                )}
                <button onClick={openCreateModal} className="w-[46px] h-[46px] sm:w-[55px] sm:h-[55px] bg-[#1A2B4C] border-2 border-[#FDD835] rounded-full btn-press flex items-center justify-center text-white hover:bg-[#FDD835] shadow-md transition-all">
                  <Plus size={23} strokeWidth={3} className="sm:w-7 sm:h-7" />
                </button>
              </div>
            </div>

            <div className="space-y-3 w-full">
              {selectedDayHoliday && (
                <div className="bg-gradient-to-r from-[#0d281e] via-[#112240] to-[#0A1931] border-2 border-emerald-500/50 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-lg flex-shrink-0 shadow-inner">
                      🇧🇷
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Feriado Nacional</span>
                        <span className="text-[8.5px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Lembrete Ativo</span>
                      </div>
                      <h4 className="text-[14px] sm:text-[15px] font-black text-white uppercase tracking-tight">{selectedDayHoliday.name}</h4>
                      <p className="text-[10px] text-white/60 font-medium uppercase mt-0.5">{selectedDayHoliday.description}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedDayRegularAppointments.length > 0 ? (
                selectedDayRegularAppointments.map(renderAppCard)
              ) : !selectedDayHoliday ? (
                <div className="py-20 glass-panel rounded-[2.5rem] flex flex-col items-center justify-center border-dashed border-2 border-white/10">
                  <LayoutGrid size={36} className="mb-4 text-[#FDD835]/20" />
                  <p className="text-[11.5px] font-black uppercase tracking-[0.4em] text-white/30">Nada agendado</p>
                </div>
              ) : null}
            </div>
          </section>
        </main>
      ) : activeTab === 'agenda' ? (
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
               {(selectedDayRegularAppointments.length > 0 || selectedDayHoliday) && (
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
             
             {/* Barra de Navegação e Rolagem Temporal (Para frente e para trás) */}
             <div className="mb-6 space-y-3" data-exclude-download="true">
               {/* Controles Principais de Navegação Dia a Dia */}
               <div className="bg-[#112240] border border-[#233559] rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-lg">
                 <div className="flex items-center gap-1.5">
                   <button
                     onClick={handlePrevEventDate}
                     className="p-2 sm:px-2.5 sm:py-2 bg-[#1A2B4C] hover:bg-[#233559] text-white/70 hover:text-white rounded-xl border border-white/5 transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 active:scale-95"
                     title="Pular para compromisso ou feriado anterior"
                   >
                     <ChevronLeft size={14} />
                     <span className="hidden md:inline">Evento Ant.</span>
                   </button>
                   <button
                     onClick={handlePrevDay}
                     className="p-2 sm:px-3 sm:py-2 bg-[#1A2B4C] hover:bg-[#FDD835] hover:text-black text-white rounded-xl border border-white/10 flex items-center gap-1.5 transition-all text-xs font-black uppercase shadow-sm group active:scale-95"
                     title="Dia Anterior (Voltar)"
                   >
                     <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                     <span className="hidden sm:inline">Anterior</span>
                   </button>
                 </div>

                 {/* Indicador Central da Data Selecionada */}
                 <div 
                   onClick={handleToday}
                   className="flex flex-col items-center text-center cursor-pointer px-2 py-1 rounded-xl hover:bg-white/5 transition-all"
                   title="Clique para voltar para Hoje"
                 >
                   <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
                     <span className="text-[13px] sm:text-[15px] font-black text-white uppercase tracking-tight">
                       {format(selectedDate, "dd 'de' MMMM", { locale: selectedLang.locale })}
                     </span>
                     {isToday(selectedDate) && (
                       <span className="text-[8.5px] bg-[#FDD835] text-black font-black px-1.5 py-0.5 rounded uppercase">
                         Hoje
                       </span>
                     )}
                     {selectedDayHoliday && (
                       <span className="text-[8.5px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
                         🇧🇷 Feriado
                       </span>
                     )}
                   </div>
                   <span className="text-[9.5px] sm:text-[10.5px] font-bold text-white/50 uppercase tracking-wider mt-0.5">
                     {format(selectedDate, "EEEE, yyyy", { locale: selectedLang.locale })}
                   </span>
                 </div>

                 <div className="flex items-center gap-1.5">
                   {!isToday(selectedDate) && (
                     <button
                       onClick={handleToday}
                       className="px-2.5 py-1.5 bg-[#FDD835]/15 hover:bg-[#FDD835] text-[#FDD835] hover:text-black rounded-lg border border-[#FDD835]/30 transition-all text-[10px] font-black uppercase tracking-wider active:scale-95"
                       title="Ir para o dia de hoje"
                     >
                       Hoje
                     </button>
                   )}
                   <button
                     onClick={handleNextDay}
                     className="p-2 sm:px-3 sm:py-2 bg-[#1A2B4C] hover:bg-[#FDD835] hover:text-black text-white rounded-xl border border-white/10 flex items-center gap-1.5 transition-all text-xs font-black uppercase shadow-sm group active:scale-95"
                     title="Próximo Dia (Avançar)"
                   >
                     <span className="hidden sm:inline">Próximo</span>
                     <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                   </button>
                   <button
                     onClick={handleNextEventDate}
                     className="p-2 sm:px-2.5 sm:py-2 bg-[#1A2B4C] hover:bg-[#233559] text-white/70 hover:text-white rounded-xl border border-white/5 transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 active:scale-95"
                     title="Pular para próximo compromisso ou feriado"
                   >
                     <span className="hidden md:inline">Próx. Evento</span>
                     <ChevronRight size={14} />
                   </button>
                 </div>
               </div>

               {/* Barra de Rolagem Horizontal de Dias */}
               <div className="relative flex items-center bg-[#0d1e38] border border-[#233559]/70 rounded-2xl p-1.5 shadow-inner">
                 <button
                   onClick={() => scrollDateStrip('left')}
                   className="p-2 bg-[#1A2B4C]/90 hover:bg-[#FDD835] hover:text-black text-white rounded-xl transition-all shadow-md flex-shrink-0 z-10 active:scale-95 border border-white/5"
                   title="Rolar dias para trás"
                 >
                   <ChevronLeft size={16} />
                 </button>

                 <div 
                   ref={dateStripRef} 
                   className="flex items-center gap-1.5 overflow-x-auto py-1 px-2 no-scrollbar scroll-smooth flex-1"
                 >
                   {dateStrip.map((day) => {
                     const dayStr = format(day, 'yyyy-MM-dd');
                     const isSelected = isSameDay(day, selectedDate);
                     const dayHoliday = getHolidayForDate(day);
                     const hasAppointments = appointments.some(
                       a => a.date === dayStr && !a.id.startsWith('feriado_') && a.category !== 'Feriado'
                     );
                     const isDayToday = isToday(day);

                     return (
                       <button
                         key={dayStr}
                         onClick={() => setSelectedDate(day)}
                         className={`flex-shrink-0 flex flex-col items-center justify-center min-w-[54px] sm:min-w-[62px] py-2 px-1 rounded-xl transition-all border relative cursor-pointer ${
                           isSelected
                             ? 'bg-[#FDD835] text-black border-[#FDD835] font-black shadow-lg scale-105 z-10'
                             : isDayToday
                               ? 'bg-[#1A2B4C] text-[#FDD835] border-[#FDD835]/50 hover:bg-[#233559]'
                               : 'bg-[#112240] text-white/80 border-white/5 hover:bg-[#1A2B4C] hover:text-white'
                         }`}
                       >
                         <span className={`text-[9.5px] uppercase font-bold tracking-wider ${isSelected ? 'text-black/80' : 'text-white/40'}`}>
                           {format(day, 'EEE', { locale: selectedLang.locale })}
                         </span>
                         <span className={`text-[15px] sm:text-[16px] font-black leading-tight my-0.5 ${isSelected ? 'text-black' : 'text-white'}`}>
                           {format(day, 'd')}
                         </span>
                         <span className={`text-[8.5px] uppercase font-bold ${isSelected ? 'text-black/70' : 'text-white/40'}`}>
                           {format(day, 'MMM', { locale: selectedLang.locale })}
                         </span>

                         {/* Badges de Feriado 🇧🇷 e Agendamento */}
                         <div className="flex items-center gap-1 mt-1 h-3">
                           {dayHoliday && (
                             <span className="text-[9px] leading-none select-none" title={`Feriado: ${dayHoliday.name}`}>
                               🇧🇷
                             </span>
                           )}
                           {hasAppointments && (
                             <span 
                               className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black' : 'bg-[#FDD835]'}`} 
                               title="Compromisso agendado"
                             />
                           )}
                         </div>
                       </button>
                     );
                   })}
                 </div>

                 <button
                   onClick={() => scrollDateStrip('right')}
                   className="p-2 bg-[#1A2B4C]/90 hover:bg-[#FDD835] hover:text-black text-white rounded-xl transition-all shadow-md flex-shrink-0 z-10 active:scale-95 border border-white/5"
                   title="Rolar dias para frente"
                 >
                   <ChevronRight size={16} />
                 </button>
               </div>
             </div>
             
             {selectedDayHoliday && (
               <div className="bg-gradient-to-r from-[#0d281e] via-[#112240] to-[#0A1931] border-2 border-emerald-500/50 rounded-2xl p-4 sm:p-5 mb-4 shadow-xl flex items-center justify-between gap-3 animate-in fade-in">
                 <div className="flex items-center gap-3">
                   <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-xl flex-shrink-0 shadow-inner">
                     🇧🇷
                   </div>
                   <div>
                     <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Feriado Nacional</span>
                       <span className="text-[8.5px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Lembrete Ativo</span>
                     </div>
                     <h4 className="text-[15px] sm:text-[16px] font-black text-white uppercase tracking-tight">{selectedDayHoliday.name}</h4>
                     <p className="text-[11px] text-white/60 font-medium uppercase mt-0.5">{selectedDayHoliday.description}</p>
                   </div>
                 </div>
               </div>
             )}
             
             <div className="w-full bg-[#112240] rounded-[2rem] border-t-4 border-[#0F52BA] border-[#233559] shadow-xl overflow-hidden">
                {selectedDayRegularAppointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <p className="text-white/40 text-xs font-bold uppercase text-center tracking-wider">
                      {selectedDayHoliday ? 'Nenhum compromisso adicional marcado para este dia.' : 'Nenhum compromisso marcado para este dia.'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {selectedDayRegularAppointments.map((app, index, arr) => {
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
                                 <span className={`text-[10.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                    isReport ? 'bg-[#FDD835]/20 text-[#FDD835]' : 'bg-white/5 text-white/50'
                                 }`}>
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
      ) : activeTab === 'history' ? (
        <main className="flex-1 flex flex-col pt-8 pb-20 px-2 animate-in fade-in duration-500">
           <div className="flex items-center gap-3 mb-6">
              <Clock size={24} className="text-[#FDD835]" />
              <h2 className="text-xl font-black text-white uppercase tracking-widest">Histórico de Atas</h2>
           </div>
           <div className="space-y-4">
              {appointments.filter(a => a.hasReport).sort((a,b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime()).map(renderAppCard)}
              {appointments.filter(a => a.hasReport).length === 0 && (
                <p className="text-white/50 text-xs font-bold uppercase text-center py-10">Nenhuma ata gerada ainda.</p>
              )}
           </div>
        </main>
      ) : activeTab === 'alerts' ? (
        <main className="flex-1 flex flex-col pt-8 pb-20 px-2 animate-in fade-in duration-500">
           <div className="flex items-center gap-3 mb-6">
              <Bell size={24} className="text-[#FDD835]" />
              <h2 className="text-xl font-black text-white uppercase tracking-widest">Central de Avisos</h2>
           </div>

           {/* Status das Notificações em Segundo Plano */}
           <div className="bg-[#112240] border border-[#233559] p-4 rounded-2xl flex items-center justify-between gap-3 shadow-lg mb-4">
             <div className="flex items-center gap-3">
               <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                 isPushSubscribed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-[#FDD835]/20 text-[#FDD835]'
               }`}>
                 <Bell size={20} />
               </div>
               <div>
                 <h4 className="text-xs font-black text-white uppercase tracking-wider">Avisos com App Fechado</h4>
                 <p className="text-[10px] text-white/50 uppercase mt-0.5">
                   {isPushSubscribed ? 'Notificações no topo da tela ativas' : 'Permita avisos para receber alertas com a tela bloqueada'}
                 </p>
               </div>
             </div>
             {!isPushSubscribed ? (
               <button
                 onClick={handleEnablePushNotifications}
                 className="px-3 py-1.5 bg-[#FDD835] text-black text-[9.5px] font-black uppercase rounded-lg hover:scale-105 active:scale-95 transition-all shadow-md flex-shrink-0"
               >
                 Ativar
               </button>
             ) : (
               <button
                 onClick={() => handleTestBackgroundPush(false)}
                 className="px-2.5 py-1.5 bg-[#1A2B4C] hover:bg-[#233559] text-[#FDD835] text-[9px] font-black uppercase rounded-lg border border-[#FDD835]/30 transition-all flex-shrink-0"
                 title="Testar envio com tela bloqueada"
               >
                 Testar
               </button>
             )}
           </div>

           <div className="space-y-4">
              {appointments.filter(a => a.potentialConflict || a.callAlert).length === 0 ? (
                 <p className="text-white/50 text-xs font-bold uppercase text-center py-10">Nenhum aviso pendente</p>
              ) : (
                appointments.filter(a => a.potentialConflict || a.callAlert).map(app => (
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
      ) : activeTab === 'settings' ? (
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
             
             <div className="glass-panel p-5 rounded-2xl border-2 border-white/5">
                <ThemeSelector currentTheme={currentTheme} onSelectTheme={handleSelectTheme} />
             </div>
             
             <div className="glass-panel p-5 rounded-2xl border-2 border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[11px] font-black text-[#FDD835] uppercase tracking-widest">Avisos no Topo do Celular (Segundo Plano)</h3>
                  <span className={`text-[8.5px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                    isPushSubscribed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {isPushSubscribed ? 'Ativo no Aparelho' : 'Pendente'}
                  </span>
                </div>

                <div className="bg-[#112240] p-4 rounded-xl mb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <p className="text-sm font-bold text-white uppercase">Notificações com App Fechado</p>
                    <p className="text-[10px] text-white/50 uppercase">Receba avisos de reuniões e ligações mesmo com celular bloqueado</p>
                  </div>
                  {!isPushSubscribed ? (
                    <button 
                      onClick={handleEnablePushNotifications} 
                      className="px-4 py-2 bg-[#FDD835] text-black text-[10px] font-black uppercase rounded-lg hover:scale-105 active:scale-95 transition-all shadow-md flex-shrink-0"
                    >
                      Ativar Notificações
                    </button>
                  ) : (
                    <span className="text-emerald-400 text-xs font-black uppercase flex items-center gap-1">
                      <Check size={14} /> Ativado
                    </span>
                  )}
                </div>

                <div className="bg-[#0A1526] p-3 rounded-xl border border-white/5 flex flex-col gap-2">
                  <p className="text-[10px] font-bold text-white/70 uppercase">Testar Notificações (Saia do app ou bloqueie a tela em 5s):</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleTestBackgroundPush(false)}
                      className="px-3 py-1.5 bg-[#1A2B4C] hover:bg-[#233559] text-white text-[9.5px] font-black uppercase rounded-lg border border-white/10 transition-all flex items-center gap-1.5"
                    >
                      <Bell size={12} className="text-[#FDD835]" />
                      Testar Aviso Normal
                    </button>
                    <button
                      onClick={() => handleTestBackgroundPush(true)}
                      className="px-3 py-1.5 bg-[#1A2B4C] hover:bg-[#233559] text-[#FDD835] text-[9.5px] font-black uppercase rounded-lg border border-[#FDD835]/30 transition-all flex items-center gap-1.5"
                    >
                      <PhoneCall size={12} className="text-[#FDD835]" />
                      Testar Alerta de Ligação
                    </button>
                  </div>
                </div>
             </div>

             <div className="glass-panel p-5 rounded-2xl border-2 border-white/5">
                <h3 className="text-[11px] font-black text-[#FDD835] uppercase mb-4 tracking-widest">Aplicativo</h3>
                <div className="flex justify-between items-center bg-[#112240] p-4 rounded-xl">
                  <div>
                    <p className="text-sm font-bold text-white uppercase">Instalar no Aparelho</p>
                    <p className="text-[10px] text-white/50 uppercase">Instale com a logo oficial na tela de início</p>
                  </div>
                  <button onClick={handleInstallClick} className="px-4 py-2 bg-[#FDD835] text-black text-[10px] font-black uppercase rounded-lg hover:scale-105 active:scale-95 transition-all shadow-md">
                    Instalar
                  </button>
                </div>
             </div>
             
             <div className="glass-panel p-5 rounded-2xl border-2 border-white/5">
                <h3 className="text-[11px] font-black text-[#FDD835] uppercase mb-4 tracking-widest">Feriados Nacionais</h3>
                <div className="flex justify-between items-center bg-[#112240] p-4 rounded-xl">
                  <div>
                    <p className="text-sm font-bold text-white uppercase">Calendário Oficial</p>
                    <p className="text-[10px] text-white/50 uppercase">Sincronizar feriados brasileiros na agenda</p>
                  </div>
                  <button 
                    onClick={() => {
                      setAppointments(prev => syncHolidaysWithAppointments(prev));
                      alert('Feriados nacionais sincronizados com sucesso na agenda!');
                    }} 
                    className="px-4 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase rounded-lg hover:bg-emerald-500/30 active:scale-95 transition-all shadow-md"
                  >
                    Sincronizar
                  </button>
                </div>
             </div>
             
             <div className="glass-panel p-5 rounded-2xl border-2 border-red-500/20">
                <h3 className="text-[11px] font-black text-red-500 uppercase mb-4 tracking-widest">Zona de Perigo</h3>
                <button onClick={() => setDeleteConfirmation({ type: 'all_data', id: 'global' })} className="w-full py-4 bg-red-500/10 text-red-500 border border-red-500/30 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Apagar Todos os Dados</button>
             </div>
           </div>
        </main>
      ) : null}

      {activeReminder && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveReminder(null)}></div>
          <div className="bg-[#1A2B4C] rounded-[2.5rem] p-10 w-full max-w-sm relative shadow-2xl border-t-8 border-t-[#FDD835] text-center">
            <div className="w-20 h-20 bg-[#FDD835]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell size={32} className="text-[#FDD835] animate-bounce" />
            </div>
            <h3 className="text-2xl font-black uppercase text-white mb-2">Lembrete</h3>
            <p className="text-blue-200 text-sm font-medium mb-6">
              O compromisso <strong className="text-[#FDD835]">{activeReminder.title}</strong> começa em {activeReminder.timeStr}!
            </p>
            <button 
              onClick={() => setActiveReminder(null)}
              className="w-full bg-[#FDD835] py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-black shadow-lg hover:bg-white transition-all"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {incomingCall && (
        <div className="fixed inset-0 z-[1500] flex flex-col p-6 animate-in slide-in-from-bottom-full duration-500 bg-[#0F172A] shadow-2xl">
          <div className="flex-1 flex flex-col items-center justify-center pt-20">
            <div className="w-32 h-32 bg-[#FDD835]/20 rounded-full flex items-center justify-center mb-8 relative">
              <div className="absolute inset-0 bg-[#FDD835]/20 rounded-full animate-ping"></div>
              <div className="w-24 h-24 bg-[#D4AF37] rounded-full flex items-center justify-center relative z-10 shadow-[0_0_40px_rgba(212,175,55,0.4)]">
                 <PhoneCall size={40} className="text-[#1A2B4C] animate-pulse" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-white text-center mb-2 px-4 shadow-sm">{incomingCall.app.title}</h2>
            <p className="text-xl text-[#FDD835] font-semibold mb-2">Começa em {incomingCall.timeStr}</p>
            <p className="text-blue-200 text-sm mb-12">Chamada de Alerta - Agendei</p>
          </div>
          
          <div className="pb-16 flex justify-around px-8">
            <button 
              onClick={() => setIncomingCall(null)}
              className="w-20 h-20 bg-red-500 rounded-full flex flex-col items-center justify-center shadow-lg hover:bg-red-600 transition-transform active:scale-95 text-white"
            >
              <PhoneCall size={28} className="rotate-[135deg] mb-1" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Recusar</span>
            </button>
            <button 
              onClick={() => {
                setIncomingCall(null);
                setActiveTab('reports');
              }}
              className="w-20 h-20 bg-green-500 rounded-full flex flex-col items-center justify-center shadow-lg hover:bg-green-600 transition-transform active:scale-95 animate-bounce text-white pt-1"
            >
              <PhoneCall size={28} className="mb-1" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Aceitar</span>
            </button>
          </div>
        </div>
      )}

      {isManualModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsManualModalOpen(false)}></div>
          <div className="bg-[#1A2B4C] rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 w-full max-w-sm relative shadow-2xl border-t-8 border-t-[#D4AF37] max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-xl sm:text-2xl font-black uppercase text-white mb-6 sm:mb-8">{editingAppointment ? 'Editar' : 'Novo'} Compromisso</h3>
            
            {!editingAppointment && (
              <div className="mb-8 p-4 bg-[#FDD835]/5 rounded-2xl border border-[#FDD835]/20">
                <p className="text-[10px] font-black text-[#FDD835] uppercase tracking-widest text-center mb-2">Ou agende por voz:</p>
                <p className="text-[9px] text-white/60 text-center mb-4 italic">Dica: Diga o horário e o compromisso (ex: "Reunião às 14h")</p>
                <VoiceAssistant 
                  onAddAppointment={(app) => {
                    handleAddAppointment(app);
                    setIsManualModalOpen(false);
                    return true;
                  }} 
                  appointments={appointments} 
                  currentSelectedDate={selectedDate} 
                  selectedLanguage={selectedLang}
                  isInsideModal={true}
                />
              </div>
            )}

            <form onSubmit={handleManualSave} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-blue-200 uppercase tracking-widest ml-1">O que será feito?</label>
                <input 
                  autoFocus 
                  type="text" 
                  placeholder="EX: REUNIÃO DE VENDAS" 
                  className="w-full bg-[#1A2B4C] border-2 border-[#233559] rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-[#FDD835] outline-none transition-all" 
                  value={manualForm.title} 
                  onChange={e => setManualForm({...manualForm, title: e.target.value.toUpperCase()})} 
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-blue-200 uppercase tracking-widest ml-1">Data</label>
                   <input type="date" className="w-full bg-[#1A2B4C] border-2 border-[#233559] rounded-2xl px-6 py-4 text-xs font-bold text-white uppercase" value={manualForm.date} onChange={e => setManualForm({...manualForm, date: e.target.value})} required />
                </div>
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-blue-200 uppercase tracking-widest ml-1">Hora</label>
                   <input type="time" className="w-full bg-[#1A2B4C] border-2 border-[#233559] rounded-2xl px-6 py-4 text-xs font-bold text-white" value={manualForm.time} onChange={e => setManualForm({...manualForm, time: e.target.value})} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-blue-200 uppercase tracking-widest ml-1">Duração</label>
                   <input type="number" placeholder="MIN" className="w-full bg-[#1A2B4C] border-2 border-[#233559] rounded-2xl px-6 py-4 text-xs font-bold text-white" value={manualForm.duration} onChange={e => setManualForm({...manualForm, duration: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-blue-200 uppercase tracking-widest ml-1">Categoria</label>
                   <select className="w-full bg-[#1A2B4C] border-2 border-[#233559] rounded-2xl px-6 py-4 text-xs font-bold text-white appearance-none" value={manualForm.category} onChange={e => setManualForm({...manualForm, category: e.target.value})}>
                     <option value="Geral">GERAL</option>
                     <option value="Saúde">SAÚDE</option>
                     <option value="Trabalho">TRABALHO</option>
                     <option value="Pessoal">PESSOAL</option>
                     <option value="Urgente">URGENTE</option>
                   </select>
                </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[9px] font-black text-blue-200 uppercase tracking-widest ml-1">Local</label>
                 <input type="text" placeholder="EX: QG, GOOGLE MEET" className="w-full bg-[#1A2B4C] border-2 border-[#233559] rounded-2xl px-6 py-4 text-xs font-bold text-white uppercase" value={manualForm.location} onChange={e => setManualForm({...manualForm, location: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-blue-200 uppercase tracking-widest ml-1">Pautas da Reunião (Opcional)</label>
                <textarea 
                  placeholder="EX: DISCUTIR METAS, APROVAR ORÇAMENTO..." 
                  className="w-full bg-[#1A2B4C] border-2 border-[#233559] rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-[#FDD835] outline-none transition-all resize-none h-24" 
                  value={manualForm.description} 
                  onChange={e => setManualForm({...manualForm, description: e.target.value.toUpperCase()})} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-blue-200 uppercase tracking-widest ml-1 flex items-center gap-1">
                  <Bell size={10} /> Lembretes
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 10, label: '10 MIN' },
                    { value: 30, label: '30 MIN' },
                    { value: 60, label: '1 HORA' },
                    { value: 120, label: '2 HORAS' },
                    { value: 1440, label: '1 DIA' }
                  ].map(opt => {
                    const isActive = manualForm.reminders.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setManualForm(prev => {
                            const curr = prev.reminders || [];
                            return {
                              ...prev,
                              reminders: isActive ? curr.filter(r => r !== opt.value) : [...curr, opt.value].sort((a,b) => b - a)
                            };
                          });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${
                          isActive 
                            ? 'bg-[#FDD835] text-black shadow-md' 
                            : 'bg-[#1A2B4C] text-slate-400 border border-[#233559] hover:border-[#FDD835]/50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[9px] font-black text-blue-200 uppercase tracking-widest ml-1 flex items-center gap-1">
                  <PhoneCall size={10} /> Alerta de Ligação
                </label>
                <button
                  type="button"
                  onClick={() => setManualForm(prev => ({ ...prev, callAlert: !prev.callAlert }))}
                  className={`w-full py-3 rounded-xl border-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-all ${
                    manualForm.callAlert 
                      ? 'border-[#EF5350] bg-[#EF5350]/10 text-[#EF5350]' 
                      : 'border-[#233559] bg-[#1A2B4C] text-slate-400 hover:border-[#FDD835]/50'
                  }`}
                >
                  <PhoneCall size={14} className={manualForm.callAlert ? 'animate-pulse' : ''} />
                  Simular Ligação Antes do Evento
                </button>
              </div>
              
              <div className="flex flex-col gap-3 pt-4">
                <button type="submit" className="w-full bg-[#FDD835] py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-black shadow-lg hover:bg-[#233559] hover:text-white transition-all">Salvar Alterações</button>
                {editingAppointment && (
                  <button type="button" onClick={() => handleDeleteAppointment(null, editingAppointment.id)} className="w-full bg-[#1A2B4C] border-2 border-red-50 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                    <Trash2 size={14} /> Excluir ou Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {isSubscriptionModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSubscriptionModalOpen(false)}></div>
          <div className="bg-[#1A2B4C] rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 w-full max-w-sm relative shadow-2xl border-t-8 border-t-[#FDD835] text-center">
            <div className="w-20 h-20 bg-[#FDD835]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles size={32} className="text-[#FDD835]" />
            </div>
            <h3 className="text-2xl font-black uppercase text-white mb-2">Plano Pro</h3>
            <p className="text-blue-200 text-sm font-medium mb-6">
              Desbloqueie todos os recursos e remova os anúncios.
            </p>
            
            <div className="bg-[#0A1931] rounded-2xl p-6 mb-8 border-2 border-[#FDD835]/30">
              <div className="text-[10px] font-black text-[#FDD835] uppercase tracking-widest mb-1">Assinatura Mensal</div>
              <div className="text-4xl font-black text-white">R$ 9,90</div>
              <div className="text-[10px] text-white/40 font-bold mt-1">COBRADO MENSALMENTE</div>
              
              <ul className="mt-6 space-y-3 text-left">
                <li className="flex items-center gap-2 text-[10px] font-bold text-white uppercase">
                  <Check size={12} className="text-[#FDD835]" /> Gravações Ilimitadas
                </li>
                <li className="flex items-center gap-2 text-[10px] font-bold text-white uppercase">
                  <Check size={12} className="text-[#FDD835]" /> Sem Anúncios
                </li>
                <li className="flex items-center gap-2 text-[10px] font-bold text-white uppercase">
                  <Check size={12} className="text-[#FDD835]" /> Suporte Prioritário
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  setIsPro(true);
                  setIsSubscriptionModalOpen(false);
                  alert('Parabéns! Você agora é um usuário PRO.');
                }}
                className="w-full bg-[#FDD835] py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-black shadow-lg hover:bg-white transition-all"
              >
                Assinar Agora
              </button>
              <button 
                onClick={() => setIsSubscriptionModalOpen(false)}
                className="w-full py-2 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
              >
                Talvez mais tarde
              </button>
            </div>
          </div>
        </div>
      )}

      {(activeAppointment || selectedReport) && (
        <div className="fixed inset-0 z-[450] flex items-end sm:items-center justify-center p-0 sm:p-4 pb-0 sm:pb-8 animate-in slide-in-from-bottom duration-500">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => { setActiveAppointmentId(null); setSelectedReport(null); }}></div>
          <div className="w-full max-w-lg bg-[#1A2B4C] rounded-t-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 max-h-[90vh] sm:max-h-[85vh] overflow-y-auto custom-scrollbar relative shadow-2xl border-t-8 border-t-[#0F52BA]">
            <div className="absolute top-4 sm:top-8 right-4 sm:right-8 flex items-center gap-2 z-10">
              {activeAppointment && !selectedReport && (
                <button onClick={(e) => handleDeleteAppointment(e, activeAppointment.id)} className="p-3 bg-red-50 rounded-2xl text-red-500 hover:text-red-700 hover:bg-red-100 transition-all" title="Excluir Compromisso"><Trash2 size={20}/></button>
              )}
              <button onClick={() => { setActiveAppointmentId(null); setSelectedReport(null); }} className="p-3 bg-[#1A2B4C] rounded-2xl text-blue-300 hover:text-red-500 transition-all"><X size={20}/></button>
            </div>
            
            {activeAppointment && !selectedReport && (
              <MeetingManager 
                activeAppointment={activeAppointment} 
                onReportGenerated={handleReportGenerated} 
                selectedLanguage={selectedLang} 
                onTimerUpdate={(time) => setRecordingTimer(prev => prev ? {...prev, time} : null)}
                onRecordingStateChange={(isRecording) => setRecordingTimer(isRecording ? {id: activeAppointment.id, time: 0, isRecording: true} : null)}
              />
            )}

            {selectedReport && (
              <div className="space-y-10 pt-4 text-slate-900">
                <header className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-[#FDD835] tracking-[0.4em] uppercase bg-[#FDD835]/5 px-4 py-2 rounded-full inline-block">Resumo da Reunião</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleShareReport(selectedReport)} className="p-3 bg-[#1A2B4C] rounded-xl text-white hover:bg-[#FDD835] transition-all" title="Compartilhar"><Share2 size={18}/></button>
                      <button onClick={(e) => handleDeleteReport(e, selectedReport.appointmentId)} className="p-3 bg-[#1A2B4C] rounded-xl text-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all" title="Excluir apenas a Ata"><Trash2 size={18}/></button>
                      <button onClick={(e) => handleDeleteAppointment(e, selectedReport.appointmentId)} className="p-3 bg-red-50 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-100 transition-all" title="Excluir Compromisso e Ata"><X size={18}/></button>
                    </div>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white uppercase leading-tight pr-16 sm:pr-0">{appointments.find(a => a.id === selectedReport.appointmentId)?.title}</h2>
                </header>

                <div className="space-y-6 sm:space-y-8">
                  <div className="bg-[#1A2B4C] p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-2 border-[#FDD835]/20 text-[13px] sm:text-[15px] text-blue-100 leading-relaxed shadow-inner markdown-body">
                    <Markdown>{selectedReport.markdownReport}</Markdown>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
                   <button onClick={() => navigator.clipboard.writeText(selectedReport.markdownReport).catch(e => console.error("Clipboard error:", e))} className="py-4 sm:py-5 bg-[#1A2B4C] rounded-[1.5rem] text-[10px] font-black uppercase text-white border-2 border-[#233559] hover:bg-[#1A2B4C] transition-all">Copiar Tudo</button>
                   <button onClick={() => handleDownloadPDF(selectedReport)} className="py-4 sm:py-5 bg-[#FDD835] rounded-[1.5rem] text-[10px] font-black uppercase text-black shadow-xl hover:bg-[#233559] transition-all flex items-center justify-center gap-2">
                     <Download size={14} /> Baixar PDF
                   </button>
                   <button onClick={() => handleShareReport(selectedReport)} className="py-4 sm:py-5 bg-[#0A1931] rounded-[1.5rem] text-[10px] font-black uppercase text-white shadow-xl hover:bg-[#FDD835] transition-all flex items-center justify-center gap-2">
                     <Share2 size={14} /> Enviar
                   </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {deleteConfirmation && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirmation(null)}></div>
          <div className="bg-[#1A2B4C] rounded-[2.5rem] p-10 w-full max-w-sm relative shadow-2xl border-t-8 border-t-red-500 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} className="text-red-500" />
            </div>
            <h3 className="text-2xl font-black uppercase text-white mb-4">Confirmar Exclusão</h3>
            <p className="text-[14px] font-bold text-slate-500 mb-8">
              {deleteConfirmation.type === 'appointment' 
                ? 'Deseja realmente excluir este compromisso e todos os seus dados?' 
                : deleteConfirmation.type === 'report'
                  ? 'Deseja realmente excluir a ata desta reunião? O compromisso será mantido.'
                  : deleteConfirmation.type === 'all_data'
                    ? 'Deseja realmente APAGAR TODOS OS DADOS da sua agenda? Esta ação não pode ser desfeita.'
                    : 'Deseja realmente desativar o espelhamento? O link atual parará de funcionar.'}
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmDeletion} className="w-full bg-red-500 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white shadow-lg hover:bg-red-600 transition-all">
                Sim, Excluir
              </button>
              <button onClick={() => setDeleteConfirmation(null)} className="w-full bg-[#1A2B4C] py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white hover:bg-[#1A2B4C] transition-all">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {isMirrorModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsMirrorModalOpen(false)}></div>
          <div className="bg-[#112240] rounded-[2.5rem] p-8 w-full max-w-sm relative shadow-2xl border border-[#FDD835]/30 text-center overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#FDD835]"></div>
            
            <div className="w-20 h-20 bg-[#FDD835]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Monitor size={36} className="text-[#FDD835]" />
            </div>
            
            <h3 className="text-2xl font-black uppercase text-white mb-2 tracking-tighter">Espelhamento</h3>
            <p className="text-[11px] font-bold text-white/50 mb-8 uppercase tracking-widest leading-relaxed">
              Compartilhe sua agenda em tempo real com executivos e diretores.
            </p>

            {!mirrorId ? (
              <button 
                onClick={enableMirroring}
                className="w-full bg-[#FDD835] py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-black shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                Ativar Espelhamento
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-[#0A1931] p-4 rounded-xl border border-white/5 text-left mb-6">
                  <p className="text-[9px] font-black text-[#FDD835] uppercase mb-1 tracking-widest">Link de Acesso</p>
                  <p className="text-[10px] text-white/40 break-all font-mono">{`${window.location.origin}/mirror/${mirrorId}`}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/mirror/${mirrorId}`).catch(e => console.error(e));
                      alert("Link copiado!");
                    }}
                    className="bg-white/5 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest text-white border border-white/10 hover:bg-white/10"
                  >
                    Copiar Link
                  </button>
                  <button 
                    onClick={syncAllToFirestore}
                    className="bg-blue-500/20 border border-blue-500/30 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-500/30"
                  >
                    Sincronizar
                  </button>
                </div>
                
                <button 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'Agendei - Espelhamento Executivo',
                        text: 'Acompanhe minha agenda em tempo real.',
                        url: `${window.location.origin}/mirror/${mirrorId}`
                      }).catch(e => console.error("Share error:", e));
                    }
                  }}
                  className="w-full bg-[#FDD835] py-4 rounded-xl text-[9px] font-black uppercase tracking-widest text-black shadow-md hover:scale-105"
                >
                  Enviar Link para WhatsApp
                </button>
                
                <button 
                  onClick={() => setDeleteConfirmation({ type: 'mirror', id: 'mirror' })}
                  className="w-full mt-4 py-3 text-[9px] font-black uppercase text-red-500/50 hover:text-red-500 transition-colors"
                >
                  Desativar Serviço
                </button>
              </div>
            )}
            
            <button 
              onClick={() => setIsMirrorModalOpen(false)}
              className="mt-6 text-[10px] font-black text-white/30 uppercase tracking-widest hover:text-white"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <RarbCodingLogo />

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 pb-6 pt-3 px-8 flex justify-between items-center z-50 max-w-2xl mx-auto">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-[#FDD835]' : 'text-[#9E9E9E] hover:text-white'}`}>
          <Home size={28} strokeWidth={2.5} />
          <span className="text-[11px] font-bold">Início</span>
        </button>
        <button onClick={() => setActiveTab('agenda')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'agenda' ? 'text-[#FDD835]' : 'text-[#9E9E9E] hover:text-white'}`}>
          <CalendarIcon size={28} strokeWidth={2.5} />
          <span className="text-[11px] font-bold">Agenda</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'history' ? 'text-[#FDD835]' : 'text-[#9E9E9E] hover:text-white'}`}>
          <Clock size={28} strokeWidth={2.5} />
          <span className="text-[11px] font-bold">Histórico</span>
        </button>
        <button onClick={() => setActiveTab('alerts')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'alerts' ? 'text-[#FDD835]' : 'text-[#9E9E9E] hover:text-white'}`}>
          <Bell size={28} strokeWidth={2.5} />
          <span className="text-[11px] font-bold">Avisos</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'settings' ? 'text-[#FDD835]' : 'text-[#9E9E9E] hover:text-white'}`}>
          <Settings size={28} strokeWidth={2.5} />
          <span className="text-[11px] font-bold">Ajustes</span>
        </button>
      </nav>
    </div>
    </>
  );
};

export default App;
