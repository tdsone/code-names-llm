import { useState, useEffect } from 'react';
import type { Player } from '../../../shared/types'; // adjust path if needed shared/types.ts
import { v4 as uuidv4 } from 'uuid';

export default function GameSetup({ onPlayersSubmit, onClose }: { onPlayersSubmit: (gameSetup: any) => void; onClose: () => void }) {
  const [red, setRed] = useState<Omit<Player, 'id' | 'agent'>>({ name: '', role: 'operative' });
  const [blue, setBlue] = useState<Omit<Player, 'id' | 'agent'>>({ name: '', role: 'operative' });

  useEffect(() => {
    setBlue((prev) => ({ ...prev, role: red.role }));
  }, [red.role]);

  useEffect(() => {
    setRed((prev) => ({ ...prev, role: blue.role }));
  }, [blue.role]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const redSpymasterIsHuman = red.role === 'spymaster';
    const blueSpymasterIsHuman = blue.role === 'spymaster';

    const redTeam = {
      players: [
        redSpymasterIsHuman
          ? { id: uuidv4(), agent: 'human', name: red.name, role: 'spymaster' }
          : { id: uuidv4(), agent: 'ai', name: 'Red AI', role: 'spymaster' },
        redSpymasterIsHuman
          ? { id: uuidv4(), agent: 'ai', name: 'Red AI', role: 'operative' }
          : { id: uuidv4(), agent: 'human', name: red.name, role: 'operative' },
      ],
    };

    const blueTeam = {
      players: [
        blueSpymasterIsHuman
          ? { id: uuidv4(), agent: 'human', name: blue.name, role: 'spymaster' }
          : { id: uuidv4(), agent: 'ai', name: 'Blue AI', role: 'spymaster' },
        blueSpymasterIsHuman
          ? { id: uuidv4(), agent: 'ai', name: 'Blue AI', role: 'operative' }
          : { id: uuidv4(), agent: 'human', name: blue.name, role: 'operative' },
      ],
    };

    const gameSetup = {
      teams: {
        red: redTeam,
        blue: blueTeam,
      },
    };

    onPlayersSubmit(gameSetup);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm bg-transparent pointer-events-auto">
      <div className="relative z-50 bg-white p-6 rounded shadow-lg w-full max-w-md pointer-events-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 z-50"
          type="button"
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-lg font-semibold mb-4 text-center">Game Setup</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h3 className="font-medium">Red Player</h3>
            <input
              className="w-full p-2 border rounded"
              placeholder="Name"
              value={red.name}
              onChange={(e) => setRed({ ...red, name: e.target.value })}
              required
            />
            <select
              className="w-full p-2 border rounded mt-2"
              value={red.role}
              onChange={(e) => setRed({ ...red, role: e.target.value as Player['role'] })}
            >
              <option value="operative">Operative</option>
              <option value="spymaster">Spymaster</option>
            </select>
          </div>

          <div>
            <h3 className="font-medium">Blue Player</h3>
            <input
              className="w-full p-2 border rounded"
              placeholder="Name"
              value={blue.name}
              onChange={(e) => setBlue({ ...blue, name: e.target.value })}
              required
            />
            <select
              className="w-full p-2 border rounded mt-2"
              value={blue.role}
              onChange={(e) => setBlue({ ...blue, role: e.target.value as Player['role'] })}
            >
              <option value="operative">Operative</option>
              <option value="spymaster">Spymaster</option>
            </select>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}