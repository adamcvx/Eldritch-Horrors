import { createHash, randomBytes } from 'node:crypto';
import { createClient } from '@libsql/client/web';
import catalog from '../../src/api/base44Catalog.json' with { type: 'json' };

const abilities = new Map(catalog.Ability.map(ability => [ability.id, ability]));
const elements = ['Dimension', 'Void', 'Dream', 'Flesh', 'Sunken'];
const number = value => Math.max(0, Math.min(500, Number(value) || 0));
const reply = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

function loadFighter(save, fusionId) {
  const fusion = save?.Fusion.find(row => row.id === fusionId);
  if (!fusion) return null;
  const glyphs = [...new Set(fusion.abilities || [])].filter(id => abilities.has(id)).slice(0, 4);
  if (!glyphs.length) return null;
  const stats = {};
  for (const name of ['hp', 'attack', 'defense', 'speed']) {
    stats[name] = number(number(fusion.stats[name]) + number(fusion.levelBonus?.[name]));
    for (const talent of catalog.Talent) {
      if (save.player.learnedTalents.includes(talent.name)) {
        stats[name] += Math.round(number(fusion.stats[name]) * (talent.statBonus?.['all_' + name + '_boost'] || 0));
      }
    }
  }
  const equipped = save.PlayerOrb.filter(row => row.equippedToFusion === fusion.id)
    .slice(0, fusion.level >= 21 ? 3 : fusion.level >= 11 ? 2 : 1);
  const orbs = equipped.map(owned => catalog.Orb.find(row => row.id === owned.orbId)).filter(Boolean);
  for (const orb of orbs) {
    if (!orb || orb.orbTrigger !== 'Passive' || orb.orbType !== 'Unstable') continue;
    stats[orb.orbStatBenefit] = Math.round(stats[orb.orbStatBenefit] * (1 + orb.orbBenefitValue / 100));
    if (orb.orbStatDrawback) stats[orb.orbStatDrawback] = Math.round(stats[orb.orbStatDrawback] * (1 - orb.orbDrawbackValue / 100));
  }
  stats.hp = Math.max(1, stats.hp);
  return {
    name: String(fusion.fusedName).slice(0, 100), player: String(save.player.displayName || 'Cultist').slice(0, 60),
    type: elements.includes(fusion.originType) ? fusion.originType : 'Void',
    image: /^\/Artwork\/[\w%.-]+(?:\/[\w%.-]+)?\.(?:png|jpe?g|webp|gif)$/i.test(fusion.generatedImage) ? fusion.generatedImage : null,
    stats, hp: stats.hp, glyphs, orbs, cooldowns: {}, effects: [],
  };
}

function takeTurn(state, abilityId) {
  const a = state.fighters[state.turn];
  const b = state.fighters[1 - state.turn];
  const stat = (fighter, field) => Math.max(1, fighter.stats[field] + fighter.effects
    .filter(effect => effect.field === field).reduce((sum, effect) => sum + effect.amount, 0));
  for (const [id, remaining] of Object.entries(a.cooldowns)) {
    a.cooldowns[id] = Math.max(0, remaining - 1);
  }
  // On-going effects tick once at the end of the affected fighter's turn.
  const existing = [...a.effects];
  const log = [];
  if (abilityId) {
    if (!a.glyphs.includes(abilityId) || a.cooldowns[abilityId]) return false;
    const ability = abilities.get(abilityId);
    const power = ability.effect?.includes('{power}%') ? ability.power / 100 : ability.power;
    const effects = ability.statEffect ?? [];
    const abilityCooldown = Math.ceil(ability.cooldown / 2);
    a.cooldowns[abilityId] = abilityCooldown;
    let text = a.player + ' used ' + ability.name;
    if (ability.type === 'attack') {
      const gap = (elements.indexOf(b.type) - elements.indexOf(a.type) + 5) % 5;
      const multiplier = [1, 1.25, .75, 1.5, 1][gap];
      const damage = Math.max(1, Math.round((stat(a, 'attack') * power - stat(b, 'defense') * .3) * multiplier));
      b.hp = Math.max(0, b.hp - damage);
      const drain = (a.orbs ?? []).filter(orb => orb.orbTrigger === 'OnAttack' && orb.orbType === 'Parasitic')
        .reduce((total, orb) => total + Math.round(damage * orb.orbBenefitValue * (orb.originSynergy === a.type ? 1.5 : 1) / 100), 0);
      if (drain && a.hp < a.stats.hp) {
        const healed = Math.min(a.stats.hp - a.hp, drain);
        a.hp += healed;
        text += ' and drained ' + healed + ' HP';
      }
      text += ' for ' + damage + ' damage';
    }
    for (const name of effects) {
      const fighter = name.endsWith('_up') || name === 'heal_over_time' ? a : b;
      const field = name.split('_')[0];
      let amount;
      if (name === 'heal_over_time') amount = Math.max(1, Math.round((ability.effect.includes('max health') ? a.stats.hp : stat(a, 'speed')) * power));
      else if (name === 'damage_over_time') amount = -Math.max(1, Math.round(stat(a, 'speed') * power - stat(b, 'speed') * .1));
      else amount = Math.max(1, Math.round(fighter.stats[field] * power)) * (name.endsWith('_down') ? -1 : 1);
      fighter.effects = fighter.effects.filter(effect => effect.name !== name);
      fighter.effects.push({ name, field, amount, turns: Math.max(1, ability.turnLength) });
    }
    log.push(text + '.');
  } else log.push(a.player + ' passed.');
  for (const effect of existing) {
    if (!a.effects.includes(effect)) continue;
    if (effect.name === 'heal_over_time' || effect.name === 'damage_over_time') {
      a.hp = Math.max(0, Math.min(a.stats.hp, a.hp + effect.amount));
      log.push(a.player + (effect.amount < 0 ? ' lost ' : ' recovered ') + Math.abs(effect.amount) + ' HP.');
    }
    effect.turns--;
  }
  a.effects = a.effects.filter(effect => effect.turns > 0);
  state.log = [...state.log, ...log].slice(-60);
  if (!a.hp || !b.hp) state.winner = b.hp ? 1 - state.turn : state.turn;
  else state.turn = 1 - state.turn;
  return true;
}

