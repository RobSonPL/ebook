
import React, { useState, useEffect, useRef } from 'react';
import { 
  FileDown, Megaphone, Palette, GraduationCap, Headphones, ArrowRight, 
  RefreshCw, FileText, ImageIcon, Volume2, Play, Zap, Wrench, 
  ClipboardCheck, FileArchive, Globe, Check, User, Layout, DownloadCloud,
  Sparkles, Download, Image as LucideImage, Eye, ChevronRight, ChevronLeft,
  Loader2, Upload, Trash2, X, Info
} from 'lucide-react';
import { EbookData, ExtrasData, AppPhase } from '../types';
import { generateImage, generateAudiobook, generateCourse } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

declare var html2pdf: any;
declare var htmlDocx: any;
declare var JSZip: any;

interface PhaseExtrasProps {
  ebookData: EbookData;
  isGenerating: boolean;
  onGenerateExtras: () => void;
  onChangePhase: (phase: AppPhase) => void;
  onUpdateExtras: (updates: Partial<ExtrasData>) => void;
}

const AVAILABLE_VOICES = [
  { id: 'Kore', name: 'Kore (Męski, Głęboki)' },
  { id: 'Puck', name: 'Puck (Żeński, Jasny)' },
  { id: 'Charon', name: 'Charon (Męski, Narracyjny)' },
  { id: 'Zephyr', name: 'Zephyr (Żeński, Ciepły)' },
];

