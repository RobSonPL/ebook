
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { PhaseBriefing } from './components/PhaseBriefing';
import { PhaseStructure } from './components/PhaseStructure';
import { PhaseWriting } from './components/PhaseWriting';
import { PhaseExtras } from './components/PhaseExtras';
import { AdminPanel } from './components/AdminPanel';
import { AppPhase, BriefingData, EbookData, User, ExtrasData } from './types';
import { generateStructure, generateChapterStream, generateExtras } from './services/geminiService';
import { getAllUsers } from './services/mockAuth';
import { INITIAL_BRIEFING } from './constants';

const App: React.FC = () => {
  const [currentUser] = useState<User>({
    id: 'guest-admin', email: 'gosc@ebook-pro.pl', name: 'Użytkownik Gość', role: 'admin', joinedAt: Date.now(),
    avatarUrl: 'https://ui-avatars.com/api/?name=Gość&background=2563eb&color=fff'
  });

  const [phase, setPhase] = useState<AppPhase>(AppPhase.DASHBOARD);
  const [briefing, setBriefing] = useState<BriefingData>(INITIAL_BRIEFING);
  const [ebookData, setEbookData] = useState<EbookData>({ id: '', createdAt: Date.now(), lastUpdated: Date.now(), title: '', chapters: [] });
  const [allEbooks, setAllEbooks] = useState<EbookData[]>([]);
  const [isDatabaseLoaded, setIsDatabaseLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('ebooks');
    if (stored) {
      try { const parsed = JSON.parse(stored); if (Array.isArray(parsed)) setAllEbooks(parsed); } catch (e) { setAllEbooks([]); }
    }
    setIsDatabaseLoaded(true);
  }, []);

  useEffect(() => { if (isDatabaseLoaded) localStorage.setItem('ebooks', JSON.stringify(allEbooks)); }, [allEbooks, isDatabaseLoaded]);

  const saveEbookToLocalStorage = useCallback(() => {
    if (!ebookData.id || !isDatabaseLoaded) return;
    setAllEbooks(prev => {
      const index = prev.findIndex(e => e.id === ebookData.id);
      const timestamp = Date.now();
      const updatedEbook = { ...ebookData, lastUpdated: timestamp, ownerId: currentUser.id };
      if (index >= 0) {
         const updated = [...prev];
         updated[index] = updatedEbook;
         return updated;
      }
      return [...prev, updatedEbook];
    });
    setLastSaved(Date.now());
  }, [isDatabaseLoaded, ebookData, currentUser]);

  const handleStartNew = () => {
    const newId = crypto.randomUUID();
    const newData: EbookData = { id: newId, ownerId: currentUser.id, createdAt: Date.now(), lastUpdated: Date.now(), title: '', chapters: [], briefing: { ...INITIAL_BRIEFING } };
    setEbookData(newData);
    setBriefing({ ...INITIAL_BRIEFING });
    setPhase(AppPhase.BRIEFING);
  };

  const handleStartFromIdea = (idea: BriefingData) => {
    const newId = crypto.randomUUID();
    const newData: EbookData = { 
      id: newId, 
      ownerId: currentUser.id, 
      createdAt: Date.now(), 
      lastUpdated: Date.now(), 
      title: idea.topic || '', 
      chapters: [], 
      briefing: idea 
    };
    setEbookData(newData);
    setBriefing(idea);
    setPhase(AppPhase.BRIEFING);
  };

  const handleOpenEbook = (ebook: EbookData) => {
    setEbookData(ebook);
    setBriefing(ebook.briefing || INITIAL_BRIEFING);
    if (ebook.extras) setPhase(AppPhase.EXTRAS);
    else if (ebook.chapters.length > 0) { 
      setPhase(AppPhase.WRITING); 
      setCurrentChapterId(ebook.chapters[0].id); 
    }
    else setPhase(AppPhase.STRUCTURE);
  };

  const handleBriefingSubmit = async (data: BriefingData) => {
    setBriefing(data);
    setIsGenerating(true);
    try {
      const toc = await generateStructure(data);
      const updatedEbook: EbookData = {
        ...ebookData, briefing: data, title: toc.title,
        chapters: toc.chapters.map((c, idx) => ({ id: `ch-${idx}`, title: c.title, description: c.description, content: '', status: 'pending' }))
      };
      setEbookData(updatedEbook);
      setPhase(AppPhase.STRUCTURE);
    } catch (e) { alert("Błąd API."); } finally { setIsGenerating(false); }
  };

  const handlePhaseChange = (newPhase: AppPhase) => {
    if (newPhase === AppPhase.DASHBOARD) {
      saveEbookToLocalStorage();
      setPhase(AppPhase.DASHBOARD);
      return;
    }
    // Walidacja przejścia do przodu
    if (newPhase === AppPhase.STRUCTURE && ebookData.chapters.length === 0) return;
    if (newPhase === AppPhase.WRITING && ebookData.chapters.length === 0) return;
    if (newPhase === AppPhase.EXTRAS && !ebookData.chapters.some(c => c.status === 'completed')) return;
    
    setPhase(newPhase);
  };

  const handleGenerateChapter = async (chapterId: string, instructions?: string, length?: 'micro' | 'short' | 'medium' | 'long' | 'very_long' | 'epic') => {
    const chapter = ebookData.chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    
    // Resetuj treść i ustaw status ładowania
    setEbookData(prev => ({ 
      ...prev, 
      chapters: prev.chapters.map(c => c.id === chapterId ? { ...c, status: 'generating', content: '' } : c) 
    }));
    
    setIsGenerating(true);
    try {
      await generateChapterStream(briefing, chapter.title, chapter.description, ebookData.title, (chunk) => {
        setEbookData(prev => ({ 
          ...prev, 
          chapters: prev.chapters.map(c => c.id === chapterId ? { ...c, content: c.content + chunk } : c) 
        }));
      }, instructions, length);
      
      setEbookData(prev => ({ 
        ...prev, 
        chapters: prev.chapters.map(c => c.id === chapterId ? { ...c, status: 'completed' } : c) 
      }));
      
      // Auto-save po wygenerowaniu rozdziału
      setLastSaved(Date.now());
    } catch (e) { 
      console.error(e);
      alert("Błąd podczas generowania treści rozdziału."); 
      setEbookData(prev => ({ 
        ...prev, 
        chapters: prev.chapters.map(c => c.id === chapterId ? { ...c, status: 'pending' } : c) 
      }));
    } finally { 
      setIsGenerating(false); 
    }
  };

  return (
    <Layout 
      currentPhase={phase} ebookTitle={ebookData.title}
      onGoToDashboard={() => handlePhaseChange(AppPhase.DASHBOARD)}
      user={currentUser} onLogout={() => {}} onGoToAdmin={() => setPhase(AppPhase.ADMIN)}
      onPhaseChange={handlePhaseChange}
    >
      {phase === AppPhase.DASHBOARD && (
        <Dashboard 
          savedEbooks={allEbooks} 
          onNewEbook={handleStartNew} 
          onOpenEbook={handleOpenEbook} 
          onDeleteEbook={(id) => setAllEbooks(p => p.filter(e => e.id !== id))} 
          onStartFromIdea={handleStartFromIdea} 
        />
      )}
      {phase === AppPhase.BRIEFING && <PhaseBriefing onNext={handleBriefingSubmit} isGenerating={isGenerating} initialData={briefing} />}
      {phase === AppPhase.STRUCTURE && <PhaseStructure title={ebookData.title} chapters={ebookData.chapters} onConfirm={() => setPhase(AppPhase.WRITING)} onEditChapter={(id, t, d) => setEbookData(p => ({...p, chapters: p.chapters.map(c => c.id === id ? {...c, title: t, description: d} : c)}))} onEditTitle={(t) => setEbookData(p => ({...p, title: t}))} />}
      {phase === AppPhase.WRITING && (
        <PhaseWriting 
          chapters={ebookData.chapters} 
          currentChapterId={currentChapterId} 
          onSelectChapter={setCurrentChapterId} 
          onGenerateChapter={handleGenerateChapter} 
          onUpdateContent={(id, c) => setEbookData(p => ({...p, chapters: p.chapters.map(ch => ch.id === id ? {...ch, content: c} : ch)}))} 
          onNextPhase={() => setPhase(AppPhase.EXTRAS)} 
          isGenerating={isGenerating} 
          lastSaved={lastSaved} 
        />
      )}
      {phase === AppPhase.EXTRAS && <PhaseExtras ebookData={ebookData} isGenerating={isGenerating} onGenerateExtras={async () => { setIsGenerating(true); try { const ex = await generateExtras(briefing, ebookData.title, ebookData.chapters); setEbookData(p => ({...p, extras: ex})); } finally { setIsGenerating(false); } }} onChangePhase={setPhase} onUpdateExtras={(u) => setEbookData(p => ({...p, extras: p.extras ? {...p.extras, ...u} : undefined}))} />}
    </Layout>
  );
};

export default App;
