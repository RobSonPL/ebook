
export enum AppPhase {
  DASHBOARD = 'DASHBOARD',
  BRIEFING = 'BRIEFING',
  STRUCTURE = 'STRUCTURE',
  WRITING = 'WRITING',
  EXTRAS = 'EXTRAS',
  ADMIN = 'ADMIN', // New phase for database management
}

export interface BriefingData {
  topic: string;
  targetAudience: string;
  coreProblem: string;
  tone: string;
  authorName: string;
  targetLength: 'short' | 'medium' | 'long';
  chapterCount: number;
  language: 'pl' | 'en'; // Added language field
  contextMaterial?: string; // New: Source material from PDF/Youtube/Text
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  content: string;
  status: 'pending' | 'generating' | 'completed';
}

export interface TrainingLesson {
  title: string;
  duration: string;
  keyTakeaways: string[];
  activity: string;
}

export interface TrainingModule {
  title: string;
  objective: string;
  lessons: TrainingLesson[];
}

export interface TrainingQuiz {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface TrainingCourse {
  title: string;
  description: string;
  targetAudience: string;
  totalDuration: string;
  modules: TrainingModule[];
  quiz: TrainingQuiz[];
}

export interface ExtrasData {
  marketingBlurb: string;
  shortDescription: string; // Max 100 chars (Hook)
  mediumDescription?: string; // Max 200 chars (Problem/Solution)
  longDescription: string; // Full Promo
  checklist: string;
  alternativeTitles: string[];
  faq?: { question: string; answer: string }[]; 
  purchaseLink?: string; // New field for custom CTA link
  qrCodeUrl?: string; // Generated QR Code URL
  trainingCourse?: TrainingCourse; // New field for Training Course
  audiobookUrl?: string; // Generated Audio/WAV URL
  audioVoice?: string; // Selected Voice Name
  imagePrompts: {
    cover: string;
    box3d: string;
    tocBackground: string;
    pageBackground: string;
    chapterImages?: string[]; 
  };
  viralVideoPrompts?: { 
    youtube: string;
    tiktok: string;
    instagram: string;
    facebookAds: string;
  };
}

export type FontType = 
  | 'serif' | 'sans' | 'mono' 
  | 'lato' | 'merriweather' | 'playfair' | 'oswald' | 'raleway'
  // Romantic
  | 'greatvibes' | 'parisienne'
  // Feminine
  | 'cormorant' | 'cinzel'
  // Technical
  | 'robotomono' | 'orbitron'
  // Masculine
  | 'bebas' | 'anton'
  // Childish
  | 'patrick' | 'fredoka';

export interface EbookData {
  id: string;
  createdAt: number;
  lastUpdated: number;
  title: string;
  chapters: Chapter[];
  extras?: ExtrasData;
  briefing?: BriefingData;
  fontPreference?: FontType;
  ownerId?: string;
}

export interface GeminiResponse<T> {
  data?: T;
  error?: string;
}

export type TocResponse = {
  title: string;
  chapters: { title: string; description: string }[];
};

export interface NicheIdea {
  topic: string;
  audience: string;
  problem: string;
  reason: string;
  sources?: string[]; 
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  joinedAt: number;
  avatarUrl: string;
}

declare var htmlDocx: any;
declare var mammoth: any;
declare var pdfjsLib: any;
declare var html2pdf: any;
declare var pdfMake: any;
