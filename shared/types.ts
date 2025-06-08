export interface Card {
  word: string;
  type: "red" | "blue" | "neutral" | "assassin";
  revealed?: boolean;
}
export interface Clue {
  word: string;
  number: number;
}

export interface Game {
  id: string;
  cards: Card[];
  teams: { red: Team; blue: Team };
  currentTeam: "red" | "blue";
  phase: "waiting" | "giving-clue" | "guessing" | "finished";
  clue?: Clue;
  guessesRemaining?: number;
  winner?: "red" | "blue";
  createdAt: Date;
}

export type Agent = "human" | "ai";

export type Role = "spymaster" | "operative";

export interface Player {
  id: string;          // socket, user id, or uuid
  name?: string;       // "Julia", "GPT-4o", …
  agent: Agent;        // "human" | "ai"
  role: Role;          // "spymaster" | "operative"
}

export interface Team {
  color: "red" | "blue";
  players: [Player, Player];        // exactly one human + one AI
}
