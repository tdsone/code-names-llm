import type { Game as GameType } from "../../shared/types";

export function isAISpymasterTurn(game: GameType): boolean {
  const team = game.currentTeam;               // "red" | "blue"
  const spymaster = game.teams[team].players.find(
    (p) => p.role === "spymaster"
  );
  return game.phase === "waiting" && spymaster?.agent === "ai";
}