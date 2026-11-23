import { randomUUID } from 'node:crypto';
import { createClient } from '@libsql/client/web';
import catalog from '../../src/api/base44Catalog.json' with { type: 'json' };
import { validSave } from '../../src/api/saveFormat.js';
import { getAccountId, isSameOrigin } from '../lib/account.mjs';

const orbCatalog = new Map(catalog.Orb.map(orb => [orb.id, orb]));
const priceOK = value => Number.isSafeInteger(value) && value > 0 && value <= 1_000_000;
const collection = type => type === 'fusion' ? 'Fusion' : 'PlayerOrb';

class MarketError extends Error {}
const requireMarket = (condition, message) => { if (!condition) throw new MarketError(message); };

export function marketHandler(db, authenticate = getAccountId, clock = Date.now) {
  let schema;
  return async request => {
    const reply = (status, data) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
    if (!['GET', 'POST'].includes(request.method)) return reply(405, { error: 'Method not allowed.' });
    if (request.method === 'POST' && !isSameOrigin(request)) return reply(403, { error: 'Request origin rejected.' });

    let transaction;
    try {
      const owner = await authenticate();
      if (!owner) return reply(401, { error: 'Sign in to use the Black Register.' });
      let input;
      if (request.method === 'POST') {
        const body = await request.text();
        requireMarket(body.length < 4096, 'Listing request is too long.');
        try { input = JSON.parse(body); } catch { throw new MarketError('Invalid market request.'); }
        requireMarket(input && typeof input === 'object', 'Invalid market request.');
      }
      schema ??= db.batch([
        'CREATE TABLE IF NOT EXISTS single_player_saves (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)',
        'CREATE TABLE IF NOT EXISTS market_listings (id TEXT PRIMARY KEY, seller TEXT NOT NULL, status TEXT NOT NULL, expires_at INTEGER NOT NULL, payload TEXT NOT NULL)',
        'CREATE INDEX IF NOT EXISTS market_expiry ON market_listings(status, expires_at)',
      ], 'write').catch(error => { schema = undefined; throw error; });
      await schema;

      transaction = await db.transaction('write');
      const run = (sql, args = []) => transaction.execute({ sql, args });
      const now = clock();
      const players = new Map();
      const changed = new Set();
      const load = async id => {
        if (!players.has(id)) {
          const { rows } = await run('SELECT payload FROM single_player_saves WHERE id=?', [id]);
          requireMarket(rows.length, 'Create a game save before trading.');
          const save = JSON.parse(rows[0].payload);
          requireMarket(validSave(save), 'The player save could not be loaded.');
          players.set(id, save);
        }
        changed.add(id);
        return players.get(id);
      };
      const transfer = async (listing, recipient) => {
        const save = await load(recipient);
        const item = { ...listing.item, id: randomUUID() };
        save[collection(listing.itemType)].push(item);
      };
      const credit = async (id, amount) => {
        const save = await load(id);
        save.player.currency += amount;
      };
      const debit = async (id, amount) => {
        const save = await load(id);
        requireMarket(save.player.currency >= amount, 'You do not have enough Echoes.');
        save.player.currency -= amount;
      };
      const persist = async listing => run('UPDATE market_listings SET status=?,payload=? WHERE id=?',
        [listing.status, JSON.stringify(listing), listing.id]);
      const settle = async listing => {
        if (listing.bidder) {
          await transfer(listing, listing.bidder);
          await credit(listing.seller, listing.currentBid);
          listing.status = 'sold';
        } else {
          await transfer(listing, listing.seller);
          listing.status = 'expired';
        }
        await persist(listing);
      };

      // Resolve expired escrow when the market is visited. Each item is settled once.
      const expired = await run('SELECT payload FROM market_listings WHERE status=? AND expires_at<=? ORDER BY expires_at LIMIT 25', ['active', now]);
      for (const row of expired.rows) await settle(JSON.parse(row.payload));

      if (input?.action === 'create') {
        const { itemType, itemId, listingType, startingPrice, buyoutPrice, duration } = input;
        const title = typeof input.title === 'string' ? input.title.trim() : '';
        const description = typeof input.description === 'string' ? input.description.trim() : '';
        requireMarket(['fusion','orb'].includes(itemType) && ['fixed','auction'].includes(listingType)
          && priceOK(startingPrice) && [6,12,24,48,72].includes(duration)
          && title.length > 0 && title.length <= 100 && description.length <= 800
          && (buyoutPrice == null || (listingType === 'auction' && priceOK(buyoutPrice) && buyoutPrice >= startingPrice)),
        'Enter a valid price, duration, title, and item.');
        const count = await run('SELECT COUNT(*) AS count FROM market_listings WHERE seller=? AND status=?', [owner, 'active']);
        requireMarket(Number(count.rows[0].count) < 15, 'You can have at most 15 active listings.');
        const save = await load(owner);
        const items = save[collection(itemType)];
        const position = items.findIndex(item => item.id === itemId);
        const item = items[position];
        requireMarket(item && (itemType === 'fusion' ? item.playerOwner === save.player.id
          : item.playerId === save.player.id && !item.equippedToFusion && orbCatalog.has(item.orbId)), 'That item is unavailable for sale.');
        if (itemType === 'fusion') {
          // Equipment remains with the seller; the abomination itself goes into escrow.
          for (const orb of save.PlayerOrb) if (orb.equippedToFusion === item.id) orb.equippedToFusion = null;
          item.equippedOrbs = [];
        }
        items.splice(position, 1);
        const expires = now + duration * 3_600_000;
        const listing = { id: randomUUID(), seller: owner, itemType, item, title, description, listingType, startingPrice,
          buyoutPrice: buyoutPrice ?? null, currentBid: 0, status: 'active', expiresAt: new Date(expires).toISOString() };
        await run('INSERT INTO market_listings VALUES (?,?,?,?,?)', [listing.id, owner, listing.status, expires, JSON.stringify(listing)]);
      } else if (input) {
        const { rows } = await run('SELECT payload FROM market_listings WHERE id=? AND status=? AND expires_at>?', [input.listingId ?? '', 'active', now]);
        requireMarket(rows.length, 'This listing is no longer available.');
        const listing = JSON.parse(rows[0].payload);
        if (input.action === 'cancel') {
          requireMarket(listing.seller === owner && !listing.bidder, 'Only the seller can cancel a listing without bids.');
          await transfer(listing, owner);
          listing.status = 'cancelled';
        } else if (input.action === 'bid') {
          requireMarket(listing.seller !== owner && listing.listingType === 'auction' && priceOK(input.amount)
            && input.amount >= listing.startingPrice && input.amount > listing.currentBid
            && (!listing.buyoutPrice || input.amount < listing.buyoutPrice), 'Enter a higher bid below the buyout price.');
          if (listing.bidder) await credit(listing.bidder, listing.currentBid);
          await debit(owner, input.amount);
          listing.bidder = owner;
          listing.currentBid = input.amount;
        } else if (input.action === 'buy') {
          const price = listing.listingType === 'fixed' ? listing.startingPrice : listing.buyoutPrice;
          requireMarket(listing.seller !== owner && priceOK(price), 'This listing cannot be purchased.');
          if (listing.bidder) await credit(listing.bidder, listing.currentBid);
          await debit(owner, price);
          await credit(listing.seller, price);
          await transfer(listing, owner);
          listing.status = 'sold';
        } else throw new MarketError('Unknown market action.');
        await persist(listing);
      }
      for (const id of changed) {
        const save = players.get(id);
        requireMarket(validSave(save), 'The resulting save could not be stored.');
        await run('UPDATE single_player_saves SET payload=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=?', [JSON.stringify(save), id]);
      }

      const publicListing = ({ seller, bidder, item, ...listing }) => ({
        ...listing, sellerId: seller === owner ? 'local-player' : 'other-player', hasBid: Boolean(bidder),
        itemData: listing.itemType === 'fusion'
          ? Object.fromEntries(['fusedName','generatedImage','level','stats','levelBonus','rarity','originType','ascensionLevel']
            .map(field => [field, item[field]]))
          : orbCatalog.get(item.orbId),
      });
      const active = await run('SELECT payload FROM market_listings WHERE status=? AND expires_at>? ORDER BY rowid DESC LIMIT 150', ['active', now]);
      const mine = await run('SELECT payload FROM market_listings WHERE seller=? ORDER BY rowid DESC LIMIT 100', [owner]);
      await transaction.commit();
      const serialize = result => result.rows.map(row => publicListing(JSON.parse(row.payload)));
      return reply(200, { success: true, listings: serialize(active), mine: serialize(mine) });
    } catch (error) {
      if (error instanceof MarketError) return reply(400, { error: error.message });
      console.error('Black Register request failed', error.message);
      return reply(503, { error: 'The Black Register is temporarily unavailable. Try again.' });
    } finally {
      transaction?.close();
    }
  };
}

let handler;
export default request => {
  const { TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: authToken } = process.env;
  if (!url || !authToken) return Response.json({ error: 'Market storage is unavailable.' }, { status: 503 });
  handler ??= marketHandler(createClient({ url, authToken }));
  return handler(request);
};
