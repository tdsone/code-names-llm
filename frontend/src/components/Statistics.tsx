import React, { useState, useEffect } from 'react';

interface GameStats {
  totalGames: number;
  aiSpymaster: number;
  aiOperative: number;
  averageClueRating: number | null;
  averageGuessRating: number | null;
}

const GameStatistics: React.FC = () => {
  const [stats, setStats] = useState<GameStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
   fetch("/api/game/stats")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message ?? "Failed to load statistics");
        }
        setStats(json.stats);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      });
  }, []);

  // ─── STYLE HELPERS ─────────────────────────────────────────────────────────
  const brandBlue = "#1F6BFF";
  const brandRed = "#E60023";

  const containerStyle: React.CSSProperties = {
    textAlign: "center",
    maxWidth: "600px",
    margin: "0 auto",
  };

  const totalStyle: React.CSSProperties = {
    fontSize: "3rem",
    marginBottom: "0.5rem",
    fontWeight: 700,
  };

  const totalLabelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "1.25rem",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    gap: "1rem",
    marginTop: "1rem",
  };

  const cardStyle = (color: string): React.CSSProperties => ({
    flex: 1,
    padding: "1rem",
    borderRadius: "8px",
    background: `${color}1A`, // 10 % opacity background
    color,
  });

  const numberStyle: React.CSSProperties = {
    fontSize: "2.5rem",
    fontWeight: 700,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginTop: "0.25rem",
    fontSize: "0.9rem",
  };
  // ───────────────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="game-stats-container">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="game-stats-container">
        <p>Loading statistics…</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h2 style={totalStyle}>
        {stats.totalGames}
        <span style={totalLabelStyle}>Total Games Played</span>
      </h2>

      <div style={rowStyle}>
        <div style={cardStyle(brandBlue)}>
          <span style={numberStyle}>{stats.aiSpymaster}</span>
          <span style={labelStyle}>AI as Spymaster</span>
        </div>
        <div style={cardStyle(brandRed)}>
          <span style={numberStyle}>{stats.aiOperative}</span>
          <span style={labelStyle}>AI as Operative</span>
        </div>
      </div>

      <div style={rowStyle}>
        <div style={cardStyle(brandBlue)}>
          <span style={numberStyle}>{stats.averageClueRating?.toFixed(1) ?? "—"}</span>
          <span style={labelStyle}>Avg Clue Rating</span>
        </div>
        <div style={cardStyle(brandRed)}>
          <span style={numberStyle}>{stats.averageGuessRating?.toFixed(1) ?? "—"}</span>
          <span style={labelStyle}>Avg Guess Rating</span>
        </div>
      </div>
    </div>
  );
};

export default GameStatistics;