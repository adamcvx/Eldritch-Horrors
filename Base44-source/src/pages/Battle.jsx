import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Match } from '@/entities/Match';
import { Fusion } from '@/entities/Fusion';
import { Ability } from '@/entities/Ability';
import { User } from '@/entities/User';
import { Campaign } from '@/entities/Campaign';
import { motion, AnimatePresence } from 'framer-motion';
import { updateQuestProgress } from '../components/quests/QuestService';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { getEffectiveStats } from '../components/talents/TalentService';
import { calculateDamageMultiplier } from '../components/synergy/SynergyService';

// Updated imports for Orb Logic
import {
  applyOrbEffectsToStats,
  getPlayerEquippedOrbs, // Use the service function
  getOrbsForTrigger,
  calculateEffectiveOrbValues,
  processOnAttackTriggers,
  processOnTurnEndTriggers,
  processOnHitTriggers,
  processOnStartTriggers,
  givePlayerOrb, // Import the new function
  lookupOrbsById // Import the new lookup function
} from '../components/orbs/OrbService';
import { Orb } from '@/entities/Orb';

// New Imports for Enhanced UI and Backgrounds
import { Gem, Star, Swords, Shield, HeartPulse, BrainCircuit, Heart, Zap, Wind } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import RarityBadge from '../components/RarityBadge';
import { getSynergyDetails } from '../components/synergy/SynergyService';
import { Backgrounds } from '@/entities/Backgrounds';
import BattleUI from '../components/battle/BattleUI';
import FusionCard from '../components/cards/FusionCard';
import { applyTalentBonusesToFusion } from '../components/talents/TalentService';
import { getGlobalEconomySettings } from '../components/user/UserService';

// New import for LootService
import { generateBattleLoot, generateCampaignLoot, formatLootForDisplay, getCampaignReplayFragments } from '../components/loot/LootService';

// === AUTH HELPERS ===
const decodeJwt = (token) => {
  try {
    const base64Payload = token.split('.')[1];
    const payload = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload);
  } catch (err) {
    console.error("Failed to decode JWT:", err);
    return null;
  }
};

const OPPONENT_ID = 'ai_opponent';

function statDuringTurn(stats, effects, stat) {
  const gain = (effects?.buffs ?? []).filter(effect => effect.name === stat + '_up')
    .reduce((total, effect) => total + (effect.amount ?? 0), 0);
  const loss = (effects?.debuffs ?? []).filter(effect => effect.name === stat + '_down')
    .reduce((total, effect) => total + (effect.amount ?? 0), 0);
  return Math.max(1, stats[stat] + gain - loss);
}

function getEffectiveStatsWithTalents(fusion) {
  return applyOrbEffectsToStats({ stats: getEffectiveStats(fusion) }, fusion.loadedEquippedOrbs);
}