export const PhaseExtras: React.FC<PhaseExtrasProps> = ({ 
  ebookData, 
  isGenerating, 
  onGenerateExtras, 
  onChangePhase, 
  onUpdateExtras 
}) => {
  const [activeTab, setActiveTab] = useState<'marketing' | 'ebook' | 'training' | 'audio' | 'tools'>('marketing');
  const [isGeneratingImg, setIsGeneratingImg] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState<{current: number, total: number} | null>(null);
  const [isGeneratingCourse, setIsGeneratingCourse] = useState(false);
  const [audioChapters, setAudioChapters] = useState<Record<string, string>>({});
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [isExporting, setIsExporting] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  
  const exportRef = useRef<HTMLDivElement>(null);
  const salesCopyRef = useRef<HTMLDivElement>(null);
  const toolsExportRef = useRef<HTMLDivElement>(null);
  const trainingExportRef = useRef<HTMLDivElement>(null);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const handleExportPDF = async (targetRef: React.RefObject<HTMLDivElement | null>, filename: string) => {
    const element = targetRef.current;
    if (!element || typeof html2pdf === 'undefined') return;
    setIsExporting(true);
    const opt = {
      margin: 0,
      filename: `${filename}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], before: '.page-break-before', avoid: 'img' }
    };
    try { await html2pdf().from(element).set(opt).save(); } catch (err) { alert("Błąd PDF."); } finally { setIsExporting(false); }
  };

  const handleExportDOCX = (targetRef: React.RefObject<HTMLDivElement | null>, filename: string, includeHooks: boolean = false) => {
    if (!targetRef || !targetRef.current || typeof htmlDocx === 'undefined') return;
    
    let html = targetRef.current.innerHTML;
    
    if (includeHooks && ebookData.extras) {
      const hooksHtml = `
        <div style="background-color: #f8fafc; padding: 25px; border: 2px solid #e2e8f0; border-radius: 15px; margin-bottom: 40px; font-family: Arial, sans-serif;">
          <h1 style="color: #2563eb; font-size: 24pt;">META-DANE E-BOOKA</h1>
          <p><strong>Opis 100:</strong> ${ebookData.extras.shortDescription}</p>
          <p><strong>Opis 200:</strong> ${ebookData.extras.longDescription}</p>
          <hr/>
          <p><strong>Hook 100:</strong> ${ebookData.extras.ctaHooks?.short100}</p>
          <p><strong>Hook 200:</strong> ${ebookData.extras.ctaHooks?.medium200}</p>
        </div>
      `;
      html = hooksHtml + html;
    }

    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6;} h1{color: #2563eb;} .page-break-before{page-break-before: always;}</style></head><body>${html}</body></html>`;
    const converted = htmlDocx.asBlob(fullHtml);
    downloadBlob(converted, `${filename}.docx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      if (type === 'photo') onUpdateExtras({ authorPhoto: base64 });
      else onUpdateExtras({ authorLogo: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate3Proposals = async (type: 'cover' | 'box' | 'bg') => {
    setIsGeneratingImg(type);
    let promptBase = "";
    if (type === 'cover') promptBase = ebookData.extras?.imagePrompts.cover || "Professional ebook cover design";
    else if (type === 'box') promptBase = ebookData.extras?.imagePrompts.box3d || "3D box set presentation";
    else promptBase = "Solid clean plain high quality light aesthetic background, white and subtle cream, very bright, professional minimalistic wallpaper for documents, no dark colors";
    
    try {
      const lightPrompt = `${promptBase}, bright style, light colors, soft lighting, professional high resolution`;
      const p1 = generateImage(`${lightPrompt}, minimal design`);
      const p2 = generateImage(`${lightPrompt}, elegant texture`);
      const p3 = generateImage(`${lightPrompt}, clean corporate look`);
      const results = await Promise.all([p1, p2, p3]);
      
      if (type === 'cover') onUpdateExtras({ coverProposals: results });
      else if (type === 'box') onUpdateExtras({ boxProposals: results });
      else onUpdateExtras({ bgProposals: results });
    } catch (e) {
      alert("Błąd generowania obrazów.");
    } finally {
      setIsGeneratingImg(null);
    }
  };

  const handleGenerateAudioForChapter = async (chapterId: string, index: number) => {
    const chapter = ebookData.chapters.find(c => c.id === chapterId);
    if (!chapter?.content) return;
    setIsGeneratingAudio(true);
    try {
      const fullText = `Rozdział ${index + 1}. ${chapter.title}. ${chapter.content}`;
      const url = await generateAudiobook(fullText, selectedVoice);
      setAudioChapters(prev => ({ ...prev, [chapter.id]: url }));
    } catch (e) {
      alert("Błąd audio.");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleGenerateAudioAll = async () => {
    const chaptersToProcess = ebookData.chapters.filter(c => c.content);
    setIsGeneratingAudio(true);
    setAudioProgress({ current: 0, total: chaptersToProcess.length });
    
    try {
      for (let i = 0; i < chaptersToProcess.length; i++) {
        const chapter = chaptersToProcess[i];
        setAudioProgress({ current: i + 1, total: chaptersToProcess.length });
        const fullText = `Rozdział ${i + 1}. ${chapter.title}. ${chapter.content}`;
        const url = await generateAudiobook(fullText, selectedVoice);
        setAudioChapters(prev => ({ ...prev, [chapter.id]: url }));
      }
    } catch (err) {
      alert("Błąd podczas generowania paczki audio.");
    } finally { 
      setIsGeneratingAudio(false); 
      setAudioProgress(null);
    }
  };

  const downloadGraphicsZip = async () => {
    if (typeof JSZip === 'undefined') { alert("JSZip nie załadowany."); return; }
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("Ebook_Resources");
      
      const addFile = async (url: string, name: string) => {
        const res = await fetch(url);
        const blob = await res.blob();
        folder.file(name, blob);
      };

      if (ebookData.extras?.authorPhoto) await addFile(ebookData.extras.authorPhoto, "Cover_Photo.png");
      if (ebookData.extras?.authorLogo) await addFile(ebookData.extras.authorLogo, "Brand_Logo.png");
      if (ebookData.extras?.pageBackgroundUrl) await addFile(ebookData.extras.pageBackgroundUrl, "Page_Background.png");

      const content = await zip.generateAsync({ type: "blob" });
      downloadBlob(content, `${ebookData.title}_Materials.zip`);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      <div className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm z-20">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          <button onClick={() => setActiveTab('marketing')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'marketing' ? 'bg-white shadow-lg text-blue-600' : 'text-slate-500'}`}>MARKETING</button>
          <button onClick={() => setActiveTab('ebook')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'ebook' ? 'bg-white shadow-lg text-blue-600' : 'text-slate-500'}`}>E-BOOK A4</button>
          <button onClick={() => setActiveTab('training')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'training' ? 'bg-white shadow-lg text-orange-600' : 'text-slate-500'}`}>SZKOLENIE</button>
          <button onClick={() => setActiveTab('audio')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'audio' ? 'bg-white shadow-lg text-purple-600' : 'text-slate-500'}`}>AUDIOBOOK</button>
          <button onClick={() => setActiveTab('tools')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'tools' ? 'bg-white shadow-lg text-emerald-600' : 'text-slate-500'}`}>NARZĘDZIA</button>
        </div>
        <button onClick={() => onChangePhase(AppPhase.DASHBOARD)} className="text-xs font-black text-slate-400 flex items-center hover:text-slate-900 transition-colors">DASHBOARD <ArrowRight className="w-4 h-4 ml-2" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 lg:p-12">
        <div className="max-w-7xl mx-auto">
          {!ebookData.extras && !isGenerating ? (
            <div className="text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-200 shadow-xl">
              <Megaphone className="w-20 h-20 text-blue-100 mx-auto mb-8" />
              <h2 className="text-3xl font-black text-slate-900 mb-4">Projekt ukończony!</h2>
              <button onClick={onGenerateExtras} className="bg-blue-600 hover:bg-blue-700 text-white font-black py-5 px-14 rounded-3xl shadow-2xl transition-all">GENERUJ MATERIAŁY KOŃCOWE</button>
            </div>
          ) : isGenerating ? (
            <div className="text-center py-24"><Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-8" /><h2 className="text-2xl font-black text-slate-900">Tworzenie imperium treści...</h2></div>
          ) : (
            <>
              {activeTab === 'marketing' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                       <div className="bg-white p-10 rounded-[40px] border shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-8 flex gap-2">
                             <button onClick={() => handleExportDOCX(salesCopyRef, "Sales_Copy", true)} className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl hover:scale-105 transition-all flex items-center text-xs font-black uppercase"><DownloadCloud className="w-4 h-4 mr-2" /> Word (.docx)</button>
                          </div>
                          <h3 className="text-3xl font-black mb-8 text-blue-600 flex items-center"><Zap className="w-8 h-8 mr-3 text-amber-500" /> Maszyna Sprzedażowa</h3>
                          <div ref={salesCopyRef} className="prose prose-lg max-w-none text-slate-800 leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{ebookData.extras?.salesSummary || ''}</ReactMarkdown>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-8">
                       <div className="bg-white p-8 rounded-[40px] border shadow-sm">
                          <h4 className="text-xl font-black mb-6 flex items-center"><Palette className="w-6 h-6 mr-3 text-purple-600" /> Branding & Grafika</h4>
                          
                          <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="space-y-2">
                              <label className="flex flex-col items-center justify-center h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-blue-50 transition-all overflow-hidden relative group">
                                 {ebookData.extras?.authorLogo ? <img src={ebookData.extras.authorLogo} className="w-full h-full object-contain p-4" /> : <div className="text-center"><Upload className="w-6 h-6 mx-auto mb-1 text-slate-400"/><span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Wgraj Logo</span></div>}
                                 <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
                              </label>
                              <span className="block text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Twoje Logo</span>
                            </div>
                            <div className="space-y-2">
                              <label className="flex flex-col items-center justify-center h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-blue-50 transition-all overflow-hidden relative group">
                                 {ebookData.extras?.authorPhoto ? <img src={ebookData.extras.authorPhoto} className="w-full h-full object-cover" /> : <div className="text-center"><User className="w-6 h-6 mx-auto mb-1 text-slate-400"/><span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Wgraj Foto</span></div>}
                                 <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'photo')} />
                              </label>
                              <span className="block text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Foto Autora</span>
                            </div>
                          </div>

                          <div className="mb-6 p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
                             <div className="flex justify-between items-center mb-4">
                               <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Okładka E-booka</span>
                               <button onClick={() => handleGenerate3Proposals('cover')} disabled={!!isGeneratingImg} className="text-blue-600 hover:underline text-[10px] font-black uppercase">Generuj Propozycje</button>
                             </div>
                             {ebookData.extras?.coverProposals ? (
                               <div className="space-y-4">
                                 {ebookData.extras.coverProposals.map((img, i) => (
                                   <div key={i} className={`group relative w-full aspect-[3/4] rounded-2xl overflow-hidden border-4 transition-all cursor-pointer shadow-xl ${ebookData.extras?.authorPhoto === img ? 'border-blue-600 scale-[1.02]' : 'border-transparent opacity-80'}`} onClick={() => onUpdateExtras({authorPhoto: img})}>
                                      <img src={img} className="w-full h-full object-cover" />
                                   </div>
                                 ))}
                               </div>
                             ) : <div className="aspect-[3/4] bg-slate-200 rounded-2xl flex items-center justify-center text-slate-400"><LucideImage className="w-10 h-10" /></div>}
                          </div>

                          <div className="mb-6 p-6 bg-slate-100/50 rounded-3xl border border-slate-200">
                             <div className="flex justify-between items-center mb-4">
                               <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Jasne Tło Stron</span>
                               <button onClick={() => handleGenerate3Proposals('bg')} disabled={!!isGeneratingImg} className="text-blue-600 hover:underline text-[10px] font-black uppercase">Generuj Tła</button>
                             </div>
                             {ebookData.extras?.bgProposals ? (
                               <div className="grid grid-cols-1 gap-4">
                                 {ebookData.extras.bgProposals.map((img, i) => (
                                   <div key={i} className={`group relative w-full aspect-video rounded-2xl overflow-hidden border-4 transition-all cursor-pointer shadow-lg ${ebookData.extras?.pageBackgroundUrl === img ? 'border-blue-600' : 'border-transparent opacity-80'}`} onClick={() => onUpdateExtras({pageBackgroundUrl: img})}>
                                      <img src={img} className="w-full h-full object-cover" />
                                   </div>
                                 ))}
                               </div>
                             ) : <div className="aspect-video bg-slate-200 rounded-2xl flex items-center justify-center text-slate-400"><LucideImage className="w-8 h-8" /></div>}
                          </div>

                          <button onClick={downloadGraphicsZip} disabled={isZipping} className="w-full py-5 bg-slate-900 text-white rounded-3xl text-xs font-black flex items-center justify-center gap-3 shadow-xl hover:scale-105 transition-all"><DownloadCloud className="w-5 h-5" /> POBIERZ PAKIET GRAFIK (.ZIP)</button>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ebook' && (
                <div className="flex flex-col lg:flex-row gap-8 animate-in zoom-in-95 duration-500">
                   <div className="lg:w-1/4 space-y-4">
                      <div className="bg-white p-8 rounded-[32px] border shadow-sm sticky top-8">
                         <h3 className="text-lg font-black mb-6 text-slate-900">Eksport Premium A4</h3>
                         <button onClick={() => handleExportPDF(exportRef, ebookData.title)} disabled={isExporting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl mb-4 flex items-center justify-center shadow-lg shadow-blue-500/20">{isExporting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <FileDown className="w-5 h-5 mr-2" />} POBIERZ PDF (A4)</button>
                         <button onClick={() => handleExportDOCX(exportRef, ebookData.title)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-4 rounded-2xl flex items-center justify-center"><DownloadCloud className="w-5 h-5 mr-2" /> POBIERZ WORD (.DOCX)</button>
                      </div>
                   </div>
                   <div className="lg:w-3/4">
                      <div className="bg-slate-800 p-10 lg:p-20 rounded-[40px] shadow-inner overflow-hidden flex justify-center">
                         <div ref={exportRef} className="bg-white shadow-2xl relative" style={{ width: '210mm', minHeight: '297mm', color: '#1a1a1a' }}>
                            {/* Title Page */}
                            <div className="relative flex flex-col items-center justify-center p-20 text-center overflow-hidden" style={{ height: '297mm' }}>
                               {ebookData.extras?.pageBackgroundUrl && <img src={ebookData.extras.pageBackgroundUrl} className="absolute inset-0 w-full h-full object-cover opacity-20 -z-10" />}
                               {ebookData.extras?.authorPhoto && <img src={ebookData.extras.authorPhoto} className="w-72 h-auto shadow-2xl rounded-2xl mb-12 border-8 border-white object-cover aspect-[3/4]" />}
                               <h1 className="text-5xl font-black text-slate-900 mb-6 leading-tight">{ebookData.title}</h1>
                               <div className="w-24 h-2 bg-blue-600 mb-8"></div>
                               <p className="text-2xl font-bold text-blue-700">Autor: {ebookData.briefing?.authorName || 'E-book Architect'}</p>
                            </div>

                            {/* TOC */}
                            <div className="p-24 page-break-before relative" style={{ minHeight: '297mm' }}>
                               {ebookData.extras?.pageBackgroundUrl && <img src={ebookData.extras.pageBackgroundUrl} className="absolute inset-0 w-full h-full object-cover opacity-10 -z-10" />}
                               <h2 className="text-4xl font-black mb-16 border-b-8 border-blue-600 pb-4">Spis Treści</h2>
                               <div className="space-y-6">
                                  {ebookData.chapters.map((ch, i) => (
                                    <div key={ch.id} className="flex justify-between items-baseline group">
                                       <div className="flex items-center gap-4">
                                          <span className="text-lg font-black text-blue-600">{i + 1}.</span>
                                          <span className="text-xl font-bold text-slate-800">{ch.title}</span>
                                       </div>
                                       <div className="flex-1 border-b border-dashed border-slate-300 mx-4"></div>
                                       <span className="text-lg font-black text-slate-400">str. {i + 3}</span>
                                    </div>
                                  ))}
                               </div>
                            </div>

                            {/* Chapters */}
                            {ebookData.chapters.map((ch, i) => (
                              <div key={ch.id} className="p-24 page-break-before relative" style={{ minHeight: '297mm' }}>
                                 {ebookData.extras?.pageBackgroundUrl && <img src={ebookData.extras.pageBackgroundUrl} className="absolute inset-0 w-full h-full object-cover opacity-10 -z-10" />}
                                 <div className="mb-12 flex items-center justify-between">
                                    <span className="text-xs font-black text-blue-600 tracking-widest uppercase">Rozdział {i + 1}</span>
                                 </div>
                                 <h2 className="text-4xl font-black mb-10 text-slate-900 leading-tight border-l-8 border-blue-600 pl-6">{ch.title}</h2>
                                 <div className="prose prose-lg max-w-none text-slate-800 leading-relaxed text-justify">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{ch.content || 'Treść w przygotowaniu...'}</ReactMarkdown>
                                 </div>
                                 <div className="absolute bottom-10 left-0 right-0 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">Strona {i + 3} | {ebookData.briefing?.authorName}</div>
                              </div>
                            ))}

                            {/* Back Cover - Including Logo & Photo */}
                            <div className="p-24 page-break-before relative flex flex-col items-center justify-center text-center" style={{ minHeight: '297mm' }}>
                               {ebookData.extras?.pageBackgroundUrl && <img src={ebookData.extras.pageBackgroundUrl} className="absolute inset-0 w-full h-full object-cover opacity-10 -z-10" />}
                               <h2 className="text-3xl font-black mb-12">O Autorze</h2>
                               {ebookData.extras?.authorPhoto && (
                                 <div className="mb-8">
                                    <img src={ebookData.extras.authorPhoto} className="w-56 h-56 rounded-full border-8 border-white shadow-2xl object-cover mx-auto mb-6" />
                                    <p className="text-2xl font-black text-slate-900">{ebookData.briefing?.authorName}</p>
                                    <p className="text-blue-600 font-bold italic">Ekspert & Ghostwriter</p>
                                 </div>
                               )}
                               <div className="max-w-md bg-white/80 p-10 rounded-[40px] shadow-xl border border-slate-100 italic">
                                  <p className="text-slate-700 leading-relaxed">"{ebookData.extras?.longDescription}"</p>
                                </div>
                               {ebookData.extras?.authorLogo && (
                                 <div className="absolute bottom-20">
                                   <img src={ebookData.extras.authorLogo} className="w-32 object-contain" alt="Logo" />
                                 </div>
                               )}
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'audio' && (
                <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
                   <div className="bg-white p-12 rounded-[40px] border shadow-xl">
                      <div className="flex items-center justify-between mb-10">
                         <div className="flex items-center"><div className="w-16 h-16 bg-purple-100 rounded-3xl flex items-center justify-center text-purple-600 mr-5"><Headphones className="w-8 h-8" /></div><div><h3 className="text-2xl font-black text-slate-900">Audiobook Pro Engine</h3><p className="text-slate-500 font-bold">Lektor czyta rozdziały wraz z numerami.</p></div></div>
                         <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} className="bg-slate-100 border-none px-6 py-4 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-purple-400 transition-all">{AVAILABLE_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
                      </div>

                      <div className="space-y-4 mb-10">
                         {ebookData.chapters.map((ch, i) => (
                            <div key={ch.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                               <div className="flex items-center"><div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center font-black text-slate-400 text-xs mr-4">{i + 1}</div><p className="font-bold text-slate-800">{ch.title}</p></div>
                               {audioChapters[ch.id] ? (
                                  <div className="flex items-center gap-3">
                                     <audio src={audioChapters[ch.id]} controls className="h-8 w-48" />
                                     <button onClick={() => handleGenerateAudioForChapter(ch.id, i)} className="p-2 text-slate-400 hover:text-purple-600 transition-colors"><RefreshCw className="w-4 h-4" /></button>
                                  </div>
                               ) : (
                                  <button onClick={() => handleGenerateAudioForChapter(ch.id, i)} disabled={isGeneratingAudio || !ch.content} className="p-2 px-6 bg-white text-purple-600 text-[10px] font-black uppercase rounded-xl border border-purple-100 hover:bg-purple-600 hover:text-white transition-all disabled:opacity-50">Generuj Plik Audio</button>
                               )}
                            </div>
                         ))}
                      </div>

                      {isGeneratingAudio && audioProgress ? (
                         <div className="p-8 bg-purple-50 rounded-3xl border border-purple-100 text-center shadow-inner mb-6">
                            <Loader2 className="w-10 h-10 text-purple-600 animate-spin mx-auto mb-4" />
                            <p className="font-black text-purple-900">Przetwarzanie Rozdziału {audioProgress.current} z {audioProgress.total}</p>
                            <div className="w-full bg-purple-200 h-2 rounded-full mt-4 overflow-hidden">
                               <div className="bg-purple-600 h-full transition-all duration-1000" style={{ width: `${(audioProgress.current / audioProgress.total) * 100}%` }}></div>
                            </div>
                         </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                           <button onClick={handleGenerateAudioAll} disabled={isGeneratingAudio} className="bg-purple-600 hover:bg-purple-700 text-white font-black py-5 rounded-3xl shadow-xl flex items-center justify-center gap-3 transition-all"><Play className="w-5 h-5" /> GENERUJ WSZYSTKIE (AUTO)</button>
                           <button onClick={async () => { setIsZipping(true); try { const zip = new JSZip(); for (let i = 0; i < ebookData.chapters.length; i++) { const ch = ebookData.chapters[i]; const url = audioChapters[ch.id]; if (url) { const res = await fetch(url); const blob = await res.blob(); zip.file(`rozdział_${i + 1}.wav`, blob); } } const content = await zip.generateAsync({type: 'blob'}); downloadBlob(content, `${ebookData.title}_Audiobook.zip`); } finally { setIsZipping(false); } }} disabled={Object.keys(audioChapters).length === 0 || isZipping} className="bg-slate-900 text-white font-black py-5 rounded-3xl disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl"><DownloadCloud className="w-5 h-5" /> POBIERZ PACZKĘ .ZIP</button>
                        </div>
                      )}
                   </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
