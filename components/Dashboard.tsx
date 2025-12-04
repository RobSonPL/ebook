import React, { useState, useEffect } from 'react';
import { Plus, Book, Clock, Search, Sparkles, ArrowRight, Trash2, Edit, TrendingUp, Lightbulb } from 'lucide-react';
import { EbookData, NicheIdea, BriefingData } from '../types';
import { generateNicheIdeas, getRecommendations } from '../services/geminiService';

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
      // Get last 3 topics or briefing topics
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
               Rekomendacje
             </button>
             <button
              onClick={() => handleTabChange('agent')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center ${activeTab === 'agent' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-900'}`}
             >
               <Sparkles className="w-4 h-4 mr-2" />
               Agent Inspiracji
             </button>
          </div>
        </div>

        {activeTab === 'library' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* Create New Card */}
            <button
              onClick={onNewEbook}
              className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                <Plus className="w-8 h-8" />
              </div>
              <span className="text-lg font-bold text-gray-700 group-hover:text-blue-700">Nowy Projekt</span>
            </button>

            {/* Ebook Cards */}
            {savedEbooks.map((ebook) => (
              <div key={ebook.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden flex flex-col h-64">
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <Book className="w-6 h-6 text-indigo-600" />
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                      {ebook.chapters.filter(c => c.status === 'completed').length} / {ebook.chapters.length} Rozdziałów
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                    {ebook.title || "Bez Tytułu"}
                  </h3>
                  <div className="flex items-center text-xs text-gray-400 mt-auto">
                    <Clock className="w-3 h-3 mr-1" />
                    Ostatnia edycja: {formatDate(ebook.lastUpdated)}
                  </div>
                </div>
                <div className="bg-gray-50 border-t border-gray-100 p-4 flex justify-between items-center">
                   <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteEbook(ebook.id); }}
                    className="text-gray-400 hover:text-red-500 transition-colors p-2"
                    title="Usuń"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                   <button 
                    onClick={() => onOpenEbook(ebook)}
                    className="flex items-center text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
                   >
                     Otwórz <Edit className="w-4 h-4 ml-1" />
                   </button>
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
                 <h2 className="text-xl font-bold text-amber-900 mb-2">Polecane dla Ciebie</h2>
                 <p className="text-amber-800/80">
                   Te propozycje są generowane przez AI na podstawie Twoich poprzednich projektów oraz aktualnych trendów rynkowych. 
                   Wybierz temat, aby natychmiast rozpocząć pracę nad nowym e-bookiem.
                 </p>
               </div>
             </div>

             {isLoadingRecs ? (
               <div className="space-y-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse"></div>
                  ))}
               </div>
             ) : (
               <div className="space-y-6">
                 {recommendedIdeas.map((idea, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:border-amber-300 hover:shadow-md transition-all">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{idea.topic}</h3>
                          <div className="flex items-center gap-2 mb-3">
                             <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded uppercase tracking-wide">
                               Trending
                             </span>
                             <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded">
                               Dla: {idea.audience}
                             </span>
                          </div>
                          <p className="text-gray-600 mb-2">
                            <span className="font-semibold text-gray-900">Problem:</span> {idea.problem}
                          </p>
                          <p className="text-gray-500 text-sm italic">
                            "{idea.reason}"
                          </p>
                        </div>
                        <button
                          onClick={() => onStartFromIdea({
                            topic: idea.topic,
                            targetAudience: idea.audience,
                            coreProblem: idea.problem,
                            tone: 'Profesjonalny i inspirujący'
                          })}
                          className="flex items-center justify-center whitespace-nowrap text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 px-6 py-3 rounded-lg transition-all shadow-lg shadow-amber-600/20"
                        >
                          Rozpocznij <ArrowRight className="w-4 h-4 ml-2" />
                        </button>
                      </div>
                    </div>
                 ))}
                 
                 {!isLoadingRecs && recommendedIdeas.length === 0 && (
                   <div className="text-center py-12 text-gray-500">
                     Nie udało się pobrać rekomendacji. Spróbuj odświeżyć stronę lub sprawdź połączenie.
                   </div>
                 )}

                  {!isLoadingRecs && recommendedIdeas.length > 0 && (
                   <div className="text-center mt-8">
                     <button 
                       onClick={fetchRecommendations}
                       className="text-amber-700 hover:text-amber-900 font-medium text-sm flex items-center justify-center mx-auto"
                     >
                       <TrendingUp className="w-4 h-4 mr-1" />
                       Pobierz nowe rekomendacje
                     </button>
                   </div>
                 )}
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
              <p className="text-indigo-100 mb-6">
                Wpisz swoją branżę, zainteresowania lub luźny pomysł, a AI zaproponuje Ci 3 dochodowe tematy na e-booka.
              </p>
              
              <form onSubmit={handleAgentSearch} className="relative">
                <input
                  type="text"
                  value={agentQuery}
                  onChange={(e) => setAgentQuery(e.target.value)}
                  placeholder="np. joga dla początkujących, marketing w social media, gotowanie wege..."
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
                <div key={idx} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:border-purple-300 transition-all animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 150}ms` }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{idea.topic}</h3>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full">
                          Dla: {idea.audience}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-3"><strong className="text-gray-800">Problem:</strong> {idea.problem}</p>
                      <p className="text-gray-500 text-xs italic border-l-2 border-purple-200 pl-3">"{idea.reason}"</p>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => onStartFromIdea({
                        topic: idea.topic,
                        targetAudience: idea.audience,
                        coreProblem: idea.problem,
                        tone: 'Profesjonalny i inspirujący'
                      })}
                      className="flex items-center text-sm font-bold text-white bg-gray-900 hover:bg-black px-5 py-2.5 rounded-lg transition-all shadow hover:shadow-lg"
                    >
                      Stwórz ten e-book <ArrowRight className="w-4 h-4 ml-2" />
                    </button>
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