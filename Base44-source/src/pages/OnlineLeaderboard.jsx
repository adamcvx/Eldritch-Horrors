import { useEffect, useState } from 'react';

export default function OnlineLeaderboard() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch('/api/multiplayer?view=leaderboard', {
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Leaderboard unavailable.');
        setRows(result.leaderboard);
      } catch (e) {
        if (!controller.signal.aborted) setError(e.message);
      }
    })();
    return () => controller.abort();
  }, []);
  return <main className="mx-auto max-w-4xl space-y-4 p-4">
    <h1 className="font-title text-4xl">Crucible Ascension</h1>
    <p>Rankings from completed online battles.</p>
    {error && <p role="alert">{error}</p>}
    {!error && !rows && <p role="status">Loading rankings…</p>}
    {rows?.length === 0 && <p>No ranked matches have finished yet.</p>}
    {Boolean(rows?.length) && <table className="w-full border-collapse text-left">
      <thead><tr><th>Rank</th><th>Cultist</th><th>Score</th><th>Wins</th><th>Losses</th></tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index} className="border-t border-purple-900">
        <td className="py-3">{index + 1}</td><td>{row.name}</td><td>{row.score}</td><td>{row.wins}</td><td>{row.losses}</td>
      </tr>)}</tbody>
    </table>}
  </main>;
}
