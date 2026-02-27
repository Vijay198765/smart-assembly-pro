import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const WORD_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING },
    meaning: { type: Type.STRING },
    antonym: { type: Type.STRING },
    synonym: { type: Type.STRING },
    example: { type: Type.STRING },
    pronunciation: { type: Type.STRING },
  },
  required: ["word", "meaning", "antonym", "synonym", "example"],
};

const THOUGHT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    quote: { type: Type.STRING },
    author: { type: Type.STRING },
    bio: { type: Type.STRING },
  },
  required: ["quote", "author"],
};

const NEWS_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      summary: { type: Type.STRING },
      category: { type: Type.STRING, enum: ["International", "National", "Sports"] },
    },
    required: ["title", "summary", "category"],
  },
};

const SPECIAL_ITEM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING },
    title: { type: Type.STRING },
    content: { type: Type.STRING },
    answer: { type: Type.STRING },
  },
  required: ["type", "content"],
};

const CELEBRATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
  },
  required: ["title", "description"],
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, section, date, difficulty, language, options } = req.body;

  try {
    if (type === 'suggestTopics') {
      const langText = language === 'Hindi' ? "in Hindi script (Devanagari)" : "in English";
      const prompt = `Suggest exactly 5 interesting and diverse topics for a school assembly special segment based on the date ${date}. These could be related to historical events, environmental days, science, or moral values relevant to this time of year. Return the result ${langText} as a simple JSON array of 5 strings.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
      });
      return res.status(200).json(JSON.parse(response.text || "[]"));
    }

    if (type === 'generateSection') {
      let schema: any;
      let sectionPrompt = "";

      switch (section) {
        case 'word':
          schema = WORD_SCHEMA;
          sectionPrompt = "Generate an advanced but student-friendly English word with its meaning, antonym (opposite), synonym, and an example sentence.";
          break;
        case 'thought':
          schema = THOUGHT_SCHEMA;
          sectionPrompt = "Generate a short motivational quote from a famous personality. Include the author's name and a very brief 1-line bio.";
          break;
        case 'news':
          schema = NEWS_SCHEMA;
          sectionPrompt = "Generate 9 news items: 3 International, 3 National (India), and 3 Sports. Each should have a title, a 2-line summary, and a category label.";
          break;
        case 'special_item':
          schema = SPECIAL_ITEM_SCHEMA;
          const topicText = options?.customTopic ? `on the topic: "${options.customTopic}"` : "";
          const lengthText = options?.contentLength === 'Long' ? "detailed and long (about 250 words)" : "concise and short (about 100 words)";
          sectionPrompt = `Generate a special assembly segment of type "${options?.specialType || 'Speech'}" ${topicText}. The content should be ${lengthText}. If it's a quiz, include the answer.`;
          break;
        case 'celebration':
          schema = CELEBRATION_SCHEMA;
          sectionPrompt = "Tell me what is celebrated or special about this specific date (festivals, international days, etc.). Provide a title and a simple description.";
          break;
      }

      const avoidRepetitionPrompt = options?.previousContent 
        ? `\n\nCRITICAL REPETITION GUARD: The user is requesting NEW content. DO NOT repeat, rephrase, or reuse any part of the following previous content: ${JSON.stringify(options.previousContent)}. Your response MUST be 100% unique and different from this.`
        : "";

      const prompt = `Generate school assembly content for the date: ${date}.
      Target Audience Difficulty Level: ${difficulty}.
      Primary Language: ${language}.
      
      CRITICAL LANGUAGE RULE: If Primary Language is "Hindi", you MUST generate ALL text content (titles, summaries, meanings, quotes, stories, etc.) in Hindi script (Devanagari). For the "Word of the Day", provide a Hindi word with its Hindi meaning and usage.
      
      Section: ${section}.
      Task: ${sectionPrompt}${avoidRepetitionPrompt}
      
      Randomness Factor: ${Math.random().toString(36).substring(7)}
      
      Safety Rules:
      - Student-safe content only.
      - No political debate, violence, or adult topics.
      - Positive and educational tone.
      
      Return the response in the specified JSON format.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });

      return res.status(200).json(JSON.parse(response.text || "{}"));
    }

    return res.status(400).json({ error: 'Invalid request type' });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
