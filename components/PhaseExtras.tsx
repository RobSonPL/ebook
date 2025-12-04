
import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, Copy, Sparkles, BookText, Facebook, Twitter, Linkedin, Printer, Type, Image as ImageIcon, FileText, Share, Mail, Share2 } from 'lucide-react';
import { EbookData, FontType } from '../types';

interface PhaseExtrasProps {
  ebookData: EbookData;
  isGenerating: boolean;
  onGenerateExtras: () => void;
}

export const PhaseExtras: React.FC<PhaseExtrasProps> = ({ ebookData, isGenerating, onGenerateExtras }) => {
  const [activeTab, setActiveTab] = useState<'marketing' | 'ebook'>('marketing');
  const [copied, setCopied] = useState(false);
  const [font, setFont] = useState<FontType>('serif');

  useEffect(() => {
    if (activeTab === 'marketing' && !ebookData.extras && !isGenerating) {
      onGenerateExtras();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareSocial = (platform: 'twitter' | 'facebook' | 'linkedin' | 'email' | 'pinterest') => {
    const text = encodeURIComponent(ebookData.extras?.marketingBlurb || `Sprawdź mój nowy e-book: ${ebookData.title}`);
    const url = encodeURIComponent(window.location.href); 
    
    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${text}`;
        window.open(shareUrl, '_blank', 'width=600,height=400');
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        window.open(shareUrl, '_blank', 'width=600,height=400');
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        window.open(shareUrl, '_blank', 'width=600,height=400');
        break;
      case 'pinterest':
        shareUrl = `https://pinterest.com/pin/create/button/?url=${url}&description=${text}`;
        window.open(shareUrl, '_blank', 'width=600,height=400');
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(ebookData.title)}&body=${text}%0A%0A${url}`;
        window.location.href = shareUrl;
        break;
    }
  };

  const handleShareFile = async () => {
    if (!navigator.share) {
      alert("Twoja przeglądarka nie obsługuje udostępniania plików.");
      return;
    }

    try {
      const fullText = `# ${ebookData.title}\n\n${ebookData.chapters.map(c => `## ${c.title}\n\n${c.content}`).join('\n\n')}`;
      const file = new File([fullText], `${ebookData.title.replace(/\s+/g, '_')}.md`, { type: 'text/markdown' });
      
      await navigator.share({
        title: ebookData.title,
        text: ebookData.extras?.shortDescription,
        files: [file]
      });
    } catch (err) {
      console.error("Error sharing file:", err);
    }
  };

  const handleExportWord = () => {
    const author = ebookData.briefing?.authorName || "Autor";
    const year = new Date().getFullYear();
    const safeTitle = ebookData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    // Map internal font keys to CSS font-family stacks
    const fontMap: Record<FontType, string> = {
      sans: 'Arial, Helvetica, sans-serif',
      serif: 'Times New Roman, serif',
      mono: '"Courier New", Courier, monospace',
      lato: '"Lato", Calibri, sans-serif',
      merriweather: '"Merriweather", Georgia, serif',
      playfair: '"Playfair Display", "Times New Roman", serif',
      oswald: '"Oswald", Impact, sans-serif',
      raleway: '"Raleway", Verdana, sans-serif'
    };

    const chosenFont = fontMap[font];

    // Rich HTML Template optimized for Word
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${ebookData.title}</title>
        <!--[if gte mso 9]>
        <xml>
        <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Merriweather:wght@300;700&family=Oswald:wght@400;700&family=Playfair+Display:wght@400;700&family=Raleway:wght@400;700&display=swap');
          
          /* Page Setup */
          @page {
            size: 21cm 29.7cm;
            margin: 2.5cm 2.5cm 2.5cm 2.5cm;
            mso-page-orientation: portrait;
            mso-header-margin: 1.25cm;
            mso-footer-margin: 1.25cm;
            mso-footer: f1;
          }

          body { 
            font-family: ${chosenFont}; 
            line-height: 1.5; 
            color: #000000;
            font-size: 11pt;
            background-color: white;
          }

          /* Refined Headings Structure */
          h1 { 
            font-size: 26pt; 
            font-weight: bold; 
            margin-top: 0; 
            margin-bottom: 24pt; 
            line-height: 1.2; 
            color: #111827; 
            page-break-after: avoid; 
            mso-outline-level: 1;
          }
          
          h2 { 
            font-size: 20pt; 
            font-weight: bold; 
            margin-top: 24pt; 
            margin-bottom: 12pt; 
            line-height: 1.3; 
            color: #111827; 
            page-break-after: avoid; 
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 6pt;
            mso-outline-level: 2;
          }
          
          h3 { 
            font-size: 16pt; 
            font-weight: bold; 
            margin-top: 18pt; 
            margin-bottom: 8pt; 
            line-height: 1.4; 
            color: #374151; 
            page-break-after: avoid; 
            mso-outline-level: 3;
          }
          
          /* Text */
          p { margin-top: 0; margin-bottom: 12pt; text-align: justify; widows: 2; orphans: 2; }
          ul, ol { margin-top: 0; margin-bottom: 12pt; margin-left: 24pt; }
          li { margin-bottom: 4pt; }
          a { color: #2563eb; text-decoration: underline; }
          blockquote { border-left: 4px solid #e5e7eb; padding-left: 12pt; margin-left: 12pt; margin-top: 12pt; margin-bottom: 12pt; color: #4b5563; font-style: italic; }
          
          /* Tables */
          table { width: 100%; border-collapse: collapse; margin-bottom: 12pt; }
          th, td { border: 1px solid #d1d5db; padding: 8pt; text-align: left; vertical-align: top; }
          th { background-color: #f9fafb; font-weight: bold; }

          /* Layout Utilities for Word */
          .page-break { page-break-before: always; }
          
          /* Cover Page */
          table.cover-layout { width: 100%; height: 900px; border: none; }
          table.cover-layout td { border: none; vertical-align: middle; text-align: center; }
          
          .cover-title { font-size: 42pt; font-weight: bold; color: #111827; margin-bottom: 12pt; line-height: 1.1; }
          .cover-subtitle { font-size: 24pt; color: #4b5563; margin-bottom: 32pt; }
          .cover-author { font-size: 18pt; font-weight: bold; color: #1f2937; }
          .cover-year { font-size: 12pt; color: #9ca3af; margin-top: 8pt; }

          /* Copyright Page */
          .copyright-section { padding-top: 400pt; font-size: 10pt; color: #6b7280; }

          /* TOC */
          .toc-list { list-style-type: none; margin: 0; padding: 0; }
          .toc-item { margin-bottom: 12pt; border-bottom: 1px dotted #e5e7eb; padding-bottom: 2pt; }

          /* Chapter Styling */
          .chapter-header { border-top: 4px solid #111827; padding-top: 12pt; margin-top: 32pt; margin-bottom: 12pt; }
          .chapter-number { font-size: 10pt; font-weight: bold; text-transform: uppercase; color: #6b7280; letter-spacing: 2px; }
          
          /* Footer Content Style */
          p.MsoFooter, li.MsoFooter, div.MsoFooter {
            margin: 0cm;
            margin-bottom: .0001pt;
            font-size: 9.0pt;
            font-family: ${chosenFont};
            color: #9ca3af;
            text-align: center;
          }
        </style>
      </head>
      <body>
        
        <!-- COVER PAGE -->
        <table class="cover-layout">
          <tr>
            <td>
              <div class="cover-title">${ebookData.title}</div>
              <div class="cover-subtitle">${ebookData.briefing?.topic}</div>
              <br/><br/>
              <div class="cover-author">${author}</div>
              <div class="cover-year">${year}</div>
            </td>
          </tr>
        </table>
        
        <br class="page-break" />

        <!-- COPYRIGHT PAGE -->
        <div class="copyright-section">
          <p>Copyright © ${year} ${author}. Wszelkie prawa zastrzeżone.</p>
          <p>Żadna część tej publikacji nie może być powielana, przechowywana w systemie wyszukiwania ani przekazywana w jakiejkolwiek formie ani za pomocą jakichkolwiek środków elektronicznych, mechanicznych, fotokopii, nagrywania lub innych, bez uprzedniej pisemnej zgody wydawcy.</p>
          <p>Informacje zawarte w tym e-booku mają charakter wyłącznie edukacyjny i nie zastępują profesjonalnej porady.</p>
        </div>

        <br class="page-break" />

        <!-- TOC -->
        <div>
          <h1 style="text-align:center; border-bottom: 1px solid #e5e7eb; padding-bottom: 12pt; margin-bottom: 24pt;">Spis Treści</h1>
          <ul class="toc-list">
            ${ebookData.chapters.map((c, i) => `
              <li class="toc-item">
                <strong>Rozdział ${i+1}:</strong> ${c.title}
              </li>
            `).join('')}
            ${ebookData.extras?.checklist ? `<li class="toc-item"><strong>Dodatek:</strong> Checklista - Action Plan</li>` : ''}
          </ul>
        </div>

        <br class="page-break" />

        <!-- CHAPTERS -->
        ${ebookData.chapters.map((c, i) => {
          let processedContent = c.content
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
            .replace(/\*(.*)\*/gim, '<i>$1</i>')
            .replace(/\[LINK: (.*?)\]/g, '<a href="#">$1</a>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, ' ');

          if (!processedContent.startsWith('<')) processedContent = '<p>' + processedContent + '</p>';

          return `
            <div class="chapter">
              <div class="chapter-header">
                <span class="chapter-number">Rozdział ${i+1}</span>
              </div>
              <div style="font-size: 32pt; font-weight: bold; margin-bottom: 24pt; color: #111827; line-height: 1.1;">${c.title}</div>
              <div class="content">${processedContent}</div>
            </div>
            <br class="page-break" />
          `;
        }).join('')}

        <!-- CHECKLIST -->
        ${ebookData.extras?.checklist ? `
          <div class="checklist">
             <div class="chapter-header">
                <span class="chapter-number">Dodatek</span>
             </div>
             <div style="font-size: 32pt; font-weight: bold; margin-bottom: 24pt; color: #111827;">Checklista Podsumowująca</div>
             <div>${ebookData.extras.checklist.replace(/\n/gim, '<br/>')}</div>
          </div>
          <br class="page-break" />
        ` : ''}

        <!-- BACK COVER -->
        <table class="cover-layout" style="height: 600px; background-color: #f9fafb;">
          <tr>
            <td style="padding: 40pt;">
              <h2 style="font-size: 24pt; border-bottom: 2px solid #e5e7eb; padding-bottom: 10pt; margin-top: 0;">O tym E-booku</h2>
              <p style="font-size: 14pt; font-style: italic; margin-top: 20pt;">${ebookData.extras?.longDescription || ''}</p>
              <br/>
              <div style="margin-top: 40pt;">
                <p><strong>${author}</strong></p>
                <p style="color: #6b7280;">Ekspert w dziedzinie: ${ebookData.briefing?.topic}</p>
              </div>
            </td>
          </tr>
        </table>

        <!-- FOOTER DEFINITION -->
        <div style='mso-element:footer' id='f1'>
          <p class=MsoFooter>
            <span style='mso-field-code:" PAGE "'></span> / <span style='mso-field-code:" NUMPAGES "'></span> 
            <span style='margin-left: 10px; margin-right: 10px;'>|</span>
            ${ebookData.title} &mdash; ${author}
          </p>
        </div>

      </body>
      </html>
    `;

    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(htmlContent);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `${safeTitle}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  const fontConfig: Record<FontType, { label: string, class: string, family: string }> = {
    sans: { label: 'System Sans', class: 'font-sans', family: 'ui-sans-serif, system-ui' },
    serif: { label: 'System Serif', class: 'font-serif', family: 'ui-serif, Georgia' },
    mono: { label: 'Monospace', class: 'font-mono', family: 'ui-monospace, SFMono-Regular' },
    lato: { label: 'Lato (Modern)', class: 'font-lato', family: "'Lato', sans-serif" },
    merriweather: { label: 'Merriweather (Classic)', class: 'font-merriweather', family: "'Merriweather', serif" },
    playfair: { label: 'Playfair (Elegant)', class: 'font-playfair', family: "'Playfair Display', serif" },
    oswald: { label: 'Oswald (Bold)', class: 'font-oswald', family: "'Oswald', sans-serif" },
    raleway: { label: 'Raleway (Clean)', class: 'font-raleway', family: "'Raleway', sans-serif" },
  };

  const currentYear = new Date().getFullYear();
  const author = ebookData.briefing?.authorName || "Autor";

  return (
    <div className="flex-1 overflow-y-auto p-8 lg:p-12 bg-indigo-50">
      
      {/* Dynamic Font Styles */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Merriweather:wght@300;700&family=Oswald:wght@400;700&family=Playfair+Display:wght@400;700&family=Raleway:wght@400;700&display=swap');
          
          .font-lato { font-family: 'Lato', sans-serif; }
          .font-merriweather { font-family: 'Merriweather', serif; }
          .font-playfair { font-family: 'Playfair Display', serif; }
          .font-oswald { font-family: 'Oswald', sans-serif; }
          .font-raleway { font-family: 'Raleway', sans-serif; }

          @media print {
            /* Fix for content cutoff - reset app-level overflows */
            html, body, #root, main {
              height: auto !important;
              overflow: visible !important;
              background: white !important;
              position: static !important;
            }

            /* Hide everything by default */
            body * { visibility: hidden; }

            /* Only show the print area and its children */
            .print-area, .print-area * { visibility: visible; }
            
            /* Position the print area at top-left */
            .print-area { 
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 100%; 
              margin: 0; 
              padding: 0;
              z-index: 9999;
            }

            .page-break { page-break-before: always; }
            .no-print { display: none !important; }
            
            @page {
              margin: 2cm;
              size: A4;
              @bottom-center {
                content: "${ebookData.title} | " counter(page);
                font-size: 9pt;
                color: #9ca3af;
              }
            }
          }
        `}
      </style>

      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8 no-print">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Gotowy Produkt</h1>
          <p className="text-gray-600">Pobierz pełną treść e-booka lub materiały promocyjne.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-8 no-print">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex">
            <button
              onClick={() => setActiveTab('marketing')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center ${
                activeTab === 'marketing' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Marketing & Prompty
            </button>
            <button
              onClick={() => setActiveTab('ebook')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center ${
                activeTab === 'ebook' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <BookText className="w-4 h-4 mr-2" />
              Pełny E-book
            </button>
          </div>
        </div>

        {/* --- MARKETING TAB --- */}
        {activeTab === 'marketing' && (
          <div className="space-y-6">
            {isGenerating && !ebookData.extras ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <p className="text-lg font-medium text-gray-700">Analizuję treść e-booka i tworzę materiały sprzedażowe...</p>
              </div>
            ) : ebookData.extras ? (
              <>
                {/* Social Share */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-100 flex flex-col md:flex-row items-center justify-between">
                  <div className="mb-4 md:mb-0">
                    <h3 className="text-lg font-bold text-gray-900">Udostępnij projekt</h3>
                    <p className="text-sm text-gray-500">Pochwal się postępami w social mediach</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => handleShareSocial('facebook')} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors" title="Udostępnij na Facebooku">
                      <Facebook className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleShareSocial('twitter')} className="p-2 bg-sky-500 text-white rounded-full hover:bg-sky-600 transition-colors" title="Udostępnij na X (Twitter)">
                      <Twitter className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleShareSocial('linkedin')} className="p-2 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition-colors" title="Udostępnij na LinkedIn">
                      <Linkedin className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleShareSocial('pinterest')} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors" title="Zapisz na Pinterest">
                      <Share2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleShareSocial('email')} className="p-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors" title="Wyślij e-mail">
                      <Mail className="w-5 h-5" />
                    </button>
                    <div className="w-px h-8 bg-gray-200 mx-2"></div>
                    <button onClick={handleShareFile} className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors" title="Udostępnij plik (Mobile)">
                       <Share className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Description & Blurb */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-sm font-bold uppercase text-gray-400 mb-2">Short Description (SEO)</h3>
                    <p className="text-gray-800 italic">{ebookData.extras.shortDescription}</p>
                    <button onClick={() => handleCopy(ebookData.extras!.shortDescription)} className="mt-3 text-xs text-indigo-600 font-semibold flex items-center"><Copy className="w-3 h-3 mr-1"/> {copied ? 'Skopiowano!' : 'Kopiuj'}</button>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                     <h3 className="text-sm font-bold uppercase text-gray-400 mb-2">Alternatywne Tytuły</h3>
                     <ul className="list-disc list-inside space-y-1 text-gray-700">
                        {ebookData.extras.alternativeTitles.map((t, i) => <li key={i}>{t}</li>)}
                     </ul>
                  </div>
                </div>

                 {/* Sales Blurb */}
                 <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Tekst Sprzedażowy (Landing Page)</h3>
                    <div className="prose prose-indigo max-w-none">
                      <ReactMarkdown>{ebookData.extras.marketingBlurb}</ReactMarkdown>
                    </div>
                 </div>

                 {/* Image Prompts */}
                 <div className="bg-gradient-to-br from-gray-900 to-slate-800 text-white p-8 rounded-xl shadow-lg">
                    <div className="flex items-center mb-6">
                      <ImageIcon className="w-6 h-6 mr-3 text-purple-400" />
                      <h3 className="text-xl font-bold">Prompty dla AI Graphic Generator</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">E-book Cover Options</h3>
                        <span className="text-xs font-bold text-purple-300 uppercase">Okładka (Cover)</span>
                        <div className="bg-white/10 p-3 rounded mt-1 font-mono text-xs text-gray-300 select-all">
                          {ebookData.extras.imagePrompts.cover}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-purple-300 uppercase">Wizualizacja 3D (Box)</span>
                        <div className="bg-white/10 p-3 rounded mt-1 font-mono text-xs text-gray-300 select-all">
                          {ebookData.extras.imagePrompts.box3d}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <span className="text-xs font-bold text-purple-300 uppercase">Tło Spisu Treści</span>
                           <div className="bg-white/10 p-3 rounded mt-1 font-mono text-xs text-gray-300 select-all">
                            {ebookData.extras.imagePrompts.tocBackground}
                           </div>
                        </div>
                        <div>
                           <span className="text-xs font-bold text-purple-300 uppercase">Tło Stron</span>
                           <div className="bg-white/10 p-3 rounded mt-1 font-mono text-xs text-gray-300 select-all">
                            {ebookData.extras.imagePrompts.pageBackground}
                           </div>
                        </div>
                      </div>
                    </div>
                 </div>
              </>
            ) : null}
          </div>
        )}

        {/* --- EBOOK FULL VIEW --- */}
        {activeTab === 'ebook' && (
          <div>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm no-print sticky top-0 z-20">
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 border-r pr-4">
                    <Type className="w-4 h-4 text-gray-500" />
                    <select 
                      value={font} 
                      onChange={(e) => setFont(e.target.value as FontType)}
                      className="text-sm border-none bg-transparent focus:ring-0 font-medium text-gray-700 cursor-pointer w-48"
                    >
                      {Object.entries(fontConfig).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))}
                    </select>
                 </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleExportWord}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-bold shadow-md shadow-blue-600/20 transition-all transform hover:-translate-y-0.5"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Eksport Word (Pełny)
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex items-center px-4 py-2 bg-gray-900 text-white hover:bg-black rounded-lg text-sm font-semibold transition-colors"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Drukuj / PDF
                </button>
              </div>
            </div>

            {/* Document Preview (Print Area) */}
            <div className={`print-area bg-white shadow-2xl min-h-[1000px] p-[2cm] mx-auto text-gray-900 ${fontConfig[font]?.class} max-w-[21cm]`}>
              
              {/* Cover Page Placeholder */}
              <div className="flex flex-col justify-center items-center text-center min-h-[800px] border-b-2 border-gray-100 mb-12 page-break">
                <h1 className="text-5xl font-bold mb-6">{ebookData.title}</h1>
                <p className="text-2xl text-gray-600 mb-12">{ebookData.briefing?.topic}</p>
                <div className="mt-auto mb-12">
                  <p className="text-xl font-medium">{author}</p>
                  <p className="text-sm text-gray-400 mt-2">{currentYear}</p>
                </div>
              </div>

              {/* Copyright Page */}
              <div className="flex flex-col justify-end min-h-[600px] mb-12 page-break text-xs text-gray-500 leading-relaxed">
                 <p>Copyright © {currentYear} {author}. Wszelkie prawa zastrzeżone.</p>
                 <p className="mt-4">
                   Żadna część tej publikacji nie może być powielana, przechowywana w systemie wyszukiwania ani przekazywana w jakiejkolwiek formie ani za pomocą jakichkolwiek środków elektronicznych, mechanicznych, fotokopii, nagrywania lub innych, bez uprzedniej pisemnej zgody wydawcy.
                 </p>
                 <p className="mt-4">
                   Informacje zawarte w tym e-booku mają charakter wyłącznie edukacyjny i nie zastępują profesjonalnej porady.
                 </p>
              </div>

              {/* TOC */}
              <div className="mb-12 page-break">
                <h2 className="text-3xl font-bold mb-8 text-center border-b pb-4">Spis Treści</h2>
                <ul className="space-y-4">
                  {ebookData.chapters.map((chapter, index) => (
                    <li key={chapter.id} className="flex justify-between items-baseline border-b border-dotted border-gray-300 pb-1">
                      <span className="text-lg">
                        <span className="font-bold mr-2">{index + 1}.</span> {chapter.title}
                      </span>
                    </li>
                  ))}
                  {ebookData.extras?.checklist && (
                    <li className="flex justify-between items-baseline border-b border-dotted border-gray-300 pb-1 mt-4">
                      <span className="text-lg font-bold">
                        Checklista - Action Plan
                      </span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Chapters */}
              <div className="space-y-16">
                {ebookData.chapters.map((chapter, index) => (
                  <div key={chapter.id} className="page-break">
                     {/* Chapter Title Page/Header */}
                     <div className="mb-8 mt-4 pt-4 border-t-4 border-gray-900">
                        <span className="text-sm font-bold tracking-widest uppercase text-gray-500">Rozdział {index + 1}</span>
                        <h2 className="text-4xl font-bold mt-2 mb-6">{chapter.title}</h2>
                     </div>

                     <div className="prose prose-lg max-w-none text-justify prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-8 prose-h3:text-xl">
                        <ReactMarkdown 
                          components={{
                            h1: ({node, ...props}) => <h2 {...props} style={{fontSize: '1.8rem', marginTop: '2rem'}} />, 
                            table: ({node, ...props}) => <div className="overflow-x-auto my-6"><table {...props} className="min-w-full divide-y divide-gray-300 border" /></div>,
                            thead: ({node, ...props}) => <thead {...props} className="bg-gray-50" />,
                            th: ({node, ...props}) => <th {...props} className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900" />,
                            td: ({node, ...props}) => <td {...props} className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 border-t" />,
                            a: ({node, ...props}) => <a {...props} className="text-blue-600 hover:text-blue-800 underline" target="_blank" />
                          }}
                        >
                          {chapter.content || "*Brak treści*"}
                        </ReactMarkdown>
                     </div>
                     
                     {/* Footer for Preview Only */}
                     <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between text-xs text-gray-400 no-print">
                       <span>{ebookData.title}</span>
                       <span>{author}</span>
                     </div>
                  </div>
                ))}
              </div>
              
              {/* Checklist Section */}
              {ebookData.extras?.checklist && (
                <div className="page-break">
                   <div className="mb-8 mt-4 pt-4 border-t-4 border-gray-900">
                      <span className="text-sm font-bold tracking-widest uppercase text-gray-500">Dodatek</span>
                      <h2 className="text-4xl font-bold mt-2 mb-6">Checklista Podsumowująca</h2>
                   </div>
                   <div className="prose prose-lg max-w-none">
                      <ReactMarkdown>
                        {ebookData.extras.checklist}
                      </ReactMarkdown>
                   </div>
                </div>
              )}

              {/* Back Cover / Long Description */}
              {ebookData.extras?.longDescription && (
                <div className="page-break flex flex-col justify-center items-center min-h-[800px] bg-gray-50 p-12 mt-12 rounded-xl print:bg-white border-t-8 border-gray-900">
                   <h3 className="text-2xl font-bold mb-6">O tym E-booku</h3>
                   <p className="text-lg leading-relaxed text-center italic">{ebookData.extras.longDescription}</p>
                   <div className="mt-12 pt-8 border-t border-gray-300 w-full text-center">
                      <p className="font-bold">{author}</p>
                      <p className="text-sm text-gray-500">Ekspert w dziedzinie: {ebookData.briefing?.topic}</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
