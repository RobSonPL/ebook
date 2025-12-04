import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';
import { BriefingData, TocResponse, NicheIdea, ExtrasData, Chapter } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Brak klucza API. Upewnij się, że environment variable API_KEY jest ustawione.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to strip markdown code blocks from JSON response
const cleanJsonText = (text: string): string => {
  let cleanText = text.trim();
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText.substring(7);
  } else if (cleanText.startsWith("```")) {
    cleanText = cleanText.substring(3);
  }
  
  if (cleanText.endsWith("```")) {
    cleanText = cleanText.substring(0, cleanText.length - 3);
  }
  return cleanText.trim();
};

export const generateStructure = async (briefing: BriefingData): Promise<TocResponse> => {
  const ai = getClient();
  const prompt = `
    Na podstawie poniższego briefingu przygotuj chwytliwy tytuł e-booka oraz szczegółowy spis treści (rozdziały).
    Każdy rozdział powinien mieć krótki opis tego, co się w nim znajdzie.

    TEMAT: ${briefing.topic}
    AUTOR: ${briefing.authorName}
    GRUPA DOCELOWA: ${briefing.targetAudience}
    GŁÓWNY PROBLEM: ${briefing.coreProblem}
    TON: ${briefing.tone}

    Zwróć wynik w formacie JSON.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
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

  if (response.text) {
    try {
      return JSON.parse(cleanJsonText(response.text)) as TocResponse;
    } catch (e) {
      console.error("JSON Parse Error in generateStructure:", e, response.text);
      throw new Error("Błąd parsowania odpowiedzi AI.");
    }
  }
  throw new Error("Nie udało się wygenerować struktury.");
};

export const generateChapterStream = async (
  briefing: BriefingData,
  chapterTitle: string,
  chapterDescription: string,
  ebookTitle: string,
  onChunk: (text: string) => void,
  userInstructions?: string,
  specificLength?: 'short' | 'medium' | 'long'
) => {
  const ai = getClient();
  
  const lengthMap = {
    short: "Krótki i zwięzły (ok. 500-800 słów). Skup się na esencji.",
    medium: "Standardowa długość (ok. 1000-1500 słów). Wyczerp temat, ale bez lania wody.",
    long: "Bardzo szczegółowy i pogłębiony (2000+ słów). Wiele przykładów, detali i analiz."
  };

  const targetLen = specificLength || briefing.targetLength || 'medium';

  const prompt = `
    Jesteśmy w FAZIE 3: TWORZENIE TREŚCI.
    Napisz pełną treść rozdziału: "${chapterTitle}".
    
    Kontekst e-booka: "${ebookTitle}"
    Autor: "${briefing.authorName}"
    Opis rozdziału: ${chapterDescription}
    Briefing:
    - Odbiorca: ${briefing.targetAudience}
    - Problem: ${briefing.coreProblem}
    - Ton: ${briefing.tone}
    
    WYMAGANA DŁUGOŚĆ: ${lengthMap[targetLen]}

    ${userInstructions ? `\n    DODATKOWE WYTYCZNE/OUTLINE OD UŻYTKOWNIKA:\n    "${userInstructions}"\n` : ''}

    Wytyczne dla tego rozdziału:
    1. Zacznij od problemu.
    2. Przejdź do rozwiązania.
    3. Podaj przykład/dowód (Case Study lub metafora).
    4. Zakończ zadaniem dla czytelnika (Action Point).
    5. FORMATOWANIE:
       - Używaj nagłówków H2 (##) dla głównych sekcji.
       - Używaj nagłówków H3 (###) dla podsekcji.
       - Nie używaj H1.
    6. BOGATA TREŚĆ:
       - Jeśli to ma sens w kontekście, wstaw tabelę porównawczą (Markdown table).
       - Jeśli to ma sens, wstaw placeholder na link do źródła zewnętrznego.
  `;

  const responseStream = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    }
  });

  for await (const chunk of responseStream) {
    if (chunk.text) {
      onChunk(chunk.text);
    }
  }
};

export const generateExtras = async (briefing: BriefingData, ebookTitle: string, chapters: Chapter[]): Promise<ExtrasData> => {
  const ai = getClient();
  
  // Use full content for better context (Flash model has large window)
  const fullContent = chapters.map(c => `### ${c.title}\n${c.content}`).join('\n\n');

  const prompt = `
    Jesteśmy w FAZIE 4: DODATKI I MARKETING.
    E-book pt. "${ebookTitle}" jest gotowy.
    Autor: ${briefing.authorName}

    Poniżej znajduje się pełna treść e-booka. Wykorzystaj ją, aby stworzyć precyzyjne i dopasowane materiały.
    
    --- TREŚĆ EBOOKA ---
    ${fullContent}
    --------------------

    Wygeneruj zestaw materiałów dodatkowych w formacie JSON:
    1. 'marketingBlurb': Tekst sprzedażowy na landing page (model AIDA). Musi być perswazyjny.
    2. 'shortDescription': Krótki opis (do 2 zdań, meta description pod SEO).
    3. 'longDescription': Długi opis e-booka (na tył okładki lub do sklepu, podsumowujący wartość).
    4. 'checklist': "Action Plan" - praktyczna checklista dla czytelnika w formacie Markdown (lista punktowana lub checkbox), która podsumowuje kluczowe kroki z całego e-booka.
    5. 'alternativeTitles': 3 alternatywne, chwytliwe tytuły.
    6. 'imagePrompts': Obiekt zawierający 4 prompty (po angielsku) dla generatora obrazów (np. Midjourney/DALL-E):
       - 'cover': Strona tytułowa (nowoczesna, pasująca do tematu).
       - 'box3d': Wizualizacja produktu (3D box mockup).
       - 'tocBackground': Tło pod spis treści (subtelne).
       - 'pageBackground': Tekstura/tło dla stron z treścią (bardzo jasne, low opacity).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          marketingBlurb: { type: Type.STRING },
          shortDescription: { type: Type.STRING },
          longDescription: { type: Type.STRING },
          checklist: { type: Type.STRING },
          alternativeTitles: { type: Type.ARRAY, items: { type: Type.STRING } },
          imagePrompts: {
            type: Type.OBJECT,
            properties: {
              cover: { type: Type.STRING },
              box3d: { type: Type.STRING },
              tocBackground: { type: Type.STRING },
              pageBackground: { type: Type.STRING },
            }
          }
        },
        required: ["marketingBlurb", "shortDescription", "longDescription", "checklist", "alternativeTitles", "imagePrompts"]
      }
    }
  });

  if (response.text) {
    try {
      return JSON.parse(cleanJsonText(response.text)) as ExtrasData;
    } catch (e) {
      console.error("JSON Parse Error in generateExtras:", e);
      throw new Error("Błąd generowania dodatków.");
    }
  }
  throw new Error("Błąd generowania dodatków.");
};

export const generateNicheIdeas = async (userQuery: string): Promise<NicheIdea[]> => {
  const ai = getClient();
  const prompt = `
    Użytkownik szuka pomysłu na e-booka. Działa w niszy/interesuje się: "${userQuery}".
    
    Zaproponuj 3 konkretne, dochodowe pomysły na e-booka.
    Dla każdego pomysłu podaj:
    1. Temat (chwytliwy roboczy tytuł).
    2. Grupę docelową (Avatar).
    3. Główny problem, który rozwiązuje.
    4. Krótkie uzasadnienie, dlaczego to się sprzeda (reason).

    Odpowiedź w formacie JSON.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ideas: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                audience: { type: Type.STRING },
                problem: { type: Type.STRING },
                reason: { type: Type.STRING },
              }
            }
          }
        }
      }
    }
  });

  if (response.text) {
    try {
      const parsed = JSON.parse(cleanJsonText(response.text));
      return parsed.ideas as NicheIdea[];
    } catch (e) {
      console.error("JSON Parse Error in generateNicheIdeas:", e);
      return [];
    }
  }
  return [];
};