export default function Battle() {
  const abilityInFlight = useRef(false);
  const [match, setMatch] = useState(null);
  const [playerFusion, setPlayerFusion] = useState(null);
  const [opponentFusion, setOpponentFusion] = useState(null);
  const [playerAbilities, setPlayerAbilities] = useState([]);
  const [opponentAbilities, setOpponentAbilities] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [opponentUser, setOpponentUser] = useState(null); // New state for opponent user data
  const [opponentId, setOpponentId] = useState(null);

  // New state for equipped orbs
  const [playerOrbs, setPlayerOrbs] = useState([]);
  const [opponentOrbs, setOpponentOrbs] = useState([]);

  const [matchId, setMatchId] = useState(null);
  const [campaignId, setCampaignId] = useState(null);
  const [allAbilities, setAllAbilities] = useState([]); // Store all abilities for AI lookups

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Battle state
  const [turn, setTurn] = useState(null); // 'player', 'opponent', 'ai', or null
  const [battleLog, setBattleLog] = useState([]); // Ensure it's always an array

  // UI related state
  const [battleType, setBattleType] = useState(null); // 'campaign', 'ranked', 'casual', etc.
  const [campaignStage, setCampaignStage] = useState(null);
  const [hp, setHp] = useState({ playerHP: 0, opponentHP: 0 }); // Current HP for both fusions
  const [maxPlayerHp, setMaxPlayerHp] = useState(0); // Max HP for player
  const [maxOpponentHp, setMaxOpponentHp] = useState(0); // Max HP for opponent

  // Fusion selection state (only for campaign)
  const [selectableFusions, setSelectableFusions] = useState([]);

  // New Background state
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [loadingBackground, setLoadingBackground] = useState(true);

  // Global Economy Settings State
  const [economySettings, setEconomySettings] = useState(null);

  // New state for battle results display
  const [battleResults, setBattleResults] = useState(null);
  // State to track winner for BattleUI (needed because match state might not update immediately for UI)
  const [winnerIdState, setWinnerIdState] = useState(null);

  const subscriptionRef = useRef(null);

  // Helper function to calculate rank from points
  const calculateRank = (points) => {
    if (points >= 2400) return 'Elder';
    if (points >= 2100) return 'Herald';
    if (points >= 1800) return 'Occultist';
    if (points >= 1500) return 'Acolyte';
    if (points >= 1200) return 'Cultist';
    return 'Initiate';
  };

  // Derived states for BattleUI and AI logic
  const isPve = battleType === 'campaign';
  // isPlayerTurn will now be controlled by the main useEffect

  // Helper to load orbs for an AI fusion from its document using the new lookup service
  const loadOrbsFromFusionDoc = useCallback(async (fusion) => {
    if (!Array.isArray(fusion?.equippedOrbs) || fusion.equippedOrbs.length === 0) {
      return [];
    }
    try {
      // Use the new lookup service instead of direct Orb.filter
      const orbsById = await lookupOrbsById(fusion.equippedOrbs);
      return fusion.equippedOrbs.map((id) => orbsById[id]).filter(Boolean);
    } catch (e) {
      console.error("❌ Failed to load orbs from fusion doc:", fusion?.id, e);
      return [];
    }
  }, []);

  // Handle body overflow for full-screen battle
  useEffect(() => {
    const isInActualBattle = playerFusion && opponentFusion && battleType;

    if (isInActualBattle) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'auto';
      };
    }
  }, [playerFusion, opponentFusion, battleType]);

  // New useEffect to load global economy settings
  useEffect(() => {
    const loadEconomySettings = async () => {
      try {
        const settings = await getGlobalEconomySettings();
        setEconomySettings(settings);
      } catch (error) {
        console.error('Error loading economy settings:', error);
      }
    };
    loadEconomySettings();
  }, []); // Run once on component mount

  // Helper to determine whose turn it is based on turn number
  const determineTurn = useCallback((turnNumber, players, currentUserId) => {
    if (!players || players.length < 2) return 'player'; // Default case

    // Player at index 0 goes on odd turns (1, 3, 5...), player at index 1 goes on even turns (2, 4, 6...)
    const activePlayerIndex = (turnNumber - 1) % 2;
    const activePlayerId = players[activePlayerIndex];

    return activePlayerId === currentUserId ? 'player' : 'opponent';
  }, []);

  // Modified handlePveStatUpdate to integrate LootService
  const handlePveStatUpdate = useCallback(async (stage) => {
    if (!currentUser) return;

    let playerRewardsForDisplay = null;

    try {
      const player = await User.me();
      if (stage.campaignWeek && player.campaignWeek !== stage.campaignWeek) {
        throw new Error('A new Forbidden Path chapter has begun. Return to the campaign to continue.');
      }
      const firstClear = stage.stageNumber === (player.campaignProgress || 0) + 1;
      // Replays award Echoes and reduced boss Fragments without repeating first-clear orb drops.
      const generatedLoot = firstClear ? await generateCampaignLoot({
        stageNumber: stage.stageNumber,
        isBoss: stage.isBoss,
        isFinalBoss: stage.isFinalBoss,
        baseShards: stage.rewardShards,
        baseFragments: stage.rewardFragments
      }) : { echoes: stage.rewardShards || 0, fragments: getCampaignReplayFragments(stage), orbs: [], bonusEchoes: 0 };
      const formattedLoot = formatLootForDisplay(generatedLoot);
      playerRewardsForDisplay = formattedLoot;

      const userUpdate = {
        currency: (player.currency || 0) + formattedLoot.totalEchoes,
        voidFragments: (player.voidFragments || 0) + formattedLoot.fragments,
        ...(stage.campaignWeek && { campaignWeek: stage.campaignWeek })
      };

      // If an orb was dropped, add it to the player's inventory
      if (generatedLoot.orbs && generatedLoot.orbs.length > 0) {
        for (const orb of generatedLoot.orbs) {
          if (orb && orb.id) {
            await givePlayerOrb(currentUser.id, orb.id);
            console.log(`Player ${currentUser.id} was awarded orb ${orb.name} (${orb.id})`);
          }
        }
      }

      // Only advance progress if this is the next sequential stage
      if (firstClear) {
        userUpdate.campaignProgress = stage.stageNumber;
      }

      await User.updateMyUserData(userUpdate);
      // Update quest progress for the player
      try {
        await updateQuestProgress(currentUser, { won: true, matchType: 'pve' });
      } catch (questError) {
        console.error('Campaign rewards saved, but quest progress could not be updated:', questError);
      }

      // Set battle results for display
      setBattleResults({
        isVictory: true,
        rewards: {
          ...playerRewardsForDisplay,
          orbs: generatedLoot.orbs || [] // 👈 include orbs in the result
        },
        campaignStage: stage,
        matchType: 'campaign'
      });

    } catch (error) {
      console.error('Error updating PVE stats:', error);
      setBattleResults({ isError: true, message: error.message });
    }
  }, [currentUser]);

  // Modified handleBattleEnd (PvP related) to integrate LootService
  const handleBattleEnd = useCallback(async (winnerId, loserId, matchType) => {
    if (!economySettings || !winnerId || !loserId || !match?.id) {
      console.error('Missing data for handleBattleEnd:', { economySettings, winnerId, loserId, matchId: match?.id });
      return;
    }

    let playerRewardsForDisplay = null; // To store rewards for the current user

    try {
      const [winnerResults, loserResults] = await Promise.all([
        User.filter({ id: winnerId }),
        User.filter({ id: loserId })
      ]);

      if (winnerResults.length === 0 || loserResults.length === 0) {
        console.error('Winner or loser user data not found for stats update.');
        return;
      }

      const winnerData = winnerResults[0];
      const loserData = loserResults[0];

      // Update match as finished, new to this function's scope.
      // This will set the state to 'finished' even if it was 'abandoned'.
      await Match.update(match.id, {
        state: 'finished',
        winner: winnerId
      });

      const isRanked = matchType === 'ranked';

      // --- Generate Loot for Winner ---
      const baseWinnerEchoes = isRanked ? economySettings.rankedWinReward : economySettings.casualWinReward;
      const winnerGeneratedLoot = await generateBattleLoot({
        battleType: matchType,
        isVictory: true,
        economySettings,
        baseRewards: { echoes: baseWinnerEchoes }
      });
      const formattedWinnerLoot = formatLootForDisplay(winnerGeneratedLoot);

      // --- Generate Loot for Loser ---
      const baseLoserEchoes = isRanked ? economySettings.rankedLossReward : economySettings.casualLossReward;
      const loserGeneratedLoot = await generateBattleLoot({
        battleType: matchType,
        isVictory: false,
        economySettings,
        baseRewards: { echoes: baseLoserEchoes }
      });
      const formattedLoserLoot = formatLootForDisplay(loserGeneratedLoot);

      let winnerUpdates = {
        wins: (winnerData.wins || 0) + 1,
        currency: (winnerData.currency || 0) + formattedWinnerLoot.totalEchoes,
        voidFragments: (winnerData.voidFragments || 0) + formattedWinnerLoot.fragments
      };
      let loserUpdates = {
        losses: (loserData.losses || 0) + 1,
        currency: (loserData.currency || 0) + formattedLoserLoot.totalEchoes,
        voidFragments: (loserData.voidFragments || 0) + formattedLoserLoot.fragments
      };

      // Existing ranking points and updates logic (ELO-style) - PRESERVED
      if (isRanked) {
        winnerUpdates.rankedWins = (winnerData.rankedWins || 0) + 1;
        loserUpdates.rankedLosses = (loserData.rankedLosses || 0) + 1;

        const winnerPoints = winnerData.rankingPoints || 1000;
        const loserPoints = loserData.rankingPoints || 1000;

        const pointDifference = Math.abs(winnerPoints - loserPoints);
        let pointsGained = 25;

        if (winnerPoints < loserPoints) {
          // Underdog wins, get more points
          pointsGained += Math.min(15, Math.floor(pointDifference / 50));
        } else {
          // Favorite wins, get fewer points
          pointsGained -= Math.min(10, Math.floor(pointDifference / 100));
        }

        const pointsLost = Math.max(10, pointsGained - 5);

        winnerUpdates.rankingPoints = Math.min(3000, winnerPoints + pointsGained);
        loserUpdates.rankingPoints = Math.max(0, loserPoints - pointsLost);

        // Update ranks based on points
        winnerUpdates.rank = calculateRank(winnerUpdates.rankingPoints);
        loserUpdates.rank = calculateRank(loserUpdates.rankingPoints);
      } else {// casual match
        winnerUpdates.casualWins = (winnerData.casualWins || 0) + 1;
        loserUpdates.casualLosses = (loserData.casualLosses || 0) + 1;
      }

      await User.update(winnerId, winnerUpdates);
      await User.update(loserId, loserUpdates);

      // Update quest progress for both players
      await updateQuestProgress(winnerData, { won: true, matchType });
      await updateQuestProgress(loserData, { won: false, matchType });

      // Determine rewards for the current player for display purposes
      const isPlayerWinner = currentUser?.id === winnerId;
      playerRewardsForDisplay = isPlayerWinner ? formattedWinnerLoot : formattedLoserLoot;
      setBattleResults({
        isVictory: isPlayerWinner,
        rewards: playerRewardsForDisplay,
        matchType: matchType
      });

    } catch (statError) {
      console.error("Failed to update player stats/end battle:", statError);
      setBattleResults({ isError: true, message: statError.message });
    }
  }, [economySettings, match?.id, currentUser?.id]);


  // Renamed from `handleTurnEnd` (in previous code) to `handleServerTurnUpdate`
  // This function sends the full match state to the server for PvP.
  const handleServerTurnUpdate = useCallback(async (payload) => {
    if (!match?.id) {
      console.error('Match ID is null in handleServerTurnUpdate');
      return;
    }
    // New logic: Assume payload already contains the fully processed state.
    // Cooldowns and status effects are decremented by processEndOfTurnEffects on the client.
    await Match.update(match.id, payload);
  }, [match?.id]);

  // New useEffect to load background
  useEffect(() => {
    const loadBackground = async () => {
      if (!playerFusion || !opponentFusion) return;
      setLoadingBackground(true);
      try {
        const originTypes = [];
        if (playerFusion.originType) originTypes.push(playerFusion.originType);
        if (opponentFusion.originType) originTypes.push(opponentFusion.originType);

        if (originTypes.length > 0) {
          const selectedOriginType = originTypes[Math.floor(Math.random() * originTypes.length)];
          const backgrounds = await Backgrounds.filter({ originType: selectedOriginType });
          if (backgrounds.length > 0) {
            const randomBackground = backgrounds[Math.floor(Math.random() * backgrounds.length)];
            setBackgroundImage(randomBackground.image);
          } else {
            setBackgroundImage(null); // No background found for this type
          }
        } else {
          setBackgroundImage(null); // No origin types found
        }
      } catch (error) {
        console.error('Error loading battle background:', error);
        setBackgroundImage(null); // Fallback on error
      } finally {
        setLoadingBackground(false);
      }
    };
    loadBackground();
  }, [playerFusion, opponentFusion]);


  // New useEffect to extract matchId and campaignId from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setMatchId(urlParams.get('matchId'));
    setCampaignId(urlParams.get('campaignId'));
  }, []);

  // New helper function to process end-of-turn effects for PvE (cooldowns, status effects)
  const processEndOfTurnEffects = useCallback((currentMatchState, currentPlayerFusion, currentOpponentFusion) => {
    const newState = JSON.parse(JSON.stringify(currentMatchState));
    const newLogs = [...(newState.log || [])];

    // --- Handle cooldowns ---
    if (newState.cooldowns) {
      for (const actorId in newState.cooldowns) {
        for (const abId in newState.cooldowns[actorId]) {
          if (newState.cooldowns[actorId][abId] > 0) {
            newState.cooldowns[actorId][abId] -= 1;
          }
        }
      }
    }

    // --- Handle Status Effects (Buffs/Debuffs) ---
    const fusionsInBattleWithData = [
      { fusion: currentPlayerFusion, orbs: playerOrbs },
      { fusion: currentOpponentFusion, orbs: opponentOrbs }
    ].filter((f) => f.fusion);

    for (const { fusion } of fusionsInBattleWithData) {
      if (newState.statusEffects[fusion.id]) {
        const effects = newState.statusEffects[fusion.id];
        // Ensure fusion data used for effective stats calculation is the current one
        const fusionData = fusion.id === currentPlayerFusion?.id ? currentPlayerFusion : currentOpponentFusion;

        // Buffs
        if (effects.buffs) {
          effects.buffs.forEach((buff) => {
            switch (buff.name) {
              case 'heal_over_time': {
                const maxHp = getEffectiveStatsWithTalents(fusionData).hp;
                newState.hp[fusion.id] = Math.min(maxHp, newState.hp[fusion.id] + buff.amount);
                break;
              }
            }
          });
          effects.buffs = effects.buffs.
            map((buff) => ({ ...buff, turnsLeft: buff.turnsLeft - 1 })).
            filter((buff) => buff.turnsLeft > 0);
        }

        // Debuffs
        if (effects.debuffs) {
          effects.debuffs.forEach((debuff) => {
            switch (debuff.name) {
              case 'damage_over_time': {
                newState.hp[fusion.id] = Math.max(0, newState.hp[fusion.id] - debuff.amount);
                break;
              }
            }
          });
          effects.debuffs = effects.debuffs.
            map((debuff) => ({ ...debuff, turnsLeft: debuff.turnsLeft - 1 })).
            filter((debuff) => debuff.turnsLeft > 0);
        }
      }
    }

    // --- Handle Orb 'OnTurnEnd' triggers ---
    for (const { fusion, orbs } of fusionsInBattleWithData) {
      // --- Added Targeting Enemy For OnTurnEnd -- //
      const enemyFusion = fusion.id === currentPlayerFusion?.id ?
        currentOpponentFusion :
        currentPlayerFusion;

      if (!enemyFusion) continue;

      const maxHp = getEffectiveStatsWithTalents(fusion).hp;
      const currentHp = newState.hp[fusion.id];

      const enemyMaxHp = getEffectiveStatsWithTalents(enemyFusion).hp;
      const enemyCurrentHp = newState.hp[enemyFusion.id];

      const { hpChange, statusEffects, logs: orbLogs } = processOnTurnEndTriggers({
        fusionOrbs: Array.isArray(orbs) ? orbs : [],
        fusion,
        targetFusion: enemyFusion, // pass in the enemy too
        currentHp,
        maxHp,
        logs: []
      });

      // Apply HP changes
      if (hpChange !== 0) {
        newState.hp[fusion.id] = Math.max(0, Math.min(maxHp, currentHp + hpChange));
      }

      // Apply new status effects
      if (statusEffects.length > 0) {
        if (!newState.statusEffects[fusion.id]) {
          newState.statusEffects[fusion.id] = {
            buffs: [],
            debuffs: []
          };
        }

        statusEffects.forEach((effect) => {
          if (effect.type === 'buff') {
            newState.statusEffects[fusion.id].buffs.push(effect);
          } else if (effect.type === 'debuff') {
            if (Math.random() < (effect.chance || 0) / 100) {
              if (!newState.statusEffects[enemyFusion.id]) {
                newState.statusEffects[enemyFusion.id] = {
                  buffs: [],
                  debuffs: []
                };
              }

              newState.statusEffects[enemyFusion.id].debuffs.push(effect);

              // Add log entry when debuff succeeds
              newLogs.push({
                turn: 0,
                actor: fusion.id,
                action: effect.name,
                result: `${fusion.fusedName} afflicted ${enemyFusion.fusedName} with ${effect.name}!`
              });
            }
          }
        });
      }
      newLogs.push(...orbLogs); // Add orb-related logs
    }

    newState.log = newLogs;
    return newState;
  }, [playerOrbs, opponentOrbs]);

  // Renamed from `handleTurnEnd` (in previous code) to `handleEndTurn`
  // This function handles a player or AI passing their turn.
  const handleEndTurn = useCallback(async (isPlayer) => {
    if (!match || !currentUser) {
      console.error('Missing battle state for end turn.');
      return;
    }

    const actorId = isPlayer ? currentUser.id : OPPONENT_ID;

    const newLogEntry = {
      turn: match.turnNumber || 1, // Use global turn number
      actor: actorId,
      action: 'End Turn',
      result: `${isPlayer ? 'Player' : 'AI'} passed their turn.`
    };

    let updatedMatchData = {
      ...match,
      log: [...(match.log || []), newLogEntry],
      state: match.state, // Preserve current state
      winner: match.winner // Preserve current winner
    };

    // Process end-of-turn effects locally for both PvP and PvE
    // This will decrement cooldowns, status effects, and apply OnTurnEnd orb effects
    let finalMatchData = processEndOfTurnEffects(updatedMatchData, playerFusion, opponentFusion);

    // Increment the global turn counter for the NEXT turn
    finalMatchData.turnNumber = (match.turnNumber || 0) + 1;

    // Check for win/loss condition AFTER end of turn effects are applied
    let matchState = finalMatchData.state;
    let winnerId = finalMatchData.winner;

    if (matchState !== 'finished') {
      const playerCurrentHp = finalMatchData.hp[playerFusion.id];
      const opponentCurrentHp = finalMatchData.hp[opponentFusion.id];

      if (opponentCurrentHp <= 0 && playerCurrentHp > 0) {
        matchState = 'finished';
        winnerId = isPve ? currentUser.id : match.players.find((pId) => pId === currentUser.id);
      } else if (playerCurrentHp <= 0) {// If player is at 0 or less, they lose regardless of opponent HP
        matchState = 'finished';
        winnerId = isPve ? OPPONENT_ID : match.players.find((pId) => pId !== currentUser.id);
      }
    }

    const finalUpdates = {
      ...finalMatchData,
      state: matchState,
      winner: winnerId
    };

    // Handle battle end based on the new state
    if (matchState === 'finished' && winnerId) {
      setWinnerIdState(winnerId); // Set winner ID for UI
      if (isPve) {
        if (winnerId === currentUser.id) {
          await handlePveStatUpdate(campaignStage);
        }
      } else {// PvP
        const loserId = match.players.find((id) => id !== winnerId);
        if (winnerId && loserId) {
          await handleBattleEnd(winnerId, loserId, match.matchType);
        }
      }
    }


    if (isPve) {
      setMatch(finalUpdates);
      setBattleLog(finalUpdates.log);
      setHp((prev) => ({
        playerHP: finalUpdates.hp[playerFusion.id],
        opponentHP: finalUpdates.hp[opponentFusion.id]
      }));
    } else {// PVP
      try {
        await handleServerTurnUpdate(finalUpdates); // Send the fully processed state

        // Update local state for responsiveness
        setMatch(finalUpdates);
        setBattleLog(finalUpdates.log);
      } catch (error) {
        console.error('Error ending turn (PvP):', error);
      }
    }
  }, [match, currentUser, isPve, playerFusion, opponentFusion, handleServerTurnUpdate, setMatch, setBattleLog, setHp, processEndOfTurnEffects, handlePveStatUpdate, handleBattleEnd, campaignStage]);


  // Main ability usage logic, called by player or AI
  const handleUseAbility = useCallback(async (ability, isPlayer) => {
    if (abilityInFlight.current || match?.state !== 'in_progress') return;
    if (!playerFusion || !opponentFusion || !currentUser) {
      console.error('Missing battle state for ability use.');
      return;
    }

    // Turn checks - ensure only active player/AI can act
    if (isPlayer && turn !== 'player') {
      console.log('Not player turn, cannot use ability.');
      return;
    }
    if (!isPlayer && turn !== 'opponent') {// This `turn` is the local state, consistent with determineTurn
      console.log('Not AI turn, AI cannot use ability.');
      return;
    }

    if (!ability || !ability.id) {
      console.error('Ability is null or missing ID');
      return;
    }

    const actorId = isPlayer ? currentUser.id : OPPONENT_ID;
    const actorFusion = isPlayer ? playerFusion : opponentFusion;
    const targetFusion = isPlayer ? opponentFusion : playerFusion;
    const actorOrbs = isPlayer ? playerOrbs : opponentOrbs;
    const targetOrbs = isPlayer ? opponentOrbs : playerOrbs;

    // Determine actual target HP based on current match state
    const currentTargetHp = match.hp?.[targetFusion.id];
    const currentActorHp = match.hp?.[actorFusion.id];

    if (currentTargetHp === undefined || currentActorHp === undefined) {
      console.error('HP values not found for fusions in match state.');
      return;
    }

    // Check if cooldown > 0 for the current actor
    if ((match.cooldowns?.[actorId]?.[ability.id] || 0) > 0) {
      console.log(`${ability.name} is on cooldown for ${match.cooldowns[actorId][ability.id]} more turns.`);
      return;
    }

    abilityInFlight.current = true;
    try {
      // Imported glyphs use both decimal multipliers and percentage points.
      const power = ability.effect?.includes('{power}%') ? ability.power / 100 : ability.power;
      let finalDamage = 0;
      let healingAmount = 0; // Accumulates healing from ability and orbs
      let selfDamageApplied = 0; // Accumulates self damage from orbs/counters
      let logResult = '';
      const turnLogs = []; // Temporary log for this turn's events, will contain objects

      const actorStats = getEffectiveStatsWithTalents(actorFusion);
      const targetStats = getEffectiveStatsWithTalents(targetFusion);
      const actorEffects = match.statusEffects?.[actorFusion.id];
      const targetEffects = match.statusEffects?.[targetFusion.id];
      const effectNames = ability.statEffect ?? [];
      const hotAmount = ability.effect?.includes('max health')
        ? Math.round(actorStats.hp * power) : Math.round(actorStats.speed * power);

      //Ability Type Check//
      switch (ability.type) {
        case 'attack':
          // Fixed damage formula: (Attacker Attack * Power) - (Defender Defense * 0.3), minimum 1
          const baseAttackDamage = statDuringTurn(actorStats, actorEffects, 'attack') * power;
          const defenseReduction = statDuringTurn(targetStats, targetEffects, 'defense') * 0.3;
          finalDamage = Math.max(1, Math.round(baseAttackDamage - defenseReduction));
          break;

        case 'buff':
          if (!effectNames.includes('heal_over_time')) healingAmount = Math.max(1, hotAmount);
          logResult = healingAmount ? ` Healed ${healingAmount} hp.` : ' Applied healing over time.';
          break;

        case 'debuff':
          // For debuffs, calculate damage per turn based on attack power
          const baseDebuffDamage = getEffectiveStatsWithTalents(actorFusion).speed * power;
          const debuffDefenseReduction = getEffectiveStatsWithTalents(targetFusion).speed * 0.1;
          finalDamage = Math.max(1, Math.round(baseDebuffDamage - debuffDefenseReduction));
          if (!effectNames.includes('damage_over_time')) finalDamage = 0;
          logResult = finalDamage ? ` Dealing ${finalDamage} damage per turn.` : ' Applied stat penalties.';
          break;

        case 'defense':
          logResult = ' Raised defenses.';
          break;

        default:
          finalDamage = 0;
          logResult = ` Without a specific effect.`;
      }

      // Apply synergy multipliers AFTER base damage calculation
      if (finalDamage > 0 && ability.type === 'attack') {
        const synergyMultiplier = calculateDamageMultiplier(
          actorFusion.originType,
          targetFusion.originType
        );
        finalDamage = Math.round(finalDamage * synergyMultiplier);

        if (synergyMultiplier > 1.0) {
          logResult += ` (Enhanced by synergy!)`;
        } else if (synergyMultiplier < 1.0) {
          logResult += ` (Reduced by resistance!)`;
        }
      }

      // Process OnAttack orb triggers (attacker's orbs)
      const onAttackOrbResults = processOnAttackTriggers({
        attackerOrbs: Array.isArray(actorOrbs) ? actorOrbs : [],
        attackerFusion: actorFusion,
        targetFusion: targetFusion,
        baseDamage: ability.type === 'attack' ? finalDamage : 0,
        targetCurrentHp: currentTargetHp,
        targetMaxHp: getEffectiveStatsWithTalents(targetFusion).hp,
        logs: []
      });

      if (ability.type === 'attack') finalDamage = onAttackOrbResults.finalDamage;
      healingAmount += onAttackOrbResults.healingApplied;
      turnLogs.push(...onAttackOrbResults.logs); // Add full log objects

      // Process OnHit orb triggers for the target (defender's orbs)
      if (ability.type === 'attack' && finalDamage > 0) {
        const onHitOrbResults = processOnHitTriggers({
          defenderOrbs: Array.isArray(targetOrbs) ? targetOrbs : [],
          defenderFusion: targetFusion,
          attackerFusion: actorFusion,
          incomingDamage: finalDamage,
          logs: []
        });

        finalDamage = Math.max(0, finalDamage - onHitOrbResults.damageReduction);
        selfDamageApplied += onHitOrbResults.counterDamage; // Counter damage is self-damage to actor
        turnLogs.push(...onHitOrbResults.logs); // Add full log objects
      }

      if (ability.type === 'attack') logResult = ` Dealt ${finalDamage} damage!` + logResult;

      // Calculate new HP values based on direct action and orb effects
      const immediateDamage = ability.type === 'debuff' ? 0 : finalDamage;
      let newTargetHp = Math.max(0, currentTargetHp - immediateDamage);
      let newActorHp = Math.max(0, Math.min(
        getEffectiveStatsWithTalents(actorFusion).hp,
        currentActorHp + healingAmount - selfDamageApplied
      ));

      // Prepare cooldowns to set on the match object
      const updatedCooldowns = JSON.parse(JSON.stringify(match.cooldowns || {}));
      if (!updatedCooldowns[actorId]) {
        updatedCooldowns[actorId] = {};
      }
      updatedCooldowns[actorId][ability.id] = ability.cooldown;

      // Prepare status effects to set on the match object
      const updatedStatusEffects = JSON.parse(JSON.stringify(match.statusEffects || {}));

      if (Array.isArray(ability.statEffect) && ability.statEffect.length > 0 && ability.turnLength > 0) {
        ability.statEffect.forEach((effectName) => {
          let targetFusionIdForStatus;
          let amount = 0;

          // Decide target PER EFFECT
          if (['attack_up', 'defense_up', 'heal_over_time'].includes(effectName)) {
            targetFusionIdForStatus = actorFusion.id; // buffs/HoT → self
            amount = effectName === 'heal_over_time' ? Math.max(1, hotAmount)
              : Math.max(1, Math.round(actorStats[effectName.split('_')[0]] * power));
          } else {
            targetFusionIdForStatus = targetFusion.id; // debuffs/DoT → enemy
            amount = effectName === 'damage_over_time' ? finalDamage
              : Math.max(1, Math.round(targetStats[effectName.split('_')[0]] * power));
          }

          if (!updatedStatusEffects[targetFusionIdForStatus]) {
            updatedStatusEffects[targetFusionIdForStatus] = { buffs: [], debuffs: [] };
          }

          const effectData = {
            name: effectName,
            turnsLeft: ability.turnLength,
            amount,
            abilityId: ability.id // This ensures we can look up the custom name
          };

          if (['attack_up', 'defense_up', 'heal_over_time'].includes(effectName)) {
            updatedStatusEffects[targetFusionIdForStatus].buffs.push(effectData);
          } else {
            updatedStatusEffects[targetFusionIdForStatus].debuffs.push(effectData);
          }
        });
      }

      // Add a log entry for the ability use
      const abilityLogEntry = {
        turn: match.turnNumber || 1, // Use global turn number
        actor: actorId,
        action: ability.name,
        abilityType: ability.type,
        result: logResult
      };

      // Combine ability log with orb logs
      const combinedTurnLogs = [abilityLogEntry, ...turnLogs];

      // Prepare the new 'match' object state from current state (before end-of-turn processing)
      let preProcessMatchData = {
        ...match,
        hp: {
          ...match.hp,
          [targetFusion.id]: newTargetHp,
          [actorFusion.id]: newActorHp
        },
        cooldowns: updatedCooldowns,
        statusEffects: updatedStatusEffects,
        log: [...(match.log || []), ...combinedTurnLogs]
      };

      // Process end-of-turn effects *before* incrementing turnNumber for the next turn
      // This will update cooldowns, status effects, and apply OnTurnEnd orb effects
      let finalMatchData = processEndOfTurnEffects(preProcessMatchData, playerFusion, opponentFusion);

      // Increment the global turn counter for the NEXT turn
      finalMatchData.turnNumber = (match.turnNumber || 0) + 1;

      // Check for win/loss condition
      let matchState = 'in_progress';
      let winnerId = null;

      if (finalMatchData.hp[opponentFusion.id] <= 0 && finalMatchData.hp[playerFusion.id] > 0) {
        matchState = 'finished';
        winnerId = currentUser.id; // Player wins
      } else if (finalMatchData.hp[playerFusion.id] <= 0) {
        matchState = 'finished';
        winnerId = isPve ? OPPONENT_ID : opponentId; // Opponent wins
      }

      // Prepare the final payload for server/local update
      const finalUpdates = {
        ...finalMatchData, // Contains all state after ability and end-of-turn effects
        state: matchState,
        winner: winnerId
      };

      // Handle battle end
      if (matchState === 'finished' && winnerId) {
        setWinnerIdState(winnerId); // Set winner ID for UI
        if (isPve) {
          if (winnerId === currentUser.id) {
            await handlePveStatUpdate(campaignStage);
          }
        } else {// PvP
          const loserId = match.players.find((id) => id !== winnerId);
          await handleBattleEnd(winnerId, loserId, match.matchType);
        }
      }

      // Update match state
      if (isPve) {
        setMatch(finalUpdates);
        setBattleLog(finalUpdates.log);
        setHp((prev) => ({
          playerHP: finalUpdates.hp[playerFusion.id],
          opponentHP: finalUpdates.hp[opponentFusion.id]
        }));
      } else {// PvP
        await handleServerTurnUpdate(finalUpdates); // Send the complete updated match state
        setMatch(finalUpdates); // Update local state immediately for responsiveness
        setBattleLog(finalUpdates.log);
        setHp((prev) => ({
          playerHP: finalUpdates.hp[playerFusion.id] || maxPlayerHp,
          opponentHP: finalUpdates.hp[opponentFusion.id] || maxOpponentHp
        }));
      }

    } catch (error) {
      console.error('Error using ability:', error);
    } finally {
      abilityInFlight.current = false;
    }
  }, [match, playerFusion, opponentFusion, currentUser, turn, maxPlayerHp, maxOpponentHp, handleServerTurnUpdate, handleBattleEnd, processEndOfTurnEffects, isPve, campaignStage, handlePveStatUpdate, playerOrbs, opponentOrbs, opponentId]);


  // Main battle data loading logic with improved auth error handling
  const loadBattleData = useCallback(async () => {
    if (!matchId && !campaignId) {
      setError('No match or campaign ID provided');
      setLoading(false);
      return;
    }

    try {
      console.log('Loading battle data with matchId:', matchId, 'campaignId:', campaignId);

      // Fetch all abilities once for efficient lookup
      const allAbilitiesData = await Ability.filter({});
      setAllAbilities(allAbilitiesData);

      if (campaignId) {
        // Campaign Battle
        console.log('🎮 Starting campaign mode initialization...');
        
        // Handle authentication with proper error handling
        let user;
        try {
          user = await User.me();
        } catch (authError) {
          console.error('Authentication failed:', authError);
          if (authError.message?.includes('401') || authError.status === 401) {
            setError('Your session has expired. Please log in again.');
            setTimeout(() => {
              window.location.href = createPageUrl('Welcome');
            }, 2000);
            return;
          }
          throw authError;
        }

        const [stageResult] = await Promise.all([
          Campaign.filter({ id: campaignId })
        ]);

        if (!user || !user.id) {
          throw new Error('Failed to load user data or user ID is missing.');
        }

        if (!stageResult || stageResult.length === 0) {
          throw new Error("Campaign stage not found.");
        }

        const stage = stageResult[0];
        if (!stage || !stage.id || !stage.enemyFusionId) {
          throw new Error("Stage data is invalid or missing required fields.");
        }

        if (stage.stageNumber > (user.campaignProgress || 0) + 1) {
          throw new Error('Complete the previous campaign stage first.');
        }

        // Load player's fusions and the specific enemy fusion
        const [playerFusions, enemyFusionResult] = await Promise.all([
          Fusion.filter({ playerOwner: user.id }, '-created_date'),
          Fusion.filter({ id: stage.enemyFusionId })
        ]);

        if (!playerFusions || playerFusions.length === 0) {
          throw new Error('You need at least one abomination to battle.');
        }

        if (!enemyFusionResult || enemyFusionResult.length === 0) {
          throw new Error(`Enemy fusion with ID "${stage.enemyFusionId}" not found.`);
        }

        const enemy = enemyFusionResult[0];
        if (!enemy || !enemy.id) {
          throw new Error("Enemy fusion data is invalid.");
        }

        // Apply talent bonuses to player fusions
        const validPlayerFusions = playerFusions.filter((fusion) => fusion && fusion.id && fusion.stats);

        const playerFusionsWithTalents = await Promise.all(
          validPlayerFusions.map(async (fusion) => {
            try {
              const fusionWithTalents = await applyTalentBonusesToFusion(fusion, user.learnedTalents || []);
              const orbs = await getPlayerEquippedOrbs(user.id, fusion.id);
              return { ...fusionWithTalents, loadedEquippedOrbs: orbs };
            } catch (error) {
              console.error('Error applying talents to player fusion:', error);
              return fusion;
            }
          })
        );

        const enemyFusionWithTalents = await applyTalentBonusesToFusion(enemy, []);

        // Filter for battle-ready fusions
        const battleReadyFusions = playerFusionsWithTalents.filter((fusion) =>
          fusion && fusion.id && fusion.abilities && fusion.abilities.length > 0
        );

        if (battleReadyFusions.length === 0) {
          throw new Error('You need at least one abomination with abilities assigned to battle. Visit Blasphemous Relics in The Sanctum to assign abilities, under the abilities tab.');
        }

        // Set all campaign states at once
        console.log('✅ Campaign data loaded, showing fusion selection...');
        setBattleType('campaign');
        setCampaignStage(stage);
        setCurrentUser(user);
        setSelectableFusions(battleReadyFusions);
        setOpponentFusion({ ...enemyFusionWithTalents, loadedEquippedOrbs: await loadOrbsFromFusionDoc(enemy) });
        setError(null);
        setLoading(false); // Explicitly set loading to false here

      } else if (matchId) {
        // PVP Match
        setBattleType('pvp');

        // Handle authentication
        let user;
        try {
          user = await User.me();
        } catch (authError) {
          console.error('Authentication failed in PVP:', authError);
          if (authError.message?.includes('401') || authError.status === 401) {
            setError('Your session has expired. Please log in again.');
            setTimeout(() => {
              window.location.href = createPageUrl('Welcome');
            }, 2000);
            setLoading(false);
            return;
          }
          throw authError;
        }

        const [matchResults] = await Promise.all([
          Match.filter({ id: matchId })
        ]);

        if (!user?.id) throw new Error('Failed to load user data.');
        if (!matchResults || matchResults.length === 0) {
          setError('Match not found.');
          setLoading(false);
          return;
        }

        const matchData = matchResults[0];
        if (!matchData.players || !matchData.players.includes(user.id)) {
          setError('You are not a participant in this match.');
          setLoading(false);
          return;
        }

        // Find opponent
        const oppId = matchData.players.find((id) => id !== user.id);
        if (!oppId) {
          setError('Opponent not found in match.');
          setLoading(false);
          return;
        }

        // --- NEW ---
        // Fetch opponent's full user data
        const opponentUserResult = await User.filter({ id: oppId });
        if (opponentUserResult.length > 0) {
          setOpponentUser(opponentUserResult[0]);
        }
        // --- END NEW ---

        setOpponentId(oppId);
        setCurrentUser(user);
        setMatch(matchData);
        setBattleLog(matchData.log || []);

        // Load fusions
        const playerFusionId = matchData.fusionMonsters[user.id];
        const opponentFusionId = matchData.fusionMonsters[oppId];
        if (!playerFusionId || !opponentFusionId) {
          setError('Fusion data missing from match.');
          setLoading(false);
          return;
        }

        const [playerFusionResults, opponentFusionResults] = await Promise.all([
          Fusion.filter({ id: playerFusionId }),
          Fusion.filter({ id: opponentFusionId })
        ]);

        if (!playerFusionResults.length || !opponentFusionResults.length) {
          setError('Failed to load fusion data.');
          setLoading(false);
          return;
        }

        const playerFusionData = playerFusionResults[0];
        const opponentFusionData = opponentFusionResults[0];

        // Apply talents
        const [playerFusionWithTalents, opponentFusionWithTalents] = await Promise.all([
          applyTalentBonusesToFusion(playerFusionData, user.learnedTalents || []),
          applyTalentBonusesToFusion(opponentFusionData, []) // Opponent talents would be fetched differently if they had them
        ]);

        // Load Orbs for both fusions using the PlayerOrb entity
        const [pOrbs, oOrbs] = await Promise.all([
          getPlayerEquippedOrbs(user.id, playerFusionWithTalents.id),
          getPlayerEquippedOrbs(oppId, opponentFusionWithTalents.id)
        ]);

        console.log("✅ PvP Player Fusion:", playerFusionWithTalents);
        console.log("✅ PvP Opponent Fusion:", opponentFusionWithTalents);

        setPlayerFusion(playerFusionWithTalents);
        setOpponentFusion(opponentFusionWithTalents);

        console.log("✅ Player Orbs from PlayerOrb:", pOrbs);
        console.log("✅ Opponent Orbs from PlayerOrb:", oOrbs);
        setPlayerOrbs(pOrbs); // Set state for orb services
        setOpponentOrbs(oOrbs); // Set state for orb services

        // --- Load Abilities ---
        const playerAbilitiesList = Array.isArray(playerFusionWithTalents.abilities) ?
          playerFusionWithTalents.abilities.
            map((id) => {
              const found = allAbilitiesData.find((ab) => ab.id === id);
              if (!found) console.warn(`⚠️ Player ability with id ${id} not found in allAbilities`);
              return found;
            }).
            filter(Boolean) :
          [];
        const opponentAbilitiesList = Array.isArray(opponentFusionWithTalents.abilities) ?
          opponentFusionWithTalents.abilities.
            map((id) => {
              const found = allAbilitiesData.find((ab) => ab.id === id);
              if (!found) console.warn(`⚠️ Opponent ability with id ${id} not found in allAbilities`);
              return found;
            }).
            filter(Boolean) :
          [];

        console.log("✅ Player Abilities:", playerAbilitiesList);
        console.log("✅ Opponent Abilities:", opponentAbilitiesList);

        setPlayerAbilities(playerAbilitiesList);
        setOpponentAbilities(opponentAbilitiesList);

        // HP for UI
        setHp({
          playerHP: matchData.hp[playerFusionId] || 0,
          opponentHP: matchData.hp[opponentFusionId] || 0
        });
        setMaxPlayerHp(getEffectiveStatsWithTalents(playerFusionWithTalents).hp);
        setMaxOpponentHp(getEffectiveStatsWithTalents(opponentFusionWithTalents).hp);

        // Process OnStart orb triggers for both fusions (PvP only)
        // For PvE, this is handled when the match is initialized after fusion selection.
        const initialMatchStateCopy = JSON.parse(JSON.stringify(matchData));
        let updatedMatchForOrbs = { ...initialMatchStateCopy };
        const tempLogs = [];

        // Player's OnStart Orbs
        const playerOnStartResults = processOnStartTriggers({
          fusionOrbs: pOrbs,
          fusion: playerFusionWithTalents,
          targetFusion: opponentFusionWithTalents, // Target is opponent for initial effects
          currentHp: updatedMatchForOrbs.hp[playerFusionWithTalents.id],
          maxHp: getEffectiveStatsWithTalents(playerFusionWithTalents).hp,
          logs: []
        });
        updatedMatchForOrbs.hp[playerFusionWithTalents.id] = Math.max(0, Math.min(getEffectiveStatsWithTalents(playerFusionWithTalents).hp, updatedMatchForOrbs.hp[playerFusionWithTalents.id] + playerOnStartResults.hpChange));
        if (playerOnStartResults.statusEffects.length > 0) {
          if (!updatedMatchForOrbs.statusEffects[playerFusionWithTalents.id]) updatedMatchForOrbs.statusEffects[playerFusionWithTalents.id] = { buffs: [], debuffs: [] };
          playerOnStartResults.statusEffects.forEach((effect) => {
            if (effect.type === 'buff') {
              updatedMatchForOrbs.statusEffects[playerFusionWithTalents.id].buffs.push(effect);
            } else if (effect.type === 'debuff') {
              updatedMatchForOrbs.statusEffects[playerFusionWithTalents.id].debuffs.push(effect);
            }
          });
        }
        tempLogs.push(...playerOnStartResults.logs);

        // Opponent's OnStart Orbs
        const opponentOnStartResults = processOnStartTriggers({
          fusionOrbs: oOrbs,
          fusion: opponentFusionWithTalents,
          targetFusion: playerFusionWithTalents, // Target is player for initial effects
          currentHp: updatedMatchForOrbs.hp[opponentFusionWithTalents.id],
          maxHp: getEffectiveStatsWithTalents(opponentFusionWithTalents).hp,
          logs: []
        });
        updatedMatchForOrbs.hp[opponentFusionWithTalents.id] = Math.max(0, Math.min(getEffectiveStatsWithTalents(opponentFusionWithTalents).hp, updatedMatchForOrbs.hp[opponentFusionWithTalents.id] + opponentOnStartResults.hpChange));
        if (opponentOnStartResults.statusEffects.length > 0) {
          if (!updatedMatchForOrbs.statusEffects[opponentFusionWithTalents.id]) updatedMatchForOrbs.statusEffects[opponentFusionWithTalents.id] = { buffs: [], debuffs: [] };
          opponentOnStartResults.statusEffects.forEach((effect) => {
            if (effect.type === 'buff') {
              updatedMatchForOrbs.statusEffects[opponentFusionWithTalents.id].buffs.push(effect);
            } else if (effect.type === 'debuff') {
              updatedMatchForOrbs.statusEffects[opponentFusionWithTalents.id].debuffs.push(effect);
            }
          });
        }
        tempLogs.push(...opponentOnStartResults.logs);

        if (tempLogs.length > 0) {
          updatedMatchForOrbs.log = [...updatedMatchForOrbs.log, ...tempLogs.map((log) => ({
            turn: updatedMatchForOrbs.turnNumber || 1, // Use current turn number for orb logs
            actor: 'system',
            action: 'Orb Trigger',
            result: log.result
          }))];
        }

        // Apply these initial changes to the match state
        setMatch(updatedMatchForOrbs);
        setBattleLog(updatedMatchForOrbs.log);
        
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Error in loadBattleData:', error);
      setLoading(false);
      
      if (error.message?.includes('session has expired') || error.message?.includes('log in again')) {
        return;
      } else if (error.message?.includes('401') || error.status === 401) {
        setError('Authentication failed. Please log in again.');
        setTimeout(() => {
          window.location.href = createPageUrl('Welcome');
        }, 2000);
      } else {
        setError('Failed to initialize battle: ' + error.message);
      }
    }
  }, [matchId, campaignId, setAllAbilities, setBattleType, setError, setLoading, setCampaignStage, setCurrentUser, setSelectableFusions, setOpponentFusion, setOpponentUser, setMatch, setBattleLog, setHp, setMaxPlayerHp, setMaxOpponentHp, setOpponentAbilities, setPlayerAbilities, setPlayerFusion, setPlayerOrbs, setOpponentOrbs]);

  // Trigger loadBattleData when matchId or campaignId are set
  useEffect(() => {
    if (matchId || campaignId) {
      loadBattleData();
    }
  }, [matchId, campaignId, loadBattleData]);

  // Sync match state periodically and determine whose turn it is (PVP only)
  useEffect(() => {
    // This effect only runs for PvP matches
    if (!match || !currentUser || isPve || battleResults) return; // Don't sync if battle is finished and results are displayed

    const syncInterval = setInterval(async () => {
      try {
        if (!match.id) return;

        const updatedMatchResults = await Match.filter({ id: match.id });
        if (updatedMatchResults.length > 0) {
          const updatedMatch = updatedMatchResults[0];

          if (updatedMatch && updatedMatch.state === 'canceled') {
            setError('This match was canceled because the opponent left.');
            clearInterval(syncInterval);
            return;
          }

          if (updatedMatch) {
            setMatch(updatedMatch);
            setBattleLog(updatedMatch.log || []);

            // Update HP for current user (PVP only)
            if (playerFusion && playerFusion.id && opponentFusion && opponentFusion.id) {
              setHp({
                playerHP: updatedMatch.hp?.[playerFusion.id] || 0,
                opponentHP: updatedMatch.hp?.[opponentFusion.id] || 0
              });
            }
          }
        }
      } catch (error) {
        console.error('Error syncing match:', error);
      }
    }, 2500);

    return () => clearInterval(syncInterval);
  }, [match, currentUser, isPve, playerFusion, opponentFusion, battleResults]);


  // New function to handle fusion selection in campaign mode
  const handleSelectFusionForCampaign = useCallback(async (fusionId) => {
    setLoading(true);
    try {
      if (!fusionId) {
        throw new Error('Fusion ID is null or undefined');
      }

      const selected = selectableFusions.find((f) => f && f.id === fusionId);
      if (!selected) {
        throw new Error('Selected fusion not found');
      }

    // Apply talents to the selected fusion.
    const selectedFusionWithTalents = await applyTalentBonusesToFusion(
      selected,
      currentUser?.learnedTalents || []
    );

    console.log('✅ Selected fusion object:', selectedFusionWithTalents);
    console.log('Abilities before safe check:', selectedFusionWithTalents.abilities);
    console.log('Equipped orbs before safe check (raw fusion doc):', selectedFusionWithTalents.equippedOrbs);

    setPlayerFusion(selectedFusionWithTalents);

    // --- Safe load of player abilities ---
    const playerAbilitiesList = Array.isArray(selectedFusionWithTalents.abilities) ?
      selectedFusionWithTalents.abilities.
        map((id) => {
          const found = allAbilities.find((ab) => ab.id === id);
          if (!found) console.warn(`⚠️ Ability with id ${id} not found in allAbilities`);
          return found;
        }).
        filter(Boolean) :
      [];
    console.log('✅ Loaded player abilities:', playerAbilitiesList);
    setPlayerAbilities(playerAbilitiesList);

    // --- Load Orbs for both player and AI opponent ---
    const playerLoadedOrbs = await getPlayerEquippedOrbs(currentUser.id, selectedFusionWithTalents.id);
    console.log('✅ Loaded player orbs from PlayerOrb:', playerLoadedOrbs);
    setPlayerOrbs(playerLoadedOrbs);

    // For AI, load orbs from the Fusion document itself
    const opponentLoadedOrbs = await loadOrbsFromFusionDoc(opponentFusion);
    console.log('✅ Loaded AI opponent orbs from Fusion doc:', opponentLoadedOrbs);
    setOpponentOrbs(opponentLoadedOrbs);

    // Set max HP for UI
    setMaxPlayerHp(getEffectiveStatsWithTalents(selectedFusionWithTalents).hp);
    if (opponentFusion) {
      setMaxOpponentHp(getEffectiveStatsWithTalents(opponentFusion).hp);

      const opponentAbilitiesList = Array.isArray(opponentFusion.abilities) ?
        opponentFusion.abilities.
          map((id) => allAbilities.find((ab) => ab.id === id)).
          filter(Boolean) :
        [];
      setOpponentAbilities(opponentAbilitiesList);
    }

    if (!campaignStage || !campaignStage.id || !currentUser?.id || !opponentFusion?.id) {
      throw new Error('Missing required data for campaign match initialization');
    }

    // Initialize a temporary match object for the campaign battle
    let initialMatchState = {
      id: `campaign_${campaignStage.id}_${Date.now()}`,
      players: [currentUser.id, OPPONENT_ID],
      fusionMonsters: {
        [currentUser.id]: selectedFusionWithTalents.id,
        [OPPONENT_ID]: opponentFusion.id
      },
      state: 'in_progress',
      matchType: 'campaign',
      hp: {
        [selectedFusionWithTalents.id]: getEffectiveStatsWithTalents(selectedFusionWithTalents).hp,
        [opponentFusion.id]: getEffectiveStatsWithTalents(opponentFusion).hp
      },
      cooldowns: {
        [currentUser.id]: {},
        [opponentFusion.id]: {}
      },
      statusEffects: {
        [selectedFusionWithTalents.id]: { buffs: [], debuffs: [] },
        [opponentFusion.id]: { buffs: [], debuffs: [] }
      },
      turnNumber: 1,
      log: [{
        turn: 1,
        actor: 'system',
        action: 'Battle Start',
        result: `${selectedFusionWithTalents.fusedName} confronts ${opponentFusion.fusedName}!`
      }]
    };

    // --- OnStart orb triggers (player + opponent) ---
    const tempLogs = [];

    const playerOnStartResults = processOnStartTriggers({
      fusionOrbs: playerLoadedOrbs,
      fusion: selectedFusionWithTalents,
      targetFusion: opponentFusion,
      currentHp: initialMatchState.hp[selectedFusionWithTalents.id],
      maxHp: getEffectiveStatsWithTalents(selectedFusionWithTalents).hp,
      logs: []
    });
    initialMatchState.hp[selectedFusionWithTalents.id] = Math.max(
      0,
      Math.min(getEffectiveStatsWithTalents(selectedFusionWithTalents).hp,
        initialMatchState.hp[selectedFusionWithTalents.id] + playerOnStartResults.hpChange)
    );
    if (playerOnStartResults.statusEffects.length > 0) {
      if (!initialMatchState.statusEffects[selectedFusionWithTalents.id]) {
        initialMatchState.statusEffects[selectedFusionWithTalents.id] = { buffs: [], debuffs: [] };
      }
      playerOnStartResults.statusEffects.forEach((effect) => {
        if (effect.type === 'buff') {
          initialMatchState.statusEffects[selectedFusionWithTalents.id].buffs.push(effect);
        } else {
          initialMatchState.statusEffects[selectedFusionWithTalents.id].debuffs.push(effect);
        }
      });
    }
    tempLogs.push(...playerOnStartResults.logs);

    const opponentOnStartResults = processOnStartTriggers({
      fusionOrbs: opponentLoadedOrbs,
      fusion: opponentFusion,
      targetFusion: selectedFusionWithTalents,
      currentHp: initialMatchState.hp[opponentFusion.id],
      maxHp: getEffectiveStatsWithTalents(opponentFusion).hp,
      logs: []
    });
    initialMatchState.hp[opponentFusion.id] = Math.max(
      0,
      Math.min(getEffectiveStatsWithTalents(opponentFusion).hp,
        initialMatchState.hp[opponentFusion.id] + opponentOnStartResults.hpChange)
    );
    if (opponentOnStartResults.statusEffects.length > 0) {
      if (!initialMatchState.statusEffects[opponentFusion.id]) {
        initialMatchState.statusEffects[opponentFusion.id] = { buffs: [], debuffs: [] };
      }
      opponentOnStartResults.statusEffects.forEach((effect) => {
        if (effect.type === 'buff') {
          initialMatchState.statusEffects[opponentFusion.id].buffs.push(effect);
        } else {
          initialMatchState.statusEffects[opponentFusion.id].debuffs.push(effect);
        }
      });
    }
    tempLogs.push(...opponentOnStartResults.logs);

    if (tempLogs.length > 0) {
      initialMatchState.log = [
        ...initialMatchState.log,
        ...tempLogs.map((log) => ({
          turn: initialMatchState.turnNumber,
          actor: 'system',
          action: 'Orb Trigger',
          result: log.result
        }))];

    }

    setMatch(initialMatchState);
    setBattleLog(initialMatchState.log);
    setHp({
      playerHP: initialMatchState.hp[selectedFusionWithTalents.id],
      opponentHP: initialMatchState.hp[opponentFusion.id]
    });

    } catch (error) {
      console.error('❌ Error selecting fusion for campaign:', error);
      setError('Failed to start battle: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [selectableFusions, currentUser, allAbilities, opponentFusion, campaignStage, loadOrbsFromFusionDoc]);

  // handleAiTurn function (moved AI logic here)
  const handleAiTurn = useCallback(async () => {
    // AI needs a slight delay to feel more natural
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Ensure opponent and abilities are loaded before proceeding
    if (!opponentFusion || allAbilities.length === 0 || !match || battleResults) {// Don't run AI if battle is over
      console.log("AI waiting for data or match is not ready or battle is over.");
      // If match isn't ready or opponent/abilities are missing, AI passes its turn.
      if (!battleResults) {// Only end turn if battle isn't already finished
        await handleEndTurn(false);
      }
      return;
    }

    // Get AI's available abilities (not on cooldown)
    const aiAbilityIds = opponentFusion.abilities || [];
    const aiCooldowns = match.cooldowns?.[OPPONENT_ID] || {};

    const availableAiAbilities = aiAbilityIds.
      map((abilityId) => allAbilities.find((a) => a.id === abilityId)).
      filter((ability) => {
        if (!ability) return false;
        const cooldown = aiCooldowns[ability.id];
        return !cooldown || cooldown === 0;
      });

    let chosenAbility = null;

    if (availableAiAbilities.length > 0) {
      const attackAbilities = availableAiAbilities.filter((a) => a.type === 'attack');
      if (attackAbilities.length > 0) {
        chosenAbility = attackAbilities[Math.floor(Math.random() * attackAbilities.length)];
      } else {
        chosenAbility = availableAiAbilities[Math.floor(Math.random() * availableAiAbilities.length)];
      }

      console.log("AI chose ability:", chosenAbility.name);
      await handleUseAbility(chosenAbility, false); // AI uses ability
    } else {
      console.log("AI has no available abilities, ending turn.");
      await handleEndTurn(false); // AI ends turn
    }
  }, [opponentFusion, allAbilities, match, handleUseAbility, handleEndTurn, battleResults]);


  // Enhanced useEffect to handle turn determination and AI logic
  useEffect(() => {
    if (!match || !currentUser || !playerFusion || !opponentFusion || battleResults) return; // Stop if battle results are already shown

    // Determine whose turn it is based on the global turn number
    const currentTurnDetermined = determineTurn(match.turnNumber || 1, match.players || [], currentUser.id);
    if (turn !== currentTurnDetermined) {// Only update if it actually changed
      setTurn(currentTurnDetermined);
    }

    // Update battle log from match log
    if (match.log && Array.isArray(match.log)) {
      setBattleLog(match.log);
    } else {
      setBattleLog([]); // Ensure it's always an array
    }

    // Handle AI turn for PvE
    if (isPve && currentTurnDetermined === 'opponent' && match.state === 'in_progress') {
      const aiTurnTimeout = setTimeout(() => {
        handleAiTurn();
      }, 2000); // 2 second delay for AI turn

      return () => clearTimeout(aiTurnTimeout);
    }

    // For PvP, the turn is determined by the server state through `match`
    // and this useEffect updates the local `turn` state.
  }, [match, currentUser, playerFusion, opponentFusion, isPve, determineTurn, handleAiTurn, turn, battleResults]);


  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading Battle Arena...</p>
        </div>
      </div>);
  }

  if (error) {
    const isCanceledError = error.toLowerCase().includes('canceled');
    const isAuthError = error.toLowerCase().includes('log in again') || error.toLowerCase().includes('authentication failed') || error.toLowerCase().includes('session has expired');

    return (
      <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`bg-gray-800 p-8 rounded-lg shadow-2xl border ${isCanceledError ? 'border-yellow-500/50' : isAuthError ? 'border-red-500/50' : 'border-red-500/50'} text-center`}>

          <h2 className={`text-2xl font-bold mb-4 ${isCanceledError ? 'text-yellow-400' : isAuthError ? 'text-red-400' : 'text-red-400'}`}>
            {isCanceledError ? 'Match Canceled' : isAuthError ? 'Authentication Required' : 'An Error Occurred'}
          </h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <Link to={createPageUrl('Campaign')}>
            <Button className="game-button-primary">
              {isCanceledError || isAuthError ? 'OK' : 'Go Back'}
            </Button>
          </Link>
        </motion.div>
      </div>);
  }

  // If in campaign mode and no player fusion selected yet, show selection screen with normal layout
  if (battleType === 'campaign' && !playerFusion && selectableFusions.length > 0 && !loading) {
    return (
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-4 text-purple-400 font-title">Select Your Abomination</h2>
          <p className="text-gray-300 text-lg">Choose which horror shall face the {campaignStage?.name}</p>
          {campaignStage &&
            <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-600 inline-block">
              <h3 className="text-xl font-semibold text-yellow-300 mb-2">{campaignStage.name}</h3>
              <p className="text-gray-400">{campaignStage.description}</p>

              <div className="flex items-center justify-center gap-4 mt-3">
                {/* Echoes */}
                <div className="flex items-center gap-2">
                  <Gem className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-300">{campaignStage.rewardShards} Echoes</span>
                </div>

                {/* Fragments */}
                {campaignStage.isBoss &&
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-300">{campaignStage.stageNumber <= currentUser?.campaignProgress
                      ? getCampaignReplayFragments(campaignStage) : campaignStage.rewardFragments} Fragments</span>
                  </div>
                }

                {campaignStage.isBoss &&
                  <Badge className="bg-red-500/20 text-red-300 border-red-500/50">
                    Boss Stage
                  </Badge>
                }
              </div>
            </div>
          }
        </div>

        {selectableFusions.length === 0 ?
          <div className="text-center">
            <div className="bg-gray-800/50 border border-red-500/50 rounded-lg p-8">
              <p className="text-red-400 mb-4 text-lg">You need an abomination with abilities to enter battle!</p>
              <p className="text-gray-400 mb-6">Your abominations must be equipped with abilities before they can face the cosmic trials.</p>
              <Link to={createPageUrl('MyFusions')}>
                <Button className="game-button-primary">
                  Manage Your Abominations
                </Button>
              </Link>
            </div>
          </div> :

          <div className="game-card-grid gap-4 xl:gap-6 relative game-gallery rounded-2xl p-3 sm:p-5 xl:p-8 border border-purple-500/30">
            {selectableFusions.map((fusion) =>
              <motion.div
                key={fusion.id}
                onClick={() => handleSelectFusionForCampaign(fusion.id)} className="min-w-0 flex flex-col">

                <FusionCard
                  fusion={fusion}
                  equippedOrbs={fusion.loadedEquippedOrbs}>
                </FusionCard>
              </motion.div>
            )}
          </div>
        }
      </div>);

  }

  if (!playerFusion || !opponentFusion) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <p className="text-white text-xl">Preparing for battle...</p>
      </div>);
  }

  const activeCooldowns = match?.cooldowns?.[currentUser?.id] || {};
  const playerStatusEffects = match?.statusEffects?.[playerFusion?.id] || { buffs: [], debuffs: [] };
  const opponentStatusEffects = match?.statusEffects?.[opponentFusion?.id] || { buffs: [], debuffs: [] };


  // Main Battle View - Full screen
  return (
    <div className="fixed inset-0 bg-gray-900 z-50">
      {/* Dynamic Background Layer */}
      {backgroundImage ?
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
          style={{ backgroundImage: `url(${backgroundImage})`, opacity: 1 }} /> :


        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900" />
      }
      <div className="absolute inset-0 bg-black/30" />

      <div className="absolute inset-0 z-10 overflow-y-auto overscroll-contain">
        <BattleUI
          match={match}
          playerFusion={playerFusion}
          opponentFusion={opponentFusion}
          opponentUser={opponentUser}
          playerAbilities={playerAbilities}
          allAbilities={allAbilities} // Pass all abilities to the UI component
          activeCooldowns={activeCooldowns}
          isPlayerTurn={turn === 'player'}
          onUseAbility={(ability) => handleUseAbility(ability, true)}
          onEndTurn={() => handleEndTurn(true)}
          battleLog={battleLog || []}
          currentUser={currentUser}
          isPve={isPve}
          playerHp={hp.playerHP}
          opponentHp={hp.opponentHP}
          maxPlayerHp={maxPlayerHp}
          maxOpponentHp={maxOpponentHp}
          campaignStage={isPve && campaignStage?.stageNumber <= currentUser?.campaignProgress
            ? { ...campaignStage, rewardFragments: getCampaignReplayFragments(campaignStage) }
            : campaignStage}
          statusEffects={{ player: playerStatusEffects, opponent: opponentStatusEffects }}
          backgroundImage={backgroundImage}
          loadingBackground={loadingBackground}
          onPlayAgain={() => {// Reset state for replay if desired, or navigate back
            setBattleResults(null); // Clear battle results
            setMatch(null);
            setPlayerFusion(null);
            setOpponentFusion(null);
            setPlayerOrbs([]);
            setOpponentOrbs([]);
            setWinnerIdState(null);
            setOpponentUser(null); // Clear opponent user data
            // Re-trigger data load for campaigns or navigate
            if (battleType === 'campaign') {
              window.location.reload(); // Choose a fighter for the same stage
            } else {
              window.location.href = createPageUrl('Home'); // Go back home for PvP
            }
          }}
          battleResults={battleResults} // Pass battle results for display
          winnerId={winnerIdState} // Pass winner ID for display
          playerOrbs={playerOrbs}
          opponentOrbs={opponentOrbs} />

      </div>
    </div>);

}