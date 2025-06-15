import React from "react";
import { useState } from "react";

export function ClueForm({ onSubmit }: { onSubmit: (clue: { word: string, number: number }) => void }) {
  const [word, setWord] = useState("");
  const [number, setNumber] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word || isNaN(Number(number))) return;
    onSubmit({ word, number: Number(number) });
    setWord("");
    setNumber("");
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex gap-3 items-center">
      <input
        value={word}
        onChange={e => setWord(e.target.value)}
        placeholder="Clue word"
        className="border border-gray-300 dark:border-gray-600 px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-[#6294D8] focus:border-[#6294D8] transition-colors"
      />
      <input
        value={number}
        onChange={e => setNumber(e.target.value)}
        placeholder="# guesses"
        type="number"
        min="1"
        className="border border-gray-300 dark:border-gray-600 px-2 py-1 w-20 rounded focus:outline-none focus:ring-2 focus:ring-[#6294D8] focus:border-[#6294D8] transition-colors"
      />
      <button
        type="submit"
        className="px-4 py-1 bg-[#6294D8] hover:bg-[#4f7bc2] text-white rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#6294D8] focus:ring-offset-2 font-semibold"
      >
        Submit
      </button>
    </form>
  );
}