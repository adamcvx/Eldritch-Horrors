import { horrors, relics } from '../../../game.mjs';
import { conjureName, upgradeFusionName } from './fusionIdentity.js';
import catalog from './base44Catalog.json';
import { cloudEnabled, loadCloudSave, storeCloudSave, packSave } from './cloudSave.js';
import { validSave, playerCollections } from './saveFormat.js';

const saveKey = 'eldritch-base44-preview-v1';
const playerId = 'local-player';
const stamp = '2026-01-01T00:00:00.000Z';
const starterAbility = {
  id: 'local-eldritch-strike', name: 'Eldritch Strike', type: 'attack',
  power: 1, cooldown: 0, turnLength: 0, effect: 'Strike the opposing horror.',
};
const fields = ['hp', 'attack', 'defense', 'speed'];
const toStats = values => Object.fromEntries(fields.map((field, index) => [field, values[index]]));
const starterRows = horrors.map((horror, index) => ({
  id: 'starter-' + index, name: horror.name, origin: horror.origin,
  description: horror.description, baseStats: toStats(horror.stats),
  image: '/Artwork/' + encodeURIComponent(horror.origin + '.png'),
}));
const imageFor = type => starterRows[horrors.findIndex(horror => horror.type === type)]?.image;
const orbRows = relics.map((relic, index) => ({
  id: 'local-orb-' + index, name: relic.name, description: relic.text,
  rarity: 'Ephemeral', orbType: 'Unstable', orbStatBenefit: fields[index + 1],
  orbBenefitValue: relic.bonus[index + 1], orbTrigger: 'Passive', costToEquip: 0, flatStatBonus: true,
}));

const legacyTalentRow = {
  id: 'local-talent', name: 'Whispers Below', description: 'Gain 8% to stats and reduce costs by 20%.',
  tier: 1, tree: 'Offense', cost: 15, icon: 'Sparkles', dependencies: [],
  statBonus: { all_hp_boost: .08, all_attack_boost: .08, all_defense_boost: .08, all_speed_boost: .08, all_cost_reduction: .20 },
};

function initialData(includePrototype = true) {
  let old;
  try {
    const candidate = includePrototype ? JSON.parse(localStorage.getItem('eldritch-horrors-v1')) : null;
    if (candidate?.version === 1 && Array.isArray(candidate.creatures)) old = candidate;
  } catch {
    // Start with the default local player if the earlier save is unavailable.
  }
  const player = {
    id: playerId, email: 'local-player@example.invalid', full_name: 'Local Cultist', displayName: 'Local Cultist',
    wins: 0, losses: 0, casualWins: 0, casualLosses: 0, rankedWins: 0, rankedLosses: 0,
    rankingPoints: 1000, rank: 'Initiate',
    role: 'user', currency: old?.echoes ?? 350, voidFragments: old?.fragments ?? 0,
    campaignProgress: old?.stage ?? 0, learnedTalents: old?.talent ? ['Whispers Below'] : [],
    hasSeenTutorial: true,
  };
  const collection = (old?.creatures ?? []).map(creature => ({
    id: creature.id, fusedName: creature.name, playerOwner: playerId,
    parents: creature.parents.map(name => starterRows.find(horror => horror.name === name)?.id).filter(Boolean),
    generatedImage: imageFor(creature.type), originType: creature.type, rarity: 'Ephemeral',
    stats: toStats(creature.stats.map(value => creature.ascended ? value + Math.round(value * .10) : value)),
    level: creature.level, abilities: [], ascensionLevel: creature.ascended ? 1 : 0,
    levelBonus: toStats(creature.stats.map(value => Math.max(1, Math.round(value * .02)) * (creature.level - 1))),
    created_date: stamp,
  }));
  return {
    User: [player],
    Fusion: collection,
    PlayerOrb: (old?.owned ?? []).map(index => ({
      id: 'owned-orb-' + index, playerId, orbId: orbRows[index]?.id,
      equippedToFusion: old.creatures.find(creature => (creature.orbs ?? [creature.relic]).includes(index))?.id ?? null,
    })),
  };
}

const catalogVersion = 4;
const localTalents = catalog.Talent.map(talent => talent.name === 'Echo Mastery'
  ? { ...talent, dependencies: talent.dependencies.filter(name => name !== 'Echoes of the Void') }
  : talent);

function upgradeCatalog(data) {
  if (data.catalogVersion === catalogVersion) return data;
  const ownedOrbs = new Set((data.PlayerOrb ?? []).map(orb => orb.orbId));
  const legacyFusions = (data.Fusion ?? []).filter(fusion => !['local-campaign', 'base44-campaign'].includes(fusion.playerOwner));
  const existingAbility = legacyFusions.some(fusion => fusion.abilities?.includes(starterAbility.id));
  const legacyTalent = data.User.some(user => user.learnedTalents?.includes('Whispers Below'));
  return {
    ...data,
    ...catalog,
    catalogVersion,
    User: data.User.map(user => {
      if (data.catalogVersion || !user.campaignProgress) return user;
      // Stage numbers from the four-stage prototype do not identify Base44 stages.
      return { ...user, prototypeCampaignProgress: user.campaignProgress, campaignProgress: 0 };
    }),
    Horror: starterRows,
    Fusion: [...legacyFusions.map(upgradeFusionName), ...catalog.Fusion],
    Ability: existingAbility ? [...catalog.Ability, starterAbility] : catalog.Ability,
    Orb: [...catalog.Orb, ...orbRows.filter(orb => ownedOrbs.has(orb.id))],
    Talent: legacyTalent ? [...localTalents, legacyTalentRow] : localTalents,
  };
}

