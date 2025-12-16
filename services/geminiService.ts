import { GoogleGenAI, Type } from "@google/genai";
import { RhythmStability, RiskLevel, AIInsightData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateScreeningInsight = async (
  bpm: number,
  stability: RhythmStability,
  risk: RiskLevel,
  symptoms: string[]
): Promise<AIInsightData> => {
  const modelId = "gemini-2.5-flash";

  const systemInstruction = `
    You are a medical screening assistant for a hospital dashboard. 
    Your audience is nurses and clinic staff. 
    You DO NOT diagnose diseases. 
    You provide non-diagnostic context and screening support based on heart rate data and reported symptoms.
    Keep language simple, professional, and calm.
  `;

  const symptomsText = symptoms.length > 0 ? symptoms.join(", ") : "None reported";

  const prompt = `
    Analyze the following heart check-up result:
    - Average BPM: ${bpm}
    - Rhythm Stability: ${stability}
    - Calculated Risk Indicator: ${risk}
    - Patient Reported Symptoms: ${symptomsText}

    Provide:
    1. 3 possible non-medical contributing factors (considering the symptoms if any, e.g., dehydration, stress, fatigue).
    2. 2-3 immediate screening recommendations for the nurse.
    3. A very short 1-sentence summary statement.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            contributingFactors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            summary: {
              type: Type.STRING,
            }
          },
          required: ["contributingFactors", "recommendations", "summary"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AIInsightData;

  } catch (error) {
    console.error("AI Insight Error:", error);
    return {
      contributingFactors: ["Data unavailable", "Check connection"],
      recommendations: ["Proceed with standard clinical protocol"],
      summary: "AI Insight unavailable. Please rely on clinical judgment."
    };
  }
};
