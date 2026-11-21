
import { Orb } from '@/entities/Orb';
import { PlayerOrb } from '@/entities/PlayerOrb';

// Cache for orb data to avoid repeated fetches
let orbCache = new Map();
let orbCacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Lookup full orb data by orb IDs with caching
 * @param {Array|string} orbIds - Single orb ID or array of orb IDs
 * @returns {Object} - Map of orbId -> orb data
 */
export const lookupOrbsById = async (orbIds) => {
  if (!orbIds) return {};
  
  // Normalize input to array
  const idsArray = Array.isArray(orbIds) ? orbIds : [orbIds];
  if (idsArray.length === 0) return {};

  try {
    const now = Date.now();
    const result = {};
    const idsToFetch = [];

    // Check cache first
    for (const id of idsArray) {
      if (orbCache.has(id) && orbCacheTime && (now - orbCacheTime < CACHE_DURATION)) {
        result[id] = orbCache.get(id);
      } else {
        idsToFetch.push(id);
      }
    }

    // Fetch missing orbs
    if (idsToFetch.length > 0) {
      const fetchedOrbs = await Orb.filter({ id: { $in: idsToFetch } });
      
      // Update cache and result
      fetchedOrbs.forEach(orb => {
        orbCache.set(orb.id, orb);
        result[orb.id] = orb;
      });
      
      // Update cache time if we fetched anything
      if (fetchedOrbs.length > 0) {
        orbCacheTime = now;
      }
    }

    return result;
  } catch (error) {
    console.error('Error looking up orbs by ID:', error);
    return {};
  }
};

/**
 * Get full orb data for an array of orb IDs, returned as array
 * @param {Array} orbIds - Array of orb IDs
 * @returns {Array} - Array of orb objects (maintains order when possible)
 */
export const getOrbsByIds = async (orbIds) => {
  if (!Array.isArray(orbIds) || orbIds.length === 0) return [];
  
  const orbMap = await lookupOrbsById(orbIds);
  return orbIds.map(id => orbMap[id]).filter(Boolean);
};

/**
 * Clear the orb cache (useful for admin operations or data refresh)
 */
export const clearOrbCache = () => {
  orbCache.clear();
  orbCacheTime = null;
};

/**
 * Calculate orb slots based on fusion level
 * @param {number} level - The current level of the fusion
 * @returns {number} - Number of orb slots available
 */
export const calculateOrbSlots = (level = 1) => {
  // Base slot + 1 slot every 10 levels
  return 1 + Math.floor((level - 1) / 10);
};

/**
 * Apply orb effects to fusion stats (passive effects)
 * @param {Object} fusion - The fusion object
 * @param {Array} equippedOrbs - Array of equipped orb objects
 * @returns {Object} - Modified stats with orb bonuses applied
 */
export const applyOrbEffectsToStats = (fusion, equippedOrbs = []) => {
  const modifiedStats = { ...fusion.stats };
  
  for (const orb of equippedOrbs) {
    if (orb.orbTrigger !== 'Passive' || orb.orbType !== 'Unstable') continue;
    const { orbStatBenefit: benefit, orbStatDrawback: drawback } = orb;
    if (Object.hasOwn(modifiedStats, benefit)) {
      modifiedStats[benefit] = orb.flatStatBonus
        ? modifiedStats[benefit] + orb.orbBenefitValue
        : Math.round(modifiedStats[benefit] * (1 + orb.orbBenefitValue / 100));
    }
    if (Object.hasOwn(modifiedStats, drawback)) {
      modifiedStats[drawback] = Math.round(modifiedStats[drawback] * (1 - (orb.orbDrawbackValue ?? 0) / 100));
    }
  }

  return modifiedStats;
};

/**
 * Check if an orb synergizes with a fusion's origin type
 * @param {Object} orb - The orb object
 * @param {string} fusionOriginType - The fusion's origin type
 * @returns {boolean} - True if there's synergy
 */
export const hasOriginSynergy = (orb, fusionOriginType) => {
  return orb.originSynergy === fusionOriginType;
};

/**
 * Calculate the effective benefit/drawback values considering synergy
 * @param {Object} orb - The orb object
 * @param {string} fusionOriginType - The fusion's origin type
 * @returns {Object} - Object with effective benefit and drawback values
 */
