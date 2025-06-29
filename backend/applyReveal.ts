// backend/services/applyReveal.ts
import { Game as GameType, Clue as ClueType, Card as CardType } from
  "../shared/types";
import { maybeGenerateClue } from "./ai";

/**
 * Reveals the chosen card and applies all game-over / turn-end rules.
 * This is now the ONE place that sets `phase`, `winner`, switches teams,
 * decrements guesses, etc.
 */
export async function applyReveal(
  game: GameType,
  index: number
): Promise<void> {
  const card = game.cards[index];
  if (card.revealed) return;        // guard against double-flips

  // 1️⃣ flip
  card.revealed = true;
  if (game.guessesRemaining !== undefined) {
    game.guessesRemaining -= 1;
  }

  // 2️⃣ compute win / loss conditions
  const teamPlaying  = game.currentTeam;
  const assassin     = card.type === "assassin";
  const wrongTeam    = card.type !== teamPlaying && card.type !== "neutral";
  const neutral      = card.type === "neutral";
  const redWon  = game.cards
    .filter((c) => c.type === "red")
    .every((c) => c.revealed);
  const blueWon = game.cards
    .filter((c) => c.type === "blue")
    .every((c) => c.revealed);
  const noGuesses =
    game.guessesRemaining !== undefined && game.guessesRemaining <= 0;

  if (assassin) {
    game.phase  = "finished";
    game.winner = teamPlaying === "red" ? "blue" : "red";
    return;
  }
  if (redWon || blueWon) {
    game.phase  = "finished";
    game.winner = redWon ? "red" : "blue";
    return;
  }

  // 3️⃣ otherwise, maybe end turn
  if (neutral || wrongTeam || noGuesses) {
    await endTurn(game);
  }
}

/** identical behaviour to the old inline helper */
async function endTurn(game: GameType) {
  game.currentTeam = game.currentTeam === "red" ? "blue" : "red";
  game.phase = "waiting";
  game.clue  = undefined;
  game.guessesRemaining = undefined;

  await maybeGenerateClue(game);

  const currentClue = game.clue as ClueType | undefined;
  if (currentClue) {
    (game.aiClueWords ??= []).push({
      clue: currentClue.word,
      words: currentClue.words ?? [],
    });
  }
}