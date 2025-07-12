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
      <div className="relative z-50 bg-[#FFF6F5] p-6 rounded-lg shadow-lg w-full max-w-md pointer-events-auto">
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
          <div className="bg-[#F05F4599] p-4 rounded text-white">
            <h3 className="font-medium text-white pb-2">Human Red Player</h3>
            <input
              className="w-full p-2 border rounded text-white"
              placeholder="Name"
              value={red.name}
              onChange={(e) => setRed({ ...red, name: e.target.value })}
              required
            />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setRed({ ...red, role: 'operative' })}
                className={`flex-1 px-2 py-1 rounded border transition ${
                  red.role === 'operative'
                    ? 'bg-white text-[#F05F45] font-semibold'
                    : 'bg-transparent text-white border-white/40 hover:bg-white/20'
                }`}
              >
                🔍 Operative
              </button>
              <button
                type="button"
                onClick={() => setRed({ ...red, role: 'spymaster' })}
                className={`flex-1 px-2 py-1 rounded border transition ${
                  red.role === 'spymaster'
                    ? 'bg-white text-[#F05F45] font-semibold'
                    : 'bg-transparent text-white border-white/40 hover:bg-white/20'
                }`}
              >
                🃏 Spymaster
              </button>
            </div>
          </div>

          <div className="bg-[#6294D899] p-4 rounded text-white">
            <h3 className="font-medium pb-2">Human Blue Player</h3>
            <input
              className="w-full p-2 border rounded text-white"
              placeholder="Name"
              value={blue.name}
              onChange={(e) => setBlue({ ...blue, name: e.target.value })}
              required
            />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setBlue({ ...blue, role: 'operative' })}
                className={`flex-1 px-2 py-1 rounded border transition ${
                  blue.role === 'operative'
                    ? 'bg-white text-[#6294D8] font-semibold'
                    : 'bg-transparent text-white border-white/40 hover:bg-white/20'
                }`}
              >
                🔍 Operative
              </button>
              <button
                type="button"
                onClick={() => setBlue({ ...blue, role: 'spymaster' })}
                className={`flex-1 px-2 py-1 rounded border transition ${
                  blue.role === 'spymaster'
                    ? 'bg-white text-[#6294D8] font-semibold'
                    : 'bg-transparent text-white border-white/40 hover:bg-white/20'
                }`}
              >
                🃏 Spymaster
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="bg-[#6294D8] text-white px-4 py-2 rounded hover:bg-[#4F7FC0]">
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TeamInputModal({ onSubmit, onClose }: { onSubmit: (data: any) => void; onClose: () => void }) {
  const [teamName, setTeamName] = useState('');
  const [teamColor, setTeamColor] = useState('red');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ teamName, teamColor });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm bg-transparent pointer-events-auto">
      <div className="relative z-50 bg-[#FFF6F5] p-6 rounded shadow-lg w-full max-w-md pointer-events-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 z-50"
          type="button"
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-lg font-semibold mb-4 text-center">Team Input</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h3 className="font-medium">Team Name</h3>
            <input
              className="w-full p-2 border rounded"
              placeholder="Enter team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
            />
          </div>

          <div>
            <h3 className="font-medium">Team Color</h3>
            <select
              className="w-full p-2 border rounded mt-2"
              value={teamColor}
              onChange={(e) => setTeamColor(e.target.value)}
            >
              <option value="red">Red</option>
              <option value="blue">Blue</option>
              <option value="green">Green</option>
              <option value="yellow">Yellow</option>
            </select>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="bg-[#6294D8] text-white px-4 py-2 rounded hover:bg-[#4F7FC0]">
              Save Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SettingsModal({ settings, onSave, onClose }: { settings: any; onSave: (settings: any) => void; onClose: () => void }) {
  const [difficulty, setDifficulty] = useState(settings.difficulty || 'normal');
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ difficulty, soundEnabled });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm bg-transparent pointer-events-auto">
      <div className="relative z-50 bg-[#FFF6F5] p-6 rounded shadow-lg w-full max-w-md pointer-events-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 z-50"
          type="button"
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-lg font-semibold mb-4 text-center">Settings</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h3 className="font-medium">Difficulty</h3>
            <select
              className="w-full p-2 border rounded"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="easy">Easy</option>
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="soundEnabled"
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="soundEnabled" className="font-medium">Enable Sound</label>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="bg-[#6294D8] text-white px-4 py-2 rounded hover:bg-[#4F7FC0]">
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}