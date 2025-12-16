import React, { useState, useRef } from 'react';
import { Plus, Book, Clock, Sparkles, ArrowRight, Trash2, Edit, TrendingUp, Lightbulb, Upload, FileUp } from 'lucide-react';
import { EbookData, NicheIdea, BriefingData, Chapter } from '../types';
import { generateNicheIdeas, getRecommendations } from '../services/geminiService';
import { INITIAL_BRIEFING } from '../constants';

declare var mammoth: any;
declare var pdfjsLib: any;

interface DashboardProps {
  savedEbooks: EbookData[];
  onNewEbook: () => void;
  onOpenEbook: (ebook: EbookData) => void;
  onDeleteEbook: (id: string) => void;
  onStartFromIdea: (idea: BriefingData) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  savedEbooks, 
  onNewEbook, 
  onOpenEbook, 
  onDeleteEbook,
  onStartFromIdea
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'recommendations' | 'agent'>('library');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Agent state
  const [agentQuery, setAgentQuery] = useState('');
  const [agentIdeas, setAgentIdeas] = useState<NicheIdea[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Recommendations state
  const [recommendedIdeas, setRecommendedIdeas] = useState<NicheIdea[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);

  const handleAgentSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const ideas = await generateNicheIdeas(agentQuery);
      setAgentIdeas(ideas);
    } catch (error) {
      console.error(error);
      alert("Nie udało się wygenerować pomysłów. Spróbuj ponownie.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleTabChange = (tab: 'library' | 'recommendations' | 'agent') => {
    setActiveTab(tab);
    if (tab === 'recommendations' && recommendedIdeas.length === 0) {
      fetchRecommendations();
    }
  };

  const fetchRecommendations = async () => {
    setIsLoadingRecs(true);
    try {
      const pastTopics = savedEbooks
        .slice(0, 3)
        .map(e => e.briefing?.topic || e.title)
        .filter(t => t && t.length > 2);
      
      const ideas = await getRecommendations(pastTopics);
      setRecommendedIdeas(ideas);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const readPdfFile = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error("Biblioteka PDF.js nie jest załadowana.");
    }
    
    // Ensure worker is set (redundant safe check)
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
       pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText;
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let content = "";
      let title = file.name.replace(/\.[^/.]+$/, "");
      let parsedChapters: Chapter[] = [];

      // 1. EXTRACT CONTENT
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.id && data.chapters) {
          onOpenEbook(data);
          return;
        }
      } else if (file.name.endsWith('.docx')) {
        if (typeof mammoth === 'undefined') {
          alert("Biblioteka Mammoth.js nie została załadowana.");
          return;
        }
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        content = result.value;
      } else if (file.name.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        content = await readPdfFile(arrayBuffer);
      } else {
        // txt, md
        content = await file.text();
      }

