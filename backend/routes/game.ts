import axios from "axios";
import express, { type Request, type Response } from "express";
import type {
  Game as GameType,
  Card as CardType,
  Clue as ClueType,
  Player as PlayerType,
  Team as TeamType,
  ClueHistoryItem,
} from "../../shared/types";

import { v4 as uuidv4 } from "uuid";
import { maybeGenerateClue } from "../ai";
import { makeAIGuesses } from "../ai";
import { applyReveal } from "../applyReveal";

// Store all active games keyed by their ID
const games: Record<string, GameType> = {};

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
  const startingTeam = Math.random() < 0.5 ? "red" : "blue";
  const redCount = startingTeam === "red" ? 9 : 8;
  const blueCount = startingTeam === "blue" ? 9 : 8;

  try {
    const prompt = `
    Generate a JSON array of **exactly 25 unique** Codenames cards. Each card must have:
    – a **word** (string, single English noun, capitalised),
    – a **type** (one of **"red"**, **"blue"**, **"neutral"**, **"assassin"**).

    Team distribution **must be**:
      • ${redCount} red,
      • ${blueCount} blue,
      • 7 neutral,
      • 1 assassin.
    No team may have more than **9** cards. All 25 words must be **unique**.

    ### Creativity / diversity rules
    1. **Mix unrelated categories.** At most **2 words** may belong to the same obvious group (e.g.\ animals, musical instruments, foods, body parts, professions, nature‑features).  
       Example bad cluster: “Dog, Cat, Horse” (animals) – **not allowed**.
    2. Favour known, commonly used words but strive for unusual combinations. Prioritize tangible specific words instead of abstract concepts.  
       Example: choose “Zephyr” instead of “Wind”.
    4. Avoid proper nouns, acronyms, offensive terms, or multi‑word phrases. There can't be more than one word with the same root.
    5. Balance syllable length – include short and long words.
    6. Output **RAW JSON ONLY** (no Markdown, no commentary). If you output any extra text or not exactly 25 cards, respond with an error instead.

    ### Perfect output example (structure only, counts differ):

    [
      {"word": "Quasar",     "type": "red"},
      {"word": "Zephyr",     "type": "red"},
      …
      {"word": "Velvet",     "type": "assassin"}
    ]
  `.trim();
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
              text: prompt,
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

    // Convert to CardType and mark unrevealed
    const rawCards: CardType[] = parsedCards.map((c) => ({
      ...c,
      revealed: false,
    }));

    // --- post‑process to enforce card limits --------------------
    let redSeen = 0;
    let blueSeen = 0;
    const sanitizedCards: CardType[] = [];

    for (const card of rawCards) {
      if (card.type === "red") {
        if (redSeen < redCount) {
          sanitizedCards.push(card);
          redSeen++;
        }
      } else if (card.type === "blue") {
        if (blueSeen < blueCount) {
          sanitizedCards.push(card);
          blueSeen++;
        }
      } else {
        // neutrals and assassin are always kept
        sanitizedCards.push(card);
      }
    }

    // --- refill any missing card types to reach exact required counts --------
    const requiredCounts = { red: redCount, blue: blueCount, neutral: 7, assassin: 1 };

    const currentCounts = {
      red: sanitizedCards.filter(c => c.type === "red").length,
      blue: sanitizedCards.filter(c => c.type === "blue").length,
      neutral: sanitizedCards.filter(c => c.type === "neutral").length,
      assassin: sanitizedCards.filter(c => c.type === "assassin").length,
    };

    console.log("Raw counts:", rawCards.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>));

    console.log("Counts after initial trim:", currentCounts);

    // Cards we skipped earlier because they exceeded per‑team limits
    const overflowCards = rawCards.filter(c => !sanitizedCards.includes(c));

    // helper to pull a card of a specific type from overflowCards
    const pullFromOverflow = (type: CardType["type"]) => {
      const idx = overflowCards.findIndex(c => c.type === type);
      if (idx === -1) return false;         // none left of this type
      sanitizedCards.push(overflowCards[idx]);
      overflowCards.splice(idx, 1);
      return true;
    };

    // Top up each team / type until we meet the required counts
    (["red", "blue", "neutral", "assassin"] as const).forEach((type) => {
      while (currentCounts[type] < requiredCounts[type]) {
        // 1️⃣ First, try to pull a correct‑type card from overflow
        if (pullFromOverflow(type)) {
          currentCounts[type]++;
          continue;
        }

        // 2️⃣ Otherwise, repurpose ANY overflow card by re‑labelling it
        if (overflowCards.length > 0) {
          const donorCard = overflowCards.shift()!; // remove first
          donorCard.type = type;                    // mutate to needed type
          sanitizedCards.push(donorCard);
          currentCounts[type]++;
          continue;
        }

        // 3️⃣ Nothing left to use – break out to avoid infinite loop
        break;
      }
    });

    console.log("Counts after refill:", {
      red: sanitizedCards.filter(c => c.type === "red").length,
      blue: sanitizedCards.filter(c => c.type === "blue").length,
      neutral: sanitizedCards.filter(c => c.type === "neutral").length,
      assassin: sanitizedCards.filter(c => c.type === "assassin").length,
    });

    // Final guard and assignment
    if (sanitizedCards.length !== 25) {
      console.error(
        `Card generation failed – expected 25 cards, got ${sanitizedCards.length}`
      );
      throw new Error(
        `Card generation failed – expected 25 cards, got ${sanitizedCards.length}`
      );
    }
    const cards = sanitizedCards;

    const { teams } = req.body || {};
    let redTeam: TeamType;
    let blueTeam: TeamType;

    if (teams && teams.red && teams.blue) {
      redTeam = teams.red;
      blueTeam = teams.blue;
    } else {
      // fallback to default logic
      // randomly decide if humans are spymasters or operatives
      const humansAreSpymasters = Math.random() < 0.5;

      redTeam = {
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

      blueTeam = {
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
    }

    const teamsObj: { red: TeamType; blue: TeamType } = {
      red: redTeam,
      blue: blueTeam,
    };
    
    const game: GameType = {
      id: uuidv4(),
      cards,
      teams: teamsObj,
      currentTeam: startingTeam,
      phase: "waiting",
      createdAt: new Date(),
      aiClueWords: [],
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
  // Append this clue word to the AI clue history
  if (!game.aiClueWords) {
    game.aiClueWords = [];
  }
  const historyItem = {
    clue: game.clue.word,
    words: game.clue.words ?? [],
  };
  game.aiClueWords.push(historyItem);

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
    await applyReveal(game, i);
  res.json({ success: true, game, flipped: game.cards[i] });
});


//@ts-ignore TESTING AI CLUES - NOT FOR PROD 
router.post("/:id/ai-clue", async (req, res) => {
  const game = games[req.params.id];
  if (!game) return res.status(404).json({ success:false, message:"Game not found" });

  await maybeGenerateClue(game);
  // Persist the AI‑generated clue *targets* (the words the clue is pointing to)
  const currentClue = (game.clue as ClueType | undefined);
  if (currentClue) {
    (game.aiClueWords ??= []).push({
      clue: currentClue.word,
      words: currentClue.words ?? [],
    });
  }
  res.json({ success: true, game });
});



export default router;
