
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Chapter } from '../types';
import { Loader2, CheckCircle, Circle, PlayCircle, X, MessageSquarePlus, AlignLeft, Save, Edit2, Eye, BarChart2 } from 'lucide-react';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';

interface PhaseWritingProps {
  chapters: Chapter[];
  currentChapterId: string | null;
  onSelectChapter: (id: string) => void;
  onGenerateChapter: (id: string, instructions?: string, length?: 'short' | 'medium' | 'long' | 'very_long') => void;
  onUpdateContent: (id: string, content: string) => void;
  onNextPhase: () => void;
  isGenerating: boolean;
  lastSaved: number | null;
}

// Mermaid component for rendering charts in Writing Phase
const Mermaid = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && chart) {
      mermaid.initialize({ startOnLoad: true, theme: 'default' });
      mermaid.run({ nodes: [ref.current] });
    }
  }, [chart]);

  return (
    <div className="mermaid bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-center my-4" ref={ref}>
      {chart}
    </div>
  );
};

export const PhaseWriting: React.FC<PhaseWritingProps> = ({
  chapters,
  currentChapterId,
  onSelectChapter,
  onGenerateChapter,
  onUpdateContent,
  onNextPhase,
  isGenerating,
  lastSaved
}) => {
  const activeChapter = chapters.find(c => c.id === currentChapterId);
  const allCompleted = chapters.every(c => c.status === 'completed');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [chapterLength, setChapterLength] = useState<'short' | 'medium' | 'long' | 'very_long'>('medium');

  // Auto-scroll only when generating
  useEffect(() => {
    if (scrollRef.current && activeChapter?.status === 'generating') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeChapter?.content, activeChapter?.status]);

  const handleOpenGenerationModal = () => {
    // Default suggestion for stats
    setInstructions('- Zawrzyj tabelę z danymi statystycznymi lub diagramem.\n');
    setChapterLength('medium'); 
    setIsModalOpen(true);
  };

  const handleConfirmGeneration = () => {
    if (activeChapter) {
      onGenerateChapter(activeChapter.id, instructions, chapterLength);
      setIsModalOpen(false);
      setIsEditing(false); 
    }
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-gray-100 relative">
      {/* Chapter Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full hidden lg:flex">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Rozdziały</h2>
          <div className="text-xs text-gray-500 mt-1">
            Ukończono: {chapters.filter(c => c.status === 'completed').length} / {chapters.length}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {chapters.map((chapter, index) => (
            <button
              key={chapter.id}
              onClick={() => onSelectChapter(chapter.id)}
              style={{ animationDelay: `${index * 75}ms` }}
              className={`w-full text-left p-3 rounded-lg border transition-all flex items-start group animate-in fade-in slide-in-from-left-4 duration-500 fill-mode-backwards ${
                chapter.id === currentChapterId
                  ? 'border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <div className="mr-3 mt-0.5 flex-shrink-0">
                {chapter.status === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : chapter.status === 'generating' ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 group-hover:text-gray-400" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-gray-500 block mb-0.5">Rozdział {index + 1}</span>
                <span className={`text-sm font-medium block whitespace-normal break-words leading-tight ${chapter.id === currentChapterId ? 'text-blue-900' : 'text-gray-700'}`}>
                  {chapter.title}
                </span>
              </div>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onNextPhase}
            disabled={!allCompleted}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors shadow-lg"
          >
            Zakończ i przejdź do Dodatków
          </button>
        </div>
      </div>

      {/* Editor/Preview Area */}
      <div className="flex-1 flex flex-col h-full bg-white max-w-5xl mx-auto shadow-2xl my-4 lg:my-8 rounded-xl overflow-hidden border border-gray-200 relative">
        {!activeChapter ? (
          <div className="flex-1 flex items-center justify-center flex-col text-gray-400 p-8 text-center">
            <PlayCircle className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-xl font-medium">Wybierz rozdział z listy, aby rozpocząć pisanie.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-8 py-4 border-b border-gray-100 flex justify-between items-center bg-white z-10">
              <div className="flex-1 min-w-0 mr-4">
                <h2 className="text-xl font-bold text-gray-900 truncate">{activeChapter.title}</h2>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                   {lastSaved && (
                     <span className="flex items-center text-green-600 mr-4 transition-opacity duration-500">
                       <Save className="w-3 h-3 mr-1" />
                       Autosaved: {new Date(lastSaved).toLocaleTimeString()}
                     </span>
                   )}
                   <span className="truncate">{activeChapter.description}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Edit Toggle */}
                {activeChapter.status !== 'generating' && (
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isEditing 
                        ? 'bg-gray-100 text-gray-900' 
                        : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    {isEditing ? (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Podgląd
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edytuj
                      </>
                    )}
                  </button>
                )}

                {/* Generate Button */}
                {activeChapter.status !== 'completed' && activeChapter.status !== 'generating' && (
                  <button
                    onClick={handleOpenGenerationModal}
                    disabled={isGenerating}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium transition-colors shadow-md flex items-center disabled:opacity-70 whitespace-nowrap"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <PlayCircle className="w-4 h-4 mr-2" />}
                    Generuj Treść
                  </button>
                )}
                 {activeChapter.status === 'generating' && (
                  <div className="flex items-center text-blue-600 text-sm font-medium animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin mr-2"/>
                    Pisanie w toku...
                  </div>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
               {isEditing ? (
                 <textarea
                   value={activeChapter.content}
                   onChange={(e) => onUpdateContent(activeChapter.id, e.target.value)}
                   className="w-full h-full p-8 lg:p-12 resize-none outline-none font-mono text-gray-800 text-lg leading-relaxed bg-gray-50"
                   placeholder="Zacznij pisać lub wygeneruj treść..."
                 />
               ) : (
                 <div ref={scrollRef} className="h-full overflow-y-auto p-8 lg:p-12">
                   {activeChapter.content ? (
                     <div className="prose prose-lg prose-indigo max-w-none text-gray-800">
                       <ReactMarkdown
                         remarkPlugins={[remarkGfm]}
                         components={{
                            code(props) {
                              const {children, className, node, ...rest} = props;
                              const match = /language-(\w+)/.exec(className || '');
                              if (match && match[1] === 'mermaid') {
                                return <Mermaid chart={String(children).replace(/\n$/, '')} />;
                              }
                              return <code {...rest} className={className}>{children}</code>;
                            }
                         }}
                       >
                         {activeChapter.content}
                       </ReactMarkdown>
                     </div>
                   ) : (
                     <div className="h-full flex items-center justify-center text-gray-300 italic">
                       Treść rozdziału pojawi się tutaj...
                     </div>
                   )}
                   {/* Visual Cursor for generation effect */}
                   {activeChapter.status === 'generating' && (
                     <span className="inline-block w-2 h-5 bg-blue-500 animate-pulse ml-1 align-middle"></span>
                   )}
                 </div>
               )}
            </div>
          </>
        )}
      </div>

      {/* Generation Instructions Modal */}
      {isModalOpen && activeChapter && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Ustawienia Rozdziału</h3>
                <p className="text-sm text-gray-500 truncate max-w-xs">{activeChapter.title}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <AlignLeft className="w-4 h-4 mr-2 text-blue-500" />
                  Długość (szacunkowa)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['short', 'medium', 'long', 'very_long'] as const).map((len) => (
                    <button
                      key={len}
                      onClick={() => setChapterLength(len)}
                      className={`py-2 px-3 text-xs sm:text-sm font-medium rounded-lg border transition-all ${
                        chapterLength === len
                          ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {len === 'short' && 'Krótki (~800 zn)'}
                      {len === 'medium' && 'Standard (~1500 zn)'}
                      {len === 'long' && 'Długi (~2500 zn)'}
                      {len === 'very_long' && 'Bardzo długi (~5000 zn)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <MessageSquarePlus className="w-4 h-4 mr-2 text-blue-500" />
                  Kluczowe punkty / Outline
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm outline-none"
                  placeholder="- Wspomnij o..."
                />
                <p className="text-xs text-gray-400 mt-2 flex items-center">
                   <BarChart2 className="w-3 h-3 mr-1" />
                   Sugestia: Pozostaw domyślne, aby wygenerować statystyki i diagramy.
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleConfirmGeneration}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-600/20 transition-all flex items-center"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
