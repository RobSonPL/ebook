
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, Upload, FileText, X, Trash2, Wand2, Loader2, Image as ImageIcon, Tag } from 'lucide-react';
import { BriefingData, EbookCategory } from '../types';
import { INITIAL_BRIEFING } from '../constants';
import { suggestBriefingFields } from '../services/geminiService';

declare var mammoth: any;
declare var pdfjsLib: any;

const CATEGORIES: EbookCategory[] = [
  'psychologia', 'rodzina', 'relacje', 'social media', 'Ai', 'uzależnienia', 
  'życie zawodowe', 'życie rodzinne', 'mąż/żona', 'dzieci', 'rodzice', 'książki', 
  'inspiracje', 'inspirujące postacie', 'medytacja', 'hipnoza', 'rozwój osobisty', 
  'technologia jutra', 'finanse', 'marketing', 'food'
];

interface PhaseBriefingProps {
  onNext: (data: BriefingData) => void;
  isGenerating: boolean;
  initialData?: BriefingData;
}

export const PhaseBriefing: React.FC<PhaseBriefingProps> = ({ onNext, isGenerating, initialData }) => {
  const [formData, setFormData] = useState<BriefingData>(INITIAL_BRIEFING);
  const [isSuggestingAudience, setIsSuggestingAudience] = useState(false);
  const [isSuggestingProblem, setIsSuggestingProblem] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, content: string, type: 'text' | 'image', preview?: string}[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) setFormData(prev => ({ ...prev, ...initialData }));
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'chapterCount' ? parseInt(value) : value }));
  };

  const handleMagicFill = async (field: 'audience' | 'problem') => {
    if (!formData.topic) { alert("Podaj temat."); return; }
    field === 'audience' ? setIsSuggestingAudience(true) : setIsSuggestingProblem(true);
    try {
      const suggestions = await suggestBriefingFields(formData.topic);
      setFormData(prev => ({
        ...prev,
        targetAudience: field === 'audience' ? suggestions.targetAudience : prev.targetAudience,
        coreProblem: field === 'problem' ? suggestions.coreProblem : prev.coreProblem
      }));
    } catch (err) { alert("Błąd AI."); } finally {
      setIsSuggestingAudience(false);
      setIsSuggestingProblem(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingFile(true);
    try {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setUploadedFiles(prev => [...prev, { name: file.name, content: ev.target?.result as string, type: 'image', preview: ev.target?.result as string }]);
          setIsProcessingFile(false);
        };
        reader.readAsDataURL(file);
        return;
      }
      const text = await file.text();
      setUploadedFiles(prev => [...prev, { name: file.name, content: text, type: 'text' }]);
    } catch (err) {} finally { setIsProcessingFile(false); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Faza 1: Briefing & Kontekst</h1>
          <p className="text-gray-600">Zdefiniuj fundamenty i dostarcz AI materiały źródłowe.</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onNext(formData); }} className="bg-white rounded-2xl shadow-xl border p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
               <label className="block text-sm font-bold text-gray-700 mb-2">Kategoria E-booka *</label>
               <select name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none capitalize">
                 <option value="inne">Wybierz kategorię...</option>
                 {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
               </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Temat e-booka *</label>
              <input type="text" name="topic" value={formData.topic} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Autor</label>
              <input type="text" name="authorName" value={formData.authorName} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="relative">
               <div className="flex justify-between mb-2">
                 <label className="block text-sm font-bold text-gray-700">Grupa docelowa *</label>
                 <button type="button" onClick={() => handleMagicFill('audience')} className="text-xs flex items-center bg-purple-100 text-purple-700 px-2 py-1 rounded font-bold"><Wand2 className="w-3 h-3 mr-1" /> AI Suggest</button>
               </div>
               <textarea name="targetAudience" value={formData.targetAudience} onChange={handleChange} rows={2} className="w-full px-4 py-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div className="relative">
               <div className="flex justify-between mb-2">
                 <label className="block text-sm font-bold text-gray-700">Główny problem *</label>
                 <button type="button" onClick={() => handleMagicFill('problem')} className="text-xs flex items-center bg-purple-100 text-purple-700 px-2 py-1 rounded font-bold"><Wand2 className="w-3 h-3 mr-1" /> AI Suggest</button>
               </div>
               <textarea name="coreProblem" value={formData.coreProblem} onChange={handleChange} rows={2} className="w-full px-4 py-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div><label className="block text-sm font-bold text-gray-700 mb-2">Język</label><select name="language" value={formData.language} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300"><option value="pl">Polski</option><option value="en">English</option></select></div>
            <div><label className="block text-sm font-bold text-gray-700 mb-2">Rozdziały</label><input type="number" name="chapterCount" value={formData.chapterCount} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300" /></div>
            <div><label className="block text-sm font-bold text-gray-700 mb-2">Format</label><select name="targetLength" value={formData.targetLength} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300"><option value="micro">Mikro (400 słów/ch)</option><option value="medium">Standard (1500 słów/ch)</option><option value="long">Długa (2500 słów/ch)</option></select></div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-bold flex items-center mb-4"><Sparkles className="w-5 h-5 mr-2 text-purple-600" />Materiały źródłowe</h3>
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed p-10 rounded-2xl text-center hover:bg-blue-50 cursor-pointer transition-all">
               <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
               <Upload className="w-10 h-10 mx-auto text-blue-400 mb-4" />
               <p className="font-bold">Dodaj pliki lub obrazy (.jpg, .png, .pdf, .docx)</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
               {uploadedFiles.map((f, i) => (
                 <div key={i} className="bg-gray-50 border px-3 py-1.5 rounded-lg flex items-center gap-2">
                   {f.type === 'image' ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                   <span className="text-xs font-bold">{f.name}</span>
                   <button type="button" onClick={() => setUploadedFiles(p => p.filter((_, idx) => idx !== i))}><X className="w-3 h-3 text-red-500" /></button>
                 </div>
               ))}
            </div>
          </div>

          <button type="submit" disabled={isGenerating} className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center">
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
            Wygeneruj Strukturę E-booka
          </button>
        </form>
      </div>
    </div>
  );
};
