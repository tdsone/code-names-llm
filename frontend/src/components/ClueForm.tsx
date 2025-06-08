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
        className="border px-3 py-1 rounded"
      />
      <input
        value={number}
        onChange={e => setNumber(e.target.value)}
        placeholder="# guesses"
        type="number"
        min="1"
        className="border px-2 py-1 w-20 rounded"
      />
      <button type="submit" className="px-4 py-1 bg-blue-500 text-white rounded">Submit</button>
    </form>
  );
}