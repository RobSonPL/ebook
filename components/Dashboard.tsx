
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Plus, Book, Clock, Sparkles, ArrowRight, Trash2, TrendingUp, Search, Filter, Tag, Loader2, Lightbulb, Edit3, Wand2, Hash, Ruler, ChevronRight, Zap, Target, ShieldCheck } from 'lucide-react';
import { EbookData, NicheIdea, BriefingData, EbookCategory } from '../types';
import { generateNicheIdeas, getRecommendations } from '../services/geminiService';
import { INITIAL_BRIEFING } from '../constants';

const CATEGORIES: EbookCategory[] = [
  // Fixed: 'children' is not a valid EbookCategory, changed to 'dzieci'
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
  onFastTrackStructure: (briefing: BriefingData) => Promise<void>;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  savedEbooks, 
  onNewEbook, 
  onOpenEbook, 
  onDeleteEbook,
  onStartFromIdea,
  onFastTrackStructure
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'recommendations' | 'agent'>('library');
  const [selectedCategory, setSelectedCategory] = useState<EbookCategory | 'wszystkie'>('wszystkie');
  
  const [agentQuery, setAgentQuery] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [chapterCount, setChapterCount] = useState(8);
  const [targetLength, setTargetLength] = useState<'micro' | 'short' | 'medium' | 'long' | 'very_long' | 'epic'>('medium');
  
  const [isFastTracking, setIsFastTracking] = useState(false);
  const [agentIdeas, setAgentIdeas] = useState<NicheIdea[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [recommendedIdeas, setRecommendedIdeas] = useState<NicheIdea[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);

  const normalize = (cat: string) => cat ? cat.toLowerCase().trim() : '';

  const filteredEbooks = useMemo(() => {
    if (selectedCategory === 'wszystkie') return savedEbooks;
    return savedEbooks.filter(e => normalize(e.briefing?.category || '') === normalize(selectedCategory));
  }, [savedEbooks, selectedCategory]);

  const handleAgentSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAgentIdeas([]);
    setIsSearching(true);
    try {
      const context = agentQuery || "najbardziej dochodowe i niszowe tematy e-bookowe";
      // Fixed: generateNicheIdeas only takes one argument (context: string)
      const ideas = await generateNicheIdeas(context);
      setAgentIdeas(ideas);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFastTrack = async () => {
    if (!agentQuery) return;
    setIsFastTracking(true);
    try {
      const fastTrackBriefing: BriefingData = {
        ...INITIAL_BRIEFING,
        topic: agentQuery,
        coreProblem: customDescription || 'Brak opisu szczegółowego.',
        category: selectedCategory !== 'wszystkie' ? selectedCategory : 'inne',
        chapterCount,
        targetLength,
        authorName: "R | H Philosophy"
      };
      await onFastTrackStructure(fastTrackBriefing);
    } catch (err) {
      console.error(err);
      alert("Wystąpił błąd podczas generowania planu.");
    } finally {
      setIsFastTracking(false);
    }
  };

  const fetchRecommendations = async () => {
    setRecommendedIdeas([]);
    setIsLoadingRecs(true);
    try {
      const pastTopics = savedEbooks.slice(0, 5).map(e => e.title);
      // Fixed: getRecommendations only takes one argument (past: string[])
      const ideas = await getRecommendations(pastTopics);
      setRecommendedIdeas(ideas);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'recommendations') {
      fetchRecommendations();
    }
  }, [selectedCategory, activeTab]);

  // Fixed: Use React.FC to properly handle 'key' and other React attributes when used in maps
  const NicheCard: React.FC<{ idea: NicheIdea, onUse: (idea: NicheIdea) => void }> = ({ idea, onUse }) => (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col h-full">
       <div className="flex justify-between items-start mb-4">
          <span className="text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-600 px-3 py-1 rounded-full">{idea.category}</span>
          <TrendingUp className="w-4 h-4 text-emerald-500" />
       </div>
       <h4 className="text-xl font-black text-slate-900 mb-3 group-hover:text-blue-600 transition-colors leading-tight">{idea.topic}</h4>
       <p className="text-sm text-slate-500 font-medium mb-4 flex-1">{idea.reason}</p>
       <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-start gap-2">
             <Target className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
             <p className="text-[11px] font-bold text-slate-700">Odbiorca: <span className="font-medium text-slate-500">{idea.audience}</span></p>
          </div>
          <div className="flex items-start gap-2">
             <Zap className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" />
             <p className="text-[11px] font-bold text-slate-700">Problem: <span className="font-medium text-slate-500">{idea.problem}</span></p>
          </div>
       </div>
       <button 
          onClick={() => onUse(idea)}
          className="w-full py-3 bg-slate-900 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-600 transition-all group/btn"
       >
          PROJEKTUJ TĘ NISZĘ <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
       </button>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6 lg:p-10">
      <div className="max-w-6xl mx-auto">
        
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

        {activeTab === 'library' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            <button onClick={onNewEbook} className="flex flex-col items-center justify-center h-64 border-3 border-dashed border-slate-200 rounded-3xl hover:border-blue-500 hover:bg-blue-50 transition-all group shadow-sm bg-white">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-all"><Plus className="w-7 h-7" /></div>
              <span className="text-lg font-black text-slate-700">Nowy Projekt</span>
            </button>
            {filteredEbooks.map(ebook => (
              <div key={ebook.id} onClick={() => onOpenEbook(ebook)} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden h-64 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col">
                <div className="h-32 bg-slate-100 p-6 relative flex items-center justify-center">
                   <div className="w-14 h-20 bg-white shadow-xl border-l-4 border-blue-600 rounded-r-lg group-hover:rotate-3 transition-transform"></div>
                   {ebook.briefing?.category && (
                    <span className="absolute top-4 right-4 text-[10px] bg-blue-600 text-white px-3 py-1 rounded-full font-black shadow-md flex items-center capitalize">{ebook.briefing.category}</span>
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

        {activeTab === 'recommendations' && (
          <div className="space-y-10 animate-in fade-in duration-700">
             <div className="text-center max-w-2xl mx-auto mb-12">
                <h2 className="text-3xl font-black text-slate-900 mb-4">R | H Analytics: Trendy 2025 🔥</h2>
                <p className="text-slate-500 font-medium">Analiza trendów rynkowych dopasowana do Twojej historii pisania. Znajdź swoją kolejną dochodową niszową niszową.</p>
             </div>

             {isLoadingRecs ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   {[...Array(8)].map((_, i) => (
                      <div key={i} className="h-80 bg-white rounded-[32px] border border-slate-100 p-8 space-y-4 animate-pulse">
                         <div className="w-1/3 h-4 bg-slate-100 rounded-full"></div>
                         <div className="w-full h-8 bg-slate-200 rounded-xl"></div>
                         <div className="w-full h-24 bg-slate-50 rounded-2xl"></div>
                      </div>
                   ))}
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   {recommendedIdeas.map((idea, i) => (
                      <NicheCard 
                         key={i} 
                         idea={idea} 
                         onUse={(id) => onStartFromIdea({
                            ...INITIAL_BRIEFING,
                            topic: id.topic,
                            targetAudience: id.audience,
                            coreProblem: id.problem,
                            category: id.category
                         })} 
                      />
                   ))}
                </div>
             )}
          </div>
        )}

        {activeTab === 'agent' && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in zoom-in-95 duration-500">
            <div className="text-center">
               <h2 className="text-4xl font-black text-slate-900 flex items-center justify-center mb-3"><Sparkles className="w-10 h-10 mr-4 text-purple-600" /> Kreator Inteligentny</h2>
               <p className="text-slate-500 font-medium">Projektuj e-booki o wysokim autorytecie (R | H Philosophy Standard).</p>
            </div>
            
            <div className="bg-white p-10 rounded-[50px] shadow-2xl space-y-8 border border-slate-100">
              <div className="relative group">
                <input 
                  type="text" 
                  value={agentQuery} 
                  onChange={(e) => setAgentQuery(e.target.value)} 
                  className="w-full p-8 pl-16 rounded-[32px] border border-slate-100 bg-slate-50 focus:bg-white focus:ring-8 focus:ring-purple-50 outline-none text-xl font-black transition-all" 
                  placeholder="Wpisz temat lub tytuł..." 
                />
                <Search className="w-8 h-8 text-slate-300 absolute left-6 top-8 group-focus-within:text-purple-500 transition-colors" />
              </div>

              {agentQuery && (
                <div className="animate-in slide-in-from-top-4 duration-500 space-y-8">
                  <div className="bg-purple-50 p-8 rounded-[40px] border border-purple-100">
                    <label className="flex items-center text-[10px] font-black text-purple-700 uppercase tracking-[0.2em] mb-4">
                       Doprecyzuj wizję (Kontekst Strategiczny)
                    </label>
                    <textarea 
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      className="w-full h-32 p-6 rounded-3xl border-none outline-none focus:ring-0 text-slate-700 bg-white placeholder-slate-300 transition-all shadow-inner font-medium"
                      placeholder="Opisz o czym ma być ten projekt, jakie cele chcesz osiągnąć..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100">
                        <label className="flex items-center text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4"><Ruler className="w-4 h-4 mr-2" /> Długość Rozdziałów</label>
                        <select value={targetLength} onChange={(e) => setTargetLength(e.target.value as any)} className="w-full bg-white border-none px-5 py-4 rounded-2xl font-bold text-sm shadow-sm outline-none focus:ring-4 focus:ring-purple-50">
                           <option value="micro">Mikro (~400 słów)</option>
                           <option value="short">Krótki (~800 słów)</option>
                           <option value="medium">Standard (~1500 słów)</option>
                           <option value="long">Długi (~2500 słów)</option>
                           <option value="epic">Epicki (Deep Dive)</option>
                        </select>
                     </div>
                     <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100">
                        <label className="flex items-center text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4"><Hash className="w-4 h-4 mr-2" /> Ilość Rozdziałów</label>
                        <div className="flex items-center gap-6">
                           <input type="range" min="3" max="25" value={chapterCount} onChange={(e) => setChapterCount(parseInt(e.target.value))} className="flex-1 accent-purple-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                           <span className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-purple-600 text-xl shadow-md">{chapterCount}</span>
                        </div>
                     </div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-6">
                    <button 
                      onClick={handleAgentSearch} 
                      disabled={isSearching || isFastTracking}
                      className="flex-1 py-5 bg-white border border-slate-200 text-slate-600 rounded-3xl font-black hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-lg"
                    >
                      {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                      SZUKAJ NISZ RYNKOWYCH
                    </button>
                    <button 
                      onClick={handleFastTrack}
                      disabled={isFastTracking || isSearching}
                      className="flex-1 py-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-3xl font-black shadow-2xl shadow-purple-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      {isFastTracking ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                      STRATEGIA & STRUKTURA AI
                    </button>
                  </div>
                </div>
              )}

              {agentIdeas.length > 0 && !isSearching && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-10 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-6">
                    {agentIdeas.map((idea, i) => (
                       <NicheCard 
                          key={i} 
                          idea={idea} 
                          onUse={(id) => onStartFromIdea({
                             ...INITIAL_BRIEFING,
                             topic: id.topic,
                             targetAudience: id.audience,
                             coreProblem: id.problem,
                             category: id.category
                          })} 
                       />
                    ))}
                 </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
