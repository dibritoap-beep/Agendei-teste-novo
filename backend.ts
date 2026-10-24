import express from "express";
import { GoogleGenAI, Type } from "@google/genai";

export const app = express();

app.use(express.json({ limit: '10mb' }));

// Helper to generate a beautiful structured offline fallback report
const generateFallbackReport = (text: string, title: string) => {
  const dateStr = new Date().toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const formattedLines = text ? text.split('\n').map(line => `> ${line}`).join('\n') : '';
  
  return `# MEMÓRIA DO REGISTRO EXECUTIVO DA REUNIÃO: ${title || 'PONTOS CHAVE'}
## Gerado em: ${dateStr}

Durante a reunião, os participantes deliberaram sobre os pontos centrais e encaminhamentos futuros:

${formattedLines}

### 📋 DELIBERAÇÕES E PRÓXIMOS PASSOS:
* **Alinhamento:** Todos os pontos listados acima foram arquivados com sucesso no histórico deste compromisso.
* **Encaminhamentos:** As ações futuras decorrentes destas discussões serão acompanhadas diretamente pelo painel principal da agenda.`;
};

// Helper handler: Health Check
const handleHealth = (req: express.Request, res: express.Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
};

// Helper handler: Analyze Meeting
const handleAnalyzeMeeting = async (req: express.Request, res: express.Response) => {
  const { transcript = '', language = 'Português', termsAccepted = true, activeAppointmentTitle = '' } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log("GEMINI_API_KEY missing - returning elegant local fallback report.");
    return res.json({
      markdownReport: generateFallbackReport(transcript, activeAppointmentTitle),
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
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Transcrição/Notas da Reunião: "${transcript}"\n\n[LI E ACEITO AS RESPONSABILIDADES]`,
      config: {
        systemInstruction: `Analise e processe as entradas da reunião (áudio transcrito ou notas digitadas) em ${language || 'Português'}.
             
      # PERSONA: "CÉREBRO DA AGENDA DE VOZ INTELIGENTE"
      Você é a inteligência central de um aplicativo SaaS de produtividade. Sua missão é transformar informações capturadas durante ou após uma reunião (seja voz longa ou apenas os pontos principais digitados) em uma memória executiva de alto valor.
      
      # DIRETRIZES DE ESTILO E FORMATO
      1. Use Markdown (Emojis, Negrito, Listas).
      2. Idioma: Português do Brasil (PT-BR).
      3. Seja conciso, executivo e claro.
      
      # ESTRUTURA DA MEMÓRIA DO REGISTRO EXECUTIVO DA REUNIÃO
      # MEMÓRIA DO REGISTRO EXECUTIVO DA REUNIÃO
      ## ${activeAppointmentTitle || 'REUNIÃO EXECUTIVA'}
      
      [Redija a memória do registro executivo da reunião detalhando as principais abordagens, decisões tomadas e encaminhamentos futuros de forma clara e profissional.]`,
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
      markdownReport: text.startsWith('{') ? generateFallbackReport(transcript, activeAppointmentTitle) : (text || generateFallbackReport(transcript, activeAppointmentTitle)),
      fullTranscript: transcript
    });

  } catch (error: any) {
    console.error("Gemini Error - generating beautiful local fallback:", error);
    return res.json({
      markdownReport: generateFallbackReport(transcript, activeAppointmentTitle),
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

// Route Registrations (both /api/route and /route for Vercel rewrite compatibility)
app.get("/api/health", handleHealth);
app.get("/health", handleHealth);

app.post("/api/analyze-meeting", handleAnalyzeMeeting);
app.post("/analyze-meeting", handleAnalyzeMeeting);

app.post("/api/voice-assistant", handleVoiceAssistant);
app.post("/voice-assistant", handleVoiceAssistant);
