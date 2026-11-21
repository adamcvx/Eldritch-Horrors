
import { Talent } from '@/entities/Talent';

// Cache for talents to avoid repeated fetches
let talentsCache = null;
let talentsCacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Retry function with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      let isRateLimit = false; // Initialize here
      // Check for common rate limit indicators in error message or status code (if available)
      if (error.message?.includes('429') || error.message?.toLowerCase().includes('rate limit exceeded')) {
        isRateLimit = true;
      }
      // If error object has a response/status, check that too (e.g., from axios)
      if (error.response && error.response.status === 429) {
        isRateLimit = true; // Ensure this is caught
      }
      
      if (isRateLimit && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 500; // Added random jitter
        console.log(`Rate limit hit or potential API error, retrying in ${delay.toFixed(0)}ms (attempt ${attempt}/${maxRetries}). Error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
};

// Get talents with caching
const getTalentsWithCache = async () => {
  const now = Date.now();
  
  if (talentsCache && talentsCacheTime && (now - talentsCacheTime < CACHE_DURATION)) {
    return talentsCache;
  }
  
  const talents = await retryWithBackoff(() => Talent.list());
  talentsCache = talents;
  talentsCacheTime = now;
  
  return talents;
};

/**
 * Calculate talent bonuses for a fusion based on the player's learned talent names
 * @param {Array} learnedTalentNames - Array of talent names the player has learned
 * @param {Object} baseStats - The base stats of the fusion to calculate percentages from
 * @param {Array} talentsData - Optional pre-fetched talents data to avoid API call
 * @returns {Object} - Talent bonuses object with hp, attack, defense, speed
 */
export const calculateTalentBonuses = async (learnedTalentNames = [], baseStats = {}, talentsData = null) => {
  if (!learnedTalentNames || learnedTalentNames.length === 0) {
    return { hp: 0, attack: 0, defense: 0, speed: 0 };
  }

  try {
    // Use provided talents data or fetch with cache
    const talents = talentsData || await getTalentsWithCache();
    const learnedTalents = talents.filter(talent => learnedTalentNames.includes(talent.name));

    const talentBonus = { hp: 0, attack: 0, defense: 0, speed: 0 };

    for (const talent of learnedTalents) {
      if (talent.statBonus) {
        // Check for global "all_" bonuses
        if (talent.statBonus.all_hp_boost) {
          talentBonus.hp += (baseStats.hp || 0) * talent.statBonus.all_hp_boost;
        }
        if (talent.statBonus.all_attack_boost) {
          talentBonus.attack += (baseStats.attack || 0) * talent.statBonus.all_attack_boost;
        }
        if (talent.statBonus.all_defense_boost) {
          talentBonus.defense += (baseStats.defense || 0) * talent.statBonus.all_defense_boost;
        }
        if (talent.statBonus.all_speed_boost) {
          talentBonus.speed += (baseStats.speed || 0) * talent.statBonus.all_speed_boost;
        }
      }
    }

    // Round the bonuses to avoid floating point issues
    return {
      hp: Math.round(talentBonus.hp),
      attack: Math.round(talentBonus.attack),
      defense: Math.round(talentBonus.defense),
      speed: Math.round(talentBonus.speed)
    };
  } catch (error) {
    console.error('Error calculating talent bonuses:', error);
    return { hp: 0, attack: 0, defense: 0, speed: 0 };
  }
};

/**
 * Calculate ascension bonuses for a fusion based on its ascension level
 * NOTE: This function is deprecated since ascension now modifies base stats directly
 * @param {number} ascensionLevel - The star level of the fusion (0-5)
 * @param {Object} baseStats - The base stats of the fusion to calculate percentages from
 * @returns {Object} - Ascension bonuses object with hp, attack, defense, speed
 */
export const calculateAscensionBonuses = (ascensionLevel = 0, baseStats = {}) => {
  // This function is now deprecated as ascension modifies base stats directly
  return { hp: 0, attack: 0, defense: 0, speed: 0 };
};

/**
 * Calculate the total cost reduction percentage from learned talents
 * @param {Array} learnedTalentNames - Array of talent names the player has learned
 * @param {Array} talentsData - Optional pre-fetched talents data to avoid API call
 * @returns {number} - Total cost reduction percentage (0.1 = 10% reduction)
 */
export const calculateCostReduction = async (learnedTalentNames = [], talentsData = null) => {
  if (!learnedTalentNames || learnedTalentNames.length === 0) {
    return 0;
  }

  try {
    // Use provided talents data or fetch with cache
    const talents = talentsData || await getTalentsWithCache();
    const learnedTalents = talents.filter(talent => learnedTalentNames.includes(talent.name));

    let totalReduction = 0;

    for (const talent of learnedTalents) {
      if (talent.statBonus && talent.statBonus.all_cost_reduction) {
        totalReduction += talent.statBonus.all_cost_reduction;
      }
    }

    return totalReduction;
  } catch (error) {
    console.error('Error calculating cost reduction:', error);
    return 0;
  }
};

/**
 * Apply cost reduction to a base cost and return the effective cost
 * @param {number} baseCost - The original cost in Echoes
 * @param {Array} learnedTalentNames - Array of talent names the player has learned
 * @param {Array} talentsData - Optional pre-fetched talents data to avoid API call
 * @returns {number} - The effective cost after applying reductions (minimum 1)
 */
export const getEffectiveCost = async (baseCost, learnedTalentNames = [], talentsData = null) => {
  if (!baseCost || baseCost <= 0) return 0;

  const reductionPercentage = await calculateCostReduction(learnedTalentNames, talentsData);
  const reducedCost = baseCost * (1 - reductionPercentage);
  
  // Ensure cost never goes below 1 Echo (except for free items)
  return Math.max(1, Math.round(reducedCost));
};

/**
 * Apply talent bonuses to a fusion and return the updated fusion
 * @param {Object} fusion - The fusion to apply bonuses to
 * @param {Array} learnedTalentNames - Array of talent names the player has learned
 * @param {Array} talentsData - Optional pre-fetched talents data to avoid API call
 * @returns {Object} - The fusion with talent bonuses applied
 */
export const applyTalentBonusesToFusion = async (fusion, learnedTalentNames = [], talentsData = null) => {
  const talentBonus = await calculateTalentBonuses(learnedTalentNames, fusion.stats, talentsData);
  
  return {
    ...fusion,
    talentBonus
  };
};

/**
 * Get the effective stats of a fusion (base + level + talent bonuses)
 * Note: Ascension bonuses are now included in base stats directly
 * @param {Object} fusion - The fusion object
 * @returns {Object} - Object with effective hp, attack, defense, speed
 */
export const getEffectiveStats = (fusion) => {
  const baseStats = fusion.stats || {};
  const levelBonus = fusion.levelBonus || {};
  const talentBonus = fusion.talentBonus || {};

  return {
    hp: (baseStats.hp || 0) + (levelBonus.hp || 0) + (talentBonus.hp || 0),
    attack: (baseStats.attack || 0) + (levelBonus.attack || 0) + (talentBonus.attack || 0),
    defense: (baseStats.defense || 0) + (levelBonus.defense || 0) + (talentBonus.defense || 0),
    speed: (baseStats.speed || 0) + (levelBonus.speed || 0) + (talentBonus.speed || 0)
  };
};
