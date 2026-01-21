
export enum AppPhase {
  DASHBOARD = 'DASHBOARD',
  BRIEFING = 'BRIEFING',
  STRUCTURE = 'STRUCTURE',
  WRITING = 'WRITING',
  GRAPHICS = 'GRAPHICS',
  MARKETING = 'MARKETING',
  AUDIO = 'AUDIO',
  EXTRAS = 'EXTRAS', // Zachowane dla kompatybilności wstecznej
  ADMIN = 'ADMIN', 
}

export type EbookCategory = 
  | 'psychologia' | 'rodzina' | 'relacje' | 'social media' | 'Ai' | 'uzależnienia' 
  | 'życie zawodowe' | 'życie rodzinne' | 'mąż/żona' | 'dzieci' | 'rodzice' | 'książki' 
  | 'inspiracje' | 'inspirujące postacie' | 'medytacja' | 'hipnoza' | 'rozwój osobisty' 
  | 'technologia jutra' | 'finanse' | 'marketing' | 'food' | 'inne';

export interface BriefingData {
  topic: string;
  category?: EbookCategory;
  targetAudience: string;
  coreProblem: string;
  tone: string;
  authorName: string;
  targetLength: 'micro' | 'short' | 'medium' | 'long' | 'very_long' | 'epic';
  chapterCount: number;
  language: 'pl' | 'en'; 
  contextMaterial?: string; 
  contextImages?: { mimeType: string; data: string }[]; 
}

export interface TocResponse {
  title: string;
  chapters: {
    title: string;
    description: string;
  }[];
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  content: string;
  status: 'pending' | 'generating' | 'completed';
}

export interface ExtrasData {
  marketingBlurb: string;
  shortDescription: string; 
  longDescription: string; 
  salesSummary?: string;
  ctaHooks?: {
    short100: string;
    medium200: string;
    fullSalesCopy: string;
  };
  imagePrompts: {
    cover: string;
    box3d: string;
    tocBackground: string;
    pageBackground: string;
    coverProposals?: string[];
    bgProposals?: string[];
    boxProposals?: string[];
  };
  generatedCovers?: string[];
  generatedBackgrounds?: string[];
  generatedBoxes?: string[];
  selectedCoverIdx?: number;
  selectedBgIdx?: number;
  selectedBoxIdx?: number;
  tools?: {
    checklist: string[];
    todoList: string[];
    futurePlanner: string[];
    inspiringQuotes: string[];
    inspiringPeople: { name: string, description: string }[];
    monthlyCalendarTitle: string;
  };
  authorPhoto?: string;
  authorLogo?: string;
}

export type FontType = 'serif' | 'sans' | 'mono';

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

export interface NicheIdea {
  topic: string;
  audience: string;
  problem: string;
  reason: string;
  category: EbookCategory;
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
