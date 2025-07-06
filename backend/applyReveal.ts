import { Game as GameType } from "../shared/types";

/**
 * Reveals the chosen card and applies all game‑over / turn‑end rules.
 * Server-side canonical implementation.  Leaves the game in phase "waiting"
 * when the turn should pass, so that the front‑end can request `/ai-clue`.
 */
export function applyReveal(game: GameType, index: number): void {
  const card = game.cards[index];
  if (card.revealed) return; // guard against double flips

  // 1️⃣ Flip the card
  card.revealed = true;
  if (game.guessesRemaining !== undefined) game.guessesRemaining -= 1;

  // 2️⃣ Evaluate end‑of‑game conditions
  if (card.type === "assassin") {
    game.phase = "finished";
    game.winner = game.currentTeam === "red" ? "blue" : "red";
    return;
  }

  const redsCleared = game.cards
    .filter(c => c.type === "red")
    .every(c => c.revealed);
  const bluesCleared = game.cards
    .filter(c => c.type === "blue")
    .every(c => c.revealed);

  if (redsCleared || bluesCleared) {
    game.phase = "finished";
    game.winner = redsCleared ? "red" : "blue";
    return;
  }

  // 3️⃣ Decide whether the turn ends
  const wrongTeam = card.type !== game.currentTeam && card.type !== "neutral";
  const neutral   = card.type === "neutral";
  const noGuesses = game.guessesRemaining !== undefined && game.guessesRemaining <= 0;

  if (wrongTeam || neutral || noGuesses) endTurn(game);
}

/** Hand control to the other team and clear clue / guesses. */
function endTurn(game: GameType) {
  game.currentTeam = game.currentTeam === "red" ? "blue" : "red";
  game.phase = "waiting";
  game.clue = undefined;
  game.guessesRemaining = undefined;
}