export interface Card {
  word: string;
  type: "red" | "blue" | "neutral" | "assassin";
  revealed?: boolean;
}

export interface Game {
  id: string;
  cards: Card[];
  currentTeam: "red" | "blue";
  phase: "waiting" | "giving-clue" | "guessing" | "finished";
  winner?: "red" | "blue";
  createdAt: Date;
}