export const calculateEffectiveOrbValues = (orb, fusionOriginType) => {
  const synergyMultiplier = hasOriginSynergy(orb, fusionOriginType) ? 1.5 : 1.0;
  
  return {
    effectiveBenefit: orb.orbBenefitValue * synergyMultiplier,
    effectiveDrawback: orb.orbDrawbackValue * synergyMultiplier
  };
};

/**
 * Get player's available orbs (owned but not equipped to any fusion)
 * @param {string} playerId - The player's user ID
 * @returns {Array} - Available player orb instances with base orb data
 */
export const getPlayerAvailableOrbs = async (playerId) => {
  try {
    // Get all player orb instances that are unequipped
    const playerOrbs = await PlayerOrb.filter({
      playerId: playerId,
      $or: [
        { equippedToFusion: null },
        { equippedToFusion: { $exists: false } }
      ]
    });

    if (playerOrbs.length === 0) return [];

    // Use the new lookup function to get orb details
    const orbIds = [...new Set(playerOrbs.map(po => po.orbId))];
    const orbsById = await lookupOrbsById(orbIds);

    // Combine player orb instances with base orb data
    const availableOrbs = playerOrbs
      .filter(po => orbsById[po.orbId]) // Only include if base orb exists
      .map(playerOrb => ({
        ...orbsById[playerOrb.orbId], // Base orb data
        playerOrbId: playerOrb.id, // Player orb instance ID for tracking
        isEquipped: false,
        equippedToFusion: null
      }));

    return availableOrbs;
  } catch (error) {
    console.error('Error getting player available orbs:', error);
    return [];
  }
};

/**
 * Get player's equipped orbs for a specific fusion
 * @param {string} playerId - The player's user ID  
 * @param {string} fusionId - The fusion ID
 * @returns {Array} - Equipped orb instances with base orb data
 */
export const getPlayerEquippedOrbs = async (playerId, fusionId) => {
  try {
    // Get player orb instances equipped to this fusion
    const playerOrbs = await PlayerOrb.filter({
      playerId: playerId,
      equippedToFusion: fusionId
    });

    if (playerOrbs.length === 0) return [];

    // Use the new lookup function to get orb details
    const orbIds = playerOrbs.map(po => po.orbId);
    const orbsById = await lookupOrbsById(orbIds);

    // Combine player orb instances with base orb data
    const equippedOrbs = playerOrbs
      .filter(po => orbsById[po.orbId])
      .map(playerOrb => ({
        ...orbsById[playerOrb.orbId], // Base orb data
        playerOrbId: playerOrb.id, // Player orb instance ID for tracking
        isEquipped: true,
        equippedToFusion: playerOrb.equippedToFusion
      }));

    return equippedOrbs;
  } catch (error) {
    console.error('Error getting player equipped orbs:', error);
    return [];
  }
};

/**
 * Equip an orb to a fusion
 * @param {string} playerOrbId - The player orb instance ID
 * @param {string} fusionId - The fusion ID to equip to
 * @returns {boolean} - Success status
 */
export const equipOrbToFusion = async (playerOrbId, fusionId) => {
  try {
    await PlayerOrb.update(playerOrbId, {
      equippedToFusion: fusionId
    });
    return true;
  } catch (error) {
    console.error('Error equipping orb to fusion:', error);
    return false;
  }
};

/**
 * Unequip an orb from a fusion
 * @param {string} playerOrbId - The player orb instance ID
 * @returns {boolean} - Success status
 */
export const unequipOrbFromFusion = async (playerOrbId) => {
  try {
    await PlayerOrb.update(playerOrbId, {
      equippedToFusion: null
    });
    return true;
  } catch (error) {
    console.error('Error unequipping orb from fusion:', error);
    return false;
  }
};

/**
 * Give a player an orb (add to their inventory)
 * @param {string} playerId - The player's user ID
 * @param {string} orbId - The base orb ID to give
 * @returns {Object|null} - The created PlayerOrb instance or null if failed
 */
export const givePlayerOrb = async (playerId, orbId) => {
  try {
    const playerOrb = await PlayerOrb.create({
      playerId: playerId,
      orbId: orbId,
      acquiredDate: new Date().toISOString()
    });
    return playerOrb;
  } catch (error) {
    console.error('Error giving player orb:', error);
    return null;
  }
};

