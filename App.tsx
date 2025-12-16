
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
import { getCurrentUser, getAllUsers } from './services/mockAuth';
import { INITIAL_BRIEFING } from './constants';

const App: React.FC = () => {
  // Auth State - BYPASS LOGIN (Default User)
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'guest-admin',
    email: 'gosc@ebook-pro.pl',
    name: 'Użytkownik Gość',
    role: 'admin', // Admin role allows seeing all ebooks
    joinedAt: Date.now(),
    avatarUrl: 'https://ui-avatars.com/api/?name=Gość&background=2563eb&color=fff'
  });

  // App State
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
  const [isDatabaseLoaded, setIsDatabaseLoaded] = useState(false);
  
  // Admin State
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  // --- Initial Load ---

  useEffect(() => {
    // 1. Load Data
    loadEbooks();
  }, []);

  // Update Admin Data when entering admin phase
  useEffect(() => {
    if (phase === AppPhase.ADMIN) {
      setAllUsers(getAllUsers());
    }
  }, [phase]);

  // --- Data Management ---

  const loadEbooks = () => {
    const stored = localStorage.getItem('ebooks');
    if (stored) {
      try {
        const parsed: EbookData[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setAllEbooks(parsed);
        } else {
          setAllEbooks([]);
        }
      } catch (e) {
        console.error("Failed to parse database", e);
        setAllEbooks([]);
      }
    }
    setIsDatabaseLoaded(true);
  };

  // Sync ALL ebooks to LocalStorage
  useEffect(() => {
    if (!isDatabaseLoaded) return;
    localStorage.setItem('ebooks', JSON.stringify(allEbooks));
  }, [allEbooks, isDatabaseLoaded]);

  // Keep ref in sync
  useEffect(() => {
    ebookDataRef.current = ebookData;
  }, [ebookData]);

  // --- Autosave Logic ---

  const saveEbookToLocalStorage = useCallback(() => {
    const currentData = ebookDataRef.current;
    
    // Don't save empty drafts or if we haven't loaded DB yet
    if (!currentData.id || !isDatabaseLoaded) return;
    
    // Safety check: ensure ownerId is set (backward compatibility)
    if (currentUser && !currentData.ownerId) {
       currentData.ownerId = currentUser.id;
    }

    setAllEbooks(prev => {
      const index = prev.findIndex(e => e.id === currentData.id);
      const timestamp = Date.now();
      
      if (index >= 0) {
         const updated = [...prev];
         updated[index] = { ...currentData, lastUpdated: timestamp };
         return updated;
      } else {
         return [...prev, { ...currentData, lastUpdated: timestamp }];
      }
    });
    setLastSaved(Date.now());
  }, [isDatabaseLoaded, currentUser]);

  // Interval Autosave (Every 60 seconds)
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (currentUser) saveEbookToLocalStorage();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [saveEbookToLocalStorage, currentUser]);

  // Save on page close/reload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentUser) saveEbookToLocalStorage();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveEbookToLocalStorage, currentUser]);


  // --- User Actions ---
  
  const handleLogout = () => {
    // No-op or reset view since login is disabled
    setPhase(AppPhase.DASHBOARD);
    alert("Tryb gościa aktywny.");
  };

  const handleStartNew = () => {
    saveEbookToLocalStorage(); 
    const newId = crypto.randomUUID();
    const newData: EbookData = {
      id: newId,
      ownerId: currentUser?.id, // Assign owner
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
      setAllEbooks(prev => prev.filter(e => e.id !== id));
      if (ebookData.id === id) {
        setPhase(AppPhase.DASHBOARD);
      }
  };

  const handleStartFromIdea = (ideaBriefing: BriefingData) => {
    saveEbookToLocalStorage();
    const newId = crypto.randomUUID();
    const newData: EbookData = {
      id: newId,
      ownerId: currentUser?.id, // Assign owner
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

  const handleGoToAdmin = () => {
    saveEbookToLocalStorage();
    setPhase(AppPhase.ADMIN);
  };

  // --- Phase 1: Briefing -> Structure ---
  const handleBriefingSubmit = async (data: BriefingData) => {
    setBriefing(data);
    setIsGenerating(true);
    
    setEbookData(prev => ({ ...prev, briefing: data }));
    
    try {
      const toc = await generateStructure(data);
      const updatedEbook: EbookData = {
        ...ebookData,
        ownerId: currentUser?.id,
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
      ebookDataRef.current = updatedEbook;
      
      setPhase(AppPhase.STRUCTURE);
      
      setTimeout(() => saveEbookToLocalStorage(), 0);

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

  const handleUpdateExtras = (updates: Partial<ExtrasData>) => {
    setEbookData(prev => {
      if (!prev.extras) return prev;
      return {
        ...prev,
        extras: { ...prev.extras, ...updates }
      };
    });
  };

  // Filter ebooks for the dashboard (Admin sees all, User sees own)
  const visibleEbooks = currentUser.role === 'admin' 
    ? allEbooks 
    : allEbooks.filter(e => e.ownerId === currentUser.id);

  return (
    <Layout 
      currentPhase={phase} 
      ebookTitle={phase !== AppPhase.DASHBOARD && phase !== AppPhase.ADMIN ? ebookData.title : undefined}
      onGoToDashboard={handleGoToDashboard}
      user={currentUser}
      onLogout={handleLogout}
      onGoToAdmin={handleGoToAdmin}
    >
      {phase === AppPhase.DASHBOARD && (
        <Dashboard 
          savedEbooks={visibleEbooks}
          onNewEbook={handleStartNew}
          onOpenEbook={handleOpenEbook}
          onDeleteEbook={handleDeleteEbook}
          onStartFromIdea={handleStartFromIdea}
        />
      )}
      
      {phase === AppPhase.ADMIN && currentUser.role === 'admin' && (
        <AdminPanel 
          users={allUsers}
          allEbooks={allEbooks}
          onRefreshData={() => {
             setAllUsers(getAllUsers());
             loadEbooks(); // Reload ebooks in case admin deleted something
          }}
          onDeleteEbook={handleDeleteEbook}
        />
      )}

      {phase === AppPhase.BRIEFING && (
        <PhaseBriefing 
          onNext={handleBriefingSubmit} 
          isGenerating={isGenerating} 
          initialData={briefing}
        />
      )}

      {phase === AppPhase.STRUCTURE && (
        <PhaseStructure 
          title={ebookData.title}
          chapters={ebookData.chapters}
          onConfirm={confirmStructure}
          onEditChapter={handleEditChapter}
          onEditTitle={handleEditTitle}
        />
      )}

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

      {phase === AppPhase.EXTRAS && (
        <PhaseExtras 
          ebookData={ebookData}
          isGenerating={isGenerating}
          onGenerateExtras={handleGenerateExtras}
          onChangePhase={setPhase}
          onUpdateExtras={handleUpdateExtras}
        />
      )}
    </Layout>
  );
};

export default App;