export const getRecommendations = async (pastTopics: string[]): Promise<NicheIdea[]> => {
  const ai = getClient();
  let promptContext = "";

  if (pastTopics.length > 0) {
    promptContext = `
      Użytkownik stworzył już e-booki o następującej tematyce: "${pastTopics.join('", "')}".
      Zaproponuj 3 nowe, unikalne tematy e-booków, które są:
      1. Powiązane tematycznie lub uzupełniające do poprzednich (tzw. cross-selling lub level up).
      2. Obecnie zyskują na popularności (trending) i mają potencjał sprzedażowy.
    `;
  } else {
    promptContext = `
      Użytkownik dopiero zaczyna. Zaproponuj 3 "pewniaki" - tematy e-booków z wysokim potencjałem sprzedażowym w 2024/2025 roku, bazując na obecnych gorących trendach rynkowych (np. AI, produktywność, zdrowie mentalne, finanse).
    `;
  }

  const prompt = `
    Jesteś strategiem wydawniczym.
    ${promptContext}

    Dla każdego pomysłu podaj:
    1. Temat (chwytliwy roboczy tytuł).
    2. Grupę docelową (Avatar).
    3. Główny problem, który rozwiązuje.
    4. Krótkie uzasadnienie (reason) dlaczego akurat to warto napisać.

    Odpowiedź w formacie JSON.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ideas: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                audience: { type: Type.STRING },
                problem: { type: Type.STRING },
                reason: { type: Type.STRING },
              }
            }
          }
        }
      }
    }
  });

  if (response.text) {
    try {
      const parsed = JSON.parse(cleanJsonText(response.text));
      return parsed.ideas as NicheIdea[];
    } catch (e) {
      console.error("JSON Parse Error in getRecommendations:", e);
      return [];
    }
  }
  return [];
};
