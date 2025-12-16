
import React from 'react';
import { ArrowRight, Edit3, CheckCircle2, FileText, GripVertical } from 'lucide-react';
import { Chapter } from '../types';

interface PhaseStructureProps {
  title: string;
  chapters: Chapter[];
  onConfirm: () => void;
  onEditChapter: (id: string, newTitle: string, newDesc: string) => void;
  onEditTitle: (newTitle: string) => void;
}

export const PhaseStructure: React.FC<PhaseStructureProps> = ({ 
  title, 
  chapters, 
  onConfirm,
  onEditChapter,
  onEditTitle
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-8 lg:p-12 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
             <h2 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-1">Faza 2: Struktura</h2>
             <h1 className="text-3xl font-extrabold text-gray-900">Plan E-booka</h1>
             <p className="text-gray-600 mt-2 text-sm">
               Dostosuj tytuły i dokładnie opisz co ma zawierać każdy rozdział. Im lepszy opis tutaj, tym lepsza treść w kolejnym kroku.
             </p>
          </div>
          <button
            onClick={onConfirm}
            className="flex items-center bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-green-600/20 transition-all whitespace-nowrap"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Zatwierdź i Pisz
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>

        {/* Title Editor */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Tytuł E-booka</label>
          <div className="flex items-center group bg-gray-50 rounded-lg border border-transparent hover:border-gray-300 focus-within:border-blue-500 focus-within:bg-white transition-all">
            <input
              type="text"
              value={title}
              onChange={(e) => onEditTitle(e.target.value)}
              className="w-full text-2xl font-serif font-bold text-gray-900 border-none focus:ring-0 p-3 bg-transparent rounded-lg"
            />
            <Edit3 className="w-5 h-5 text-gray-400 mr-4 opacity-50 group-hover:opacity-100" />
          </div>
        </div>

        {/* Chapter List */}
        <div className="space-y-6">
          {chapters.map((chapter, index) => (
            <div key={chapter.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow group relative">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-100 group-hover:bg-blue-500 rounded-l-xl transition-colors"></div>
              
              <div className="flex items-start pl-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm mr-4 mt-2 shadow-sm">
                  {index + 1}
                </div>
                
                <div className="flex-1 space-y-4">
                  {/* Title Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tytuł Rozdziału</label>
                    <input
                      type="text"
                      value={chapter.title}
                      onChange={(e) => onEditChapter(chapter.id, e.target.value, chapter.description)}
                      className="block w-full text-lg font-bold text-gray-900 border-b border-gray-200 focus:border-blue-500 focus:ring-0 px-0 py-1 transition-colors"
                      placeholder="Wpisz tytuł rozdziału..."
                    />
                  </div>

                  {/* Description Textarea */}
                  <div>
                    <label className="flex items-center text-xs font-bold text-blue-600 uppercase mb-2">
                      <FileText className="w-3 h-3 mr-1" />
                      Instrukcje dla AI (Co ma być w środku?)
                    </label>
                    <textarea
                      value={chapter.description}
                      onChange={(e) => onEditChapter(chapter.id, chapter.title, e.target.value)}
                      className="block w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-gray-50 focus:bg-white resize-y min-h-[80px] transition-all leading-relaxed"
                      rows={3}
                      placeholder="Opisz szczegółowo o czym ma być ten rozdział. Wymień kluczowe punkty, przykłady lub metodologie, które chcesz uwzględnić."
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-4 bg-blue-50 rounded-xl border border-blue-100 text-center text-sm text-blue-800 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 mr-2" />
          <span>Dokładne wypełnienie opisów (instrukcji) gwarantuje lepszą jakość treści w kolejnym kroku.</span>
        </div>
      </div>
    </div>
  );
};
