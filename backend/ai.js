const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateCodenamesCards() {
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
  return JSON.parse(text);
}

module.exports = { generateCodenamesCards };