export const horrors = [
  {
    "name": "Veil Serpent",
    "type": "Dimension",
    "origin": "Fomalhaut",
    "description": "A serpentine abomination woven from shadows and echoes of forgotten screams.",
    "stats": [
      55,
      45,
      40,
      25
    ],
    "strongAgainst": "Void"
  },
  {
    "name": "Gibbering Shambler",
    "type": "Flesh",
    "origin": "Flesh Pits",
    "description": "An amorphous mass of flesh and mouths that constantly whispers maddening secrets.",
    "stats": [
      80,
      20,
      40,
      10
    ],
    "strongAgainst": "Sunken"
  },
  {
    "name": "Dream-Eater",
    "type": "Dream",
    "origin": "Dreamlands",
    "description": "A being of living nightmare that feeds on the sanity of sleeping minds.",
    "stats": [
      55,
      35,
      15,
      50
    ],
    "strongAgainst": "Flesh"
  },
  {
    "name": "Deep Lurker",
    "type": "Sunken",
    "origin": "Sunken City",
    "description": "An amphibious terror from a forgotten city beneath the waves, covered in phosphorescent eyes.",
    "stats": [
      75,
      30,
      35,
      15
    ],
    "strongAgainst": "Dimension"
  },
  {
    "name": "Faceless Watcher",
    "type": "Void",
    "origin": "The Void",
    "description": "A silent observer from the spaces between stars, its presence instills a creeping dread.",
    "stats": [
      60,
      25,
      20,
      40
    ],
    "strongAgainst": "Dream"
  }
];

export const relics = [
  { name: 'Bloodglass Orb', text: '+12 Attack', bonus: [0, 12, 0, 0], cost: 90 },
  { name: 'Chitin Seal', text: '+12 Defense', bonus: [0, 0, 12, 0], cost: 90 },
  { name: 'Sleepless Eye', text: '+12 Speed', bonus: [0, 0, 0, 12], cost: 90 },
];

export const stages = [
  { name: 'The Drowned Gate', type: 'Sunken', stats: [75, 26, 24, 18], reward: 55 },
  { name: 'The Hollow Choir', type: 'Dream', stats: [112, 36, 30, 43], reward: 90 },
  { name: 'The Skin Cathedral', type: 'Flesh', stats: [150, 48, 55, 26], reward: 135 },
  { name: 'The Lightless Throne', type: 'Void', stats: [208, 64, 61, 66], reward: 200 },
];

export const fusionCost = 100;
export const ascensionCost = 10;
export const talentCost = 15;
export const maxLevel = 25;
export const orbUnlockLevels = [1, 11, 21];
export const levelCost = (creature, talent = false) => {
  const base = creature.level * 10;
  return talent ? Math.ceil(base * 0.8) : base;
};
export const equippedOrbs = creature => creature.orbs ?? [creature.relic ?? null];

export function today(date = new Date()) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-');
}

export function newGame() {
  return { version: 1, echoes: 350, fragments: 0, creatures: [], owned: [], stage: 0, talent: false, daily: { day: today(), wins: 0, claimed: false } };
}

export function strongAgainst(type) {
  return horrors.find(horror => horror.type === type)?.strongAgainst;
}

export function previewFusion(first, second) {
  return {
    name: first.type + '–' + second.type + ' Abomination',
    type: first.type,
    parents: [first.name, second.name],
    stats: first.stats.map((value, index) => Math.round((value + second.stats[index]) * 0.65)),
    level: 1,
    ascended: false,
    relic: null,
  };
}

export function effectiveStats(creature, talent) {
  const equipment = equippedOrbs(creature);
  return creature.stats.map((base, index) => {
    const training = (creature.level - 1) * Math.max(1, Math.ceil(base * 0.02));
    const ascension = creature.ascended ? 1.1 : 1;
    const knowledge = talent ? 1.08 : 1;
    const bonus = equipment.reduce((total, orb) => total + (relics[orb]?.bonus[index] ?? 0), 0);
    return Math.round((base + training) * ascension * knowledge) + bonus;
  });
}

export function battle(creature, enemy, talent) {
  const [health, attack, defense, speed] = effectiveStats(creature, talent);
  const [enemyHealth, enemyAttack, enemyDefense, enemySpeed] = enemy.stats;
  const hit = (power, speed, armor, advantage) => Math.max(5, Math.round((power + speed * 0.35 - armor * 0.45) * (advantage ? 1.25 : 1)));
  const dealt = hit(attack, speed, enemyDefense, strongAgainst(creature.type) === enemy.type);
  const taken = hit(enemyAttack, enemySpeed, defense, strongAgainst(enemy.type) === creature.type);
  const rounds = Math.ceil(enemyHealth / dealt);
  return { won: rounds <= Math.ceil(health / taken), rounds: Math.min(rounds, Math.ceil(health / taken)), dealt, taken };
}
