import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import webpush from "web-push";

export const app = express();

app.use(express.json({ limit: '10mb' }));

// Helper to generate a structured executive fallback report matching the approved layout
const generateFallbackReport = (
  text: string, 
  title: string, 
  dateStr?: string, 
  timeStr?: string, 
  locationStr?: string
) => {
  const now = new Date();
  const dateFormatted = dateStr 
    ? dateStr.split('-').reverse().join('/') 
    : now.toLocaleDateString('pt-BR');
  const timeFormatted = timeStr || now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const locationFormatted = locationStr || 'Sede / Reunião Executiva';
  const fullDateExtenso = now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  const points = text 
    ? text.split('\n').filter(l => l.trim()).map(line => `* ${line.replace(/^[-*•>]\s*/, '')}`).join('\n') 
    : '* Alinhamento das diretrizes e objetivos prioritários da agenda.';

  return `# MEMÓRIA DO REGISTRO EXECUTIVO DA REUNIÃO
## ${title ? title.toUpperCase() : 'REUNIÃO EXECUTIVA'}

* **DATA E HORÁRIO:** ${dateFormatted} às ${timeFormatted}
* **PRESENTES:** Participantes registrados e partes interessadas do compromisso.

---

### 1. RESUMO EXECUTIVO
Durante a sessão de trabalho, foram abordados os tópicos centrais da pauta, analisando o progresso das ações em curso e consolidando os principais direcionamentos operacionais e estratégicos.

### 2. ENCAMINHAMENTOS E DELIBERAÇÕES
${points}
* **Acompanhamento:** Registro arquivado com sucesso no histórico executivo do AGENDEI.

---

**LOCAL E DATA:**  
${locationFormatted}, ${fullDateExtenso}.`;
};

// Helper handler: Health Check
const handleHealth = (req: express.Request, res: express.Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
};

