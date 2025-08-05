import { AzureOpenAI } from "openai";
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

import { createClient } from "@supabase/supabase-js";
import { client } from "../azure";

// ─── helper: let the active team voluntarily end its guessing phase ──────────
function passTurn(game: GameType) {
  // Only valid while the active team is still guessing
  if (game.phase !== "guessing") {
    throw new Error("Cannot pass when not in guessing phase");
  }

  // Flip to the other team
  game.currentTeam = game.currentTeam === "red" ? "blue" : "red";

  // Reset per‑turn fields so the next spymaster can give a new clue
  game.phase = "waiting"; // expecting clue
  game.clue = undefined;
  game.guessesRemaining = undefined;
}

// Store all active games keyed by their ID
const games: Record<string, GameType> = {};

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
  const startingTeam = Math.random() < 0.5 ? "red" : "blue";
  const redCount = startingTeam === "red" ? 9 : 8;
  const blueCount = startingTeam === "blue" ? 9 : 8;

  const cardWords: string[] = [
    "Anchor",
    "Zephyr",
    "Quasar",
    "Obelisk",
    "Mosaic",
    "Tapestry",
    "Compass",
    "Lantern",
    "Carousel",
    "Mirage",
    "Vortex",
    "Catalyst",
    "Ember",
    "Solstice",
    "Zenith",
    "Paradox",
    "Horizon",
    "Cipher",
    "Gallery",
    "Obsidian",
  ];

  function getRandomWords<T>(arr: T[], count: number): T[] {
    const copy = [...arr]; // clone so we don’t mutate original
    const result: T[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * copy.length);
      result.push(copy.splice(idx, 1)[0]); // remove & return one at random
    }
    return result;
  }

  const example = getRandomWords(cardWords, 3)

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
    6.  Do not use the word "venom".
    7. Only choose words that appear in the top 10,000 most common English words (i.e. ones you’d teach in an intermediate ESL class). No rare, archaic, or highly domain-specific terms.
    8. Output **RAW JSON ONLY** (no Markdown, no commentary). If you output any extra text or not exactly 25 cards, respond with an error instead.

    ### Perfect output example (structure only, counts differ):

    [
      {"word": "${example[0]}",     "type": "red"},
      {"word": "${example[1]}",     "type": "red"},
      …
      {"word": "${example[2]}",     "type": "assassin"}
    ]
  `.trim();
    const response = await client.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4.1",
      max_tokens: 1000,
      temperature: 1.0,
      top_p: 0.8,
      frequency_penalty: 0.5,
  presence_penalty: 0.5
    });
    const rawText = response.choices[0].message.content!;

    // Strip ```json ... ```
    const jsonText = rawText.replace(/^```json\n/, "").replace(/\n```$/, "");

    // Parse it
    const parsedCards = JSON.parse(jsonText) as Omit<CardType, "revealed">[];

    // Convert to CardType and mark unrevealed
    const rawCards: CardType[] = parsedCards.map((c) => ({
      ...c,
      revealed: false,
    }));

    // Remove duplicate cards based on the word property
    const seenWords = new Set<string>();
    const uniqueRawCards: CardType[] = [];
    for (const card of rawCards) {
      if (!seenWords.has(card.word)) {
        seenWords.add(card.word);
        uniqueRawCards.push(card);
      }
    }

    // --- post‑process to enforce card limits --------------------
    let redSeen = 0;
    let blueSeen = 0;
    const sanitizedCards: CardType[] = [];

    for (const card of uniqueRawCards) {
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
    const requiredCounts = {
      red: redCount,
      blue: blueCount,
      neutral: 7,
      assassin: 1,
    };

    const currentCounts = {
      red: sanitizedCards.filter((c) => c.type === "red").length,
      blue: sanitizedCards.filter((c) => c.type === "blue").length,
      neutral: sanitizedCards.filter((c) => c.type === "neutral").length,
      assassin: sanitizedCards.filter((c) => c.type === "assassin").length,
    };

    console.log(
      "Raw counts:",
      uniqueRawCards.reduce((acc, c) => {
        acc[c.type] = (acc[c.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    );

    console.log("Counts after initial trim:", currentCounts);

    // Cards we skipped earlier because they exceeded per‑team limits
    const overflowCards = uniqueRawCards.filter(
      (c) => !sanitizedCards.includes(c)
    );

    // helper to pull a card of a specific type from overflowCards
    const pullFromOverflow = (type: CardType["type"]) => {
      const idx = overflowCards.findIndex((c) => c.type === type);
      if (idx === -1) return false; // none left of this type
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
          donorCard.type = type; // mutate to needed type
          sanitizedCards.push(donorCard);
          currentCounts[type]++;
          continue;
        }

        // 3️⃣ Nothing left to use – break out to avoid infinite loop
        break;
      }
    });

    console.log("Counts after refill:", {
      red: sanitizedCards.filter((c) => c.type === "red").length,
      blue: sanitizedCards.filter((c) => c.type === "blue").length,
      neutral: sanitizedCards.filter((c) => c.type === "neutral").length,
      assassin: sanitizedCards.filter((c) => c.type === "assassin").length,
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

//@ts-ignore
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("clu3")
      .select("operative, spymaster, AI_clues_rating, AI_guesses_rating");

    if (error) {
      console.error("Supabase fetch error:", error.message);
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch stats from Supabase" });
    }

    const totalGames = data.length;

    let aiSpymaster = 0;
    let aiOperative = 0;
    let clueSum = 0,
      clueCount = 0,
      guessSum = 0,
      guessCount = 0;

    data.forEach((row) => {
      if (row.spymaster === "ai") aiSpymaster++;
      if (row.operative === "ai") aiOperative++;

      if (row.AI_clues_rating != null) {
        clueSum += row.AI_clues_rating;
        clueCount++;
      }
      if (row.AI_guesses_rating != null) {
        guessSum += row.AI_guesses_rating;
        guessCount++;
      }
    });

    const averageClueRating = clueCount ? clueSum / clueCount : null;
    const averageGuessRating = guessCount ? guessSum / guessCount : null;

    res.json({
      success: true,
      stats: {
        totalGames,
        aiSpymaster,
        aiOperative,
        averageClueRating,
        averageGuessRating,
      },
    });
  } catch (err: any) {
    console.error("Stats endpoint error:", err.message);
    res
      .status(500)
      .json({ success: false, message: err.message ?? "Unknown error" });
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
  const operative = game.teams[game.currentTeam].players.find(
    (p) => p.role === "operative"
  );
  const operativeIsAI = operative?.agent === "ai";

  if (operativeIsAI) {
    await makeAIGuesses(game);
    console.log(
      "After AI guesses:",
      game.cards.map((c) => ({ word: c.word, revealed: c.revealed }))
    );
  }

  res.json({ success: true, game });
});

// POST /games/:id/pass   Body: { team: "red" | "blue" }
//@ts-ignore
router.post("/:id/pass", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { team } = req.body as { team: "red" | "blue" };

  const game = games[id];
  if (!game) {
    return res.status(404).json({ success: false, message: "Game not found." });
  }

  // ── guards ────────────────────────────────────────────────────────────────
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

  try {
    /** 1️⃣ flip team & reset per-turn fields */
    passTurn(game);

    /** 2️⃣ if the NEW spymaster is AI, let it give a clue immediately */
    const newSpymaster = game.teams[game.currentTeam].players.find(
      (p) => p.role === "spymaster"
    );
    if (newSpymaster?.agent === "ai") {
      await maybeGenerateClue(game);

      // store the words that clue is pointing to (history)
      const currentClue = game.clue as ClueType | undefined;
      if (currentClue) {
        (game.aiClueWords ??= []).push({
          clue: currentClue.word,
          words: currentClue.words ?? [],
        });
      }
    }

    /** 3️⃣  ⇒ MAKE SURE THE MAP HOLDS THE UPDATED OBJECT  */
    games[id] = game; // <-- IMPORTANT when you don't persist anywhere else

    /** 4️⃣  respond */
    return res.json({ success: true, game });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * PUT /game/:id/cards/:index
 * Flip a single card for the active team.
 * Body: { team: "red" | "blue" }
 */
//@ts-ignore
router.put("/:id/cards/:index", async (req: Request, res: Response) => {
  // start chunked response to keep connection alive
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Transfer-Encoding", "chunked");
  res.flushHeaders();
  res.write(" "); // heartbeat chunk

  const { id, index } = req.params;
  const { team } = req.body as { team: "red" | "blue" };

  const game = games[id];
  if (!game) {
    return res.status(404).json({ success: false, message: "Game not found." });
  }

  // --- basic guards ---------------------------------------------------------
  const currentPhase = game.phase;
  if (currentPhase !== "guessing") {
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
  // --- outcome logic --------------------------------------------------------
  applyReveal(game, i);

  // If the turn just ended and the NEW spymaster is AI, generate a clue now.
  const newPhase: GameType["phase"] = game.phase;
  if (newPhase === "waiting") {
    const newSpymaster = game.teams[game.currentTeam].players.find(
      (p) => p.role === "spymaster"
    );
    if (newSpymaster?.agent === "ai") {
      await maybeGenerateClue(game);

      // Persist clue history
      const currentClue = game.clue as ClueType | undefined;
      if (currentClue) {
        (game.aiClueWords ??= []).push({
          clue: currentClue.word,
          words: currentClue.words ?? [],
        });
      }
    }
  }

  res.write(JSON.stringify({ success: true, game, flipped: game.cards[i] }));
  res.end();
});

//@ts-ignore TESTING AI CLUES - NOT FOR PROD
router.post("/:id/ai-clue", async (req, res) => {
  const game = games[req.params.id];
  if (!game)
    return res.status(404).json({ success: false, message: "Game not found" });

  await maybeGenerateClue(game);
  // Persist the AI‑generated clue *targets* (the words the clue is pointing to)
  const currentClue = game.clue as ClueType | undefined;
  if (currentClue) {
    (game.aiClueWords ??= []).push({
      clue: currentClue.word,
      words: currentClue.words ?? [],
    });
  }
  res.json({ success: true, game });
});

//@ts-ignore
router.put("/:id/rating", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rating, category } = req.body as {
    rating: number;
    category: "clue" | "guess";
  };

  const game = games[id];
  if (!game) {
    return res.status(404).json({ success: false, message: "Game not found." });
  }

  // Validate rating value
  if (![1, 2, 3, 4, 5].includes(rating)) {
    return res
      .status(400)
      .json({ success: false, message: "Rating must be an integer 1‑5." });
  }

  // Validate category
  if (category !== "clue" && category !== "guess") {
    return res
      .status(400)
      .json({ success: false, message: "Category must be 'clue' or 'guess'." });
  }

  // Update the appropriate field on the game
  if (category === "clue") {
    game.clueRating = rating;
  } else {
    game.guessRating = rating;
  }

  // ── persist rating to Supabase when the game is finished ────────────────
  try {
    if (game.phase === "finished") {
      await saveGameToSupabase(game);
    }
  } catch (err: any) {
    console.error("Failed to save rating to Supabase:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to save rating to Supabase" });
  }

  res.json({ success: true, game });
});

// send data to supabase
const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_KEY as string
);

/**
 * Persists a finished game to Supabase.
 * Expects the game to be in phase "finished" and at least one rating present.
 */
//@ts-ignore
router.post("/:id/save", async (req: Request, res: Response) => {
  const { id } = req.params;
  const game = games[id];

  if (!game) {
    return res.status(404).json({ success: false, message: "Game not found." });
  }

  if (game.phase !== "finished") {
    return res
      .status(400)
      .json({ success: false, message: "Game is not finished yet." });
  }

  try {
    await saveGameToSupabase(game);
    res.json({ success: true });
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: err.message ?? "Unknown error" });
  }
});

/**
 * Persist a finished game (with ratings) to Supabase table `clue3`.
 * - Stores a few scalar columns for quick queries and the full JSON blob.
 */
async function saveGameToSupabase(game: GameType) {
  // Derive player names and human/AI roles
  const redSpymaster = game.teams.red.players.find(
    (p) => p.role === "spymaster"
  );
  const redOperative = game.teams.red.players.find(
    (p) => p.role === "operative"
  );
  const blueSpymaster = game.teams.blue.players.find(
    (p) => p.role === "spymaster"
  );
  const blueOperative = game.teams.blue.players.find(
    (p) => p.role === "operative"
  );
  // Only include human players for each team
  const redHumanPlayers = game.teams.red.players.filter(
    (p) => p.agent === "human"
  );
  const blueHumanPlayers = game.teams.blue.players.filter(
    (p) => p.agent === "human"
  );

  const player_red = redHumanPlayers
    .map((p) => `${p.name}${p.role === "spymaster" ? " (S)" : " (O)"}`)
    .join(", ");

  const player_blue = blueHumanPlayers
    .map((p) => `${p.name}${p.role === "spymaster" ? " (S)" : " (O)"}`)
    .join(", ");

  /** "human" if ANY operative is human, otherwise "ai" */
  const operativeRole =
    redOperative?.agent === "human" || blueOperative?.agent === "human"
      ? "human"
      : "ai";

  /** "human" if ANY spymaster is human, otherwise "ai" */
  const spymasterRole =
    redSpymaster?.agent === "human" || blueSpymaster?.agent === "human"
      ? "human"
      : "ai";

  const row = {
    id: game.id, // PK
    created_at: game.createdAt.toISOString(), // timestamptz
    winner: game.winner ?? null, // text
    player_red: player_red,
    player_blue: player_blue,
    operative: operativeRole, // "human" / "ai"
    spymaster: spymasterRole, // "human" / "ai"
    AI_clues_rating: game.clueRating ?? null, // int2
    AI_guesses_rating: game.guessRating ?? null, // int2
    json: JSON.stringify(game), // jsonb (full game object)
  };

  const { error } = await supabase
    .from("clu3")
    .upsert(row, { onConflict: "id" }); // insert or update by id

  if (error) {
    console.error("Supabase upsert error:", error.message);
    throw new Error("Failed to save game to Supabase");
  }
}



export default router;
