/* backend/ai/ai.ts ----------------------------------------------------------- */
import type {
  Game as GameType,
  Clue as ClueType,
  Player as PlayerType,
} from "../shared/types";
import { applyReveal } from "./applyReveal";
import { client } from "./azure";

// Augment the Game object with a runtime-only array of used clue words
type GameWithHistory = GameType & { usedClueWords?: string[] };

// ▸ Which player is spymaster for the active team?
export function getActiveSpymaster(game: GameType): PlayerType {
  const team = game.teams[game.currentTeam];
  return team.players.find((p) => p.role === "spymaster")!;
}

// ▸ Decide whether to call OpenAI, then mutate the game in-place
export async function maybeGenerateClue(game: GameType): Promise<void> {
  const spymaster = getActiveSpymaster(game);
  // Ensure we have an array tracking previously‑used clue words
  (game as GameWithHistory).usedClueWords ??= [];
  if (spymaster.agent !== "ai") return;

  const clue = await generateClue(game);
  game.clue = clue;
  game.guessesRemaining = clue.number + 1;
  game.phase = "guessing";
}

/* -------------------------------------------------------------------------- */
/* The ONLY function that contacts OpenAI                                     */
/* -------------------------------------------------------------------------- */
async function generateClue(game: GameType): Promise<ClueType> {
  const boardInfo = game.cards.map((c) => ({
    word: c.word,
    type: c.type,
    revealed: c.revealed,
  }));

  const team = game.currentTeam as "red" | "blue";
  const otherTeam = team === "red" ? "blue" : "red";
  const redCount = game.currentTeam === "red" ? 9 : 8;
  const blueCount = game.currentTeam === "blue" ? 9 : 8;

  const rulesText = `
    You are the **SPYMASTER** for the ${team.toUpperCase()} team in the board‑game *Codenames*.
    Follow these rules **exactly**:

    1. Return **one single English word** (no spaces, hyphens, numbers, or proper nouns).
    2. The clue **MUST** relate exclusively to your own ${team} words.
       – It must **NOT** be connected in any way to ${otherTeam} words, neutral words, or the assassin word.
    3. If there is any doubt that a clue might point at a non‑${team} word, pick a safer, more specific clue.
    4. Aim for a clue that links **3–4** of your words.  
       Only use 5 if you are **certain** no off‑team words fit.
    5. Never reuse, rhyme with, translate, or otherwise reference any word visible on the board. Example: do NOT clue the word "jungle" with the clue "jungle".
    6. Output **raw JSON ONLY** (no markdown) in this exact schema:

       {
         "word": "<clue>",
         "number": <n>,
         "words": ["<your_word1>", "<your_word2>", ...]   // these must all be your team's words
       }
  `.trim();

  // Use Azure OpenAI client for chat completions
  const response = await client.chat.completions.create({
    messages: [
      { role: "user", content: rulesText },
      { role: "user", content: JSON.stringify(boardInfo) },
    ],
    model: "gpt-4.1",
    max_tokens: 1000,
    temperature: 0.4,
  });
  const content = response.choices[0].message.content;
    // Ensure AI response content is present
  if (!content) {
    throw new Error("AI response has no content");
  }
  const raw = content.trim();
  const jsonText = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();

  const clue = JSON.parse(jsonText) as ClueType;
  // ─── Guarantee the clue word hasn't been used before ──────────────
  const history = (game as GameWithHistory).usedClueWords!;
  if (history.includes(clue.word.toLowerCase())) {
    // Duplicate detected ─ try again (max 3 attempts to avoid infinite loops)
    if (history.length < 30) {
      // reasonable hard cap for typical game length
      return generateClue(game);
    }
  } else {
    history.push(clue.word.toLowerCase());
  }
  // ─── Reject clues that are identical to ANY word on the board ─────
  const boardWords = new Set(game.cards.map((c) => c.word.toLowerCase()));
  if (boardWords.has(clue.word.toLowerCase())) {
    // Invalid clue: matches a visible word. Retry (max 5 attempts).
    const attempts = (game as GameWithHistory).usedClueWords!.length;
    if (attempts < 35) {
      // small extra buffer over history cap
      return generateClue(game);
    }
  }
  return clue;
}
// ▸ When spymaster is human but operative is AI, trigger AI guesses
export async function makeAIGuesses(game: GameType): Promise<void> {
  if (!game.clue || game.phase !== "guessing") return;

  const unrevealed = game.cards
    .map((card, index) => ({ ...card, index }))
    .filter((card) => !card.revealed);

  const rulesText = `
    You are the AI operative for the ${game.currentTeam.toUpperCase()} team.
    The spymaster has just given you the clue: "${game.clue.word}" (${
    game.clue.number
  }).
    Choose the ${
      game.clue.number + 1
    } most likely words that match this clue from the unrevealed cards.

    Respond with RAW JSON only (no markdown fences):
    { "guesses": [<index0>, <index1>, ...] }
  `.trim();

  // Use Azure OpenAI client for AI guesses
  const response = await client.chat.completions.create({
    messages: [
      { role: "user", content: rulesText },
      { role: "user", content: JSON.stringify(unrevealed.map(c => ({ word: c.word, index: c.index }))) },
    ],
    model: process.env.AZURE_OPENAI_DEPLOYMENT!,
    max_tokens: 1000,
    temperature: 0.4,
  });
  // Ensure AI response content is present
  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("AI response has no content");
  }
  const raw = content.trim();
  const jsonText = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();

  const result = JSON.parse(jsonText) as { guesses: number[] };

  for (const index of result.guesses) {
    // ⏳ small delay so the UI shows guesses one by one
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 🔄 apply all reveal / game‑over / end‑turn rules in ONE place
    await applyReveal(game, index);

    // If the reveal ended the turn (phase changed away from "guessing"),
    // stop making further guesses.
    if (game.phase !== "guessing") return;
  }
}
