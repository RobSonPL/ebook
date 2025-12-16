
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, Globe, BookOpen, Upload, Youtube, FileText, CheckCircle2, AlertCircle, X, Trash2, Plus, Link as LinkIcon } from 'lucide-react';
import { BriefingData } from '../types';
import { INITIAL_BRIEFING } from '../constants';

// External libs declaration
declare var mammoth: any;
declare var pdfjsLib: any;

interface PhaseBriefingProps {
  onNext: (data: BriefingData) => void;
  isGenerating: boolean;
  initialData?: BriefingData;
}

type SourceTab = 'text' | 'file' | 'links';

export const PhaseBriefing: React.FC<PhaseBriefingProps> = ({ onNext, isGenerating, initialData }) => {
  const [formData, setFormData] = useState<BriefingData>(INITIAL_BRIEFING);
  
  // Knowledge Base State
  const [activeSourceTab, setActiveSourceTab] = useState<SourceTab>('text');
  const [rawText, setRawText] = useState('');
  
  // Links State (Replacing single Youtube URL)
  const [currentLink, setCurrentLink] = useState('');
  const [addedLinks, setAddedLinks] = useState<string[]>([]);

  const [uploadedFiles, setUploadedFiles] = useState<{name: string, content: string}[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effect to sync state when initialData is provided
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        authorName: initialData.authorName || INITIAL_BRIEFING.authorName,
        chapterCount: initialData.chapterCount || INITIAL_BRIEFING.chapterCount,
        language: initialData.language || INITIAL_BRIEFING.language,
        contextMaterial: initialData.contextMaterial || ''
      }));
      // Initialize context displays if data exists
      if (initialData.contextMaterial) {
         // We can't easily reverse-engineer the string back into files/links perfectly without structured storage,
         // but for Briefing phase editing, we populate the text area so the user doesn't lose data.
         // If contextMaterial is populated but rawText is empty, put it there.
         if (!rawText) {
            setRawText(initialData.contextMaterial); 
         }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  // Aggregate all sources into the main contextMaterial field whenever they change
  useEffect(() => {
    const fileContent = uploadedFiles.map(f => `--- FILE: ${f.name} ---\n${f.content}`).join('\n\n');
    
    const linksContent = addedLinks.length > 0 
      ? `\n--- EXTERNAL LINKS (SOURCES) ---\n${addedLinks.map(link => `- ${link}`).join('\n')}\n(Please use these links as context or references if possible)`
      : '';

    const combined = `${rawText}\n\n${fileContent}${linksContent}`.trim();
    
    setFormData(prev => ({ ...prev, contextMaterial: combined }));
  }, [rawText, uploadedFiles, addedLinks]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.topic && formData.targetAudience && formData.coreProblem) {
      onNext(formData);
    } else {
      alert("Proszę wypełnić wszystkie wymagane pola (Temat, Grupa Docelowa, Problem), aby przejść dalej.");
    }
  };

  // --- LINK HANDLERS ---
  const handleAddLink = () => {
    if (currentLink.trim()) {
      // Basic validation
      if (!currentLink.startsWith('http')) {
        alert("Link musi zaczynać się od http:// lub https://");
        return;
      }
      setAddedLinks(prev => [...prev, currentLink.trim()]);
      setCurrentLink('');
    }
  };

  const handleRemoveLink = (index: number) => {
    setAddedLinks(prev => prev.filter((_, i) => i !== index));
  };

  const handleLinkKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddLink();
    }
  };

  // --- FILE PROCESSING HELPERS ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      let content = "";
      
      if (file.name.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        if (typeof pdfjsLib === 'undefined') throw new Error("Biblioteka PDF niezaładowana");
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
           pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          content += textContent.items.map((item: any) => item.str).join(' ') + '\n';
        }
      } else if (file.name.endsWith('.docx')) {
        if (typeof mammoth === 'undefined') throw new Error("Biblioteka Mammoth niezaładowana");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        content = result.value;
      } else {
        content = await file.text();
      }

      setUploadedFiles(prev => [...prev, { name: file.name, content: content.substring(0, 100000) }]); // Limit size slightly
    } catch (err) {
      console.error(err);
      alert("Błąd przetwarzania pliku. Sprawdź czy plik nie jest uszkodzony.");
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
            Faza 1: Briefing & Baza Wiedzy
          </h1>
          <p className="text-lg text-gray-600">
            Zdefiniuj fundamenty i dostarcz AI materiały źródłowe, aby e-book był merytoryczny i unikalny.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 lg:p-8 space-y-8">
          
          {/* Section: Basic Info */}
          <div className="space-y-6">
             <h2 className="text-xl font-bold text-gray-900 flex items-center border-b pb-2">
                <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                Podstawowe Informacje
             </h2>

             {/* Language Selector */}
             <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <label className="block text-sm font-bold text-indigo-900 mb-3 flex items-center">
                  <Globe className="w-4 h-4 mr-2" />
                  Język E-booka / Rynek Docelowy
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className={`cursor-pointer p-3 rounded-lg border-2 flex items-center transition-all ${formData.language === 'pl' ? 'border-blue-600 bg-white shadow-md' : 'border-indigo-100 bg-transparent opacity-60 hover:opacity-100'}`}>
                    <input type="radio" name="language" value="pl" checked={formData.language === 'pl'} onChange={handleChange} className="hidden" />
                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold mr-3 text-xs">PL</div>
                    <span className="font-bold text-gray-900">Język Polski</span>
                  </label>

                  <label className={`cursor-pointer p-3 rounded-lg border-2 flex items-center transition-all ${formData.language === 'en' ? 'border-blue-600 bg-white shadow-md' : 'border-indigo-100 bg-transparent opacity-60 hover:opacity-100'}`}>
                    <input type="radio" name="language" value="en" checked={formData.language === 'en'} onChange={handleChange} className="hidden" />
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mr-3 text-xs">EN</div>
                    <span className="font-bold text-gray-900">English (Amazon KDP)</span>
                  </label>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Główny temat e-booka <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="topic"
                    value={formData.topic}
                    onChange={handleChange}
                    placeholder="np. Efektywne zarządzanie czasem"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Autor (Twoje imię / Marka)</label>
                  <input
                    type="text"
                    name="authorName"
                    value={formData.authorName}
                    onChange={handleChange}
                    placeholder="np. Synapse Creative"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
             </div>

             <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Kto jest grupą docelową? <span className="text-red-500">*</span></label>
                <textarea
                  name="targetAudience"
                  value={formData.targetAudience}
                  onChange={handleChange}
                  rows={2}
                  placeholder="np. Freelancerzy IT, wiek 25-40..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
             </div>

             <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Jaki główny problem rozwiązuje? <span className="text-red-500">*</span></label>
                <textarea
                  name="coreProblem"
                  value={formData.coreProblem}
                  onChange={handleChange}
                  rows={2}
                  placeholder="np. Ciągłe uczucie przytłoczenia..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Ton wypowiedzi</label>
                  <select name="tone" value={formData.tone} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="Profesjonalny i autorytatywny">Profesjonalny</option>
                    <option value="Przyjacielski i wspierający">Przyjacielski</option>
                    <option value="Motywacyjny i energiczny">Motywacyjny</option>
                    <option value="Akademicki i analityczny">Akademicki</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Rozdziały</label>
                  <input type="number" name="chapterCount" min="3" max="50" value={formData.chapterCount} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Długość rozdziałów</label>
                  <select name="targetLength" value={formData.targetLength} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="short">Krótka</option>
                    <option value="medium">Standardowa</option>
                    <option value="long">Długa</option>
                  </select>
                </div>
              </div>
          </div>

          {/* Section: Knowledge Base (Context) */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center border-b pb-2 pt-4">
               <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
               Baza Wiedzy (Źródła Kontekstowe)
               <span className="ml-2 text-xs font-normal text-white bg-purple-600 px-2 py-0.5 rounded-full">Opcjonalne</span>
            </h2>
            <p className="text-sm text-gray-600 -mt-4">
              Dodaj materiały, na których AI ma bazować. E-book będzie bardziej merytoryczny i dopasowany do Twoich źródeł.
            </p>

            <div className="bg-gray-50 p-1 rounded-xl flex space-x-1 border border-gray-200">
               <button type="button" onClick={() => setActiveSourceTab('text')} className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold flex items-center justify-center transition-all ${activeSourceTab === 'text' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>
                 <FileText className="w-4 h-4 mr-2" />
                 Wklej Tekst
               </button>
               <button type="button" onClick={() => setActiveSourceTab('file')} className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold flex items-center justify-center transition-all ${activeSourceTab === 'file' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>
                 <Upload className="w-4 h-4 mr-2" />
                 Pliki PDF/DOCX
               </button>
               <button type="button" onClick={() => setActiveSourceTab('links')} className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold flex items-center justify-center transition-all ${activeSourceTab === 'links' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-900'}`}>
                 <LinkIcon className="w-4 h-4 mr-2" />
                 Linki (WWW / YT)
               </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 min-h-[150px]">
               
               {/* TAB: TEXT */}
               {activeSourceTab === 'text' && (
                 <div className="animate-in fade-in">
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Notatki / Brudnopis / Fragmenty</label>
                   <textarea
                     value={rawText}
                     onChange={(e) => setRawText(e.target.value)}
                     className="w-full h-40 p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                     placeholder="Wklej tutaj dowolny tekst, notatki lub fragmenty, które AI ma uwzględnić..."
                   />
                 </div>
               )}

               {/* TAB: FILE */}
               {activeSourceTab === 'file' && (
                 <div className="animate-in fade-in">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-blue-200 rounded-lg p-6 text-center hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                       <input 
                         type="file" 
                         ref={fileInputRef} 
                         className="hidden" 
                         accept=".pdf,.docx,.txt"
                         onChange={handleFileChange}
                       />
                       {isProcessingFile ? (
                         <div className="flex flex-col items-center text-blue-600">
                            <Sparkles className="w-8 h-8 animate-spin mb-2" />
                            <span className="font-bold">Przetwarzanie pliku...</span>
                         </div>
                       ) : (
                         <div className="flex flex-col items-center text-gray-500">
                            <Upload className="w-8 h-8 mb-2 text-blue-400" />
                            <span className="font-semibold text-gray-700">Kliknij, aby dodać plik</span>
                            <span className="text-xs">Obsługiwane: PDF, DOCX, TXT</span>
                         </div>
                       )}
                    </div>

                    {/* File List */}
                    {uploadedFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {uploadedFiles.map((f, idx) => (
                           <div key={idx} className="flex items-center justify-between bg-blue-50 p-2 rounded-lg border border-blue-100">
                              <div className="flex items-center overflow-hidden">
                                <FileText className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0" />
                                <span className="text-xs font-medium truncate text-blue-900">{f.name}</span>
                                <span className="text-[10px] text-blue-400 ml-2">({f.content.length} znaków)</span>
                              </div>
                              <button type="button" onClick={() => removeFile(idx)} className="text-red-400 hover:text-red-600 p-1">
                                <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                        ))}
                      </div>
                    )}
                 </div>
               )}

               {/* TAB: LINKS (WWW / YT) */}
               {activeSourceTab === 'links' && (
                 <div className="animate-in fade-in">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Dodaj Linki (Artykuły, Blogi, YouTube)</label>
                    <div className="flex gap-2 mb-4">
                       <input
                         type="text"
                         value={currentLink}
                         onChange={(e) => setCurrentLink(e.target.value)}
                         onKeyDown={handleLinkKeyDown}
                         className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 outline-none"
                         placeholder="https://www.youtube.com/watch?v=... lub https://blog..."
                       />
                       <button 
                         type="button" 
                         onClick={handleAddLink}
                         className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-bold flex items-center"
                       >
                         <Plus className="w-4 h-4 mr-1" />
                         Dodaj
                       </button>
                    </div>

                    {addedLinks.length > 0 ? (
                       <div className="space-y-2">
                        {addedLinks.map((link, idx) => (
                           <div key={idx} className="flex items-center justify-between bg-red-50 p-2 rounded-lg border border-red-100">
                              <div className="flex items-center overflow-hidden">
                                {link.includes('youtube') || link.includes('youtu.be') ? (
                                  <Youtube className="w-4 h-4 text-red-600 mr-2 flex-shrink-0" />
                                ) : (
                                  <LinkIcon className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" />
                                )}
                                <span className="text-xs font-medium truncate text-gray-900">{link}</span>
                              </div>
                              <button type="button" onClick={() => handleRemoveLink(idx)} className="text-red-400 hover:text-red-600 p-1">
                                <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 p-3 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-200 flex items-start">
                        <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                        <p>
                          AI spróbuje przeanalizować podane linki (tytuł, opis, metadane). 
                          W przypadku stron WWW, dla najlepszych rezultatów, skopiuj najważniejsze fragmenty tekstu do zakładki "Tekst".
                        </p>
                      </div>
                    )}
                 </div>
               )}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                  Analiza kontekstu i generowanie struktury...
                </>
              ) : (
                <>
                  Przejdź do struktury
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
