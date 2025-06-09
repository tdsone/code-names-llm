import axios from "axios";
import express, { type Request, type Response } from "express";
import type {
  Game as GameType,
  Card as CardType,
  Clue as ClueType,
  Player as PlayerType,
  Team as TeamType,
} from "../../shared/types";

import { v4 as uuidv4 } from "uuid";
import { maybeGenerateClue } from "../ai";
import { makeAIGuesses } from "../ai";

// Store all active games keyed by their ID
const games: Record<string, GameType> = {};

const router = express.Router();
const startingTeam = Math.random() < 0.5 ? "red" : "blue";
const redCount = startingTeam === "red" ? 9 : 8;
const blueCount = startingTeam === "blue" ? 9 : 8;

router.get("/", async (req: Request, res: Response) => {
  try {
    const payload = {
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              file_id: "file-Aep2ne51i85kigrsvN6ZGm",
            },
            {
              type: "input_text",
              text: `Generate a JSON array of 25 (NOT MORE THAN 25) unique Codenames cards. Each card should have:
- a word (string),
- a type (one of "red", "blue", "neutral", "assassin").
Make sure there are ${redCount} red, ${blueCount} blue, 7 neutral, 1 assassin. NO team should have MORE THAN 9 CARDS! Only one team can have 9 cards!
Respond with ONLY raw JSON. Do NOT include markdown or explanations.`,
            },
          ],
        },
      ],
    };

    const openaiResponse = await axios.post(
      "https://api.openai.com/v1/responses",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const rawText = openaiResponse.data.output[0].content[0].text;

    // Strip ```json ... ```
    const jsonText = rawText.replace(/^```json\n/, "").replace(/\n```$/, "");

    // Parse it
    const parsedCards = JSON.parse(jsonText) as Omit<CardType, "revealed">[];

    const cards: CardType[] = parsedCards.map((c) => ({
      ...c,
      revealed: false,
    }));    

    // --- build initial players & teams -----------------------------------
    // randomly decide if humans are spymasters or operatives
    const humansAreSpymasters = Math.random() < 0.5;

    const redTeam: TeamType = {
      color: "red",
      players: [
        {
          id: uuidv4(),
          name: humansAreSpymasters ? "Red Human" : "Red Bot",
          agent: humansAreSpymasters ? "human" : "ai",
          role: "spymaster",
        } as PlayerType,
        {
          id: humansAreSpymasters ? "ai-red" : uuidv4(),
          name: humansAreSpymasters ? "Red Bot" : "Red Human",
          agent: humansAreSpymasters ? "ai" : "human",
          role: "operative",
        } as PlayerType,
      ],
    };

    const blueTeam: TeamType = {
      color: "blue",
      players: [
        {
          id: uuidv4(),
          name: humansAreSpymasters ? "Blue Human" : "Blue Bot",
          agent: humansAreSpymasters ? "human" : "ai",
          role: "spymaster",
        } as PlayerType,
        {
          id: humansAreSpymasters ? "ai-blue" : uuidv4(),
          name: humansAreSpymasters ? "Blue Bot" : "Blue Human",
          agent: humansAreSpymasters ? "ai" : "human",
          role: "operative",
        } as PlayerType,
      ],
    };

    const teams: { red: TeamType; blue: TeamType } = {
      red: redTeam,
      blue: blueTeam,
    };

    const game: GameType = {
      id: uuidv4(),
      cards,
      teams,
      currentTeam: startingTeam,
      phase: "waiting",
      createdAt: new Date(),
    };
    games[game.id] = game;

    res.json({
      success: true,
      game,
    });
  } catch (error: any) {
    console.error("Error sending PDF to OpenAI:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @ts-ignore
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const game = games[id];

  if (!game) {
    return res.status(404).json({
      success: false,
      message: "Game not found.",
    });
  }

  const activeTeam = game.teams[game.currentTeam];
  const activeSpymaster = activeTeam.players.find(
    (p) => p.role === "spymaster"
  );
  const activeOperative = activeTeam.players.find(
    (p) => p.role === "operative"
  );

  res.json({
    success: true,
    game,
    activeSpymaster,
    activeOperative,
  });
});