/**
 * DEPRECATED - Use getPlayerAvailableOrbs instead
 * Get all orbs that can be equipped (not already equipped to this fusion)
 * @param {Array} allOrbs - All available orbs
 * @param {Array} equippedOrbIds - Currently equipped orb IDs
 * @returns {Array} - Available orbs for equipping
 */
export const getAvailableOrbs = (allOrbs, equippedOrbIds = []) => {
  console.warn('getAvailableOrbs is deprecated, use getPlayerAvailableOrbs instead');
  return allOrbs.filter(orb => !equippedOrbIds.includes(orb.id));
};

/**
 * Get orb effects that trigger at specific battle events
 * @param {Array} equippedOrbs - Array of equipped orb objects
 * @param {string} triggerEvent - The trigger event to filter by
 * @returns {Array} - Orbs that trigger on this event
 */
export const getOrbsForTrigger = (equippedOrbs, triggerEvent) => {
  if (!Array.isArray(equippedOrbs)) return [];
  return equippedOrbs.filter(orb => orb.orbTrigger === triggerEvent);
};

/**
 * Format orb effect description for display
 * @param {Object} orb - The orb object
 * @param {string} fusionOriginType - Optional fusion origin for synergy display
 * @returns {string} - Formatted description
 */
export const formatOrbDescription = (orb, fusionOriginType = null) => {
  const hasSynergy = fusionOriginType && hasOriginSynergy(orb, fusionOriginType);
  const { effectiveBenefit, effectiveDrawback } = calculateEffectiveOrbValues(orb, fusionOriginType);
  
  let description = orb.description;
  
  // Replace placeholders with actual values
  description = description.replace(/\{benefit\}/g, `${effectiveBenefit}`);
  description = description.replace(/\{drawback\}/g, `${effectiveDrawback}`);

  description = description.replace(/\ {stat1\}/g, `${orb.orbStatBenefit}`);
  description = description.replace(/\ {stat2\}/g, `${orb.orbStatDrawback}`);
  
  if (hasSynergy) {
    description += ` (Enhanced by ${fusionOriginType} synergy!)`;
  }
  
  return description;
};

/**
 * Process OnAttack orb triggers during battle
 * @param {Object} params - Parameters object
 * @param {Array} params.attackerOrbs - Attacking fusion's equipped orbs
 * @param {Object} params.attackerFusion - The attacking fusion object
 * @param {Object} params.targetFusion - The target fusion object
 * @param {number} params.baseDamage - The base damage before orb effects
 * @param {number} params.targetCurrentHp - Target's current HP
 * @param {number} params.targetMaxHp - Target's maximum HP
 * @param {Array} params.logs - Current battle logs array (will be modified)
 * @returns {Object} - Object with modified damage and any healing applied
 */
export const processOnAttackTriggers = ({
  attackerOrbs = [],
  attackerFusion,
  targetFusion,
  baseDamage,
  targetCurrentHp,
  targetMaxHp,
  logs
}) => {
  attackerOrbs = Array.isArray(attackerOrbs) ? attackerOrbs : [];   // ✅ Safety
  const onAttackOrbs = getOrbsForTrigger(attackerOrbs, 'OnAttack');
  let finalDamage = baseDamage;
  let healingApplied = 0;
  const triggerLogs = []; // Local logs array

  onAttackOrbs.forEach(orb => {
    const { effectiveBenefit, effectiveDrawback } = calculateEffectiveOrbValues(orb, attackerFusion.originType);
    
    switch (orb.orbType) {      
      case 'Parasitic':
        // Lifesteal healing
        const lifestealAmount = Math.round(baseDamage * (effectiveBenefit / 100));
        healingApplied += lifestealAmount;
          if (healingApplied > 0) {
            triggerLogs.push({
                turn: 0,
                actor: attackerFusion.id,
                action: orb.name,
                result: ` ${attackerFusion.fusedName} drains ${lifestealAmount} hp from ${targetFusion.fusedName} with ${orb.name}!`
            });
          }
      break;
    }
  });

  return { finalDamage, healingApplied, logs: triggerLogs };
};