export function multiplayerHandler(db) {
  let ready;
  return async request => {
    const key = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    if (!key) return reply(401, { error: 'Save key required.' });
    const owner = createHash('sha256').update(key).digest('hex');
    const run = (sql, args = []) => db.execute({ sql, args });
    const view = row => ({ code: row.code, state: row.status, mode: row.mode, private: Boolean(row.invite),
      side: row.host === owner ? 0 : 1, round: Number(row.revision), ...JSON.parse(row.payload) });
    try {
      ready ??= run(`CREATE TABLE IF NOT EXISTS multiplayer_rooms (
        code TEXT PRIMARY KEY, host TEXT NOT NULL, guest TEXT, status TEXT NOT NULL,
        mode TEXT NOT NULL, invite INTEGER NOT NULL, revision INTEGER NOT NULL DEFAULT 0,
        payload TEXT NOT NULL, updated_at INTEGER NOT NULL
      )`).catch(error => { ready = undefined; throw error; });
      await ready;

      if (request.method === 'GET' && new URL(request.url).searchParams.get('view') === 'leaderboard') {
        const board = await run(
          "WITH players AS (" +
          " SELECT host AS player_id, json_extract(payload, '$.fighters[0].player') AS name, CASE WHEN json_extract(payload, '$.winner') = 0 THEN 1 ELSE 0 END AS won, updated_at FROM multiplayer_rooms WHERE mode = 'ranked' AND status = 'finished'" +
          " UNION ALL SELECT guest AS player_id, json_extract(payload, '$.fighters[1].player') AS name, CASE WHEN json_extract(payload, '$.winner') = 1 THEN 1 ELSE 0 END AS won, updated_at FROM multiplayer_rooms WHERE mode = 'ranked' AND status = 'finished'" +
          "), ordered AS (SELECT players.*, ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY updated_at DESC) AS recent FROM players)" +
          " SELECT MAX(CASE WHEN recent = 1 THEN name END) AS name, SUM(won) AS wins, COUNT(*) - SUM(won) AS losses," +
          " MAX(0,1000+(2*SUM(won)-COUNT(*))*25) AS score FROM ordered GROUP BY player_id ORDER BY score DESC, wins DESC, name LIMIT 50"
        );
        return reply(200, { leaderboard: board.rows.map(({ name, score, wins, losses }) => ({ name, score, wins, losses })) });
      }

      if (request.method === 'GET') {
        const result = await run(
          "SELECT * FROM multiplayer_rooms WHERE (host = ? OR guest = ?) AND ((status IN ('waiting','active') AND updated_at > ?) OR (status = 'finished' AND updated_at > ?)) ORDER BY updated_at DESC LIMIT 1",
          [owner, owner, Date.now() - 3600000, Date.now() - 86400000]);
        const history = (await run(
          "SELECT SUM(CASE WHEN json_extract(payload, '$.winner') = CASE WHEN host = ? THEN 0 ELSE 1 END THEN 1 ELSE 0 END) AS wins, COUNT(*) AS played FROM multiplayer_rooms WHERE mode = 'ranked' AND status = 'finished' AND (host = ? OR guest = ?)",
          [owner, owner, owner]
        )).rows[0];
        const wins = Number(history.wins ?? 0);
        const losses = Number(history.played) - wins;
        return reply(200, { room: result.rows[0] ? view(result.rows[0]) : null,
          rank: { wins, losses, score: Math.max(0, 1000 + (wins - losses) * 25) } });
      }
      if (request.method !== 'POST') return reply(405, { error: 'Method not allowed.' });
      const text = await request.text();
      if (text.length > 2000) return reply(413, { error: 'Action is too large.' });
      let input;
      try { input = JSON.parse(text); } catch { return reply(400, { error: 'Invalid action.' }); }
      if (!input || typeof input !== 'object') return reply(400, { error: 'Invalid action.' });
      const now = Date.now();
      if (['queue', 'create', 'join'].includes(input.action)) {
        const row = (await run('SELECT payload FROM single_player_saves WHERE id = ?', [owner])).rows[0];
        const fighter = loadFighter(row ? JSON.parse(row.payload) : null, input.fusionId);
        if (!fighter) return reply(400, { error: 'Choose a saved Abomination with an imported ability equipped.' });
        const mode = input.mode === 'ranked' ? 'ranked' : 'casual';
        const active = (await run("SELECT * FROM multiplayer_rooms WHERE (host = ? OR guest = ?) AND status IN ('waiting','active') AND updated_at > ? LIMIT 1", [owner, owner, now - 3600000])).rows[0];
        if (active) return reply(200, { room: view(active) });
        const match = input.action === 'join'
          ? (await run("SELECT * FROM multiplayer_rooms WHERE code = ? AND status = 'waiting' AND host <> ? AND updated_at > ?", [String(input.code ?? '').trim().toUpperCase(), owner, now - 3600000])).rows[0]
          : input.action === 'queue'
            ? (await run("SELECT * FROM multiplayer_rooms WHERE mode = ? AND status = 'waiting' AND invite = 0 AND host <> ? AND updated_at > ? ORDER BY updated_at LIMIT 1", [mode, owner, now - 3600000])).rows[0]
            : null;
        if (match) {
          const state = JSON.parse(match.payload);
          state.fighters.push(fighter);
          state.turn = fighter.stats.speed > state.fighters[0].stats.speed ? 1 : 0;
          state.log = ['The match has begun.'];
          const changed = await run("UPDATE multiplayer_rooms SET guest = ?, status = 'active', payload = ?, revision = revision + 1, updated_at = ? WHERE code = ? AND status = 'waiting'", [owner, JSON.stringify(state), now, match.code]);
          if (!changed.rowsAffected) return reply(409, { error: 'Someone joined that room first. Try again.' });
          return reply(200, { room: view({ ...match, status: 'active', guest: owner, revision: 1, payload: JSON.stringify(state) }) });
        }
        if (input.action === 'join') return reply(404, { error: 'That waiting room was not found.' });
        const code = randomBytes(8).toString('hex').toUpperCase();
        const state = { fighters: [fighter], turn: 0, log: [], winner: null };
        const invite = input.action === 'create' ? 1 : 0;
        await run("INSERT INTO multiplayer_rooms (code, host, status, mode, invite, payload, updated_at) VALUES (?, ?, 'waiting', ?, ?, ?, ?)", [code, owner, mode, invite, JSON.stringify(state), now]);
        return reply(200, { room: view({ code, host: owner, status: 'waiting', mode, invite, revision: 0, payload: JSON.stringify(state) }) });
      }

      const match = (await run('SELECT * FROM multiplayer_rooms WHERE code = ? AND (host = ? OR guest = ?)', [String(input.code ?? ''), owner, owner])).rows[0];
      if (!match) return reply(404, { error: 'Match not found.' });
      const state = JSON.parse(match.payload);
      const side = match.host === owner ? 0 : 1;
      let status = match.status;
      if (input.action === 'leave' && status === 'waiting') status = 'canceled';
      else if (input.action === 'leave' && status === 'active') {
        state.winner = 1 - side;
        state.log.push(state.fighters[side].player + ' forfeited.');
        status = 'finished';
      } else if (input.action === 'turn' && status === 'active' && state.turn === side && Number(match.revision) === input.round) {
        if (!takeTurn(state, input.abilityId)) return reply(400, { error: 'That ability is unavailable.' });
        if (state.winner !== null) status = 'finished';
      } else return reply(409, { error: 'The match changed. Wait for the latest turn.' });
      const changed = await run('UPDATE multiplayer_rooms SET status = ?, payload = ?, revision = revision + 1, updated_at = ? WHERE code = ? AND revision = ?', [status, JSON.stringify(state), now, match.code, match.revision]);
      if (!changed.rowsAffected) return reply(409, { error: 'The match changed. Wait for the latest turn.' });
      return reply(200, { room: status === 'canceled' ? null : view({ ...match, status, revision: Number(match.revision) + 1, payload: JSON.stringify(state) }) });
    } catch {
      return reply(503, { error: 'Multiplayer is temporarily unavailable.' });
    }
  };
}

let api;
export default function handler(request) {
  const { TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: authToken } = process.env;
  if (!url || !authToken) return reply(503, { error: 'Multiplayer storage is not configured.' });
  api ??= multiplayerHandler(createClient({ url, authToken }));
  return api(request);
}
