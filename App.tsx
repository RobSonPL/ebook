
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { PhaseBriefing } from './components/PhaseBriefing';
import { PhaseStructure } from './components/PhaseStructure';
import { PhaseWriting } from './components/PhaseWriting';
import { PhaseExtras } from './components/PhaseExtras';
import { AppPhase, BriefingData, EbookData } from './types';
import { generateStructure, generateChapterStream, generateExtras } from './services/geminiService';
import { INITIAL_BRIEFING } from './constants';

const App: React.FC = () => {
  const [phase, setPhase] = useState<AppPhase>(AppPhase.DASHBOARD);
  const [briefing, setBriefing] = useState<BriefingData>(INITIAL_BRIEFING);
  
  // Current active ebook state
  const [ebookData, setEbookData] = useState<EbookData>({
    id: '',
    createdAt: Date.now(),
    lastUpdated: Date.now(),
    title: '',
    chapters: [],
  });

  // Ref to hold latest ebookData for the interval closure
  const ebookDataRef = useRef(ebookData);

  // Database state
  const [allEbooks, setAllEbooks] = useState<EbookData[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  // --- Initial Load ---

  useEffect(() => {
    loadEbooks();
  }, []);

  // --- Data Management ---

  const loadEbooks = () => {
    const stored = localStorage.getItem('ebooks');
    if (stored) {
      try {
        const parsed: EbookData[] = JSON.parse(stored);
        setAllEbooks(parsed);
      } catch (e) {
        console.error("Failed to parse database", e);
        setAllEbooks([]);
      }
    }
  };

  // Sync ALL ebooks to LocalStorage
  useEffect(() => {
    if (allEbooks.length > 0) {
      localStorage.setItem('ebooks', JSON.stringify(allEbooks));
    } else {
       // If empty but we loaded, maybe we should clear LS or leave it?
       // Leaving it is fine, but if we deleted everything, we need to update LS
       if (localStorage.getItem('ebooks')) {
          localStorage.setItem('ebooks', JSON.stringify([]));
       }
    }
  }, [allEbooks]);

  // Keep ref in sync
  useEffect(() => {
    ebookDataRef.current = ebookData;
  }, [ebookData]);

  // --- Autosave Logic ---

  const saveEbookToLocalStorage = useCallback(() => {
    const currentData = ebookDataRef.current;
    // Don't save empty drafts or when not in an editing phase
    if (!currentData.id || phase === AppPhase.DASHBOARD) return;

    setAllEbooks(prev => {
      const index = prev.findIndex(e => e.id === currentData.id);
      if (index >= 0) {
         const updated = [...prev];
         updated[index] = { ...currentData, lastUpdated: Date.now() };
         return updated;
      } else {
         return [...prev, { ...currentData, lastUpdated: Date.now() }];
      }
    });
    setLastSaved(Date.now());
  }, [phase]);

  // Interval Autosave (Every 60 seconds)
  useEffect(() => {
    const intervalId = setInterval(() => {
      saveEbookToLocalStorage();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [saveEbookToLocalStorage]);

  // Save on page close/reload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveEbookToLocalStorage();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveEbookToLocalStorage]);


  // --- Actions ---

  const handleStartNew = () => {
    saveEbookToLocalStorage(); 
    const newId = crypto.randomUUID();
    const newData: EbookData = {
      id: newId,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      title: '',
      chapters: [],
      briefing: { ...INITIAL_BRIEFING }
    };
    setEbookData(newData);
    setBriefing({ ...INITIAL_BRIEFING });
    setPhase(AppPhase.BRIEFING);
    setLastSaved(null);
  };

  const handleOpenEbook = (ebook: EbookData) => {
    saveEbookToLocalStorage(); 
    setEbookData(ebook);
    setBriefing(ebook.briefing || INITIAL_BRIEFING);
    
    if (ebook.extras) setPhase(AppPhase.EXTRAS);
    else if (ebook.chapters.length > 0) {
      setPhase(AppPhase.WRITING);
      setCurrentChapterId(ebook.chapters[0].id);
    }
    else if (ebook.title) setPhase(AppPhase.STRUCTURE);
    else setPhase(AppPhase.BRIEFING);
    setLastSaved(null);
  };

  const handleDeleteEbook = (id: string) => {
    if (window.confirm("Czy na pewno chcesz usunąć ten e-book?")) {
      setAllEbooks(prev => prev.filter(e => e.id !== id));
      if (ebookData.id === id) {
        setPhase(AppPhase.DASHBOARD);
      }
    }
  };

  const handleStartFromIdea = (ideaBriefing: BriefingData) => {
    saveEbookToLocalStorage();
    const newId = crypto.randomUUID();
    const newData: EbookData = {
      id: newId,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      title: '', 
      chapters: [],
      briefing: { ...ideaBriefing }
    };
    setEbookData(newData);
    setBriefing({ ...ideaBriefing });
    setPhase(AppPhase.BRIEFING);
    setLastSaved(null);
  };

  const handleGoToDashboard = () => {
    saveEbookToLocalStorage();
    setPhase(AppPhase.DASHBOARD);
  };

  // --- Phase 1: Briefing -> Structure ---
  const handleBriefingSubmit = async (data: BriefingData) => {
    setBriefing(data);
    setIsGenerating(true);
    
    // Update local state
    setEbookData(prev => ({ ...prev, briefing: data }));
    
    // Note: We don't force save here yet, as structure generation is next.

    try {
      const toc = await generateStructure(data);
      const updatedEbook = {
        ...ebookData,
        briefing: data,
        title: toc.title,
        chapters: toc.chapters.map((c, idx) => ({
          id: `ch-${idx}`,
          title: c.title,
          description: c.description,
          content: '',
          status: 'pending' as const
        }))
      };
      
      setEbookData(updatedEbook);
      // Update ref immediately for the implicit save that might happen
      ebookDataRef.current = updatedEbook;
      
      setPhase(AppPhase.STRUCTURE);
      // Trigger save after structure is generated
      setTimeout(() => saveEbookToLocalStorage(), 100);

    } catch (error) {
      console.error("Error generating structure", error);
      alert("Wystąpił błąd podczas generowania struktury. Sprawdź klucz API.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Phase 2: Structure Actions ---
  const handleEditTitle = (newTitle: string) => {
    setEbookData(prev => ({ ...prev, title: newTitle }));
  };

  const handleEditChapter = (id: string, newTitle: string, newDesc: string) => {
    setEbookData(prev => ({
      ...prev,
      chapters: prev.chapters.map(c => 
        c.id === id ? { ...c, title: newTitle, description: newDesc } : c
      )
    }));
  };

  const confirmStructure = () => {
    saveEbookToLocalStorage();
    setPhase(AppPhase.WRITING);
    if (ebookData.chapters.length > 0) {
      setCurrentChapterId(ebookData.chapters[0].id);
    }
  };

  // --- Phase 3: Writing Logic ---
  const handleUpdateChapterContent = (chapterId: string, newContent: string) => {
    setEbookData(prev => ({
      ...prev,
      chapters: prev.chapters.map(c => 
        c.id === chapterId ? { ...c, content: newContent } : c
      )
    }));
    // Note: We rely on interval autosave for content updates to avoid excessive writes
  };

  const handleGenerateChapter = async (chapterId: string, instructions?: string, length?: 'short' | 'medium' | 'long') => {
    const chapter = ebookData.chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    setEbookData(prev => ({
      ...prev,
      chapters: prev.chapters.map(c => c.id === chapterId ? { ...c, status: 'generating', content: '' } : c)
    }));
    
    setIsGenerating(true);

    try {
      await generateChapterStream(
        briefing,
        chapter.title,
        chapter.description,
        ebookData.title,
        (textChunk) => {
          setEbookData(prev => ({
            ...prev,
            chapters: prev.chapters.map(c => 
              c.id === chapterId ? { ...c, content: c.content + textChunk } : c
            )
          }));
        },
        instructions,
        length
      );

      setEbookData(prev => ({
        ...prev,
        chapters: prev.chapters.map(c => c.id === chapterId ? { ...c, status: 'completed' } : c)
      }));
      // Explicit save after generation completes
      setTimeout(() => saveEbookToLocalStorage(), 100);

    } catch (e) {
      console.error(e);
      alert("Błąd podczas generowania rozdziału.");
      setEbookData(prev => ({
        ...prev,
        chapters: prev.chapters.map(c => c.id === chapterId ? { ...c, status: 'pending' } : c)
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinishWriting = () => {
    saveEbookToLocalStorage();
    setPhase(AppPhase.EXTRAS);
  };

  // --- Phase 4: Extras ---
  const handleGenerateExtras = async () => {
    setIsGenerating(true);
    try {
      const extras = await generateExtras(briefing, ebookData.title, ebookData.chapters);
      setEbookData(prev => ({ ...prev, extras: extras }));
      setTimeout(() => saveEbookToLocalStorage(), 100);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Render ---

  return (
    <Layout 
      currentPhase={phase} 
      ebookTitle={phase !== AppPhase.DASHBOARD ? ebookData.title : undefined}
      onGoToDashboard={handleGoToDashboard}
    >
      {/* Dashboard Placeholder / Component */}
      {phase === AppPhase.DASHBOARD && (
        <Dashboard 
          savedEbooks={allEbooks}
          onNewEbook={handleStartNew}
          onOpenEbook={handleOpenEbook}
          onDeleteEbook={handleDeleteEbook}
          onStartFromIdea={handleStartFromIdea}
        />
      )}

      {/* Phase 1: Briefing Placeholder / Component */}
      {phase === AppPhase.BRIEFING && (
        <PhaseBriefing onNext={handleBriefingSubmit} isGenerating={isGenerating} />
      )}

      {/* Phase 2: Structure Placeholder / Component */}
      {phase === AppPhase.STRUCTURE && (
        <PhaseStructure 
          title={ebookData.title}
          chapters={ebookData.chapters}
          onConfirm={confirmStructure}
          onEditChapter={handleEditChapter}
          onEditTitle={handleEditTitle}
        />
      )}

      {/* Phase 3: Writing Placeholder / Component */}
      {phase === AppPhase.WRITING && (
        <PhaseWriting 
          chapters={ebookData.chapters}
          currentChapterId={currentChapterId}
          onSelectChapter={setCurrentChapterId}
          onGenerateChapter={handleGenerateChapter}
          onUpdateContent={handleUpdateChapterContent}
          onNextPhase={handleFinishWriting}
          isGenerating={isGenerating}
          lastSaved={lastSaved}
        />
      )}

      {/* Phase 4: Extras Placeholder / Component */}
      {phase === AppPhase.EXTRAS && (
        <PhaseExtras 
          ebookData={ebookData}
          isGenerating={isGenerating}
          onGenerateExtras={handleGenerateExtras}
        />
      )}
    </Layout>
  );
};

export default App;
