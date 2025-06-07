"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCodenamesCards = generateCodenamesCards;
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({
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
    if (!text) {
        throw new Error('No response from OpenAI');
    }
    return JSON.parse(text);
}
//# sourceMappingURL=ai.js.map