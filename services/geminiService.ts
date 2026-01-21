
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';
import { BriefingData, TocResponse, NicheIdea, ExtrasData, Chapter } from '../types';

declare const process: any;

const getClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const cleanJsonText = (text: string): string => {
  let cleanText = text.trim();
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = cleanText.match(jsonBlockRegex);
  if (match) {
    cleanText = match[1];
  } else {
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```(json)?/, "").replace(/```$/, "");
    }
  }
  return cleanText.trim();
};

function pcmToWav(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  const numChannels = 1; 
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  const pcmBytes = new Uint8Array(buffer, 44);
  pcmBytes.set(pcmData);
  return new Blob([buffer], { type: 'audio/wav' });
}

// Fixed: Added missing suggestBriefingFields export
export const suggestBriefingFields = async (topic: string): Promise<{ targetAudience: string, coreProblem: string }> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Dla tematu e-booka: "${topic}", zaproponuj grupę docelową i główny problem, który e-book rozwiązuje. Zwróć JSON z polami: targetAudience, coreProblem.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          targetAudience: { type: Type.STRING },
          coreProblem: { type: Type.STRING }
        },
        required: ["targetAudience", "coreProblem"]
      }
    }
  });
  return JSON.parse(cleanJsonText(response.text || '{}'));
};

// Fixed: Added missing generateNicheIdeas export
export const generateNicheIdeas = async (context: string): Promise<NicheIdea[]> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Zaproponuj 6 unikalnych i dochodowych pomysłów na e-booki w kontekście: "${context}". Zwróć JSON jako listę obiektów z polami: topic, audience, problem, reason, category.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            audience: { type: Type.STRING },
            problem: { type: Type.STRING },
            reason: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["topic", "audience", "problem", "reason", "category"]
        }
      }
    }
  });
  return JSON.parse(cleanJsonText(response.text || '[]'));
};

// Fixed: Added missing getRecommendations export
export const getRecommendations = async (pastTopics: string[]): Promise<NicheIdea[]> => {
  const ai = getClient();
  const topicsStr = pastTopics.join(', ');
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Na podstawie poprzednich tematów e-booków autora: [${topicsStr}], zaproponuj 4 nowe, uzupełniające pomysły na kolejne publikacje. Zwróć JSON jako listę obiektów z polami: topic, audience, problem, reason, category.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            audience: { type: Type.STRING },
            problem: { type: Type.STRING },
            reason: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["topic", "audience", "problem", "reason", "category"]
        }
      }
    }
  });
  return JSON.parse(cleanJsonText(response.text || '[]'));
};

export const generateStructure = async (briefing: BriefingData): Promise<TocResponse> => {
  const ai = getClient();
  const promptText = `Stwórz plan e-booka: ${briefing.topic}. Zwróć JSON z title i chapters (title, description).`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [{ text: promptText }] },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          chapters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["title", "description"]
            }
          }
        },
        required: ["title", "chapters"]
      }
    }
  });
  return JSON.parse(cleanJsonText(response.text || '{}')) as TocResponse;
};

export const generateChapterStream = async (
  briefing: BriefingData,
  chapterTitle: string,
  chapterDescription: string,
  ebookTitle: string,
  onChunk: (text: string) => void,
  userInstructions?: string,
  specificLength?: string
) => {
  const ai = getClient();
  const promptText = `Napisz rozdział "${chapterTitle}" do e-booka "${ebookTitle}". Instrukcje: ${chapterDescription}. ${userInstructions || ''}`;
  const responseStream = await ai.models.generateContentStream({
    model: 'gemini-3-pro-preview',
    contents: { parts: [{ text: promptText }] },
    config: { systemInstruction: SYSTEM_INSTRUCTION }
  });
  for await (const chunk of responseStream) {
    if (chunk.text) onChunk(chunk.text);
  }
};

export const generateAudiobook = async (text: string, voiceName: string): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Read: ${text.substring(0, 2000)}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
    },
  });
  const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64) throw new Error("Audio generation failed");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const wav = pcmToWav(bytes, 24000);
  return URL.createObjectURL(wav);
};

export const generateImage = async (prompt: string): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: `STYLE: CLEAN, MINIMALIST, LUXURY LIGHT COLORS, PASTELS. ABSOLUTELY NO TEXT, NO LETTERS, NO TYPOGRAPHY. CONTENT: ${prompt}` }] },
    config: { imageConfig: { aspectRatio: "1:1" } }
  });
  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (part?.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  throw new Error("No image generated");
};

export const generateExtras = async (briefing: BriefingData, ebookTitle: string): Promise<ExtrasData> => {
  const ai = getClient();
  const prompt = `Stwórz pełną strategię marketingową i wizualną dla e-booka: ${ebookTitle}. 
  Wszystkie prompty graficzne muszą być opisane jako czyste tła bez żadnych napisów (CLEAN BACKGROUND, NO TEXT, NO TYPOGRAPHY).
  Zwróć JSON z polami: 
  ctaHooks (short100, medium200, fullSalesCopy), 
  imagePrompts (coverProposals - 5 prompty na artystyczne okładki bez tekstu, bgProposals - 5 prompty na subtelne tła stron, boxProposals - 5 prompty na wizualizację produktu).`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ctaHooks: { 
            type: Type.OBJECT, 
            properties: { 
              short100: { type: Type.STRING }, 
              medium200: { type: Type.STRING }, 
              fullSalesCopy: { type: Type.STRING } 
            } 
          },
          imagePrompts: {
            type: Type.OBJECT,
            properties: {
              coverProposals: { type: Type.ARRAY, items: { type: Type.STRING } },
              bgProposals: { type: Type.ARRAY, items: { type: Type.STRING } },
              boxProposals: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      }
    }
  });
  return JSON.parse(cleanJsonText(response.text || '{}')) as ExtrasData;
};