function readBrowserSave() {
  const stored = localStorage.getItem(saveKey);
  const data = stored ? JSON.parse(stored) : initialData();
  if (data.catalogVersion === catalogVersion) return data;
  const upgraded = upgradeCatalog(data);
  localStorage.setItem(saveKey, JSON.stringify(upgraded));
  return upgraded;
}

let cloudData;
let loadingCloud;
let pendingWrite = Promise.resolve();

function unpackSave(save) {
  if (!validSave(save)) throw new Error('The save file is invalid or from an unsupported version.');
  const data = { catalogVersion: -1, User: [{ ...save.player, role: 'user' }] };
  for (const field of playerCollections) data[field] = save[field];
  return upgradeCatalog(data);
}

function ensureCloudSave() {
  if (!cloudEnabled || cloudData) return Promise.resolve();
  loadingCloud ??= loadCloudSave().then(save => {
    cloudData = save ? unpackSave(save) : upgradeCatalog(initialData(false));
  }).finally(() => { loadingCloud = undefined; });
  return loadingCloud;
}

function read() {
  return cloudEnabled ? structuredClone(cloudData) : readBrowserSave();
}

function write(change) {
  if (!cloudEnabled) {
    const data = readBrowserSave();
    const result = change(data);
    localStorage.setItem(saveKey, JSON.stringify(data));
    return result;
  }
  const result = pendingWrite.then(async () => {
    await ensureCloudSave();
    const data = read();
    const value = change(data);
    await storeCloudSave(packSave(data));
    cloudData = data;
    return value;
  });
  pendingWrite = result.catch(() => {});
  return result;
}

export async function exportPlayerSave() {
  await ensureCloudSave();
  await pendingWrite;
  return packSave(read());
}

function matches(row, query) {
  return Object.entries(query).every(([key, expected]) => {
    const value = row[key] ?? null;
    if (expected && typeof expected === 'object') {
      return Object.entries(expected).every(([operator, operand]) => {
        switch (operator) {
          case '$in': return operand.includes(value);
          case '$ne': return value !== operand;
          case '$gte': return value >= operand;
          case '$gt': return value > operand;
          case '$lte': return value <= operand;
          case '$lt': return value < operand;
          default: return false;
        }
      });
    }
    return value === expected;
  });
}

function entity(name) {
  const find = async (query, sort, limit, skip = 0) => {
    await ensureCloudSave();
    await pendingWrite;
    const rows = (read()[name] ?? []).filter(row => matches(row, query));
    if (sort) {
      const descending = sort.startsWith('-');
      const key = descending ? sort.slice(1) : sort;
      rows.sort((a, b) => (descending ? -1 : 1) * (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0));
    }
    return rows.slice(skip, limit == null ? undefined : skip + limit);
  };
  const addRows = rows => write(data => {
    const records = rows.map(row => ({
      ...(name === 'Fusion' ? { level: 1, levelBonus: toStats([0, 0, 0, 0]) } : {}),
      ...row, id: crypto.randomUUID(), created_date: new Date().toISOString(), created_by: 'local-player@example.invalid',
    }));
    (data[name] ??= []).push(...records);
    return records;
  });
  return {
    list: (sort, limit, skip) => find({}, sort, limit, skip),
    filter: find,
    create: async row => (await addRows([row]))[0],
    bulkCreate: async rows => addRows(rows),
    update: async (id, change) => write(data => {
      const row = data[name]?.find(entry => entry.id === id);
      if (!row) throw new Error(name + ' record not found');
      return Object.assign(row, change, { id });
    }),
    delete: async id => write(data => {
      data[name] = (data[name] ?? []).filter(row => row.id !== id);
    }),
  };
}

export const unavailableLocally = async () => {
  throw new Error('This feature requires a connected backend and is unavailable in the local preview.');
};

const user = entity('User');
const auth = {
  ...user,
  me: async () => {
    await ensureCloudSave();
    await pendingWrite;
    return read().User[0];
  },
  isAuthenticated: async () => true,
  updateMyUserData: change => user.update(playerId, change),
  logout: () => { window.location.assign('/'); },
  login: () => { window.location.assign('/fusionlab'); },
  redirectToLogin: () => { window.location.assign('/fusionlab'); },
};

export const localBase44 = {
  auth,
  entities: new Proxy({}, { get: (_, name) => entity(name) }),
  integrations: { Core: {
    InvokeLLM: async ({ prompt }) => {
      const parents = starterRows.filter(horror => prompt.includes(horror.name));
      if (parents.length !== 2 || !prompt.includes('fusion of two abominations')) return unavailableLocally();
      return { name: conjureName(parents[0].name, parents[1].name) };
    },
    GenerateImage: async ({ prompt }) => {
      const parents = starterRows.filter(horror => prompt.includes(horror.name));
      if (parents.length !== 2 || !prompt.includes('eldritch abomination named')) return unavailableLocally();
      return { url: parents[0].image };
    },
    UploadFile: unavailableLocally,
    ExtractDataFromUploadedFile: unavailableLocally,
    SendEmail: unavailableLocally,
    SendSMS: unavailableLocally,
  }},
  appLogs: { logUserInApp: async () => {} },
};
