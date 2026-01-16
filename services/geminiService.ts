
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';
import { BriefingData, TocResponse, NicheIdea, ExtrasData, Chapter, TrainingCourse } from '../types';

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

// Fixed 'AI' to 'Ai' in VALID_CATEGORIES to match type definition
const VALID_CATEGORIES = 'psychologia, rodzina, relacje, social media, Ai, uzależnienia, życie zawodowe, życie rodzinne, mąż/żona, dzieci, rodzice, książki, inspiracje, inspirujące postacie, medytacja, hipnoza, rozwój osobisty, technologia jutra, finanse, marketing, food';

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

export const generateStructure = async (briefing: BriefingData): Promise<TocResponse> => {
  const ai = getClient();
  const lang = briefing.language || 'pl';
  const instruction = lang === 'en' ? `You are an expert Amazon KDP author. Create an outline in English.` : SYSTEM_INSTRUCTION;

  const promptText = `Na podstawie briefingu przygotuj tytuł i spis treści e-booka. 
KATEGORIA: ${briefing.category || 'Ogólna'}
TEMAT: ${briefing.topic}
GRUPA: ${briefing.targetAudience}
PROBLEM: ${briefing.coreProblem}
Zwróć JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [{ text: promptText }] },
    config: {
      systemInstruction: instruction,
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
  specificLength?: 'micro' | 'short' | 'medium' | 'long' | 'very_long' | 'epic'
) => {
  const ai = getClient();
  const lengthMap = {
    micro: "~400 słów.",
    short: "~800 słów",
    medium: "~1500 słów",
    long: "~2500 słów",
    very_long: "~4000 słów",
    epic: "~6000+ słów"
  };

  const targetLen = specificLength || briefing.targetLength || 'medium';
  const promptText = `Napisz rozdział "${chapterTitle}" do e-booka "${ebookTitle}". 
Opis: ${chapterDescription}. 
Długość: ${lengthMap[targetLen]}. 
DODATKOWE INSTRUKCJE: ${userInstructions || ''}.
Twoja odpowiedź to czysty tekst e-booka.`;

  const responseStream = await ai.models.generateContentStream({
    model: 'gemini-3-pro-preview',
    contents: { parts: [{ text: promptText }] },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingBudget: 4000 }
    }
  });

  for await (const chunk of responseStream) {
    if (chunk.text) onChunk(chunk.text);
  }
};

export const generateExtras = async (briefing: BriefingData, ebookTitle: string, chapters: Chapter[]): Promise<ExtrasData> => {
  const ai = getClient();
  const prompt = `Stwórz pakiet marketingowy dla e-booka "${ebookTitle}". 
  Wygeneruj: marketingBlurb, shortDescription (100 znaków), longDescription (200 znaków), salesSummary, ctaHooks, imagePrompts (cover, box3d, pageBackground), tools.
  Dla imagePrompts preferuj JASNĄ, PRZEJRZYSTĄ, MINIMALISTYCZNĄ estetykę (Light Colors, White background, Subtle textures).
  Zwróć JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: "Jesteś ekspertem copywritingu.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          marketingBlurb: { type: Type.STRING },
          shortDescription: { type: Type.STRING },
          longDescription: { type: Type.STRING },
          salesSummary: { type: Type.STRING },
          ctaHooks: {
            type: Type.OBJECT,
            properties: {
              short100: { type: Type.STRING },
              medium200: { type: Type.STRING },
              fullSalesCopy: { type: Type.STRING }
            },
            required: ["short100", "medium200", "fullSalesCopy"]
          },
          imagePrompts: {
            type: Type.OBJECT,
            properties: {
              cover: { type: Type.STRING },
              box3d: { type: Type.STRING },
              tocBackground: { type: Type.STRING },
              pageBackground: { type: Type.STRING }
            },
            required: ["cover", "box3d", "tocBackground", "pageBackground"]
          },
          tools: {
            type: Type.OBJECT,
            properties: {
              checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
              inspiringQuotes: { type: Type.ARRAY, items: { type: Type.STRING } },
              inspiringPeople: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: { name: { type: Type.STRING }, description: { type: Type.STRING } },
                  required: ["name", "description"]
                } 
              }
            },
            required: ["checklist", "inspiringQuotes", "inspiringPeople"]
          }
        },
        required: ["marketingBlurb", "shortDescription", "longDescription", "salesSummary", "ctaHooks", "imagePrompts", "tools"]
      }
    }
  });

  return JSON.parse(cleanJsonText(response.text || '{}')) as ExtrasData;
};

