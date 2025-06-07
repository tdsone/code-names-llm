import OpenAI from 'openai';
import { Card } from '../shared/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateCodenamesCards(): Promise<Card[]> {
  const prompt = `
    Generate a JSON array of 25 unique Codenames cards.
    Each card should have:
    - a word (string),
    - a type (one of "red", "blue", "neutral", "assassin").
    Make sure there are 9 red, 8 blue, 7 neutral, 1 assassin.
    Respond ONLY with the JSON array.
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.choices[0].message.content;
  if (!text) {
    throw new Error('No response from OpenAI');
  }
  
  return JSON.parse(text) as Card[];
}