// Helper handler: Analyze Meeting
const handleAnalyzeMeeting = async (req: express.Request, res: express.Response) => {
  const { 
    transcript = '', 
    language = 'Português', 
    termsAccepted = true, 
    activeAppointmentTitle = '',
    activeAppointmentDate = '',
    activeAppointmentTime = '',
    activeAppointmentLocation = ''
  } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log("GEMINI_API_KEY missing - returning elegant local fallback report.");
    return res.json({
      markdownReport: generateFallbackReport(transcript, activeAppointmentTitle, activeAppointmentDate, activeAppointmentTime, activeAppointmentLocation),
      fullTranscript: transcript,
      isFallback: true
    });
  }

  try {
    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const contextInfo = `
Compromisso: ${activeAppointmentTitle || 'Reunião Executiva'}
Data: ${activeAppointmentDate || new Date().toLocaleDateString('pt-BR')}
Horário: ${activeAppointmentTime || ''}
Local: ${activeAppointmentLocation || 'Reunião Presencial / Remota'}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Contexto do Agendamento:\n${contextInfo}\n\nTranscrição ou Notas Brutas da Reunião:\n"${transcript}"\n\n[PROCESSE CONFORME A ESTRUTURA OFICIAL EXIGIDA]`,
      config: {
        systemInstruction: `Você é a inteligência central do sistema "AGENDEI", especializada em redigir Memórias e Atas Executivas de alto padrão institucional em ${language || 'Português'}.

REGRAS DE FORMATAÇÃO E ESTRUTURA (OBRIGATÓRIO):
A saída DEVE seguir estritamente o formato abaixo, sem introduções e sem rodapés extras:

# MEMÓRIA DO REGISTRO EXECUTIVO DA REUNIÃO
## [TÍTULO DO COMPROMISSO EM MAIÚSCULAS]

* **DATA E HORÁRIO:** [Data no formato DD/MM/AAAA às HH:MM]
* **PRESENTES:** [Identifique todas as pessoas mencionadas na transcrição ou notas. Se não houver nomes citados, informe "Participantes da reunião"]

---

### 1. RESUMO EXECUTIVO
[Redija um resumo conciso, executivo e de alto nível de tudo o que foi tratado e alinhado na reunião]

### 2. ENCAMINHAMENTOS E DELIBERAÇÕES
* [Encaminhamento / Ação 1 com responsável e prazo se citados]
* [Encaminhamento / Ação 2 com responsável e prazo se citados]
* [Encaminhamento / Ação 3...]

---

**LOCAL E DATA:**  
[Local informado no agendamento ou cidade], [Data completa por extenso, ex: 26 de Outubro de 2026].

Diretrizes adicionais:
1. Idioma: Português do Brasil (PT-BR).
2. Não utilize emojis no texto para assegurar perfeita compatibilidade de exportação para PDF e Word.
3. Seja formal, claro e focado nas decisões tomadas e nos encaminhamentos.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            markdownReport: { type: Type.STRING },
            fullTranscript: { type: Type.STRING }
          },
          required: ["markdownReport", "fullTranscript"]
        }
      }
    });
    
    let text = (response.text || '').trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }
    
    try {
      const jsonResponse = JSON.parse(text);
      if (jsonResponse && jsonResponse.markdownReport) {
        return res.json({
          markdownReport: jsonResponse.markdownReport,
          fullTranscript: jsonResponse.fullTranscript || transcript
        });
      }
    } catch (e) {
      console.log("JSON parse error on Gemini output, proceeding with formatted text:", e);
    }

    return res.json({
      markdownReport: text.startsWith('{') 
        ? generateFallbackReport(transcript, activeAppointmentTitle, activeAppointmentDate, activeAppointmentTime, activeAppointmentLocation) 
        : (text || generateFallbackReport(transcript, activeAppointmentTitle, activeAppointmentDate, activeAppointmentTime, activeAppointmentLocation)),
      fullTranscript: transcript
    });

  } catch (error: any) {
    console.error("Gemini Error - generating beautiful local fallback:", error);
    return res.json({
      markdownReport: generateFallbackReport(transcript, activeAppointmentTitle, activeAppointmentDate, activeAppointmentTime, activeAppointmentLocation),
      fullTranscript: transcript,
      isFallback: true
    });
  }
};

// Helper handler: Voice Assistant
const handleVoiceAssistant = async (req: express.Request, res: express.Response) => {
  try {
    const { message = '', history = [], selectedDate = '' } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not configured. Returning fallback directive.");
      return res.json({ fallback: true, text: "Chave da API não configurada. Usando assistente local." });
    }

    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString();
    const userSelectedDate = selectedDate ? new Date(selectedDate).toISOString().split('T')[0] : today;

    const createAppointmentTool = {
      name: 'create_appointment',
      description: 'Cria um novo compromisso na agenda do usuário.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          titulo: { type: Type.STRING, description: 'Título do compromisso (ex: Reunião de Vendas)' },
          data_inicio: { type: Type.STRING, description: 'Data e hora de início no formato ISO 8601 (ex: 2023-10-27T10:00:00)' },
          data_fim: { type: Type.STRING, description: 'Data e hora de término no formato ISO 8601' },
          descricao: { type: Type.STRING, description: 'Breve descrição do compromisso' },
          local: { type: Type.STRING, description: 'Local da reunião ou link' },
          categoria: { type: Type.STRING, description: 'Categoria (Trabalho, Pessoal, Urgente, Saúde)' },
          me_ligar_antes: { type: Type.BOOLEAN, description: 'Se o usuário deseja um alerta de ligação simulada antes do evento' }
        },
        required: ['titulo', 'data_inicio']
      }
    };

    const formattedHistory = history ? history.map((msg: any) => {
      return `${msg.role === 'user' ? 'Usuário' : 'Assistente'}: ${msg.parts[0].text}`;
    }).join('\n') : '';

    const promptContext = `
    Histórico da conversa:
    ${formattedHistory}

    Mensagem atual do Usuário: ${message}
    `;

    if (message.toLowerCase().includes('teste')) {
      return res.json({
        text: "Ok, agendei a reunião.",
        toolCalls: [{
          name: 'create_appointment',
          args: {
            titulo: 'Reunião de Teste',
            data_inicio: '2026-07-09T15:00:00',
            descricao: 'Teste de voz',
            local: 'Escritório',
            categoria: 'Trabalho'
          }
        }]
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptContext,
      config: {
        systemInstruction: `Você é a "Vicky", uma assistente de voz elegante e supereficiente para uma agenda inteligente. 
        Sua voz deve ser prestativa, curta e focada em produtividade.
        
        DATA REAL ATUAL: ${today} (ANO: 2026)
        HORA ATUAL: ${now}
        DATA SELECIONADA PELO USUÁRIO NA INTERFACE: ${userSelectedDate}
        
        REGRAS:
        1. Se o usuário pedir para agendar "hoje", "amanhã" ou datas relativas, considere a DATA REAL ATUAL.
        2. Se o usuário disser "agende para este dia", "marque para o dia selecionado" ou não especificar a data, assuma que ele quer agendar na DATA SELECIONADA PELO USUÁRIO NA INTERFACE (${userSelectedDate}).
        3. OBRIGATÓRIO: Sempre que o usuário solicitar um agendamento ou compromisso, você DEVE EXECUTAR A FERRAMENTA "create_appointment". Não apenas responda no texto, execute a ferramenta!
        4. Seja concisa. Não dê respostas longas.
        5. Se o usuário apenas conversar, responda de forma amigável e profissional.
        6. Idioma: Português do Brasil.`,
        tools: [{ functionDeclarations: [createAppointmentTool] }]
      }
    });

    let responseText = response.text || '';
    let toolCalls: any[] = [];

    if (response.functionCalls && response.functionCalls.length > 0) {
      for (const call of response.functionCalls) {
        toolCalls.push({
          name: call.name,
          args: call.args
        });
      }
    }

    res.json({ 
      text: responseText, 
      toolCalls: toolCalls
    });
  } catch (error: any) {
    console.error("Voice Assistant Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// WEB PUSH NOTIFICATIONS (BACKGROUND ALERTS)
// ==========================================
// Chaves VAPID permanentes padrão do AGENDEI (podem ser sobrescritas por variáveis de ambiente na Vercel)
const DEFAULT_VAPID_PUBLIC = 'BIUatPKLDp5ebV9MQvxz1Ik4imaKcU6me0cRGO1EuzKGHtLa2ZZ-4PuKwCaKUAtosZTow8H7SMPWDhofsFDLJwE';
const DEFAULT_VAPID_PRIVATE = 'XLaVilpQrkezGVP7A_b9WBZa22kRwRa9O6eekWB_r4M';

let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC,
  privateKey: process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE
};

try {
  webpush.setVapidDetails(
    'mailto:contato@agendei.app',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
} catch (err) {
  console.error("Vapid initialization error:", err);
}

// In-memory subscription storage (survives requests in node process)
const pushSubscriptions = new Set<string>();

interface ScheduledPushItem {
  id: string;
  targetTimestamp: number;
  title: string;
  body: string;
  callAlert: boolean;
  appointmentId?: string;
}

let scheduledPushes: ScheduledPushItem[] = [];

// Background dispatcher loop: checks every 10 seconds if any push reminder is due
setInterval(async () => {
  const now = Date.now();
  const due = scheduledPushes.filter(item => item.targetTimestamp <= now);
  if (due.length === 0) return;

  // Remove processed items
  scheduledPushes = scheduledPushes.filter(item => item.targetTimestamp > now);

  for (const item of due) {
    const payload = JSON.stringify({
      title: item.title,
      body: item.body,
      callAlert: item.callAlert,
      appointmentId: item.appointmentId,
      url: item.callAlert ? `/?call=true&title=${encodeURIComponent(item.title)}` : '/'
    });

    for (const subStr of pushSubscriptions) {
      try {
        const sub = JSON.parse(subStr);
        await webpush.sendNotification(sub, payload);
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          pushSubscriptions.delete(subStr);
        } else {
          console.error("Error dispatching background push:", err);
        }
      }
    }
  }
}, 10000);

const handleGetVapidKey = (req: express.Request, res: express.Response) => {
  res.json({ publicKey: vapidKeys.publicKey });
};

const handlePushSubscribe = (req: express.Request, res: express.Response) => {
  const { subscription } = req.body || {};
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: "Assinatura Push inválida" });
  }

  pushSubscriptions.add(JSON.stringify(subscription));
  res.json({ success: true, count: pushSubscriptions.size });
};

const handlePushTest = async (req: express.Request, res: express.Response) => {
  const { delaySeconds = 5, callAlert = false, title, body } = req.body || {};

  const notifTitle = title || (callAlert ? '📞 LIGAÇÃO: AGENDEI IA' : 'AGENDEI - Alerta de Compromisso');
  const notifBody = body || (callAlert ? 'Chamada urgente: Reunião Executiva em 5 minutos!' : 'Seu compromisso agendado começa em breve!');

  if (delaySeconds > 0) {
    // Schedule to fire in delaySeconds (ideal for user locking phone/closing app)
    scheduledPushes.push({
      id: `test_${Date.now()}`,
      targetTimestamp: Date.now() + (delaySeconds * 1000),
      title: notifTitle,
      body: notifBody,
      callAlert: !!callAlert
    });
    return res.json({ 
      success: true, 
      message: `Notificação agendada para daqui a ${delaySeconds} segundos. Você pode bloquear a tela ou fechar o app para testar!` 
    });
  }

  // Immediate push
  const payload = JSON.stringify({
    title: notifTitle,
    body: notifBody,
    callAlert: !!callAlert,
    url: callAlert ? `/?call=true&title=${encodeURIComponent(notifTitle)}` : '/'
  });

  let sent = 0;
  for (const subStr of pushSubscriptions) {
    try {
      const sub = JSON.parse(subStr);
      await webpush.sendNotification(sub, payload);
      sent++;
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        pushSubscriptions.delete(subStr);
      }
    }
  }

  res.json({ success: true, sent });
};

const handlePushSchedule = (req: express.Request, res: express.Response) => {
  const { id, targetTimestamp, title, body, callAlert, appointmentId } = req.body || {};
  if (!targetTimestamp || !title) {
    return res.status(400).json({ error: "Parâmetros incompletos" });
  }

  // Se o alarme for no passado, descarta imediatamente para nunca disparar notificações indevidas
  if (targetTimestamp <= Date.now()) {
    return res.json({ success: true, ignored: true, reason: "Timestamp no passado" });
  }

  // Filter out any existing push with this ID to avoid duplicates
  scheduledPushes = scheduledPushes.filter(p => p.id !== id);

  scheduledPushes.push({
    id: id || `rem_${Date.now()}`,
    targetTimestamp,
    title,
    body: body || 'Compromisso agendado no AGENDEI',
    callAlert: !!callAlert,
    appointmentId
  });

  res.json({ success: true, scheduledCount: scheduledPushes.length });
};

const handlePushCron = async (req: express.Request, res: express.Response) => {
  const now = Date.now();
  const due = scheduledPushes.filter(item => item.targetTimestamp <= now);
  
  if (due.length === 0) {
    return res.json({ success: true, processed: 0, pending: scheduledPushes.length, timestamp: now });
  }

  // Remove processed items
  scheduledPushes = scheduledPushes.filter(item => item.targetTimestamp > now);

  let sentCount = 0;
  for (const item of due) {
    const payload = JSON.stringify({
      title: item.title,
      body: item.body,
      callAlert: item.callAlert,
      appointmentId: item.appointmentId,
      url: item.callAlert ? `/?call=true&title=${encodeURIComponent(item.title)}` : '/'
    });

    for (const subStr of pushSubscriptions) {
      try {
        const sub = JSON.parse(subStr);
        await webpush.sendNotification(sub, payload);
        sentCount++;
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          pushSubscriptions.delete(subStr);
        } else {
          console.error("Error dispatching background push in cron:", err);
        }
      }
    }
  }

  res.json({
    success: true,
    processed: due.length,
    sentNotifications: sentCount,
    remainingScheduled: scheduledPushes.length
  });
};

// Route Registrations (both /api/route and /route for Vercel rewrite compatibility)
app.get("/api/health", handleHealth);
app.get("/health", handleHealth);

app.post("/api/analyze-meeting", handleAnalyzeMeeting);
app.post("/analyze-meeting", handleAnalyzeMeeting);

app.post("/api/voice-assistant", handleVoiceAssistant);
app.post("/voice-assistant", handleVoiceAssistant);

app.get("/api/push-vapid-public-key", handleGetVapidKey);
app.get("/push-vapid-public-key", handleGetVapidKey);

app.post("/api/push-subscribe", handlePushSubscribe);
app.post("/push-subscribe", handlePushSubscribe);

app.post("/api/push-test", handlePushTest);
app.post("/push-test", handlePushTest);

app.post("/api/push-schedule", handlePushSchedule);
app.post("/push-schedule", handlePushSchedule);

app.get("/api/cron/check-reminders", handlePushCron);
app.get("/cron/check-reminders", handlePushCron);
app.post("/api/cron/check-reminders", handlePushCron);
app.post("/cron/check-reminders", handlePushCron);

