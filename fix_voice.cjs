const { GoogleGenAI, Type } = require('@google/genai');

const createAppointmentTool = {
  name: 'create_appointment',
  description: 'Cria um novo compromisso na agenda do usuário.',
  parameters: {
    type: "OBJECT",
    properties: {
      titulo: { type: "STRING", description: 'Título do compromisso (ex: Reunião de Vendas)' },
      data_inicio: { type: "STRING", description: 'Data e hora de início no formato ISO 8601 (ex: 2023-10-27T10:00:00)' },
    },
    required: ['titulo', 'data_inicio']
  }
};

const apiKey = process.env.GEMINI_API_KEY;
if(!apiKey) {
    console.error("No API key");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
async function test() {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Marque uma reunião amanhã às 15h sobre marketing.",
            config: {
                systemInstruction: "Você é um assistente",
                tools: [{ functionDeclarations: [createAppointmentTool] }]
            }
        });
        
        console.log("Response text:", response.text);
        console.log("Function Calls:", JSON.stringify(response.functionCalls, null, 2));
    } catch (err) {
        console.error(err);
    }
}
test();
