
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Chapter } from '../types';
import { Loader2, CheckCircle, Circle, PlayCircle, X, MessageSquarePlus, AlignLeft, Save, Edit2, Eye, BarChart2, Zap, Sparkles } from 'lucide-react';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';

interface PhaseWritingProps {
  chapters: Chapter[];
  currentChapterId: string | null;
  onSelectChapter: (id: string) => void;
  onGenerateChapter: (id: string, instructions?: string, length?: 'micro' | 'short' | 'medium' | 'long' | 'very_long' | 'epic') => void;
  onUpdateContent: (id: string, content: string) => void;
  onNextPhase: () => void;
  isGenerating: boolean;
  lastSaved: number | null;
}

const Mermaid = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && chart) {
      mermaid.initialize({ startOnLoad: true, theme: 'default' });
      mermaid.run({ nodes: [ref.current] });
    }
  }, [chart]);
  return <div className="mermaid bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-center my-4" ref={ref}>{chart}</div>;
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
  const [chapterLength, setChapterLength] = useState<'micro' | 'short' | 'medium' | 'long' | 'very_long' | 'epic'>('medium');

  useEffect(() => {
    if (scrollRef.current && activeChapter?.status === 'generating') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeChapter?.content, activeChapter?.status]);

  const handleOpenGenerationModal = () => {
    setInstructions('- Zawrzyj tabelę z danymi statystycznymi lub diagramem.\n- Dodaj sekcję "Pro Tip" na końcu.');
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

  const handleGenerateAllPending = async () => {
    if (isGenerating) return;
    const pending = chapters.filter(c => c.status !== 'completed');
    for (const ch of pending) {
      onSelectChapter(ch.id);
      await onGenerateChapter(ch.id, "Generuj pełną treść zgodnie z planem.", chapterLength);
    }
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-gray-100 relative">
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
              className={`w-full text-left p-3 rounded-lg border transition-all flex items-start group ${
                chapter.id === currentChapterId ? 'border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <div className="mr-3 mt-0.5 flex-shrink-0">
                {chapter.status === 'completed' ? <CheckCircle className="w-5 h-5 text-green-500" /> : chapter.status === 'generating' ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" /> : <Circle className="w-5 h-5 text-gray-300 group-hover:text-gray-400" />}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-gray-500 block mb-0.5">Rozdział {index + 1}</span>
                <span className={`text-sm font-medium block whitespace-normal break-words leading-tight ${chapter.id === currentChapterId ? 'text-blue-900' : 'text-gray-700'}`}>{chapter.title}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200 space-y-2 bg-gray-50">
          <button 
            onClick={handleGenerateAllPending} 
            disabled={isGenerating || allCompleted} 
            className="w-full py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 disabled:opacity-50 flex items-center justify-center transition-colors"
          >
            <Sparkles className="w-3 h-3 mr-2" /> Napisz Pozostałe
          </button>
          <button onClick={onNextPhase} disabled={!allCompleted} className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold disabled:opacity-50 hover:bg-indigo-700 transition-colors shadow-lg">Eksportuj Dodatki</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full bg-white max-w-5xl mx-auto shadow-2xl lg:my-8 rounded-xl overflow-hidden border border-gray-200 relative">
        {!activeChapter ? (
          <div className="flex-1 flex items-center justify-center flex-col text-gray-400 p-8 text-center bg-gray-50">
            <Sparkles className="w-16 h-16 mb-4 opacity-30 text-blue-600" />
            <p className="text-xl font-bold text-slate-800">Gotowy na pisanie?</p>
            <p className="text-sm mt-2 max-w-xs">Wybierz rozdział z listy po lewej stronie, aby rozpocząć proces twórczy z AI.</p>
          </div>
        ) : (
          <>
            <div className="px-8 py-4 border-b border-gray-100 flex justify-between items-center bg-white z-10">
              <div className="flex-1 min-w-0 mr-4">
                <h2 className="text-xl font-black text-slate-900 truncate">{activeChapter.title}</h2>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                   {lastSaved && <span className="flex items-center text-green-600 mr-4"><Save className="w-3 h-3 mr-1" />Autozapis: {new Date(lastSaved).toLocaleTimeString()}</span>}
                   <span className="truncate max-w-sm italic opacity-70">"{activeChapter.description}"</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {activeChapter.status !== 'generating' && (
                  <button onClick={() => setIsEditing(!isEditing)} className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${isEditing ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'}`}>
                    {isEditing ? <><Eye className="w-4 h-4 mr-2" />Podgląd</> : <><Edit2 className="w-4 h-4 mr-2" />Edytuj Ręcznie</>}
                  </button>
                )}
                {activeChapter.status !== 'completed' && activeChapter.status !== 'generating' && (
                  <button onClick={handleOpenGenerationModal} disabled={isGenerating} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-black shadow-lg shadow-blue-500/20 flex items-center disabled:opacity-70 whitespace-nowrap transition-all hover:scale-105 active:scale-95">
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Sparkles className="w-4 h-4 mr-2" />} Generuj Treść
                  </button>
                )}
                 {activeChapter.status === 'generating' && <div className="flex items-center text-blue-600 text-sm font-bold animate-pulse px-4 py-2 bg-blue-50 rounded-full border border-blue-100"><Loader2 className="w-4 h-4 animate-spin mr-2"/>AI Tworzy Twój Rozdział...</div>}
              </div>
            </div>
            <div className="flex-1 overflow-hidden relative">
               {isEditing ? <textarea value={activeChapter.content} onChange={(e) => onUpdateContent(activeChapter.id, e.target.value)} className="w-full h-full p-8 lg:p-12 resize-none outline-none font-mono text-gray-800 text-lg leading-relaxed bg-slate-50 border-none focus:ring-0" /> : <div ref={scrollRef} className="h-full overflow-y-auto p-8 lg:p-12 selection:bg-blue-100">{activeChapter.content ? <div className="prose prose-lg prose-slate max-w-none text-gray-800"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code(props) { const {children, className, ...rest} = props; const match = /language-(\w+)/.exec(className || ''); return match && match[1] === 'mermaid' ? <Mermaid chart={String(children).replace(/\n$/, '')} /> : <code {...rest} className={className}>{children}</code>; } }}>{activeChapter.content}</ReactMarkdown></div> : <div className="h-full flex items-center justify-center text-slate-300 italic flex-col gap-4"><AlignLeft className="w-12 h-12 opacity-20" /><p>Treść rozdziału pojawi się tutaj po wygenerowaniu...</p></div>}{activeChapter.status === 'generating' && <span className="inline-block w-2 h-6 bg-blue-500 animate-bounce ml-1 align-middle"></span>}</div>}
            </div>
          </>
        )}
      </div>

      {isModalOpen && activeChapter && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-white/20">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <div><h3 className="text-xl font-black text-slate-900">Parametry Pisania</h3><p className="text-xs text-slate-500 font-medium">Rozdział: {activeChapter.title}</p></div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-3 flex items-center uppercase tracking-wider"><Zap className="w-4 h-4 mr-2 text-blue-500" />Długość Rozdziału</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['micro', 'short', 'medium', 'long', 'very_long', 'epic'] as const).map((len) => (
                    <button 
                      key={len} 
                      onClick={() => setChapterLength(len)} 
                      className={`py-3 px-4 text-xs font-bold rounded-2xl border-2 transition-all ${chapterLength === len ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]' : 'border-gray-100 text-slate-500 hover:border-blue-200 hover:bg-blue-50/30'}`}
                    >
                      {len === 'micro' && 'Mikro (~400 słów)'}
                      {len === 'short' && 'Krótki (~800 słów)'}
                      {len === 'medium' && 'Standard (~1500)'}
                      {len === 'long' && 'Długi (~2500)'}
                      {len === 'very_long' && 'Bardzo długi'}
                      {len === 'epic' && 'Epicki (Deep Dive)'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 mb-3 flex items-center uppercase tracking-wider"><MessageSquarePlus className="w-4 h-4 mr-2 text-purple-500" />Instrukcje Kontekstowe</label>
                <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} className="w-full h-32 p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none text-sm transition-all" placeholder="Np. 'Skup się na praktycznych ćwiczeniach', 'Dodaj cytat znanej osoby'..." />
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex justify-end gap-4">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-slate-600 font-bold hover:bg-gray-200 rounded-2xl transition-colors">Anuluj</button>
              <button onClick={handleConfirmGeneration} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 flex items-center"><PlayCircle className="w-5 h-5 mr-2" /> Rozpocznij Pisanie</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
