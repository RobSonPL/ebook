import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Sparkles, Layers, FileDown, Copy, Megaphone, 
  Palette, GraduationCap, Headphones, ArrowRight, Download, 
  RefreshCw, Upload as UploadIcon
} from 'lucide-react';
import { EbookData, ExtrasData, AppPhase, TrainingCourse } from '../types';
import { generateImage, generateImageVariations, generateAudiobook, generateCourse } from '../services/geminiService';

declare var pdfMake: any;

interface PhaseExtrasProps {
  ebookData: EbookData;
  isGenerating: boolean;
  onGenerateExtras: () => void;
  onChangePhase: (phase: AppPhase) => void;
  onUpdateExtras: (updates: Partial<ExtrasData>) => void;
}

// Helpers
const processTextForPdf = (text: string, style: string) => {
    return text.replace(/[*_#`]/g, '');
};

const parseMarkdownTableToPdfMake = (markdownTable: string) => {
    const rows = markdownTable.trim().split('\n');
    const body = rows.map(row => {
        return row.split('|').filter(cell => cell.trim() !== '').map(cell => ({ text: cell.trim(), style: 'tableCell' }));
    });
    // Remove separator row if exists (usually starts with |-)
    const cleanBody = body.filter(row => !row[0]?.text.match(/^[:\-]*/));

    return {
        table: {
            headerRows: 1,
            widths: Array(cleanBody[0]?.length || 1).fill('*'),
            body: cleanBody
        },
        layout: 'lightHorizontalLines',
        margin: [0, 10, 0, 10]
    };
};

export const PhaseExtras: React.FC<PhaseExtrasProps> = ({ 
  ebookData, 
  isGenerating, 
  onGenerateExtras, 
  onChangePhase, 
  onUpdateExtras 
}) => {
  const [activeTab, setActiveTab] = useState<'marketing' | 'ebook' | 'training' | 'audio'>('marketing');
  
  // Local state for generated assets
  const [uploadedImages, setUploadedImages] = useState<Record<string, string>>({});
  const [coverVariations, setCoverVariations] = useState<string[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isGeneratingCourse, setIsGeneratingCourse] = useState(false);

  // Load existing data
  useEffect(() => {
     if (ebookData.extras?.qrCodeUrl) setQrCodeUrl(ebookData.extras.qrCodeUrl);
     if (ebookData.extras?.audiobookUrl) setAudioUrl(ebookData.extras.audiobookUrl);
  }, [ebookData.extras]);

  // Handlers
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Skopiowano do schowka!");
  };

  const handleCopyTeaserText = () => {
      const text = ebookData.chapters.slice(0, 2).map(c => `## ${c.title}\n\n${c.content}`).join('\n\n');
      handleCopy(text);
  };

  const handleGenerateImage = async (key: string, prompt: string) => {
      // Fallback prompt for backgrounds if not provided
      if (!prompt && (key === 'pageBackground' || key === 'tocBackground')) {
          prompt = "Abstract subtle light texture, minimalist background";
      }

      if (!prompt) {
          alert("Brak promptu. Wygeneruj najpierw pakiet marketingowy.");
          return;
      }
      setIsGeneratingImage(true);
      
      let finalPrompt = prompt;
      // ENFORCE: Light background, no text for page backgrounds
      if (key === 'pageBackground' || key === 'tocBackground') {
          finalPrompt += " . High brightness, white background, very light opacity, subtle abstract texture, NO TEXT, NO LETTERS, clean minimalist style, watermark-free, paper texture.";
      }

      try {
          const img = await generateImage(finalPrompt);
          setUploadedImages(prev => ({ ...prev, [key]: img }));
      } catch (e) {
          console.error(e);
          alert("Błąd generowania obrazu.");
      } finally {
          setIsGeneratingImage(false);
      }
  };

  const handleGenerateCoverVariations = async (prompt: string) => {
      if (!prompt) return;
      setIsGeneratingImage(true);
      try {
          const imgs = await generateImageVariations(prompt, 4);
          setCoverVariations(imgs);
      } catch (e) {
          console.error(e);
          alert("Błąd generowania wariantów.");
      } finally {
          setIsGeneratingImage(false);
      }
  };

  const handleSelectVariation = (img: string) => {
      setUploadedImages(prev => ({ ...prev, 'cover': img }));
  };

  const handleImageUpload = (key: string, file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          if (e.target?.result) {
              setUploadedImages(prev => ({ ...prev, [key]: e.target!.result as string }));
          }
      };
      reader.readAsDataURL(file);
  };
  
  // PDF Logic
  const createPdfDocDefinition = (isTeaser: boolean) => {
      const author = ebookData.briefing?.authorName || "Synapse Creative";
      const currentYear = new Date().getFullYear();
      const purchaseLink = ebookData.extras?.purchaseLink || 'https://www.naffy.io/Synapse_Creative';

      const docContent: any[] = [];
      
      // Cover Page
      if (uploadedImages['cover']) {
        docContent.push({
            image: uploadedImages['cover'],
            width: 500,
            alignment: 'center',
            margin: [0, 20, 0, 20]
        });
      }
      docContent.push({ text: processTextForPdf(ebookData.title, 'coverTitle'), style: 'coverTitle', margin: [0, 20, 0, 10], alignment: 'center' });
      docContent.push({ text: ebookData.briefing?.topic || '', style: 'coverSubtitle', margin: [0, 0, 0, 40] });
      docContent.push({ text: author, style: 'coverAuthor', margin: [0, 200, 0, 5] });

      if (isTeaser) {
           docContent.push({ text: processTextForPdf('DARMOWY FRAGMENT 🚀', 'teaserLabel'), style: 'teaserLabel', alignment: 'center', margin: [0, 10, 0, 0] });
      } else {
           docContent.push({ text: `${currentYear}`, style: 'normal', alignment: 'center' });
      }

      // Page Break
      docContent.push({ text: '', pageBreak: 'after' });
      
      // TOC
      docContent.push({ text: 'Spis Treści', style: 'header', alignment: 'center', margin: [0, 0, 0, 20] });
      const tocList = ebookData.chapters.map((c, i) => ({
        text: `${i + 1}. ${c.title} ${isTeaser && i > 1 ? '(W pełnej wersji)' : ''}`,
        style: isTeaser && i > 1 ? 'dimmed' : 'tocItem',
        margin: [0, 5, 0, 5]
      }));
      docContent.push({ ul: tocList, style: 'tocList' });
      docContent.push({ text: '', pageBreak: 'after' });

      // Chapters
      const chaptersToInclude = isTeaser ? ebookData.chapters.slice(0, 2) : ebookData.chapters;
      chaptersToInclude.forEach((chapter, index) => {
         if (index > 0) docContent.push({ text: '', pageBreak: 'before' });
         
         docContent.push({ text: `Rozdział ${index + 1}`, style: 'chapterLabel' });
         docContent.push({ text: chapter.title, style: 'header' });
         
         if (uploadedImages[`chapter-${index}`]) {
             docContent.push({ image: uploadedImages[`chapter-${index}`], width: 400, alignment: 'center', margin: [0, 10, 0, 20] });
         }

         const paragraphs = chapter.content.split('\n\n');
         paragraphs.forEach(para => {
             const trimPara = para.trim();
             if (trimPara.startsWith('|') && trimPara.includes('|') && trimPara.split('\n').length > 1) {
                 const tableDef = parseMarkdownTableToPdfMake(trimPara);
                 if (tableDef) { docContent.push(tableDef); return; }
             }
             if (para.startsWith('## ')) {
               docContent.push({ text: para.replace('## ', ''), style: 'subheader' });
             } else if (para.startsWith('### ')) {
               docContent.push({ text: para.replace('### ', ''), style: 'subsubheader' });
             } else {
               docContent.push({ text: processTextForPdf(trimPara, 'normal'), style: 'normal' });
             }
         });
      });

      // CTA for Teaser / Extras for Full
      if (isTeaser) {
           docContent.push({ text: '', pageBreak: 'before' });
           docContent.push({ text: 'KUP PEŁNĄ WERSJĘ', style: 'cta', link: purchaseLink, alignment: 'center', margin: [0, 20, 0, 0] });
           if (qrCodeUrl) {
               // Assuming qrCodeUrl is valid image data/url
               try {
                  docContent.push({ image: qrCodeUrl, width: 150, alignment: 'center', margin: [0, 10, 0, 0] });
               } catch(e) {}
           }
      } else {
           if (ebookData.extras?.checklist) {
               docContent.push({ text: '', pageBreak: 'before' });
               docContent.push({ text: 'Checklista ✅', style: 'header' });
               const items = ebookData.extras.checklist.split('\n').filter(l => l.trim().length > 0);
               docContent.push({ ul: items, margin: [0, 10, 0, 0] });
           }
      }

      // Background logic
      const background = (currentPage: number) => {
          if (currentPage > 1 && uploadedImages['pageBackground']) {
              return {
                 image: uploadedImages['pageBackground'],
                 width: 595.28,
                 height: 841.89,
                 absolutePosition: { x: 0, y: 0 }
              };
          }
          return null; // White background by default
      };

      return {
          content: docContent,
          background: background,
          styles: {
            header: { fontSize: 24, bold: true, margin: [0, 20, 0, 10], color: '#111827' },
            subheader: { fontSize: 18, bold: true, margin: [0, 15, 0, 8], color: '#374151' },
            subsubheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5], color: '#4b5563' },
            normal: { fontSize: 11, margin: [0, 0, 0, 12], alignment: 'justify', lineHeight: 1.4, color: '#374151' },
            coverTitle: { fontSize: 36, bold: true, alignment: 'center', color: '#111827' },
            coverSubtitle: { fontSize: 18, alignment: 'center', color: '#4b5563' },
            coverAuthor: { fontSize: 16, bold: true, alignment: 'center', color: '#374151' },
            teaserLabel: { fontSize: 14, bold: true, color: '#dc2626', alignment: 'center' },
            chapterLabel: { fontSize: 10, bold: true, color: '#9ca3af', margin: [0, 40, 0, 0] },
            tocItem: { fontSize: 12, margin: [0, 5, 0, 5], color: '#374151' },
            dimmed: { fontSize: 10, color: '#9ca3af' },
            cta: { fontSize: 18, bold: true, color: '#2563eb', decoration: 'underline' },
            tableCell: { fontSize: 10, color: '#374151', margin: [0, 5, 0, 5] },
            tocList: { markerColor: '#2563eb' }
          },
          defaultStyle: { font: 'Roboto' }
      };
  };

  const handleExportPDF = () => {
      if (typeof pdfMake === 'undefined') { alert("Brak biblioteki PDF"); return; }
      try {
        const dd = createPdfDocDefinition(false);
        pdfMake.createPdf(dd).download(`${ebookData.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
      } catch (e) { console.error(e); alert("Błąd generowania PDF"); }
  };

  const handleExportTeaserPDF = () => {
      if (typeof pdfMake === 'undefined') { alert("Brak biblioteki PDF"); return; }
      try {
        const dd = createPdfDocDefinition(true);
        pdfMake.createPdf(dd).download(`${ebookData.title.replace(/[^a-z0-9]/gi, '_')}_TEASER.pdf`);
      } catch (e) { console.error(e); alert("Błąd generowania PDF"); }
  };

  const handleGenerateAudio = async () => {
      setIsGeneratingAudio(true);
      try {
          // Flatten text
          const fullText = ebookData.chapters.map(c => c.title + ". " + c.content).join("\n\n");
          // Generate - using a chunk for demo
          const url = await generateAudiobook(fullText.substring(0, 2000), selectedVoice); 
          setAudioUrl(url);
          onUpdateExtras({ audiobookUrl: url, audioVoice: selectedVoice });
      } catch (e) {
          console.error(e);
          alert("Błąd generowania audio.");
      } finally {
          setIsGeneratingAudio(false);
      }
  };

  const handleGenerateTraining = async () => {
      if (!ebookData.briefing) return;
      setIsGeneratingCourse(true);
      try {
          const course = await generateCourse(ebookData.briefing, ebookData.title, ebookData.chapters);
          onUpdateExtras({ trainingCourse: course });
      } catch (e) {
          console.error(e);
          alert("Błąd generowania kursu.");
      } finally {
          setIsGeneratingCourse(false);
      }
  };

  const ImageUploadBox = ({ label, onUpload, currentImage, compact }: any) => (
      <div className={`border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 ${compact ? 'h-32' : 'h-48'}`} onClick={() => document.getElementById(`file-${label}`)?.click()}>
          <input id={`file-${label}`} type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
          {currentImage ? (
              <img src={currentImage} className="max-h-full max-w-full object-contain" />
          ) : (
              <div className="text-center text-gray-400">
                  <UploadIcon className="w-8 h-8 mx-auto mb-2" />
                  <span className="text-xs">{label}</span>
              </div>
          )}
      </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden relative">
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 flex flex-col md:flex-row justify-between items-center shadow-sm z-10 gap-4 md:gap-0">
        <div className="flex items-center space-x-2 text-sm text-gray-500 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <button onClick={() => onChangePhase(AppPhase.BRIEFING)} className="hover:text-blue-600 whitespace-nowrap">Briefing</button>
          <span>/</span>
          <button onClick={() => onChangePhase(AppPhase.STRUCTURE)} className="hover:text-blue-600 whitespace-nowrap">Struktura</button>
          <span>/</span>
          <button onClick={() => onChangePhase(AppPhase.WRITING)} className="hover:text-blue-600 whitespace-nowrap">Treść</button>
          <span>/</span>
          <span className="font-bold text-gray-900 whitespace-nowrap">Gotowy Produkt</span>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
          <button onClick={() => setActiveTab('marketing')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'marketing' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>Marketing</button>
          <button onClick={() => setActiveTab('ebook')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'ebook' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>E-book</button>
          <button onClick={() => setActiveTab('training')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center ${activeTab === 'training' ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:text-gray-900'}`}><GraduationCap className="w-4 h-4 mr-1" /> Szkolenie</button>
          <button onClick={() => setActiveTab('audio')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center ${activeTab === 'audio' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-900'}`}><Headphones className="w-4 h-4 mr-1" /> Audio</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
             {!ebookData.extras && !isGenerating ? (
                 <div className="text-center py-20">
                     <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-6" />
                     <h2 className="text-2xl font-bold text-gray-900 mb-4">Materiały dodatkowe nie zostały jeszcze wygenerowane.</h2>
                     <button onClick={onGenerateExtras} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105">
                         Generuj Pakiet Marketingowy
                     </button>
                 </div>
             ) : isGenerating ? (
                <div className="text-center py-20 animate-pulse">
                  <Sparkles className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-6" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Generuję materiały...</h2>
                  <p className="text-gray-500">To może potrwać do minuty. Tworzymy opisy, prompty i strategie.</p>
                </div>
             ) : (
                <>
                  {/* MARKETING TAB */}
                  {activeTab === 'marketing' && (
                      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                          {/* Teaser Section */}
                          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                             <div className="flex justify-between items-center mb-6">
                                 <h3 className="text-xl font-bold text-gray-900 flex items-center"><Layers className="w-6 h-6 mr-2 text-indigo-600" /> Lead Magnet (Teaser)</h3>
                                 <div className="flex gap-2">
                                     <button onClick={handleCopyTeaserText} className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold"><Copy className="w-4 h-4 mr-2" /> Kopiuj Tekst</button>
                                     <button onClick={handleExportTeaserPDF} className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold"><FileDown className="w-4 h-4 mr-2" /> Pobierz PDF</button>
                                 </div>
                             </div>
                             {/* Cover Preview */}
                             <div className="flex justify-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="w-48 h-64 bg-white shadow-lg flex items-center justify-center overflow-hidden">
                                    {uploadedImages['cover'] ? <img src={uploadedImages['cover']} className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400">Brak okładki</span>}
                                </div>
                             </div>
                          </div>
                          
                          {/* Descriptions */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                  <div className="flex justify-between items-center mb-2">
                                      <span className="text-xs font-bold text-gray-500 uppercase">Hook (100 zn)</span>
                                      <Copy className="w-4 h-4 text-gray-400 cursor-pointer" onClick={() => handleCopy(ebookData.extras?.shortDescription || '')} />
                                  </div>
                                  <p className="text-sm italic text-gray-700">{ebookData.extras?.shortDescription}</p>
                              </div>
                              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                  <div className="flex justify-between items-center mb-2">
                                      <span className="text-xs font-bold text-gray-500 uppercase">Ads (200 zn)</span>
                                      <Copy className="w-4 h-4 text-gray-400 cursor-pointer" onClick={() => handleCopy(ebookData.extras?.mediumDescription || '')} />
                                  </div>
                                  <p className="text-sm italic text-gray-700">{ebookData.extras?.mediumDescription}</p>
                              </div>
                              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                  <div className="flex justify-between items-center mb-2">
                                      <span className="text-xs font-bold text-gray-500 uppercase">Promo Post</span>
                                      <Copy className="w-4 h-4 text-gray-400 cursor-pointer" onClick={() => handleCopy(ebookData.extras?.longDescription || '')} />
                                  </div>
                                  <p className="text-sm italic text-gray-700 line-clamp-4">{ebookData.extras?.longDescription}</p>
                              </div>
                          </div>

                          {/* Graphics & Blurb */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                             {/* Blurb */}
                             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                 <div className="flex justify-between items-start mb-4">
                                     <h3 className="font-bold text-gray-900">Landing Page Copy</h3>
                                     <Copy className="w-5 h-5 text-gray-400 cursor-pointer" onClick={() => handleCopy(ebookData.extras?.marketingBlurb || '')} />
                                 </div>
                                 <div className="prose prose-sm prose-blue max-w-none bg-gray-50 p-4 rounded-lg border border-gray-100 h-96 overflow-y-auto" dangerouslySetInnerHTML={{ __html: ebookData.extras?.marketingBlurb || '' }} />
                             </div>

                             {/* Graphics Generator */}
                             <div className="bg-slate-900 p-6 rounded-xl shadow-lg text-white">
                                <h3 className="font-bold mb-6 flex items-center"><Palette className="w-5 h-5 mr-2" /> Studio Graficzne AI</h3>
                                <div className="space-y-4">
                                    {/* Cover */}
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-xs font-bold text-blue-300 uppercase">Okładka</label>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleGenerateImage('cover', ebookData.extras?.imagePrompts.cover || '')} className="text-xs bg-blue-600 px-2 py-1 rounded">Generuj</button>
                                                <button onClick={() => handleGenerateCoverVariations(ebookData.extras?.imagePrompts.cover || '')} className="text-xs bg-indigo-600 px-2 py-1 rounded">Warianty</button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <ImageUploadBox label="Okładka" onUpload={(f: File) => handleImageUpload('cover', f)} currentImage={uploadedImages['cover']} compact />
                                            {coverVariations.length > 0 && (
                                                <div className="grid grid-cols-2 gap-1 bg-slate-800 p-1 rounded">
                                                    {coverVariations.map((v, i) => <img key={i} src={v} className="w-full h-16 object-cover cursor-pointer hover:opacity-80" onClick={() => handleSelectVariation(v)} />)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Page Background */}
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-xs font-bold text-blue-300 uppercase">Tło Stron (PDF)</label>
                                            <button onClick={() => handleGenerateImage('pageBackground', ebookData.extras?.imagePrompts.pageBackground || '')} className="text-xs bg-blue-600 px-2 py-1 rounded">Generuj Jasne Tło</button>
                                        </div>
                                        <ImageUploadBox label="Tło Stron" onUpload={(f: File) => handleImageUpload('pageBackground', f)} currentImage={uploadedImages['pageBackground']} compact />
                                    </div>

                                    {/* 3D Box */}
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-xs font-bold text-blue-300 uppercase">Box 3D</label>
                                            <button onClick={() => handleGenerateImage('box3d', ebookData.extras?.imagePrompts.box3d || '')} className="text-xs bg-blue-600 px-2 py-1 rounded">Generuj</button>
                                        </div>
                                        <ImageUploadBox label="Box 3D" onUpload={(f: File) => handleImageUpload('box3d', f)} currentImage={uploadedImages['box3d']} compact />
                                    </div>
                                </div>
                             </div>
                          </div>
                      </div>
                  )}

                  {/* EBOOK TAB */}
                  {activeTab === 'ebook' && (
                      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center py-12">
                              <BookOpen className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                              <h2 className="text-3xl font-bold text-gray-900 mb-2">Pełna Wersja E-booka</h2>
                              <p className="text-gray-600 mb-8 max-w-md mx-auto">Twój produkt jest gotowy do publikacji. Upewnij się, że dodałeś okładkę i wygenerowałeś obrazki do rozdziałów w sekcji Marketing.</p>
                              
                              <button onClick={handleExportPDF} className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-10 rounded-full shadow-xl transition-all flex items-center mx-auto text-lg">
                                  <Download className="w-6 h-6 mr-3" />
                                  Pobierz Pełny PDF
                              </button>
                          </div>
                      </div>
                  )}

                  {/* TRAINING TAB */}
                  {activeTab === 'training' && (
                      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                              <div className="flex justify-between items-center mb-6 border-b pb-4">
                                  <div>
                                      <h2 className="text-2xl font-bold text-gray-900">Kurs / Szkolenie</h2>
                                      <p className="text-gray-500 text-sm">Automatycznie wygenerowany sylabus i materiały szkoleniowe na podstawie e-booka.</p>
                                  </div>
                                  <button 
                                    onClick={handleGenerateTraining} 
                                    disabled={isGeneratingCourse}
                                    className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-bold flex items-center disabled:opacity-50"
                                  >
                                      {isGeneratingCourse ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                      {ebookData.extras?.trainingCourse ? 'Generuj Ponownie' : 'Generuj Kurs'}
                                  </button>
                              </div>

                              {ebookData.extras?.trainingCourse ? (
                                  <div className="space-y-6">
                                      <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
                                          <h3 className="text-xl font-bold text-orange-900 mb-2">{ebookData.extras.trainingCourse.title}</h3>
                                          <p className="text-orange-800 mb-4">{ebookData.extras.trainingCourse.description}</p>
                                          <div className="flex gap-4 text-sm font-semibold text-orange-700">
                                              <span>⏱ {ebookData.extras.trainingCourse.totalDuration}</span>
                                              <span>👥 {ebookData.extras.trainingCourse.targetAudience}</span>
                                          </div>
                                      </div>
                                      
                                      <div className="space-y-4">
                                          {ebookData.extras.trainingCourse.modules.map((mod, i) => (
                                              <div key={i} className="border border-gray-200 rounded-lg p-4">
                                                  <h4 className="font-bold text-lg mb-2 text-gray-800">Moduł {i+1}: {mod.title}</h4>
                                                  <p className="text-sm text-gray-600 mb-3 bg-gray-50 p-2 rounded">Cel: {mod.objective}</p>
                                                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2">
                                                      {mod.lessons.map((l, j) => (
                                                          <li key={j}><span className="font-semibold">{l.title}</span> ({l.duration}) - <span className="italic text-gray-500">{l.activity}</span></li>
                                                      ))}
                                                  </ul>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              ) : (
                                  <div className="text-center py-12 text-gray-400">
                                      <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                      <p>Kliknij "Generuj Kurs", aby stworzyć program szkoleniowy.</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}

                  {/* AUDIO TAB */}
                  {activeTab === 'audio' && (
                      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                               <div className="flex justify-between items-center mb-6">
                                   <h2 className="text-2xl font-bold text-gray-900">Audiobook AI</h2>
                                   <div className="flex items-center gap-2">
                                       <select 
                                         value={selectedVoice} 
                                         onChange={(e) => setSelectedVoice(e.target.value)}
                                         className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                       >
                                           <option value="Kore">Kore (Kobieta)</option>
                                           <option value="Fenrir">Fenrir (Mężczyzna)</option>
                                           <option value="Puck">Puck (Kobieta)</option>
                                       </select>
                                       <button 
                                         onClick={handleGenerateAudio} 
                                         disabled={isGeneratingAudio}
                                         className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold flex items-center disabled:opacity-50"
                                       >
                                           {isGeneratingAudio ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Headphones className="w-4 h-4 mr-2" />}
                                           Generuj Audio
                                       </button>
                                   </div>
                               </div>

                               {audioUrl ? (
                                   <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 text-center">
                                       <div className="w-20 h-20 bg-purple-200 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-700">
                                           <Headphones className="w-10 h-10" />
                                       </div>
                                       <h3 className="text-lg font-bold text-purple-900 mb-2">{ebookData.title} - Audiobook</h3>
                                       <audio ref={audioRef} src={audioUrl} controls className="w-full mt-4" />
                                       <a href={audioUrl} download={`audiobook-${ebookData.title}.wav`} className="inline-block mt-4 text-sm font-bold text-purple-600 hover:underline">
                                           Pobierz plik .WAV
                                       </a>
                                   </div>
                               ) : (
                                   <div className="text-center py-12 text-gray-400">
                                       <Headphones className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                       <p>Wygeneruj wersję audio swojego e-booka.</p>
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