// @ts-ignore
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const updatedGame = req.body as Partial<GameType>;

  const existingGame = games[id];
  if (!existingGame) {
    return res.status(404).json({ success: false, message: "Game not found." });
  }

  const game: GameType = {
    ...existingGame,
    ...updatedGame,
    id: existingGame.id, // keep original ID
    createdAt: existingGame.createdAt, // keep original creation time
  };

  games[id] = game;

  res.json({ success: true, game });
});

// POST /games/:id/clue    { word: "animals", number: 4 }
router.post("/:id/clue", async (req, res) => {
  const { id } = req.params;
  const { word, number } = req.body as ClueType;
  const game = games[id];

  game.clue = { word, number };
  game.guessesRemaining = number + 1;
  game.phase = "guessing";

  // Determine if the operative is AI
  const operative = game.teams[game.currentTeam].players.find(p => p.role === "operative");
  const operativeIsAI = operative?.agent === "ai";

  if (operativeIsAI) {
    await makeAIGuesses(game);
    console.log("After AI guesses:", game.cards.map(c => ({ word: c.word, revealed: c.revealed })));
  }

  res.json({ success: true, game });
});


// helper that swaps teams when a turn ends
async function endTurn(game: GameType): Promise<void> {
  game.currentTeam = game.currentTeam === "red" ? "blue" : "red";
  game.phase = "waiting";
  game.clue = undefined;
  game.guessesRemaining = undefined;

  await maybeGenerateClue(game);
}

/**
 * PUT /game/:id/cards/:index
 * Flip a single card for the active team.
 * Body: { team: "red" | "blue" }
 */
//@ts-ignore
router.put("/:id/cards/:index", async (req: Request, res: Response) => {
  const { id, index } = req.params;
  const { team } = req.body as { team: "red" | "blue" };

  const game = games[id];
  if (!game) {
    return res.status(404).json({ success: false, message: "Game not found." });
  }

  // --- basic guards ---------------------------------------------------------
  if (game.phase !== "guessing") {
    return res
      .status(409)
      .json({ success: false, message: "No guesses allowed right now." });
  }

  if (team !== game.currentTeam) {
    return res
      .status(409)
      .json({ success: false, message: "It's not your team's turn." });
  }

  const i = Number(index);
  if (isNaN(i) || i < 0 || i >= game.cards.length) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid card index." });
  }

  const card = game.cards[i];
  if (card.revealed) {
    return res
      .status(409)
      .json({ success: false, message: "Card already revealed." });
  }

  // --- reveal the card ------------------------------------------------------
  card.revealed = true;
  if (game.guessesRemaining !== undefined) {
    game.guessesRemaining -= 1;
  }

  // --- outcome logic --------------------------------------------------------
  const wrongTeam   = card.type !== team && card.type !== "neutral";
  const assassin    = card.type === "assassin";
  const redWon = game.cards
    .filter((c) => c.type === "red")
    .every((c) => c.revealed);

  const blueWon = game.cards
    .filter((c) => c.type === "blue")
    .every((c) => c.revealed);
  const noGuesses   =
    game.guessesRemaining !== undefined && game.guessesRemaining <= 0;
  const neutral     = card.type === "neutral";

  if (assassin) {
    game.phase  = "finished";
    game.winner = team === "red" ? "blue" : "red";
  } else if (redWon || blueWon) {
    game.phase  = "finished";
    game.winner = redWon ? "red" : "blue";
  } else if (neutral || wrongTeam || noGuesses) {
    // delegate turn‑end housekeeping (and possible AI clue) to helper
    await endTurn(game);
  }

  res.json({ success: true, game, flipped: card });
});


//@ts-ignore TESTING AI CLUES - NOT FOR PROD 
router.post("/:id/ai-clue", async (req, res) => {
  const game = games[req.params.id];
  if (!game) return res.status(404).json({ success:false, message:"Game not found" });

  await maybeGenerateClue(game);
  res.json({ success: true, game });
});

export default router;
