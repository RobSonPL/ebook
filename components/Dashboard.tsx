
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Plus, Book, Clock, Sparkles, ArrowRight, Trash2, TrendingUp, Search, Filter, Tag, Loader2, Lightbulb } from 'lucide-react';
import { EbookData, NicheIdea, BriefingData, EbookCategory } from '../types';
import { generateNicheIdeas, getRecommendations } from '../services/geminiService';
import { INITIAL_BRIEFING } from '../constants';

// Fixed 'AI' to 'Ai' on line 9 to match EbookCategory type definition
const CATEGORIES: EbookCategory[] = [
  'psychologia', 'rodzina', 'relacje', 'social media', 'Ai', 'uzależnienia', 
  'życie zawodowe', 'życie rodzinne', 'mąż/żona', 'dzieci', 'rodzice', 'książki', 
  'inspiracje', 'inspirujące postacie', 'medytacja', 'hipnoza', 'rozwój osobisty', 
  'technologia jutra', 'finanse', 'marketing', 'food'
];

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
  const [selectedCategory, setSelectedCategory] = useState<EbookCategory | 'wszystkie'>('wszystkie');
  
  const [agentQuery, setAgentQuery] = useState('');
  const [agentIdeas, setAgentIdeas] = useState<NicheIdea[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [recommendedIdeas, setRecommendedIdeas] = useState<NicheIdea[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);

  // Normalizacja kategorii do porównania (lowercase i usunięcie zbędnych spacji)
  const normalize = (cat: string) => cat ? cat.toLowerCase().trim() : '';

  // Filtrowanie biblioteki
  const filteredEbooks = useMemo(() => {
    if (selectedCategory === 'wszystkie') return savedEbooks;
    return savedEbooks.filter(e => normalize(e.briefing?.category || '') === normalize(selectedCategory));
  }, [savedEbooks, selectedCategory]);

  // Filtrowanie trendów
  const filteredRecommendations = useMemo(() => {
    if (selectedCategory === 'wszystkie') return recommendedIdeas;
    return recommendedIdeas.filter(idea => normalize(idea.category) === normalize(selectedCategory));
  }, [recommendedIdeas, selectedCategory]);

  // Filtrowanie wyników agenta
  const filteredAgentIdeas = useMemo(() => {
    if (selectedCategory === 'wszystkie') return agentIdeas;
    return agentIdeas.filter(idea => normalize(idea.category) === normalize(selectedCategory));
  }, [agentIdeas, selectedCategory]);

  const handleAgentSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAgentIdeas([]); // Czyścimy przed wyszukiwaniem
    setIsSearching(true);
    try {
      const context = agentQuery || "najbardziej dochodowe i niszowe tematy e-bookowe";
      const ideas = await generateNicheIdeas(context, selectedCategory);
      setAgentIdeas(ideas);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchRecommendations = async () => {
    setRecommendedIdeas([]); // Czyścimy przed wyszukiwaniem
    setIsLoadingRecs(true);
    try {
      const pastTopics = savedEbooks.slice(0, 5).map(e => e.title);
      const ideas = await getRecommendations(pastTopics, selectedCategory);
      setRecommendedIdeas(ideas);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  // Reakcja na zmianę kategorii LUB zakładki
  useEffect(() => {
    if (activeTab === 'recommendations') {
      fetchRecommendations();
    } else if (activeTab === 'agent') {
      handleAgentSearch();
    }
  }, [selectedCategory, activeTab]);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6 lg:p-10">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 mb-2">Twoje Studio</h1>
            <p className="text-slate-500 font-medium">Globalna analityka i projektowanie treści AI.</p>
          </div>
          <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200">
             <button onClick={() => setActiveTab('library')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'library' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>Biblioteka</button>
             <button onClick={() => setActiveTab('recommendations')} className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center transition-all ${activeTab === 'recommendations' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}><TrendingUp className="w-4 h-4 mr-2" />Trendy</button>
             <button onClick={() => setActiveTab('agent')} className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center transition-all ${activeTab === 'agent' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}><Sparkles className="w-4 h-4 mr-2" />Agent AI</button>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="mb-10 bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-wrap gap-2 items-center">
          <div className="flex items-center text-slate-400 mr-2">
            <Filter className="w-4 h-4 mr-2" />
            <span className="text-[10px] font-black uppercase tracking-widest">Kategorie:</span>
          </div>
          <button onClick={() => setSelectedCategory('wszystkie')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedCategory === 'wszystkie' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Wszystkie</button>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all capitalize ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{cat}</button>
          ))}
        </div>

        {/* Library Content */}
        {activeTab === 'library' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            <button onClick={onNewEbook} className="flex flex-col items-center justify-center h-64 border-3 border-dashed border-slate-200 rounded-3xl hover:border-blue-500 hover:bg-blue-50 transition-all group shadow-sm bg-white">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-all"><Plus className="w-7 h-7" /></div>
              <span className="text-lg font-black text-slate-700">Nowy Projekt</span>
            </button>
            {filteredEbooks.map(ebook => (
              <div key={ebook.id} onClick={() => onOpenEbook(ebook)} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden h-64 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col">
                <div className="h-32 bg-slate-100 p-6 relative flex items-center justify-center">
                   <div className="w-14 h-20 bg-white shadow-xl border-l-4 border-blue-600 rounded-r-lg"></div>
                   {ebook.briefing?.category && (
                    <span className="absolute top-4 right-4 text-[10px] bg-blue-600 text-white px-3 py-1 rounded-full font-black shadow-md flex items-center capitalize"><Tag className="w-3 h-3 mr-1" />{ebook.briefing.category}</span>
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-black text-slate-900 group-hover:text-blue-600 truncate text-lg">{ebook.title || 'Nowy projekt'}</h3>
                  <div className="mt-auto flex justify-between items-center text-slate-400">
                    <span className="flex items-center text-[10px] font-bold uppercase tracking-tighter"><Clock className="w-3 h-3 mr-1" />{new Date(ebook.lastUpdated).toLocaleDateString()}</span>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteEbook(ebook.id); }} className="hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Trends Content */}
        {activeTab === 'recommendations' && (
           <div className="space-y-6 animate-in fade-in duration-500">
             <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-black text-slate-900 flex items-center"><TrendingUp className="w-6 h-6 mr-3 text-amber-500" /> Co pisze świat? (Analiza 2024/2025)</h2>
                <button onClick={fetchRecommendations} disabled={isLoadingRecs} className="text-sm font-bold text-blue-600 hover:underline">Odśwież Trendy</button>
             </div>
             {isLoadingRecs ? (
               <div className="py-20 flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                 <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
                 <p className="font-bold text-slate-400">Analizujemy trendy specyficzne dla kategorii: <span className="text-amber-600 capitalize">"{selectedCategory}"</span>...</p>
               </div>
             ) : (
               <div className="grid gap-4">
                 {filteredRecommendations.length > 0 ? filteredRecommendations.map((idea, i) => (
                   <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 hover:border-amber-400 shadow-sm transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                     <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-700 px-3 py-1 rounded-full">{idea.category}</span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900">{idea.topic}</h3>
                        <p className="text-slate-500 text-sm mt-1 leading-relaxed">{idea.reason}</p>
                     </div>
                     <button 
                       onClick={() => onStartFromIdea({ ...INITIAL_BRIEFING, topic: idea.topic, targetAudience: idea.audience, coreProblem: idea.problem, category: idea.category })} 
                       className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg flex items-center whitespace-nowrap"
                     >
                       Wybierz Trend <ArrowRight className="w-4 h-4 ml-2" />
                     </button>
                   </div>
                 )) : (
                   <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center">
                      <p className="text-slate-400 font-bold mb-4">Brak dopasowanych trendów dla kategorii "{selectedCategory}".</p>
                      <button onClick={fetchRecommendations} className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-black shadow-xl">Spróbuj ponownie wygenerować 8 tematów</button>
                   </div>
                 )}
               </div>
             )}
           </div>
        )}

        {/* Agent AI Content */}
        {activeTab === 'agent' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
            <div className="text-center">
               <h2 className="text-3xl font-black text-slate-900 flex items-center justify-center mb-2"><Sparkles className="w-8 h-8 mr-3 text-purple-600" /> Generator Nisz Dochodowych</h2>
               <p className="text-slate-500">Powiedz mi o czym myślisz, a znajdę lukę na rynku w kategorii <span className="capitalize">"{selectedCategory}"</span>.</p>
            </div>
            
            <form onSubmit={handleAgentSearch} className="relative group">
              <input 
                type="text" 
                value={agentQuery} 
                onChange={(e) => setAgentQuery(e.target.value)} 
                className="w-full p-6 pl-16 rounded-3xl border-none shadow-2xl focus:ring-4 focus:ring-purple-100 outline-none text-lg font-medium transition-all" 
                placeholder="Np. 'nowoczesne wychowanie', 'zarabianie na AI'..." 
              />
              <Search className="w-7 h-7 text-slate-300 absolute left-6 top-6 group-focus-within:text-purple-500 transition-colors" />
              <button 
                type="submit" 
                disabled={isSearching} 
                className="absolute right-4 top-4 bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-2xl font-black shadow-xl disabled:opacity-50 transition-all flex items-center"
              >
                {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Szukaj Niszy'}
              </button>
            </form>

            <div className="grid gap-6">
              {isSearching ? (
                <div className="py-20 text-center"><Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" /><p className="font-bold text-slate-400">Analiza potencjału niszowego w kategorii {selectedCategory}...</p></div>
              ) : filteredAgentIdeas.length > 0 ? filteredAgentIdeas.map((idea, i) => (
                <div key={i} className="bg-white p-8 rounded-[40px] border border-slate-100 hover:shadow-2xl transition-all group flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                   <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                         <span className="text-[10px] font-black uppercase bg-purple-100 text-purple-700 px-3 py-1 rounded-full flex items-center"><Tag className="w-3 h-3 mr-1" />{idea.category}</span>
                         <span className="text-[10px] font-black uppercase bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center"><Lightbulb className="w-3 h-3 mr-1" />Potencjał: Wysoki</span>
                      </div>
                      <h4 className="font-black text-2xl text-slate-900 mb-2">{idea.topic}</h4>
                      <p className="text-slate-500 leading-relaxed font-medium">{idea.problem}</p>
                   </div>
                   <button 
                    onClick={() => onStartFromIdea({ ...INITIAL_BRIEFING, topic: idea.topic, targetAudience: idea.audience, coreProblem: idea.problem, category: idea.category })} 
                    className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-3xl font-black shadow-lg shadow-purple-500/20 transition-all whitespace-nowrap"
                   >
                     Użyj tej Niszy
                   </button>
                </div>
              )) : (
                <div className="py-20 text-center text-slate-300 font-bold italic flex flex-col items-center">
                  <p>Brak wyników niszowych dla kategorii "{selectedCategory}".</p>
                  <button onClick={handleAgentSearch} className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-xl font-black">Wymuś nowe wyszukiwanie</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
