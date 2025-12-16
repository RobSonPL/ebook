import { GoogleGenAI, Type, Modality } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';
import { BriefingData, TocResponse, NicheIdea, ExtrasData, Chapter, TrainingCourse } from '../types';

// Safe access to process
declare const process: any;

const getClient = () => {
  const apiKey = (typeof process !== 'undefined' ? process.env?.API_KEY : '') || '';
  if (!apiKey) {
    throw new Error("Brak klucza API. Upewnij się, że environment variable API_KEY jest ustawione.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to strip markdown code blocks from JSON response
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

// Helper: Convert PCM to WAV
function pcmToWav(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  const numChannels = 1; // Mono
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

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM data
  const pcmBytes = new Uint8Array(buffer, 44);
  pcmBytes.set(pcmData);

  return new Blob([buffer], { type: 'audio/wav' });
}

export const generateStructure = async (briefing: BriefingData): Promise<TocResponse> => {
  const ai = getClient();
  const lang = briefing.language || 'pl';
  const hasContext = briefing.contextMaterial && briefing.contextMaterial.length > 10;
  
  const instruction = lang === 'en'
    ? `You are an expert Amazon KDP Bestselling author and ghostwriter. Your goal is to create a high-converting, marketable book outline. 
       IMPORTANT: Even if the user provides the topic in Polish, you MUST generate the Title and Chapter Names in English.
       The output format MUST be JSON.`
    : SYSTEM_INSTRUCTION;

  const contextSection = hasContext 
    ? `
      === SOURCE MATERIAL / KNOWLEDGE BASE ===
      The user has provided specific source material. You MUST use this to shape the structure and content topics.
      
      ${briefing.contextMaterial?.substring(0, 50000)}
      ========================================
    ` 
    : '';

  const prompt = lang === 'en' 
    ? `
      ${contextSection}

      Based on the briefing ${hasContext ? 'and the provided SOURCE MATERIAL' : ''}, prepare a catchy, bestselling title and a detailed Table of Contents (chapters).
      
      CRITICAL: The output language for the JSON values (title, chapter titles, descriptions) MUST BE ENGLISH. Translate the concepts if they are in Polish.

      TOPIC: ${briefing.topic}
      AUTHOR: ${briefing.authorName}
      TARGET AUDIENCE: ${briefing.targetAudience}
      CORE PROBLEM: ${briefing.coreProblem}
      TONE: ${briefing.tone}
      
      REQUIRED CHAPTER COUNT: ${briefing.chapterCount}
      (Generate exactly this many chapters).

      Return the result strictly in JSON format matching the schema.
    `
    : `
      ${contextSection}

      Na podstawie briefingu ${hasContext ? 'oraz dostarczonych MATERIAŁÓW ŹRÓDŁOWYCH' : ''}, przygotuj chwytliwy tytuł e-booka oraz szczegółowy spis treści (rozdziały).
      Każdy rozdział powinien mieć krótki opis tego, co się w nim znajdzie.

      TEMAT: ${briefing.topic}
      AUTOR: ${briefing.authorName}
      GRUPA DOCELOWA: ${briefing.targetAudience}
      GŁÓWNY PROBLEM: ${briefing.coreProblem}
      TON: ${briefing.tone}
      
      WYMAGANA LICZBA ROZDZIAŁÓW: ${briefing.chapterCount}
      (Wygeneruj dokładnie tyle rozdziałów, ile podano powyżej).

      Zwróć wynik w formacie JSON.
    `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
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
  specificLength?: 'short' | 'medium' | 'long' | 'very_long'
) => {
  const ai = getClient();
  const lang = briefing.language || 'pl';
  const hasContext = briefing.contextMaterial && briefing.contextMaterial.length > 10;

  const lengthMap = {
    short: lang === 'en' ? "Short and concise (approx. 500-800 words). Focus on essence." : "Krótki i zwięzły (ok. 500-800 słów). Skup się na esencji.",
    medium: lang === 'en' ? "Standard length (approx. 1000-1500 words). Thorough but concise." : "Standardowa długość (ok. 1000-1500 słów). Wyczerp temat, ale bez lania wody.",
    long: lang === 'en' ? "Detailed and deep (2000+ words). Many examples and analysis." : "Długi i szczegółowy (ok. 2000-2500 słów). Wiele przykładów, detali i analiz.",
    very_long: lang === 'en' ? "Extremely comprehensive, deep dive (approx. 5000+ characters / 1500-2000 words). Cover every detail, extensive examples." : "Bardzo obszerny i wyczerpujący (ok. 5000+ znaków / 1500-2000 słów). Wyczerp temat maksymalnie, podaj liczne przykłady."
  };

  const targetLen = specificLength || briefing.targetLength || 'medium';

  const contextSection = hasContext 
    ? `
      === SOURCE MATERIAL / KNOWLEDGE BASE ===
      CRITICAL INSTRUCTION: Use the knowledge from the text below to write the chapter. 
      Prioritize the specific facts, styles, or definitions found here over general knowledge.
      
      ${briefing.contextMaterial?.substring(0, 50000)}
      ========================================
    ` 
    : '';

  const basePrompt = lang === 'en' 
    ? `
      WE ARE IN PHASE 3: CONTENT CREATION.
      Write the full content for chapter: "${chapterTitle}".
      
      E-book Context: "${ebookTitle}"
      Author: "${briefing.authorName}"
      Chapter Description: ${chapterDescription}
      Briefing:
      - Audience: ${briefing.targetAudience}
      - Problem: ${briefing.coreProblem}
      - Tone: ${briefing.tone}
      
      REQUIRED LENGTH: ${lengthMap[targetLen]}

      ${contextSection}

      ${userInstructions ? `\n    ADDITIONAL USER INSTRUCTIONS/OUTLINE:\n    "${userInstructions}"\n` : ''}

      Guidelines for this chapter (AMAZON KDP OPTIMIZATION):
      1. Start with the problem/hook.
      2. Move to the solution.
      3. Provide example/proof (Case Study or Metaphor).
      4. End with an actionable step (Action Point).
      5. FORMATTING:
         - Use short paragraphs (1-3 sentences) for better readability on Kindle.
         - Use H2 (##) for main sections.
         - Use H3 (###) for subsections.
         - Do NOT use H1.
      
      6. DATA & VISUALS:
         - Insert a Markdown Table with data/stats/comparison. THIS IS REQUIRED.
         - Use emojis (👉, ✅, 💡) for lists to improve scanning.

      LANGUAGE: Write in perfect US English.
    `
    : `
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

      ${contextSection}

      ${userInstructions ? `\n    DODATKOWE WYTYCZNE/OUTLINE OD UŻYTKOWNIKA:\n    "${userInstructions}"\n` : ''}

      Wytyczne dla tego rozdziału:
      1. Zacznij od problemu.
      2. Przejdź do rozwiązania.
      3. Podaj przykład/dowód (Case Study lub metafora).
      4. Zakończ zadaniem dla czytelnika (Action Point).
      
      5. ELEMENTY STATYSTYCZNE:
         - Wstaw tabelę (Markdown Table) z danymi, statystykami lub porównaniem. To jest WYMAGANE.
      
      6. WIZUALIZACJA TEKSTU:
         - Używaj emoji (👉, ✅, 💡) przy listach punktowanych, aby ułatwić skanowanie tekstu.

      7. FORMATOWANIE:
         - Używaj nagłówków H2 (##) dla głównych sekcji.
         - Używaj nagłówków H3 (###) dla podsekcji.
         - Nie używaj H1.
    `;

  const instruction = lang === 'en'
    ? `You are a world-class non-fiction ghostwriter specializing in Amazon KDP bestsellers. You write in engaging, accessible US English. You prioritize value, clarity, and actionable advice.`
    : SYSTEM_INSTRUCTION;

  const responseStream = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents: basePrompt,
    config: {
      systemInstruction: instruction,
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
  const lang = briefing.language || 'pl';
  
  const fullContent = chapters.map(c => `### ${c.title}\n${c.content}`).join('\n\n');

  const prompt = lang === 'en'
    ? `
      PHASE 4: EXTRAS & MARKETING (AMAZON KDP MODE).
      E-book Title: "${ebookTitle}"
      Author: ${briefing.authorName}
      Chapter Count: ${chapters.length}

      Below is the content snippet. Use it to create marketing materials in ENGLISH.
      --- CONTENT ---
      ${fullContent.substring(0, 50000)} ...
      ----------------

      Generate a JSON object with the following fields:
      1. 'marketingBlurb': AIDA model sales description for Amazon Book Description (HTML allowed).
      2. 'shortDescription': Max 100 characters. Viral HOOK style.
      3. 'mediumDescription': Max 200 characters. Problem + Solution style.
      4. 'longDescription': Detailed promotional text / Email copy.
      5. 'checklist': Action Plan checklist (Markdown format with ✅).
      6. 'alternativeTitles': 3 alternative catchy titles.
      7. 'faq': 5-10 Frequently Asked Questions.
      8. 'imagePrompts':
         - 'cover': Prompt for A4 Vertical cover. MUST include text instruction: "author: R | H" and "year: 2025".
         - 'box3d': 3D Boxshot prompt.
         - 'tocBackground': Vertical background.
         - 'pageBackground': Subtle background.
         - 'chapterImages': Array of ${chapters.length} prompts.
      9. 'viralVideoPrompts':
         - 'youtube': Long video idea.
         - 'tiktok': Viral script.
         - 'instagram': Reels idea.
         - 'facebookAds': Ad script.

      LANGUAGE: US English.
    `
    : `
      Jesteśmy w FAZIE 4: DODATKI I MARKETING.
      E-book pt. "${ebookTitle}" jest gotowy.
      Autor: ${briefing.authorName}
      Liczba rozdziałów: ${chapters.length}

      Poniżej znajduje się pełna treść e-booka. Wykorzystaj ją, aby stworzyć precyzyjne i dopasowane materiały.
      
      --- TREŚĆ EBOOKA ---
      ${fullContent.substring(0, 50000)} ... (skrócono dla kontekstu)
      --------------------

      Wciel się w rolę ŚWIATOWEJ KLASY COPYWRITERA. Twórz teksty, które sprzedają.
      Wygeneruj zestaw materiałów dodatkowych w formacie JSON.
      
      Wytyczne do tekstów reklamowych:
      - 'shortDescription': MAKSYMALNIE 100 znaków. To ma być wiralowy HOOK. Uderz w emocje.
      - 'mediumDescription': MAKSYMALNIE 200 znaków. Przedstaw Problem i Obietnicę Rozwiązania.
      - 'longDescription': Długi, perswazyjny opis promocyjny pod post na Facebooka lub Email. Storytelling.
      - 'marketingBlurb': Tekst sprzedażowy na landing page (model AIDA).

      Inne wytyczne:
      - 'checklist': Lista zadań do odhaczenia. Format Markdown Checklist: "- [ ] Zadanie 1". Użyj emoji (✅).
      - 'faq': Odpowiedzi konkretne i pomocne.
      
      SZCZEGÓLNE WYTYCZNE DLA OBRAZÓW:
      - Prompty w języku ANGIELSKIM.
      - Wszystkie obrazy w formacie PIONOWYM A4.
      - 'cover': ZAWSZE dopisz instrukcję tekstową: "text: '${ebookTitle.substring(0, 15)}...'" oraz "author: R | H".
      
      Pola JSON:
      1. 'marketingBlurb': Landing Page Text.
      2. 'shortDescription': Ad Copy (100 znaków).
      3. 'mediumDescription': Ad Copy (200 znaków).
      4. 'longDescription': Ad Copy (Długi Post).
      5. 'checklist': "Action Plan".
      6. 'alternativeTitles': 3 alternatywne tytuły.
      7. 'faq': FAQ.
      8. 'imagePrompts': Obiekt zawierający prompty do generatora obrazów:
         - 'cover', 'box3d', 'tocBackground', 'pageBackground'.
         - 'chapterImages': Lista ${chapters.length} promptów.
      9. 'viralVideoPrompts': Prompty wideo (youtube, tiktok, instagram, facebookAds).
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
          shortDescription: { type: Type.STRING, description: "Max 100 characters hook" },
          mediumDescription: { type: Type.STRING, description: "Max 200 characters problem/solution" },
          longDescription: { type: Type.STRING, description: "Full promotional copy" },
          checklist: { type: Type.STRING },
          alternativeTitles: { type: Type.ARRAY, items: { type: Type.STRING } },
          faq: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                answer: { type: Type.STRING }
              },
              required: ["question", "answer"]
            }
          },
          imagePrompts: {
            type: Type.OBJECT,
            properties: {
              cover: { type: Type.STRING },
              box3d: { type: Type.STRING },
              tocBackground: { type: Type.STRING },
              pageBackground: { type: Type.STRING },
              chapterImages: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["cover", "box3d", "tocBackground", "pageBackground", "chapterImages"]
          },
          viralVideoPrompts: {
            type: Type.OBJECT,
            properties: {
              youtube: { type: Type.STRING },
              tiktok: { type: Type.STRING },
              instagram: { type: Type.STRING },
              facebookAds: { type: Type.STRING },
            },
            required: ["youtube", "tiktok", "instagram", "facebookAds"]
          }
        },
        required: ["marketingBlurb", "shortDescription", "mediumDescription", "longDescription", "checklist", "alternativeTitles", "faq", "imagePrompts", "viralVideoPrompts"]
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

// Generowanie Audio (Audiobook) - CHUNKED to avoid token limits
export const generateAudiobook = async (text: string, voiceName: string = 'Kore'): Promise<string> => {
  const ai = getClient();
  
  // Split text into safe chunks (approx 4000 chars to stay well under 8192 token limit)
  const CHUNK_SIZE = 4000;
  const chunks = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.substring(i, i + CHUNK_SIZE));
  }

  const allPcmData: Uint8Array[] = [];
  let totalLength = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunkPrompt = i === 0 
        ? `Read this e-book part clearly and professionally in the detected language (likely Polish or English): ${chunks[i]}`
        : `Continue reading: ${chunks[i]}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: chunkPrompt,
            config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName },
                },
            },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        
        if (base64Audio) {
            const binaryString = atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let j = 0; j < len; j++) {
                bytes[j] = binaryString.charCodeAt(j);
            }
            allPcmData.push(bytes);
            totalLength += bytes.length;
        }
    } catch (err) {
        console.warn(`Error generating audio for chunk ${i}`, err);
    }
  }

  if (totalLength === 0) {
    throw new Error("No audio data received from any chunk.");
  }

  // Concatenate all chunks into one buffer
  const combinedPcm = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of allPcmData) {
      combinedPcm.set(arr, offset);
      offset += arr.length;
  }

  // Wrap combined PCM in WAV container
  const wavBlob = pcmToWav(combinedPcm, 24000); 
  
  return URL.createObjectURL(wavBlob);
};

