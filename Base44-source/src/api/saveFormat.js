export const saveVersion = 1;
export const playerCollections = ['Fusion', 'PlayerOrb', 'Quest', 'Match'];

export function validSave(save) {
  const player = save?.player;
  return save?.version === saveVersion && player?.id === 'local-player' &&
    ['currency', 'voidFragments', 'campaignProgress'].every(key =>
      Number.isSafeInteger(player[key]) && player[key] >= 0) &&
    Array.isArray(player.learnedTalents) && player.learnedTalents.every(name => typeof name === 'string') &&
    playerCollections.every(key => Array.isArray(save[key]) && save[key].every(row =>
      row && typeof row === 'object' && typeof row.id === 'string')) &&
    save.Fusion.every(row => row.playerOwner === player.id && typeof row.fusedName === 'string' &&
      Number.isInteger(row.level) && row.level >= 1 && row.level <= 25 &&
      ['hp', 'attack', 'defense', 'speed'].every(stat => Number.isFinite(row.stats?.[stat]))) &&
    save.PlayerOrb.every(row => row.playerId === player.id && typeof row.orbId === 'string');
}
