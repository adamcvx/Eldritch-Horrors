export const MAX_FUSION_LEVEL = 25;
const costs = [25, 50, 75, 100, 125];

export function ascensionOffer(fusion) {
  const stars = fusion.ascensionLevel ?? 0;
  if (fusion.level !== MAX_FUSION_LEVEL || costs[stars] == null) return null;
  const bonuses = Object.fromEntries(Object.entries(fusion.stats).map(([stat, value]) =>
    [stat, Math.round(value * 0.1)]));
  return { cost: costs[stars], stars: stars + 1, bonuses };
}

export function applyAscension(data, fusionId) {
  const player = data.User[0];
  const fusion = data.Fusion.find(row => row.id === fusionId && row.playerOwner === player.id);
  const offer = fusion && ascensionOffer(fusion);
  if (!offer) throw new Error('Only level 25 abominations with fewer than five stars can ascend.');
  if (player.voidFragments < offer.cost) throw new Error('You need more Void Fragments.');
  fusion.ascensionLevel = offer.stars;
  for (const [stat, bonus] of Object.entries(offer.bonuses)) fusion.stats[stat] += bonus;
  player.voidFragments -= offer.cost;
  return { fusion, voidFragments: player.voidFragments };
}
