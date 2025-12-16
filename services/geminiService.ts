import { RhythmStability, RiskLevel, AIInsightData } from "../types";

export const generateScreeningInsight = async (
  bpm: number,
  stability: RhythmStability,
  risk: RiskLevel,
  symptoms: string[]
): Promise<AIInsightData> => {
  const modelId = "nvidia/nemotron-3-nano-30b-a3b:free"; // Or any other OpenRouter model

  const systemInstruction = `
    You are a medical screening assistant for a hospital dashboard. 
    Your audience is nurses and clinic staff. 
    You DO NOT diagnose diseases. 
    You provide non-diagnostic context and screening support based on heart rate data and reported symptoms.
    Keep language simple, professional, and calm.
    Return the response in valid JSON format matching the schema provided.
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
    
    Output JSON format:
    {
      "contributingFactors": ["factor1", "factor2", "factor3"],
      "recommendations": ["rec1", "rec2"],
      "summary": "summary text"
    }
  `;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://mediband.vercel.app", // Optional
        "X-Title": "MediBand", // Optional
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
        throw new Error(`OpenRouter API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    if (!content) throw new Error("No response from AI");
    
    return JSON.parse(content) as AIInsightData;

  } catch (error) {
    console.error("AI Insight Error:", error);
    return {
      contributingFactors: ["Data unavailable", "Check connection"],
      recommendations: ["Proceed with standard clinical protocol"],
      summary: "AI Insight unavailable. Please rely on clinical judgment."
    };
  }
};
