
import { Orb } from '@/entities/Orb';
import { getGlobalEconomySettings } from '../user/UserService';

/**
 * LootService - Handles all loot generation and randomization
 * Separated from UI to make it easy to manage drop rates and loot tables
 */

// Base loot configuration - can be expanded later
const LOOT_CONFIG = {
  // Base drop rates (0-1, where 1 = 100% chance)
  baseDropRates: {
    echoes: 1.0, // Always drop some echoes
    fragments: 0.15, // 15% chance for fragments
    orbs: 0.08, // 8% chance for orbs
  },
  
  // Multipliers based on battle type
  battleTypeMultipliers: {
    casual: {
      echoes: 1.0,
      fragments: 0.5, // Reduced fragment chance in casual
      orbs: 0.7, // Slightly reduced orb chance in casual
    },
    ranked: {
      echoes: 1.2,
      fragments: 1.0,
      orbs: 1.0,
    },
    campaign: {
      echoes: 1.1,
      fragments: 2.0, // Campaign gives more fragment chances
      orbs: 1.3, // Better orb chances in campaign
    }
  },
  
  // Victory vs defeat multipliers
  victoryMultipliers: {
    echoes: 1.0, // Victory echoes handled by economy settings
    fragments: 1.0,
    orbs: 1.0,
  },
  
  defeatMultipliers: {
    echoes: 1.0, // Defeat echoes handled by economy settings  
    fragments: 0.3, // Much lower fragment chance on defeat
    orbs: 0.5, // Lower orb chance on defeat
  }
};

/**
 * Generate random loot based on battle parameters
 * @param {Object} params - Battle parameters
 * @param {string} params.battleType - 'casual', 'ranked', or 'campaign'
 * @param {boolean} params.isVictory - Whether the player won
 * @param {Object} params.economySettings - Current economy settings
 * @param {Object} params.baseRewards - Base rewards from battle (echoes from economy)
 * @returns {Object} Generated loot object
 */
export const generateBattleLoot = async (params) => {
  const { battleType = 'casual', isVictory = true, economySettings, baseRewards = {} } = params;
  
  try {
    const loot = {
      echoes: baseRewards.echoes || 0, // Start with base economy rewards
      fragments: 0,
      orbs: [],
      bonusEchoes: 0 // Extra echoes from loot rolls
    };

    // Get multipliers for this battle type and outcome
    const typeMultipliers = LOOT_CONFIG.battleTypeMultipliers[battleType] || LOOT_CONFIG.battleTypeMultipliers.casual;
    const outcomeMultipliers = isVictory ? LOOT_CONFIG.victoryMultipliers : LOOT_CONFIG.defeatMultipliers;

    // Calculate effective drop rates
    const effectiveDropRates = {
      echoes: LOOT_CONFIG.baseDropRates.echoes * typeMultipliers.echoes * outcomeMultipliers.echoes,
      fragments: LOOT_CONFIG.baseDropRates.fragments * typeMultipliers.fragments * outcomeMultipliers.fragments,
      orbs: LOOT_CONFIG.baseDropRates.orbs * typeMultipliers.orbs * outcomeMultipliers.orbs,
    };

    // Roll for bonus echoes (small chance for extra currency)
    if (Math.random() < effectiveDropRates.echoes * 0.2) { // 20% of echo drop rate
      const bonusAmount = Math.floor(Math.random() * 15) + 5; // 5-20 bonus echoes
      loot.bonusEchoes = bonusAmount;
    }

    // Roll for fragments
    if (Math.random() < effectiveDropRates.fragments) {
      const fragmentAmount = battleType === 'campaign' ? 
        Math.floor(Math.random() * 3) + 2 : // 2-4 fragments from campaign
        Math.floor(Math.random() * 2) + 1;   // 1-2 fragments from other battles
      loot.fragments = fragmentAmount;
    }

    // Roll for orbs
    if (Math.random() < effectiveDropRates.orbs) {
      const droppedOrb = await rollForOrb(battleType, isVictory);
      if (droppedOrb) {
        loot.orbs.push(droppedOrb);
      }
    }

    return loot;

  } catch (error) {
    console.error('Error generating battle loot:', error);
    // Return safe fallback
    return {
      echoes: baseRewards.echoes || 0,
      fragments: 0,
      orbs: [],
      bonusEchoes: 0
    };
  }
};

/**
 * Roll for a random orb drop
 * @param {string} battleType - Type of battle
 * @param {boolean} isVictory - Whether the player won
 * @returns {Object|null} Orb object or null
 */
const rollForOrb = async (battleType, isVictory) => {
  try {
    // Get all available orbs
    const allOrbs = await Orb.list();
    if (allOrbs.length === 0) return null;

    // Define rarity weights based on battle type and outcome
    const rarityWeights = getRarityWeights(battleType, isVictory);
    
    // Filter orbs by rarity and select randomly
    const selectedRarity = selectWeightedRarity(rarityWeights);
    const orbsOfRarity = allOrbs.filter(orb => orb.rarity === selectedRarity);
    
    if (orbsOfRarity.length === 0) {
      // Fallback to any orb if no orbs of selected rarity exist
      return allOrbs[Math.floor(Math.random() * allOrbs.length)];
    }

    return orbsOfRarity[Math.floor(Math.random() * orbsOfRarity.length)];

  } catch (error) {
    console.error('Error rolling for orb:', error);
    return null;
  }
};