export const generateAudiobook = async (text: string, voiceName: string): Promise<string> => {
  const ai = getClient();
  const cleanText = text.replace(/[#*_\[\]()]/g, '').substring(0, 4000); 
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: cleanText }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
    },
  });
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio data");
  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  const wavBlob = pcmToWav(bytes, 24000);
  return URL.createObjectURL(wavBlob);
};

export const generateCourse = async (briefing: BriefingData, ebookTitle: string, chapters: Chapter[]): Promise<TrainingCourse> => {
  const ai = getClient();
  const prompt = `Stwórz plan kursu online na podstawie e-booka "${ebookTitle}".`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          totalDuration: { type: Type.STRING },
          modules: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                objective: { type: Type.STRING },
                lessons: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: { title: { type: Type.STRING }, duration: { type: Type.STRING }, activity: { type: Type.STRING }, keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } } },
                    required: ["title", "duration", "activity", "keyTakeaways"]
                  }
                }
              },
              required: ["title", "objective", "lessons"]
            }
          },
          quiz: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { question: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctAnswer: { type: Type.STRING } },
              required: ["question", "options", "correctAnswer"]
            }
          }
        },
        required: ["title", "description", "totalDuration", "modules", "quiz"]
      }
    }
  });
  return JSON.parse(cleanJsonText(response.text || '{}')) as TrainingCourse;
};

export const suggestBriefingFields = async (topic: string): Promise<{ targetAudience: string, coreProblem: string }> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Zasugeruj grupę i problem dla: ${topic}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: { targetAudience: { type: Type.STRING }, coreProblem: { type: Type.STRING } },
        required: ["targetAudience", "coreProblem"]
      }
    }
  });
  return JSON.parse(cleanJsonText(response.text || '{}'));
};

export const generateImage = async (prompt: string): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio: "1:1" } }
  });
  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (part?.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  throw new Error("No image generated");
};

export const generateNicheIdeas = async (context: string, category?: string): Promise<NicheIdea[]> => {
  const ai = getClient();
  const isCategorySearch = category && category !== 'wszystkie';
  const categoryContext = isCategorySearch ? `WYMÓG KRYTYCZNY: Musisz wygenerować tematy WYŁĄCZNIE dla kategorii: "${category}".` : "";
  
  const prompt = `Zaproponuj DOKŁADNIE 8 nisz e-bookowych. ${categoryContext} Kontekst ogólny: ${context}. 
  ZASADA KRYTYCZNA 1: Każda nisza MUSI mieć przypisaną kategorię DOKŁADNIE z tej listy: ${VALID_CATEGORIES}.
  ZASADA KRYTYCZNA 2: Jeśli podałem kategorię wyżej, pole "category" w każdym z 8 obiektów MUSI mieć wartość "${category}".
  Zwróć JSON jako tablicę 8 obiektów.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
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
            category: { type: Type.STRING, description: `Musi być równa "${category}" jeśli została podana.` } 
          },
          required: ["topic", "audience", "problem", "reason", "category"]
        }
      }
    }
  });
  return JSON.parse(cleanJsonText(response.text || '[]')) as NicheIdea[];
};

export const getRecommendations = async (pastTopics: string[], category?: string): Promise<NicheIdea[]> => {
  const ai = getClient();
  const isCategorySearch = category && category !== 'wszystkie';
  const categoryContext = isCategorySearch ? `WYMÓG KRYTYCZNY: Generuj trendy WYŁĄCZNIE dla kategorii: "${category}".` : "";

  const prompt = `Zaproponuj DOKŁADNIE 8 gorących trendów e-bookowych na 2024/2025. ${categoryContext}
  ZASADA KRYTYCZNA: Pole "category" w KAŻDYM z 8 obiektów JSON musi mieć wartość DOKŁADNIE taką: "${isCategorySearch ? category : 'jedna z listy ' + VALID_CATEGORIES}".
  Zwróć JSON jako tablicę 8 obiektów.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
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
  return JSON.parse(cleanJsonText(response.text || '[]')) as NicheIdea[];
};
