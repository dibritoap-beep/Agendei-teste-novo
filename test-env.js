import { GoogleGenAI } from "@google/genai";

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("GEMINI_API_KEY is present:", !!apiKey);
  if (!apiKey) {
    console.log("Error: GEMINI_API_KEY is not defined in the environment.");
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  for (const model of modelsToTry) {
    try {
      console.log(`Trying model: ${model}...`);
      const response = await ai.models.generateContent({
        model: model,
        contents: "Olá! Responda apenas com a palavra 'Sucesso'.",
      });
      console.log(`Success with ${model}:`, response.text?.trim());
      return;
    } catch (err) {
      console.error(`Failed with ${model}:`, err.message || err);
    }
  }
}

run();