      // 2. PARSE CONTENT INTO CHAPTERS (Simple Heuristic)
      // Look for lines starting with "Rozdział X", "Chapter X", or "# "
      const chapterRegex = /(?:^|\n)(?:Rozdział|Chapter)\s+\d+.*|(?:\n#\s+.*)/i;
      
      if (chapterRegex.test(content)) {
        // Try to split
        // This is a naive split, but better than nothing
        const parts = content.split(/(?:^|\n)((?:Rozdział|Chapter)\s+\d+.*|(?:\n#\s+.*))/i).filter(p => p.trim());
        
        let currentTitle = "Wstęp / Import";
        let currentBody = "";

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            // If part looks like a header, set it as title for next body
            if (/^(?:Rozdział|Chapter)\s+\d+|^\n#\s+/.test(part) || part.length < 100 && !part.includes('\n')) {
                if (currentBody.trim()) {
                    parsedChapters.push({
                        id: `ch-${crypto.randomUUID()}`,
                        title: currentTitle.replace(/^\n#\s+/, '').trim(),
                        description: "Zaimportowana treść",
                        content: currentBody.trim(),
                        status: 'completed'
                    });
                }
                currentTitle = part.trim();
                currentBody = "";
            } else {
                currentBody += part;
            }
        }
        // Add last part
        if (currentBody.trim() || currentTitle) {
             parsedChapters.push({
                id: `ch-${crypto.randomUUID()}`,
                title: currentTitle.replace(/^\n#\s+/, '').trim(),
                description: "Zaimportowana treść",
                content: currentBody.trim(),
                status: 'completed'
            });
        }
      } 
      
      // Fallback: One big chapter
      if (parsedChapters.length === 0) {
        parsedChapters.push({
            id: `ch-${crypto.randomUUID()}`,
            title: "Pełna Treść (Import)",
            description: "Cały tekst zaimportowany z pliku",
            content: content,
            status: 'completed'
        });
      }

      // 3. CREATE EBOOK OBJECT
      const newEbook: EbookData = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        title: title,
        chapters: parsedChapters,
        briefing: {
            ...INITIAL_BRIEFING,
            topic: title,
            coreProblem: "Importowany e-book",
            targetAudience: "Ogólna"
        }
      };

      alert(`Pomyślnie zaimportowano plik: ${title}\nStworzono ${parsedChapters.length} rozdziałów.`);
      
      // 4. OPEN EBOOK
      onOpenEbook(newEbook);

    } catch (err) {
      console.error("Import error:", err);
      alert("Błąd importu pliku. Upewnij się, że format jest poprawny.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-8 lg:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Twoje Studio</h1>
            <p className="text-gray-600">Zarządzaj swoimi e-bookami lub znajdź nową inspirację.</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-2 justify-center">
             <button
              onClick={() => handleTabChange('library')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'library' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
             >
               Biblioteka
             </button>
             <button
              onClick={() => handleTabChange('recommendations')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center ${activeTab === 'recommendations' ? 'bg-white shadow text-amber-600' : 'text-gray-500 hover:text-gray-900'}`}
             >
               <TrendingUp className="w-4 h-4 mr-2" />
               Nisza & Trendy
             </button>
             <button
              onClick={() => handleTabChange('agent')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center ${activeTab === 'agent' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-900'}`}
             >
               <Sparkles className="w-4 h-4 mr-2" />
               Agent AI
             </button>
          </div>
        </div>

        {activeTab === 'library' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* Create New Card */}
            <button
              onClick={onNewEbook}
              className="flex flex-col items-center justify-center h-72 border-2 border-dashed border-gray-300 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                <Plus className="w-8 h-8" />
              </div>
              <span className="text-lg font-bold text-gray-700 group-hover:text-blue-700">Nowy Projekt</span>
            </button>

            {/* Import Card */}
            <button
              onClick={handleImportClick}
              className="flex flex-col items-center justify-center h-72 border-2 border-dashed border-gray-300 rounded-2xl hover:border-green-500 hover:bg-green-50 transition-all group"
            >
               <input 
                 type="file" 
                 accept=".docx,.txt,.md,.json,.pdf" 
                 ref={fileInputRef} 
                 className="hidden" 
                 onChange={handleFileImport}
               />
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 group-hover:scale-110 transition-transform">
                <FileUp className="w-8 h-8" />
              </div>
              <span className="text-lg font-bold text-gray-700 group-hover:text-green-700">Importuj (DOCX/PDF)</span>
            </button>

            {/* Ebook Cards */}
            {savedEbooks.map((ebook) => (
              <div key={ebook.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all overflow-hidden flex flex-col h-72 cursor-pointer group" onClick={() => onOpenEbook(ebook)}>
                {/* Visual Cover Area */}
                <div className="h-40 bg-gradient-to-br from-indigo-50 to-blue-100 p-4 flex items-center justify-center relative overflow-hidden">
                   <div className="absolute inset-0 bg-white/30 skew-y-6 transform origin-bottom-left"></div>
                   <div className="relative w-24 h-32 bg-white shadow-lg rounded-r-md border-l-4 border-indigo-600 flex flex-col p-2 transform group-hover:-translate-y-1 transition-transform duration-300">
                      <div className="text-[0.5rem] font-bold text-gray-800 leading-tight line-clamp-3 mb-1">
                        {ebook.title || "Bez Tytułu"}
                      </div>
                      <div className="mt-auto text-[0.4rem] text-gray-400">
                        {ebook.briefing?.authorName || "Autor"}
                      </div>
                      <div className="h-0.5 w-full bg-indigo-600 mt-1"></div>
                   </div>
                   <div className="absolute top-3 right-3">
                     <span className="text-xs font-semibold px-2 py-1 bg-white/80 text-gray-600 rounded-full backdrop-blur-sm shadow-sm">
                      {ebook.chapters.filter(c => c.status === 'completed').length} / {ebook.chapters.length}
                     </span>
                   </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {ebook.title || "Bez Tytułu"}
                  </h3>
                  <div className="flex items-center text-xs text-gray-400 mt-auto justify-between">
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDate(ebook.lastUpdated)}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteEbook(ebook.id); }}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1"
                      title="Usuń"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
             <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 mb-8 flex items-start">
               <div className="bg-amber-100 p-3 rounded-full mr-4 text-amber-600 hidden sm:block">
                 <Lightbulb className="w-6 h-6" />
               </div>
               <div>
                 <h2 className="text-xl font-bold text-amber-900 mb-2">Nisza Hunter (AI + Web Search)</h2>
                 <p className="text-amber-800/80">
                   Te propozycje są generowane na podstawie <strong>aktualnych trendów z Google</strong>. 
                   System analizuje, czego ludzie szukają w internecie, aby zaproponować tematy z najwyższym potencjałem sprzedażowym.
                 </p>
               </div>
             </div>

             {isLoadingRecs ? (
               <div className="flex flex-col items-center justify-center py-12">
                  <Sparkles className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                  <p className="text-lg font-medium text-gray-600">Przeszukuję internet w poszukiwaniu trendów...</p>
               </div>
             ) : (
               <div className="space-y-8">
                 {recommendedIdeas.map((idea, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:border-amber-300 hover:shadow-md transition-all">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-gray-900 mb-2 break-words">{idea.topic}</h3>
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                             <span className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-bold rounded uppercase tracking-wide flex items-center whitespace-nowrap">
                               <TrendingUp className="w-3 h-3 mr-1" /> HOT TREND
                             </span>
                             <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded whitespace-nowrap">
                               Dla: {idea.audience}
                             </span>
                          </div>
                          <p className="text-gray-600 mb-2 whitespace-normal break-words">
                            <span className="font-semibold text-gray-900">Problem:</span> {idea.problem}
                          </p>
                          <p className="text-gray-500 text-sm italic mb-4 whitespace-normal break-words">
                            "{idea.reason}"
                          </p>
                          
                          {idea.sources && idea.sources.length > 0 && (
                            <div className="bg-gray-50 p-3 rounded text-xs text-gray-500 break-all">
                               <strong className="block mb-1">Źródła Trendu:</strong>
                               {idea.sources.slice(0, 2).map((src, i) => (
                                 <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline block truncate mb-0.5">
                                   {src}
                                 </a>
                               ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => onStartFromIdea({
                            ...INITIAL_BRIEFING,
                            topic: idea.topic,
                            targetAudience: idea.audience,
                            coreProblem: idea.problem,
                            tone: 'Profesjonalny i inspirujący'
                          })}
                          className="flex items-center justify-center whitespace-nowrap text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 px-6 py-3 rounded-lg transition-all shadow-lg shadow-amber-600/20 md:self-start"
                        >
                          Wybierz <ArrowRight className="w-4 h-4 ml-2" />
                        </button>
                      </div>
                    </div>
                 ))}
                 
                 {!isLoadingRecs && recommendedIdeas.length === 0 && (
                   <div className="text-center py-12 text-gray-500">
                     Brak wyników. Kliknij poniżej, aby spróbować ponownie.
                   </div>
                 )}

                  <div className="text-center mt-8">
                     <button 
                       onClick={fetchRecommendations}
                       className="text-amber-700 hover:text-amber-900 font-medium text-sm flex items-center justify-center mx-auto"
                     >
                       <TrendingUp className="w-4 h-4 mr-1" />
                       Wyszukaj nowe trendy w internecie
                     </button>
                   </div>
               </div>
             )}
          </div>
        )}

        {activeTab === 'agent' && (
          <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl mb-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <Sparkles className="w-6 h-6 mr-2" />
                Nie masz pomysłu? Zapytaj Agenta.
              </h2>
              <form onSubmit={handleAgentSearch} className="relative">
                <input
                  type="text"
                  value={agentQuery}
                  onChange={(e) => setAgentQuery(e.target.value)}
                  placeholder="np. joga dla początkujących, marketing w social media..."
                  className="w-full px-6 py-4 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-4 focus:ring-purple-400/50 outline-none shadow-lg pr-32"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="absolute right-2 top-2 bottom-2 bg-indigo-900 hover:bg-indigo-800 text-white px-6 rounded-lg font-bold transition-colors disabled:opacity-70 flex items-center"
                >
                  {isSearching ? <Sparkles className="w-4 h-4 animate-spin" /> : "Generuj"}
                </button>
              </form>
            </div>

            <div className="space-y-6">
              {agentIdeas.map((idea, idx) => (
                <div key={idx} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:border-purple-300 transition-all">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 break-words">{idea.topic}</h3>
                      <p className="text-gray-600 text-sm mb-3 whitespace-normal break-words"><strong className="text-gray-800">Problem:</strong> {idea.problem}</p>
                      <p className="text-gray-500 text-xs italic whitespace-normal break-words">"{idea.reason}"</p>
                    </div>
                    <div className="mt-2 md:mt-0 flex-shrink-0">
                      <button
                        onClick={() => onStartFromIdea({
                          ...INITIAL_BRIEFING,
                          topic: idea.topic,
                          targetAudience: idea.audience,
                          coreProblem: idea.problem,
                          tone: 'Profesjonalny i inspirujący'
                        })}
                        className="flex items-center text-sm font-bold text-white bg-gray-900 hover:bg-black px-5 py-2.5 rounded-lg transition-all whitespace-nowrap"
                      >
                        Stwórz ten e-book <ArrowRight className="w-4 h-4 ml-2" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};