import React from 'react';
import { ArrowRight, Edit3, CheckCircle2 } from 'lucide-react';
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
        <div className="mb-8 flex justify-between items-end">
          <div>
             <h2 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-1">Faza 2: Struktura</h2>
             <h1 className="text-3xl font-extrabold text-gray-900">Spis treści</h1>
          </div>
          <button
            onClick={onConfirm}
            className="flex items-center bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-green-600/20 transition-all"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Zatwierdź i Pisz
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>

        {/* Title Editor */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Proponowany Tytuł</label>
          <div className="flex items-center group">
            <input
              type="text"
              value={title}
              onChange={(e) => onEditTitle(e.target.value)}
              className="w-full text-2xl font-serif font-bold text-gray-800 border-none focus:ring-0 p-0 bg-transparent group-hover:bg-gray-50 rounded px-2 -ml-2 transition-colors"
            />
            <Edit3 className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 ml-2" />
          </div>
        </div>

        {/* Chapter List */}
        <div className="space-y-4">
          {chapters.map((chapter, index) => (
            <div key={chapter.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm mr-4 mt-1">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={chapter.title}
                    onChange={(e) => onEditChapter(chapter.id, e.target.value, chapter.description)}
                    className="block w-full text-lg font-bold text-gray-900 border-none focus:ring-0 p-0 mb-1"
                    placeholder="Tytuł rozdziału"
                  />
                  <textarea
                    value={chapter.description}
                    onChange={(e) => onEditChapter(chapter.id, chapter.title, e.target.value)}
                    className="block w-full text-sm text-gray-600 border-none focus:ring-0 p-0 resize-none bg-transparent"
                    rows={2}
                    placeholder="Opis rozdziału..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          Upewnij się, że struktura jest logiczna. Możesz edytować tytuły i opisy przed przejściem dalej.
        </div>
      </div>
    </div>
  );
};