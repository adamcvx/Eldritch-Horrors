import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Fusion } from '@/entities/Fusion';
import { saveKey } from '@/api/cloudSave';
import catalog from '@/api/base44Catalog.json';

const glyphs = new Map(catalog.Ability.map(ability => [ability.id, ability.name]));

async function request(action) {
  const response = await fetch('/api/multiplayer', {
    method: action ? 'POST' : 'GET', cache: 'no-store',
    headers: { Authorization: 'Bearer ' + saveKey(), 'Content-Type': 'application/json' },
    body: action ? JSON.stringify(action) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Multiplayer connection failed.');
  return result;
}

export default function OnlineMatch() {
  const [fighters, setFighters] = useState([]);
  const [fusionId, setFusion] = useState('');
  const [mode, setMode] = useState('casual');
  const [invite, setInvite] = useState('');
  const [room, setRoom] = useState(null);
  const [rank, setRank] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sequence = useRef(0);

  useEffect(() => {
    let mounted = true;
    Fusion.filter({ playerOwner: 'local-player' }).then(rows => {
      if (mounted) setFighters(rows.filter(row => row.abilities?.some(id => glyphs.has(id))));
    }).catch(e => { if (mounted) setError(e.message); });
    async function poll() {
      const seq = ++sequence.current;
      try {
        const result = await request();
        if (mounted && seq === sequence.current) {
          setRoom(result.room);
          setRank(result.rank);
        }
      } catch (e) {
        if (mounted && seq === sequence.current) setError(e.message);
      }
    }
    poll();
    const timer = setInterval(poll, 2500);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  async function act(action, extra) {
    if (busy) return;
    ++sequence.current;
    setBusy(true);
    setError('');
    try {
      const result = await request({ action, mode, fusionId, code: room?.code, round: room?.round, ...extra });
      ++sequence.current;
      setRoom(result.room);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const active = room?.state === 'active';
  const waiting = room?.state === 'waiting';
  const myTurn = active && room.turn === room.side;
  const mine = room?.fighters[room.side];
  const panel = 'space-y-4 rounded-xl border border-purple-800 bg-gray-900 p-5';
  const input = 'rounded border bg-gray-800 p-2';

  return <div className="mx-auto max-w-4xl space-y-5 p-4 text-gray-100">
    <header>
      <h1 className="font-title text-4xl">Abyssal Crucible</h1>
      <p>Challenge another player in turn-based combat.</p>
      {rank && <p>Ranked score {rank.score} · {rank.wins} wins · {rank.losses} losses</p>}
    </header>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {!active && !waiting && <section className={panel}>
      {room?.state === 'finished' && <p role="status">{room.winner === room.side ? 'Victory' : 'Defeat'} in the last match</p>}
      <label className="block">Choose your Abomination
        <select className={input + ' block w-full'} value={fusionId} onChange={e => setFusion(e.target.value)}>
          <option value="">Select an equipped fighter</option>
          {fighters.map(fighter => <option key={fighter.id} value={fighter.id}>{fighter.fusedName} · Level {fighter.level}</option>)}
        </select>
      </label>
      {!fighters.length && <p>Equip an imported ability under Blasphemous Relics to join.</p>}
      <label className="block">Match type
        <select className={input + ' ml-2'} value={mode} onChange={e => setMode(e.target.value)}>
          <option value="casual">Casual</option><option value="ranked">Ranked</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-3">
        <Button disabled={!fusionId || busy} onClick={() => act('queue')}>Find Match</Button>
        <Button disabled={!fusionId || busy} onClick={() => act('create')}>Create Private Match</Button>
      </div>
      <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); act('join', { code: invite }); }}>
        <label>Room code<input className={input + ' block'} value={invite} maxLength={16} onChange={e => setInvite(e.target.value)} /></label>
        <Button type="submit" disabled={!fusionId || invite.trim().length !== 16 || busy}>Join Match</Button>
      </form>
    </section>}
    {waiting && <section className={panel}>
      <h2>Waiting for an opponent</h2>
      {room.private ? <p>Share this room code <strong className="font-mono">{room.code}</strong></p> :
        <p>Searching for a {room.mode} match.</p>}
      <Button disabled={busy} onClick={() => act('leave')}>Cancel</Button>
    </section>}
    {active && <section className={panel}>
      <h2 className="capitalize">{room.mode} battle</h2>
      <p role="status">{myTurn ? 'Your turn' : 'Opponent’s turn'}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {room.fighters.map((fighter, side) => <div key={side} className="rounded border border-purple-900 p-3">
          {fighter.image && <img src={fighter.image} alt="" className="mb-3 h-32 w-full rounded object-contain" />}
          <h3>{fighter.name} {side === room.side && '(You)'}</h3><p>{fighter.player} · {fighter.type}</p>
          <progress className="w-full" aria-label={fighter.name + ' HP'} value={fighter.hp} max={fighter.stats.hp} />
          <p>{fighter.hp} / {fighter.stats.hp} HP</p>
        </div>)}
      </div>
      <div className="flex flex-wrap gap-2">
        {mine.glyphs.map(id => {
          const remaining = Math.max(0, (mine.cooldowns[id] ?? 0) - 1);
          return <Button key={id} disabled={!myTurn || busy || remaining > 0} onClick={() => act('turn', { abilityId: id })}>
            {glyphs.get(id)}{remaining ? ' · ' + remaining : ''}
          </Button>;
        })}
        <Button variant="outline" disabled={!myTurn || busy} onClick={() => act('turn')}>End Turn</Button>
        <Button variant="outline" disabled={busy} onClick={() => { if (window.confirm('Forfeit this match?')) act('leave'); }}>Forfeit</Button>
      </div>
    </section>}
    {Boolean(room?.log.length) && <section className={panel}>
      <h2>Battle Log</h2>
      <ol>{room.log.slice(-12).map((line, index) => <li key={index}>{line}</li>)}</ol>
    </section>}
  </div>;
}
