/* backend/ai/ai.ts ----------------------------------------------------------- */
import axios from "axios";
import type {
  Game as GameType,
  Clue as ClueType,
  Player as PlayerType,
} from "../shared/types";

// ▸ Which player is spymaster for the active team?
export function getActiveSpymaster(game: GameType): PlayerType {
  const team = game.teams[game.currentTeam];
  return team.players.find((p) => p.role === "spymaster")!;
}

// ▸ Decide whether to call OpenAI, then mutate the game in-place
export async function maybeGenerateClue(game: GameType): Promise<void> {
  const spymaster = getActiveSpymaster(game);
  if (spymaster.agent !== "ai") return;

  const clue = await generateClue(game);
  game.clue             = clue;
  game.guessesRemaining = clue.number + 1;
  game.phase            = "guessing";
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

  const team      = game.currentTeam as "red" | "blue";
  const otherTeam = team === "red" ? "blue" : "red";

  const rulesText = `
    You are the spymaster for the ${team.toUpperCase()} team.
    Only clue your own ${team} words; never clue words that are ${otherTeam},
    neutral, or assassin.  Prefer clues covering 4–5 of your own words. Don't be afraid to use unusual words. Be as creative as possible.
    Respond with RAW JSON only (no markdown fences):
    { "word": "<clue>", "number": <n> }`.trim();

  const payload = {
    model: "gpt-4.1",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: rulesText },
          { type: "input_file", file_id: "file-Aep2ne51i85kigrsvN6ZGm" },
          { type: "input_text", text: JSON.stringify(boardInfo) },
        ],
      },
    ],
  };

  const { data } = await axios.post(
    "https://api.openai.com/v1/responses",
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    }
  );

  const raw = data.output[0].content[0].text.trim();
  const jsonText = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();

  return JSON.parse(jsonText) as ClueType;
}
// ▸ When spymaster is human but operative is AI, trigger AI guesses
export async function makeAIGuesses(game: GameType): Promise<void> {
  if (!game.clue || game.phase !== "guessing") return;

  const unrevealed = game.cards
    .map((card, index) => ({ ...card, index }))
    .filter((card) => !card.revealed);

  const rulesText = `
    You are the AI operative for the ${game.currentTeam.toUpperCase()} team.
    The spymaster has just given you the clue: "${game.clue.word}" (${game.clue.number}).
    Choose the ${game.clue.number + 1} most likely words that match this clue from the unrevealed cards.

    Respond with RAW JSON only (no markdown fences):
    { "guesses": [<index0>, <index1>, ...] }
  `.trim();

  const payload = {
    model: "gpt-4.1",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: rulesText },
          { type: "input_file", file_id: "file-Aep2ne51i85kigrsvN6ZGm" },
          {
            type: "input_text",
            text: JSON.stringify(unrevealed.map((c) => ({
              word: c.word,
              index: c.index,
            }))),
          },
        ],
      },
    ],
  };

  const { data } = await axios.post(
    "https://api.openai.com/v1/responses",
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    }
  );

  const raw = data.output[0].content[0].text.trim();
  const jsonText = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();

  const result = JSON.parse(jsonText) as { guesses: number[] };

}