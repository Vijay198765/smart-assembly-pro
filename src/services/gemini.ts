import { Difficulty, Language, SpecialItemType, ContentLength } from "../types";

export async function generateSection(
  section: 'word' | 'thought' | 'news' | 'special_item' | 'celebration',
  date: string,
  difficulty: Difficulty,
  language: Language,
  options?: {
    specialType?: SpecialItemType;
    customTopic?: string;
    contentLength?: ContentLength;
    previousContent?: any;
  }
): Promise<any> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'generateSection',
      section,
      date,
      difficulty,
      language,
      options
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate content');
  }

  return response.json();
}

export async function suggestTopics(date: string, language: Language): Promise<string[]> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'suggestTopics',
      date,
      language
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to suggest topics');
  }

  return response.json();
}
