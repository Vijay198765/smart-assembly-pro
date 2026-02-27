export type Difficulty = 'Primary' | 'Middle' | 'Senior';
export type Language = 'English' | 'Hindi';
export type SpecialItemType = 'Speech' | 'Fact' | 'Quiz' | 'Important Day' | 'Moral Story';
export type ContentLength = 'Short' | 'Long';

export interface WordOfTheDay {
  word: string;
  meaning: string;
  antonym: string;
  synonym: string;
  example: string;
  pronunciation?: string;
}

export interface ThoughtOfTheDay {
  quote: string;
  author: string;
  bio?: string;
}

export interface NewsItem {
  title: string;
  summary: string;
  category: 'International' | 'National' | 'Sports';
}

export interface SpecialItem {
  type: SpecialItemType;
  content: string;
  title?: string;
  answer?: string;
}

export interface Celebration {
  title: string;
  description: string;
}

export interface AssemblyData {
  word?: WordOfTheDay;
  thought?: ThoughtOfTheDay;
  news?: NewsItem[];
  special_item?: SpecialItem;
  celebration?: Celebration;
  suggested_topics?: string[];
  timestamp: string;
}

export interface AppSettings {
  difficulty: Difficulty;
  language: Language;
  themeColor: string;
  isDarkMode: boolean;
}