/**
 * Process OnTurnEnd orb triggers during battle
 * @param {Object} params - Parameters object
 * @param {Array} params.fusionOrbs - The fusion's equipped orbs
 * @param {Object} params.fusion - The fusion object
 * @param {Object} params.targetFusion - The target fusion object
 * @param {number} params.currentHp - Current HP of the fusion
 * @param {number} params.maxHp - Maximum HP of the fusion
 * @param {Array} params.logs - Current battle logs array (will be modified)
 * @returns {Object} - Object with HP changes and effects applied
 */
export const processOnTurnEndTriggers = ({
  fusionOrbs = [],
  fusion,
  targetFusion,
  currentHp,
  maxHp,
  logs
}) => {
  fusionOrbs = Array.isArray(fusionOrbs) ? fusionOrbs : [];   // ✅ Safety
  const onTurnEndOrbs = getOrbsForTrigger(fusionOrbs, 'OnTurnEnd');
  let hpChange = 0;
  let statusEffects = [];
  const triggerLogs = []; // Local logs array

  onTurnEndOrbs.forEach(orb => {
    const { effectiveBenefit, effectiveDrawback } = calculateEffectiveOrbValues(orb, fusion.originType);
    
    switch (orb.orbType) {      
      case 'Chaos':
        // Apply debuff effects
        if (effectiveBenefit > 0) {
          statusEffects.push({
            type: 'debuff',
            name: orb.name,
            effect: 'Eldritch Curse',
            value: effectiveBenefit,
            turnsLeft: 2,
            chance: orb.orbDrawbackValue || 0  // <-- % chance comes from orb
          });
        }
        break;
    }
  });

  return { hpChange, statusEffects, logs: triggerLogs };
};

/**
 * Process OnStart orb triggers at the beginning of battle
 * @param {Object} params - Parameters object
 * @param {Array} params.fusionOrbs - The fusion's equipped orbs
 * @param {Object} params.fusion - The fusion object
 * @param {Array} params.logs - Current battle logs array (will be modified)
 * @returns {Object} - Object with initial effects applied
 */
export const processOnStartTriggers = ({
  fusionOrbs = [],
  fusion,
  logs
}) => {
  fusionOrbs = Array.isArray(fusionOrbs) ? fusionOrbs : [];   // ✅ Safety
  const onStartOrbs = getOrbsForTrigger(fusionOrbs, 'OnTurnStart');
  let hpChange = 0;
  let statusEffects = [];
  const triggerLogs = []; // Local logs array

  onStartOrbs.forEach(orb => {
    const { effectiveBenefit } = calculateEffectiveOrbValues(orb, fusion.originType);
    
    switch (orb.orbType) {
      case 'immunity':
        // Grant immunity to first debuff
        statusEffects.push({
          type: 'buff',
          name: orb.name,
          effect: 'Eldritch Caraprice',
          value: effectiveBenefit,
          turnsLeft: 2
        });
      break;
    }
  });

  return { hpChange, statusEffects, logs: triggerLogs };
};

/**
 * Process OnHit orb triggers when taking damage
 * @param {Object} params - Parameters object
 * @param {Array} params.defenderOrbs - Defending fusion's equipped orbs
 * @param {Object} params.defenderFusion - The defending fusion object
 * @param {Object} params.attackerFusion - The attacking fusion object
 * @param {number} params.incomingDamage - The incoming damage amount
 * @param {Array} params.logs - Current battle logs array (will be modified)
 * @returns {Object} - Object with damage reduction and counter effects
 */
export const processOnHitTriggers = ({
  defenderOrbs = [],
  defenderFusion,
  attackerFusion,
  incomingDamage,
  logs
}) => {
  defenderOrbs = Array.isArray(defenderOrbs) ? defenderOrbs : [];   // ✅ Safety
  const onHitOrbs = getOrbsForTrigger(defenderOrbs, 'OnHit');
  let damageReduction = 0;
  let counterDamage = 0;
  const triggerLogs = []; // Local logs array

  onHitOrbs.forEach(orb => {
    const { effectiveBenefit } = calculateEffectiveOrbValues(orb, defenderFusion.originType);
    
    switch (orb.orbType) {
      case 'immunity':
        // Reduce incoming damage
        const reduction = Math.round(incomingDamage * (effectiveBenefit / 100));
        damageReduction += reduction;
      break;
    }
  });

  return { damageReduction, counterDamage, logs: triggerLogs };
};
