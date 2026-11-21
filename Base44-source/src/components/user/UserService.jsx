
import { User } from '@/entities/User';
import { EconomySettings } from '@/entities/EconomySettings';

/**
 * Ensures a user has all the required default values from the User entity schema
 * This is called when a user first logs in to populate missing fields
 */
export const ensureUserDefaults = async (user) => {
  const requiredDefaults = {
    wins: 0,
    losses: 0,
    casualWins: 0,
    casualLosses: 0,
    rankedWins: 0,
    rankedLosses: 0,
    rankingPoints: 1000,
    rank: "Initiate",
    currency: 150,
    voidFragments: 0, // Added voidFragments default
    campaignProgress: 0,
    learnedTalents: [],
    hasSeenTutorial: false
  };

  // Check if user needs default values
  const needsUpdate = Object.keys(requiredDefaults).some(key => {
    return user[key] === undefined || user[key] === null;
  });

  if (needsUpdate) {
    const updateData = {};
    
    // Only add missing fields
    Object.keys(requiredDefaults).forEach(key => {
      if (user[key] === undefined || user[key] === null) {
        updateData[key] = requiredDefaults[key];
      }
    });

    if (Object.keys(updateData).length > 0) {
      await User.updateMyUserData(updateData);
      
      // Return updated user object
      return { ...user, ...updateData };
    }
  }

  return user;
};

/**
 * Gets the current user and ensures they have all default values
 */
export const getCurrentUserWithDefaults = async () => {
  try {
    const user = await User.me();
    return await ensureUserDefaults(user);
  } catch (error) {
    throw error; // Re-throw for authentication errors
  }
};

/**
 * Gets the global economy settings from the EconomySettings entity
 * Falls back to default values if no settings found
 */
export const getGlobalEconomySettings = async () => {
  const defaultSettings = {
    talentRefundPercentage: 0.5,
    fusionRefundAmount: 25,
    dailyQuestMultiplier: 1.0,
    fusionCost: 50,
    fusionLevelingRefundRate: 0.5,
    casualWinReward: 5,
    casualLossReward: 2,
    rankedWinReward: 15,
    rankedLossReward: 5,
    campaignBossRewardFragments: 5 // New default setting
  };

  try {
    // Try to get global economy settings
    const globalSettings = await EconomySettings.filter({ settingName: 'global' });
    
    if (globalSettings.length > 0) {
      // Return the first (and should be only) global settings record
      const settings = globalSettings[0];
      return {
        talentRefundPercentage: settings.talentRefundPercentage ?? defaultSettings.talentRefundPercentage,
        fusionRefundAmount: settings.fusionRefundAmount ?? defaultSettings.fusionRefundAmount,
        dailyQuestMultiplier: settings.dailyQuestMultiplier ?? defaultSettings.dailyQuestMultiplier,
        fusionCost: settings.fusionCost ?? defaultSettings.fusionCost,
        fusionLevelingRefundRate: settings.fusionLevelingRefundRate ?? defaultSettings.fusionLevelingRefundRate,
        casualWinReward: settings.casualWinReward ?? defaultSettings.casualWinReward,
        casualLossReward: settings.casualLossReward ?? defaultSettings.casualLossReward,
        rankedWinReward: settings.rankedWinReward ?? defaultSettings.rankedWinReward,
        rankedLossReward: settings.rankedLossReward ?? defaultSettings.rankedLossReward,
        campaignBossRewardFragments: settings.campaignBossRewardFragments ?? defaultSettings.campaignBossRewardFragments // New setting
      };
    }
    
    // If no global settings exist, return defaults
    return defaultSettings;
  } catch (error) {
    console.error('Error fetching global economy settings:', error);
    return defaultSettings;
  }
};
