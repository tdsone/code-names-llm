import React from 'react';

type Clue = string | { clue: string; words: string[] };

interface RevealCluesProps {
  /** List of raw clues – either plain strings or { clue, words } objects */
  clues?: Clue[];
  /** Indicates whether the current round is finished */
  isGameOver: boolean;
}

/**
 * Displays the list of AI‑generated clue words once the game is over.
 * Until then, a placeholder message is shown so players can't peek early.
 */
const RevealClues: React.FC<RevealCluesProps> = ({ clues = [], isGameOver }) => {
  if (!isGameOver) {
    return (
      <div className="clues-hidden">
        <p className="text-sm italic text-gray-500">
          The AI's clues will appear here at the end of the round.
        </p>
      </div>
    );
  }

  if (clues.length === 0) {
    return (
      <div className="reveal-clues">
        <p className="text-sm italic text-gray-500">No clues were generated.</p>
      </div>
    );
  }

  return (
    <div className="reveal-clues">
      <ul className="list-disc pl-5 space-y-1">
        {clues.map((c, idx) => (
          <li key={idx}>
            {typeof c === "string" ? c : `${c.clue} – ${c.words.join(", ")}`}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RevealClues;
