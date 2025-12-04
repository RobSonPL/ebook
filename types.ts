
export enum AppPhase {
  DASHBOARD = 'DASHBOARD',
  BRIEFING = 'BRIEFING',
  STRUCTURE = 'STRUCTURE',
  WRITING = 'WRITING',
  EXTRAS = 'EXTRAS',
}

export interface BriefingData {
  topic: string;
  targetAudience: string;
  coreProblem: string;
  tone: string;
  authorName: string;
  targetLength: 'short' | 'medium' | 'long';
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
  checklist: string;
  alternativeTitles: string[];
  imagePrompts: {
    cover: string;
    box3d: string;
    tocBackground: string;
    pageBackground: string;
  };
}

export type FontType = 'serif' | 'sans' | 'mono' | 'lato' | 'merriweather' | 'playfair' | 'oswald' | 'raleway';

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
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  joinedAt: number;
  avatarUrl: string;
}