/**
 * Get rarity weights based on battle context
 * @param {string} battleType - Type of battle
 * @param {boolean} isVictory - Whether the player won
 * @returns {Object} Rarity weights object
 */
const getRarityWeights = (battleType, isVictory) => {
  const baseWeights = {
    'Ephemeral': 50,
    'Uncanny': 30,
    'Abyssal': 15,
    'Cosmic': 4,
    'Outer': 1
  };

  // Adjust weights based on battle type
  const typeAdjustments = {
    casual: { multiplier: 1.0 },
    ranked: { 
      'Ephemeral': 0.8,
      'Uncanny': 1.1,
      'Abyssal': 1.2,
      'Cosmic': 1.3,
      'Outer': 1.5
    },
    campaign: {
      'Ephemeral': 0.7,
      'Uncanny': 1.0,
      'Abyssal': 1.4,
      'Cosmic': 1.6,
      'Outer': 2.0
    }
  };

  // Adjust weights based on victory/defeat
  const outcomeAdjustments = isVictory ? {
    'Cosmic': 1.2,
    'Outer': 1.5
  } : {
    'Ephemeral': 1.3,
    'Uncanny': 1.1,
    'Abyssal': 0.8,
    'Cosmic': 0.6,
    'Outer': 0.4
  };

  // Apply adjustments
  const adjustedWeights = { ...baseWeights };
  const typeAdj = typeAdjustments[battleType] || {};
  
  Object.keys(adjustedWeights).forEach(rarity => {
    if (typeAdj[rarity]) {
      adjustedWeights[rarity] *= typeAdj[rarity];
    }
    if (outcomeAdjustments[rarity]) {
      adjustedWeights[rarity] *= outcomeAdjustments[rarity];
    }
  });

  return adjustedWeights;
};

/**
 * Select a rarity based on weighted probabilities
 * @param {Object} weights - Rarity weights object
 * @returns {string} Selected rarity
 */
const selectWeightedRarity = (weights) => {
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const [rarity, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) {
      return rarity;
    }
  }
  
  // Fallback to most common rarity
  return 'Ephemeral';
};

/**
 * Generate campaign-specific loot (for campaign victories)
 * @param {Object} params - Campaign parameters
 * @param {number} params.stageNumber - Stage number completed
 * @param {boolean} params.isBoss - Whether this was a boss stage
 * @param {boolean} params.isFinalBoss - Whether this was the final boss
 * @param {number} params.baseShards - Base shard reward from stage
 * @param {number} params.baseFragments - Base fragment reward from stage
 * @returns {Object} Campaign loot object
 */
export const generateCampaignLoot = async (params) => {
  const { stageNumber, isBoss, isFinalBoss, baseShards, baseFragments } = params;
  
  try {
    const loot = {
      echoes: baseShards || 0,
      fragments: baseFragments || 0,
      orbs: [],
      bonusEchoes: 0
    };

    // Bonus loot chances increase with stage number
    const stageMultiplier = Math.min(1 + (stageNumber * 0.1), 2.0); // Max 2x multiplier

    // Boss stages have better loot chances
    const bossMultiplier = isBoss ? (isFinalBoss ? 3.0 : 2.0) : 1.0;

    // Roll for bonus echoes
    if (Math.random() < 0.3 * stageMultiplier * bossMultiplier) {
      loot.bonusEchoes = Math.floor((Math.random() * 20 + 10) * bossMultiplier);
    }

    // Roll for bonus fragments (only for non-boss stages since bosses already give fragments)
    if (!isBoss && Math.random() < 0.15 * stageMultiplier) {
      loot.fragments += Math.floor(Math.random() * 2) + 1;
    }

    // Roll for orbs
    // Guaranteed orb drop for bosses, small chance for regular stages
    let shouldDropOrb = false;
    if (isBoss) {
      shouldDropOrb = true; 
    } else {
      const nonBossOrbChance = 0.05 * stageMultiplier; // 5% base chance, scaled by stage
      if (Math.random() < nonBossOrbChance) {
        shouldDropOrb = true;
      }
    }

    if (shouldDropOrb) {
      const orb = await rollForOrb('campaign', true);
      if (orb) {
        loot.orbs.push(orb);
      }
    }

    // Final boss gets guaranteed extra loot
    if (isFinalBoss) {
      loot.bonusEchoes += 50;
      loot.fragments += 3;
      // Note: The guaranteed orb drop is handled above by the 'isBoss' check.
      // No need for a second roll here to avoid duplicate orbs.
    }

    return loot;

  } catch (error) {
    console.error('Error generating campaign loot:', error);
    return {
      echoes: baseShards || 0,
      fragments: baseFragments || 0,
      orbs: [],
      bonusEchoes: 0
    };
  }
};

/**
 * Format loot for display in UI components
 * @param {Object} loot - Loot object from generation functions
 * @returns {Object} Formatted loot for UI display
 */
export const formatLootForDisplay = (loot) => {
  return {
    totalEchoes: loot.echoes + loot.bonusEchoes,
    baseEchoes: loot.echoes,
    bonusEchoes: loot.bonusEchoes,
    fragments: loot.fragments,
    orbs: loot.orbs,
    hasBonus: loot.bonusEchoes > 0 || loot.orbs.length > 0
  };
};

export const getCampaignReplayFragments = stage => stage.isBoss ? Math.floor((stage.rewardFragments || 0) / 2) : 0;
