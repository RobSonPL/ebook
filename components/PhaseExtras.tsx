
import React, { useState, useEffect, useRef } from 'react';
import { 
  Palette, RefreshCw, FileText, DownloadCloud, Sparkles, Download, 
  X, Camera, UserCircle, Package, List, Copy, Activity, Play, Loader2, Music, Check, Key, Zap, ChevronRight, ImageIcon
} from 'lucide-react';
import { EbookData, ExtrasData, AppPhase } from '../types';
import { generateImage, generateAudiobook, generateExtras } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

declare var html2pdf: any;
declare var htmlDocx: any;
declare var JSZip: any;
declare var window: any;

interface PhaseExtrasProps {
  ebookData: EbookData;
  currentPhase: AppPhase;
  isGenerating: boolean;
  onGenerateExtras: () => void;
  onChangePhase: (phase: AppPhase) => void;
  onUpdateExtras: (updates: Partial<ExtrasData>) => void;
}

const AVAILABLE_VOICES = [
  { id: 'Kore', name: 'Kore (Męski)' },
  { id: 'Puck', name: 'Puck (Żeński)' },
  { id: 'Zephyr', name: 'Zephyr (Ciepły)' },
];

export const PhaseExtras: React.FC<PhaseExtrasProps> = ({ 
  ebookData, 
  currentPhase,
  isGenerating, 
  onGenerateExtras, 
  onChangePhase, 
  onUpdateExtras 
}) => {
  const [activeTab, setActiveTab] = useState<'marketing' | 'ebook' | 'audio'>('ebook');
  const [isGeneratingVisuals, setIsGeneratingVisuals] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewScale, setPreviewScale] = useState(0.5);
  
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [isProducingAudio, setIsProducingAudio] = useState<string | null>(null);
  const [audios, setAudios] = useState<Record<string, string>>({});

  const ebookContentRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentPhase === AppPhase.MARKETING) setActiveTab('marketing');
    else if (currentPhase === AppPhase.AUDIO) setActiveTab('audio');
    else setActiveTab('ebook');
  }, [currentPhase]);

  useEffect(() => {
    const handleResize = () => {
      if (previewContainerRef.current) {
        const container = previewContainerRef.current;
        const scale = Math.min((container.clientWidth - 40) / 800, (container.clientHeight - 40) / 1130, 0.9);
        setPreviewScale(scale);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'authorPhoto' | 'authorLogo') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onUpdateExtras({ [field]: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  const handleGenerateAll = async () => {
    setIsGeneratingVisuals(true);
    setProgress(0);
    try {
      let currentExtras = ebookData.extras;
      if (!currentExtras || !currentExtras.imagePrompts) {
        currentExtras = await generateExtras(ebookData.briefing!, ebookData.title);
        onUpdateExtras(currentExtras);
      }

      const prompts = currentExtras.imagePrompts;
      const total = 15;
      let count = 0;

      const gen = async (pList: string[]) => {
        const results = [];
        for (const prompt of pList.slice(0, 5)) {
          results.push(await generateImage(prompt));
          count++;
          setProgress(Math.round((count / total) * 100));
          await new Promise(r => setTimeout(r, 1200)); 
        }
        return results;
      };

      const covers = await gen(prompts.coverProposals || []);
      const bgs = await gen(prompts.bgProposals || []);
      const boxes = await gen(prompts.boxProposals || []);

      onUpdateExtras({
        generatedCovers: covers,
        generatedBackgrounds: bgs,
        generatedBoxes: boxes,
        selectedCoverIdx: 0,
        selectedBgIdx: 0,
        selectedBoxIdx: 0
      });
    } catch (e) {
      alert("Błąd generowania AI. Sprawdź limity API.");
    } finally {
      setIsGeneratingVisuals(false);
    }
  };

  const handleDownloadPng = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}.png`;
    link.click();
  };

  const handleProduceAudio = async (id: string, text: string) => {
    setIsProducingAudio(id);
    try {
      const url = await generateAudiobook(text, selectedVoice);
      setAudios(prev => ({ ...prev, [id]: url }));
    } catch (e) {
      alert("Błąd generatora mowy.");
    } finally {
      setIsProducingAudio(null);
    }
  };

  const handleDownloadPDF = () => {
    if (!ebookContentRef.current) return;
    const originalTransform = ebookContentRef.current.style.transform;
    ebookContentRef.current.style.transform = 'none';
    const opt = {
      margin: 0, 
      filename: `${ebookData.title}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    html2pdf().set(opt).from(ebookContentRef.current).save().then(() => {
      ebookContentRef.current!.style.transform = originalTransform;
    });
  };

  const handleDownloadWord = () => {
    if (!ebookContentRef.current || typeof htmlDocx === 'undefined') return;
    const originalTransform = ebookContentRef.current.style.transform;
    ebookContentRef.current.style.transform = 'none';
    
    const styles = `
      <style>
        body { font-family: 'Times New Roman', serif; padding: 1in; background: white; }
        .page-break { page-break-after: always; clear: both; }
        h1 { font-size: 36pt; font-weight: bold; text-align: center; margin-top: 2in; text-transform: uppercase; color: #1e293b; }
        h2 { font-size: 22pt; font-weight: bold; color: #2563eb; margin-bottom: 20pt; border-left: 5pt solid #2563eb; padding-left: 10pt; }
        p { font-size: 12pt; line-height: 1.5; text-align: justify; margin-bottom: 12pt; }
        .toc { font-size: 14pt; margin-top: 50pt; }
        .toc-item { display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; margin-bottom: 10pt; }
        img { max-width: 100%; height: auto; }
        .footer { font-size: 10pt; color: #94a3b8; text-align: right; margin-top: 50pt; border-top: 1px solid #e2e8f0; padding-top: 10pt; }
      </style>
    `;
    
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head><body>${ebookContentRef.current.innerHTML}</body></html>`;
    const converted = htmlDocx.asBlob(html);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(converted);
    link.download = `${ebookData.title}.docx`;
    link.click();
    ebookContentRef.current.style.transform = originalTransform;
  };

  const ex = ebookData.extras;
  const hasVisuals = ex?.generatedCovers && ex.generatedCovers.length > 0;

  return (
    <div className={`flex flex-col h-full overflow-hidden ${activeTab === 'audio' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Dynamic Header */}
      <div className={`px-8 py-4 flex justify-between items-center shadow-md z-30 ${activeTab === 'audio' ? 'bg-slate-900 border-b border-slate-800' : 'bg-white border-b border-slate-200'}`}>
        <div className="flex p-1 bg-slate-100 rounded-2xl border">
          <button onClick={() => { setActiveTab('ebook'); onChangePhase(AppPhase.GRAPHICS); }} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'ebook' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>SKŁAD PREMIUM 💎</button>
          <button onClick={() => { setActiveTab('marketing'); onChangePhase(AppPhase.MARKETING); }} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'marketing' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>MARKETING 🚀</button>
          <button onClick={() => { setActiveTab('audio'); onChangePhase(AppPhase.AUDIO); }} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'audio' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-slate-900'}`}>AUDIO STUDIO 🎙️</button>
        </div>
        <button onClick={() => onChangePhase(AppPhase.DASHBOARD)} className="text-[10px] font-black opacity-50 flex items-center hover:opacity-100 uppercase tracking-widest transition-all">POWRÓT <X className="w-4 h-4 ml-2" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-[1700px] mx-auto">
          
          {activeTab === 'ebook' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Controls */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-2xl space-y-8 sticky top-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tighter"><Palette className="w-5 h-5 text-blue-600" /> Skład Premium</h3>
                    {hasVisuals && (
                      <button onClick={handleGenerateAll} className="text-[10px] font-black text-blue-600 flex items-center gap-1 hover:underline"><RefreshCw className="w-3 h-3" /> RE-GENERUJ</button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => photoInput.current?.click()} className="h-40 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center hover:bg-blue-50 transition-all relative overflow-hidden group">
                      <input type="file" ref={photoInput} className="hidden" onChange={(e) => handleFileUpload(e, 'authorPhoto')} />
                      {ex?.authorPhoto ? <img src={ex.authorPhoto} className="absolute inset-0 w-full h-full object-cover" /> : <><Camera className="text-slate-300 group-hover:text-blue-500" /><span className="text-[10px] font-black mt-2 text-slate-400">FOTO AUTORA</span></>}
                    </button>
                    <button onClick={() => logoInput.current?.click()} className="h-40 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center hover:bg-blue-50 transition-all relative overflow-hidden group">
                      <input type="file" ref={logoInput} className="hidden" onChange={(e) => handleFileUpload(e, 'authorLogo')} />
                      {ex?.authorLogo ? <img src={ex.authorLogo} className="absolute inset-0 w-full h-full object-contain p-6" /> : <><UserCircle className="text-slate-300 group-hover:text-blue-500" /><span className="text-[10px] font-black mt-2 text-slate-400">LOGO</span></>}
                    </button>
                  </div>

                  {!hasVisuals ? (
                    <div className="space-y-4">
                      <button onClick={handleGenerateAll} disabled={isGeneratingVisuals} className="w-full py-10 bg-blue-600 text-white font-black rounded-[32px] shadow-2xl flex flex-col items-center justify-center gap-3 hover:bg-blue-700 transition-all">
                        {isGeneratingVisuals ? <Loader2 className="animate-spin w-8 h-8" /> : <Sparkles className="w-8 h-8" />}
                        <span className="text-lg">GENERUJ PROJEKTY PREMIUM</span>
                        <span className="text-[10px] opacity-60 uppercase tracking-widest">15 wariantów (bez tekstów, jasna tonacja)</span>
                      </button>
                      {isGeneratingVisuals && (
                        <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-8 animate-in fade-in duration-500">
                      {[
                        { label: 'PROJEKTY OKŁADEK (BEZ TEKSTU)', key: 'generatedCovers', selected: 'selectedCoverIdx' },
                        { label: 'SUBTELNE TŁA STRON', key: 'generatedBackgrounds', selected: 'selectedBgIdx' },
                        { label: 'WIZUALIZACJA BOX 3D', key: 'generatedBoxes', selected: 'selectedBoxIdx' }
                      ].map(cat => (
                        <div key={cat.key} className="space-y-4">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cat.label}</label>
                            <button 
                              onClick={() => {
                                const idx = ex[cat.selected as keyof ExtrasData] as number;
                                const url = (ex[cat.key as keyof ExtrasData] as string[])[idx];
                                handleDownloadPng(url, `${cat.label}_${idx}`);
                              }}
                              className="text-[9px] font-black text-blue-500 flex items-center gap-1 hover:text-blue-700"
                            >
                              <Download className="w-2.5 h-2.5" /> POBIERZ PNG
                            </button>
                          </div>
                          <div className="grid grid-cols-5 gap-3">
                            {(ex[cat.key as keyof ExtrasData] as string[] || []).map((img, i) => (
                              <button key={i} onClick={() => onUpdateExtras({ [cat.selected]: i })} className={`aspect-square rounded-2xl border-4 overflow-hidden transition-all relative ${ex[cat.selected as keyof ExtrasData] === i ? 'border-blue-600 scale-105 shadow-2xl z-10' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                                <img src={img} className="w-full h-full object-cover" />
                                {ex[cat.selected as keyof ExtrasData] === i && <div className="absolute inset-0 bg-blue-600/10 flex items-center justify-center"><Check className="text-white drop-shadow-md" /></div>}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="pt-8 border-t border-slate-100 space-y-4">
                        <button onClick={handleDownloadPDF} className="w-full py-6 bg-slate-900 text-white font-black rounded-3xl flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-all group"><DownloadCloud className="group-hover:scale-110 transition-transform" /> PDF PREMIUM (DRUK)</button>
                        <button onClick={handleDownloadWord} className="w-full py-6 bg-blue-50 text-blue-600 font-black rounded-3xl flex items-center justify-center gap-3 hover:bg-blue-100 transition-all group"><FileText className="group-hover:scale-110 transition-transform" /> EKSPORT WORD 1:1</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview A4 */}
              <div ref={previewContainerRef} className="lg:col-span-7 bg-slate-200 rounded-[60px] flex flex-col items-center justify-start min-h-[95vh] py-12 px-6 overflow-hidden relative border-8 border-white/40 shadow-inner">
                <div 
                  ref={ebookContentRef}
                  className="bg-white shadow-2xl relative transition-transform duration-500 ease-out origin-top flex-shrink-0"
                  style={{ width: '210mm', transform: `scale(${previewScale})`, fontFamily: 'serif' }}
                >
                  {/* COVER */}
                  <div className="w-[210mm] h-[297mm] relative overflow-hidden flex flex-col items-center justify-center text-center p-24 bg-white page-break shadow-sm">
                    {ex?.generatedCovers?.[ex.selectedCoverIdx || 0] && (
                      <img src={ex.generatedCovers[ex.selectedCoverIdx || 0]} className="absolute inset-0 w-full h-full object-cover opacity-30" />
                    )}
                    <div className="relative z-10 space-y-12">
                      {ex?.authorLogo && <img src={ex.authorLogo} className="h-24 mx-auto object-contain mb-8 filter drop-shadow-lg" />}
                      <div className="w-32 h-1.5 bg-blue-600 mx-auto rounded-full"></div>
                      <h1 className="text-[42pt] font-black text-slate-900 leading-[1.1] uppercase tracking-tighter px-10">{ebookData.title || 'TYTUŁ PROJEKTU'}</h1>
                      <div className="space-y-2">
                        <p className="text-2xl text-slate-400 italic font-serif">by</p>
                        <p className="text-3xl text-slate-800 font-black uppercase tracking-[0.2em]">{ebookData.briefing?.authorName || 'R | H AUTHOR'}</p>
                      </div>
                    </div>
                  </div>

                  {/* TOC */}
                  <div className="w-[210mm] min-h-[297mm] p-24 relative flex flex-col bg-white page-break border-t border-slate-100">
                    <h2 className="text-[28pt] font-black text-slate-900 mb-16 uppercase border-b-8 border-blue-600 pb-6 w-fit pr-20">Spis Treści</h2>
                    <div className="space-y-8">
                      {ebookData.chapters.map((ch, i) => (
                        <div key={ch.id} className="flex justify-between items-end border-b-2 border-dotted border-slate-200 pb-3 group">
                          <span className="text-[18pt] font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{i + 1}. {ch.title}</span>
                          <span className="text-[16pt] font-serif italic text-slate-400">s. {i + 3}</span>
                        </div>
                      ))}
                    </div>
                    {ex?.authorLogo && <img src={ex.authorLogo} className="absolute bottom-24 right-24 h-12 opacity-10" />}
                  </div>

                  {/* CHAPTERS */}
                  {ebookData.chapters.map((ch, idx) => (
                    <div key={ch.id} className="w-[210mm] min-h-[297mm] p-24 relative flex flex-col bg-white page-break border-t border-slate-100" style={{ 
                      backgroundImage: ex?.generatedBackgrounds?.[ex.selectedBgIdx || 0] ? `url(${ex.generatedBackgrounds[ex.selectedBgIdx || 0]})` : 'none', 
                      backgroundSize: 'cover', 
                      backgroundBlendMode: 'overlay', 
                      backgroundColor: 'rgba(255,255,255,0.97)' 
                    }}>
                      <div className="flex justify-between items-center mb-20 border-b-2 border-slate-100 pb-10 opacity-30 text-[10pt] font-black uppercase tracking-[0.3em]">
                        <span>{ebookData.title}</span>
                        <span className="bg-slate-900 text-white px-3 py-1 rounded">Rozdział {idx + 1}</span>
                      </div>
                      <h2 className="text-[32pt] font-black text-slate-900 mb-16 leading-[1.2] border-l-[12px] border-blue-600 pl-12">{ch.title}</h2>
                      <div className="prose prose-slate prose-xl max-w-none text-slate-800 text-justify font-serif leading-relaxed tracking-wide">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{ch.content}</ReactMarkdown>
                      </div>
                      <div className="mt-auto pt-24 flex justify-between items-end">
                        <div className="flex items-center gap-4">
                          {ex?.authorPhoto && <img src={ex.authorPhoto} className="w-16 h-16 rounded-2xl object-cover shadow-2xl border-2 border-white" />}
                          <div className="text-[8pt] font-black uppercase tracking-widest text-slate-400">Copyright &copy; {new Date().getFullYear()} {ebookData.briefing?.authorName}</div>
                        </div>
                        <p className="text-[10pt] font-black uppercase opacity-20 bg-slate-100 px-4 py-1 rounded-full">Strona {idx + 3}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'marketing' && (
            <div className="space-y-12 animate-in fade-in duration-700 max-w-6xl mx-auto py-10">
              <div className="text-center space-y-6">
                <div className="bg-blue-600 text-white px-6 py-2 rounded-full font-black inline-block text-[11px] uppercase tracking-[0.4em] shadow-xl">Marketing Launchpad</div>
                <h2 className="text-7xl font-black tracking-tighter text-slate-900 leading-none">Gotowe Materiały Sprzedaży 🚀</h2>
                <p className="text-slate-500 font-bold max-w-2xl mx-auto">Twoja spersonalizowana strategia oparta na psychologii sprzedaży i trendach AI 2025.</p>
              </div>

              {!ex?.ctaHooks ? (
                <div className="bg-white p-24 rounded-[60px] border border-dashed border-slate-300 text-center flex flex-col items-center gap-8 shadow-inner">
                  <Activity className="w-24 h-24 text-slate-200" />
                  <div className="space-y-3">
                    <p className="text-2xl font-black text-slate-900">Analiza rynkowa w toku</p>
                    <p className="text-slate-500 font-medium">Musisz najpierw wygenerować strategię w zakładce Skład Premium.</p>
                  </div>
                  <button onClick={() => onChangePhase(AppPhase.GRAPHICS)} className="px-12 py-6 bg-slate-900 text-white font-black rounded-3xl shadow-2xl flex items-center gap-3 transition-transform hover:scale-105 active:scale-95">PRZEJDŹ DO GENERATORA</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="bg-white p-12 rounded-[50px] border border-slate-200 shadow-xl space-y-8 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <h4 className="text-[12px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-5 py-2 rounded-2xl">Killer Hook</h4>
                      <button onClick={() => {navigator.clipboard.writeText(ex.ctaHooks?.short100 || ''); alert('Skopiowano!');}} className="p-4 bg-slate-100 rounded-2xl hover:bg-slate-900 hover:text-white transition-all"><Copy className="w-6 h-6" /></button>
                    </div>
                    <p className="text-5xl font-black text-slate-900 leading-tight">"{ex.ctaHooks.short100}"</p>
                  </div>
                  <div className="bg-white p-12 rounded-[50px] border border-slate-200 shadow-xl space-y-8 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <h4 className="text-[12px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-5 py-2 rounded-2xl">Social Media Copy</h4>
                      <button onClick={() => {navigator.clipboard.writeText(ex.ctaHooks?.medium200 || ''); alert('Skopiowano!');}} className="p-4 bg-slate-100 rounded-2xl hover:bg-slate-900 hover:text-white transition-all"><Copy className="w-6 h-6" /></button>
                    </div>
                    <p className="text-2xl font-bold text-slate-600 leading-relaxed italic border-l-8 border-slate-100 pl-8">"{ex.ctaHooks.medium200}"</p>
                  </div>
                  <div className="lg:col-span-2 bg-slate-900 p-20 rounded-[80px] shadow-3xl text-white space-y-12 relative overflow-hidden group">
                    <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full group-hover:bg-blue-500/20 transition-all duration-1000"></div>
                    <div className="flex justify-between items-center relative z-10">
                      <h4 className="text-sm font-black text-blue-400 uppercase tracking-[0.6em] border-l-8 border-blue-500 pl-8">Strategic Sales Script & Long-Form Copy</h4>
                      <button onClick={() => {navigator.clipboard.writeText(ex.ctaHooks?.fullSalesCopy || ''); alert('Skopiowano!');}} className="p-6 bg-white/10 rounded-3xl hover:bg-white hover:text-slate-900 transition-all shadow-2xl flex items-center gap-3"><Copy className="w-6 h-6" /> KOPIUJ WSZYSTKO</button>
                    </div>
                    <div className="prose prose-invert max-w-none text-blue-50/90 leading-relaxed text-[22pt] font-serif relative z-10 text-justify">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{ex.ctaHooks.fullSalesCopy}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="space-y-16 animate-in fade-in duration-1000 max-w-5xl mx-auto text-white py-10">
              <div className="text-center space-y-8">
                <div className="inline-flex items-center gap-3 px-6 py-2 bg-blue-500/20 text-blue-400 rounded-full font-black uppercase text-[10px] tracking-widest border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.2)]">Studio Produkcji Głosowej</div>
                <h2 className="text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-700 leading-none">Audiobook Master 🎙️</h2>
                <div className="flex items-center gap-6 bg-slate-900 p-3 rounded-[32px] border border-slate-800 justify-center w-fit mx-auto shadow-2xl">
                  <label className="text-xs font-black uppercase px-8 text-slate-500">Lektor:</label>
                  <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} className="bg-black text-white px-10 py-5 rounded-[24px] outline-none font-bold border-none ring-2 ring-slate-800 focus:ring-blue-500 transition-all appearance-none cursor-pointer">
                    {AVAILABLE_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-6">
                {ebookData.chapters.map((ch, i) => (
                  <div key={ch.id} className="bg-white/5 backdrop-blur-xl p-12 rounded-[60px] border border-white/10 flex items-center justify-between hover:bg-white/10 transition-all group hover:border-blue-500/30">
                    <div className="flex items-center gap-12">
                      <div className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center font-black text-4xl border border-white/5 shadow-2xl group-hover:scale-110 transition-transform group-hover:text-blue-500">{i + 1}</div>
                      <div className="space-y-4">
                        <h4 className="font-black text-4xl tracking-tight leading-none">{ch.title}</h4>
                        {audios[ch.id] && (
                          <div className="flex items-center gap-6 animate-in slide-in-from-left-4">
                            <audio controls src={audios[ch.id]} className="h-12 w-80 brightness-110 contrast-125 saturate-150" />
                            <button onClick={() => {const l=document.createElement('a');l.href=audios[ch.id];l.download=`${ebookData.title}_Ch${i+1}.wav`;l.click();}} className="p-3 bg-white/5 rounded-2xl hover:bg-blue-600 transition-all hover:scale-110"><Download className="w-6 h-6" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleProduceAudio(ch.id, ch.content)} disabled={isProducingAudio === ch.id} className={`px-14 py-6 font-black rounded-[32px] transition-all flex items-center gap-4 text-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${audios[ch.id] ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-blue-600 hover:bg-white hover:text-slate-950'}`}>
                      {isProducingAudio === ch.id ? <Loader2 className="animate-spin" /> : audios[ch.id] ? <Check /> : <Play />}
                      {isProducingAudio === ch.id ? 'SYNTEZA...' : audios[ch.id] ? 'ODTWÓRZ PONOWNIE' : 'GENERUJ AUDIO'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