// Generowanie Kursu / Szkolenia
export const generateCourse = async (briefing: BriefingData, ebookTitle: string, chapters: Chapter[]): Promise<TrainingCourse> => {
  const ai = getClient();
  const fullContent = chapters.map(c => `### ${c.title}\n${c.content}`).join('\n\n');

  const prompt = `
    Jesteś ekspertem Instructional Design i Trenerem Biznesu. 
    Twoim zadaniem jest zamienić treść e-booka w PROFESJONALNY i SZCZEGÓŁOWY plan szkolenia / kursu online.
    
    TYTUŁ E-BOOKA: "${ebookTitle}"
    AUTOR: "${briefing.authorName}"
    GRUPA DOCELOWA: "${briefing.targetAudience}"

    --- TREŚĆ E-BOOKA ---
    ${fullContent.substring(0, 60000)} ...
    --------------------

    Stwórz strukturę kursu w formacie JSON.
    Kurs powinien być podzielony na Moduły.
    
    WAŻNE: KAŻDY MODUŁ MUSI BYĆ ROZPISANY BARDZO SZCZEGÓŁOWO.
    W polu 'duration' dla lekcji podaj konkretne minuty (np. "15 min").
    W polu 'title' modułu zawrzyj zsumowany czas trwania.

    WYMAGANA STRUKTURA JSON:
    1. title: Tytuł szkolenia (może być inny niż e-booka, bardziej "szkoleniowy").
    2. description: Krótki opis szkolenia i jego cel.
    3. targetAudience: Dla kogo (krótko).
    4. totalDuration: Całkowity czas (zsumowany).
    5. modules: Tablica modułów. Każdy moduł ma:
       - title: Tytuł modułu (wraz z czasem, np. "Moduł 1: Podstawy (45 min)").
       - objective: Cel edukacyjny modułu.
       - lessons: Tablica lekcji. Każda lekcja ma:
          - title: Temat lekcji.
          - duration: Czas (np. "10 min").
          - keyTakeaways: Tablica 3-4 kluczowych myśli/punktów merytorycznych.
          - activity: Proponowane ćwiczenie praktyczne dla uczestnika (konkretne zadanie).
    6. quiz: Tablica 5 pytań sprawdzających wiedzę (wielokrotny wybór).
       - question: Pytanie.
       - options: Tablica 4 odpowiedzi.
       - correctAnswer: Treść poprawnej odpowiedzi.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: "You are an Instructional Designer. Create a DETAILED, timed course syllabus.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          targetAudience: { type: Type.STRING },
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
                    properties: {
                      title: { type: Type.STRING },
                      duration: { type: Type.STRING },
                      keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
                      activity: { type: Type.STRING }
                    },
                    required: ["title", "duration", "keyTakeaways", "activity"]
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
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING }
              },
              required: ["question", "options", "correctAnswer"]
            }
          }
        },
        required: ["title", "description", "targetAudience", "totalDuration", "modules", "quiz"]
      }
    }
  });

  if (response.text) {
    try {
      return JSON.parse(cleanJsonText(response.text)) as TrainingCourse;
    } catch (e) {
      console.error("JSON Parse Error in generateCourse:", e);
      throw new Error("Błąd generowania kursu.");
    }
  }
  throw new Error("Błąd generowania kursu.");
};

export const generateNicheIdeas = async (userQuery: string): Promise<NicheIdea[]> => {
  const ai = getClient();
  const prompt = `
    Użytkownik szuka pomysłu na e-booka. Działa w niszy/interesuje się: "${userQuery}".
    
    Zaproponuj 3 konkretne, dochodowe pomysły. Odpowiedź w JSON.
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
  
  const prompt = `
    Jesteś analitykiem rynku wydawniczego.
    Twoim zadaniem jest znalezienie najbardziej dochodowych, TRENDUJĄCYCH obecnie nisz na e-booki, 
    bazując na informacjach z Google Search.

    Znajdź 3 "Gorące Nisze" (Hot Niches).
    
    Użytkownik prosi o:
    1. Tytuł e-booka
    2. Grupę docelową
    3. Opis problemu
    4. Uzasadnienie rynkowe

    Zwróć wynik WYŁĄCZNIE jako obiekt JSON (bez znaczników Markdown):
    {
      "ideas": [
        {
          "topic": "...",
          "audience": "...",
          "problem": "...",
          "reason": "..."
        }
      ]
    }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    }
  });

  let ideas: NicheIdea[] = [];
  const sources: string[] = [];

  if (response.candidates && response.candidates[0].groundingMetadata?.groundingChunks) {
    response.candidates[0].groundingMetadata.groundingChunks.forEach(chunk => {
      if (chunk.web?.uri) {
        sources.push(chunk.web.uri);
      }
    });
  }

  if (response.text) {
    try {
      const clean = cleanJsonText(response.text);
      const parsed = JSON.parse(clean);
      if (parsed.ideas) {
        ideas = parsed.ideas.map((idea: any) => ({
          ...idea,
          sources: sources
        }));
      }
    } catch (e) {
      console.error("Failed to parse recommendations JSON", e, response.text);
    }
  }

  return ideas;
};

export const generateImage = async (prompt: string): Promise<string> => {
  const ai = getClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: prompt }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4" 
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      const base64EncodeString: string = part.inlineData.data;
      return `data:${part.inlineData.mimeType};base64,${base64EncodeString}`;
    }
  }
  
  throw new Error("Failed to generate image or no image found in response.");
};

export const generateImageVariations = async (prompt: string, count: number = 4): Promise<string[]> => {
  // Use Promise.all to fetch multiple images in parallel
  const promises = Array(count).fill(prompt).map(p => generateImage(p));
  
  // We use allSettled to ensure we get some images even if one request fails
  const results = await Promise.allSettled(promises);
  
  const images = results
    .filter(r => r.status === 'fulfilled')
    .map(r => (r as PromiseFulfilledResult<string>).value);
    
  if (images.length === 0) {
     throw new Error("Failed to generate any image variations.");
  }
  
  return images;
};

export const generateVideo = async (prompt: string): Promise<string> => {
  const ai = getClient();
  const apiKey = (typeof process !== 'undefined' ? process.env?.API_KEY : '') || '';

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '9:16'
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000)); 
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  // Ensure type safety - cast or check if uri exists
  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  
  if (videoUri) {
    return `${videoUri}&key=${apiKey}`;
  }

  throw new Error("Failed to generate video.");
};