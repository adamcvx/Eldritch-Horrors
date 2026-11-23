import AscendDialog from '@/components/cards/AscendDialog';
import { ascensionOffer, MAX_FUSION_LEVEL } from '@/api/ascension';
import WalletBadge from '@/components/user/WalletBadge';

import React, { useState, useEffect, useCallback } from 'react';
import { Fusion } from '@/entities/Fusion';
import { User } from '@/entities/User';
import { Talent } from '@/entities/Talent'; // Added Talent import
import { PlayerOrb } from '@/entities/PlayerOrb'; // Added PlayerOrb import for optimized loading
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Loader2, Gem, ArrowUp, Skull, X, Settings, TrendingUp, Trash2, Star, Heart, Zap, Shield, Wind, Beaker } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FusionCard from '../components/cards/FusionCard';
import { calculateTalentBonuses, getEffectiveCost } from '../components/talents/TalentService';
import { getCurrentUserWithDefaults, getGlobalEconomySettings } from '../components/user/UserService';
import PopupDialog, { PopupSection, PopupPreview, PopupCostBreakdown, PopupWarning } from '../components/ui/PopupDialog';
import { useAppContext } from '../components/context/AppContext';
import { playButtonClick, playLevelUp, playAmbientSanctum } from '../components/sounds/SoundService';
import { getPlayerEquippedOrbs, lookupOrbsById } from '../components/orbs/OrbService'; // Import lookupOrbsById

// Update LevelUpDialog to accept effectiveCost as prop instead of calculating it
const LevelUpDialog = ({ fusion, currentUser, effectiveCost, onLevelUp, onClose }) => {
  const [leveling, setLeveling] = useState(false);

  // baseLevelUpCost is still needed for display purposes in the dialog
  const baseLevelUpCost = 10;

  const canAfford = currentUser && effectiveCost !== null && (currentUser.currency || 0) >= effectiveCost;

  // Calculate stat bonuses based on 2% of base stats
  const statBonus = {
    hp: Math.max(1, Math.round(fusion.stats.hp * 0.02)),
    attack: Math.max(1, Math.round(fusion.stats.attack * 0.02)),
    defense: Math.max(1, Math.round(fusion.stats.defense * 0.02)),
    speed: Math.max(1, Math.round(fusion.stats.speed * 0.02))
  };

  const handleLevelUp = async () => {
    // effectiveCost is passed as a prop, so no need to check for null here.
    // The check for `fusion.level >= 25` and `!canAfford` is sufficient.
    if (!canAfford || fusion.level >= 25) return;

    setLeveling(true);
    try {
      const newLevelBonus = {
        hp: (fusion.levelBonus?.hp || 0) + statBonus.hp,
        attack: (fusion.levelBonus?.attack || 0) + statBonus.attack,
        defense: (fusion.levelBonus?.defense || 0) + statBonus.defense,
        speed: (fusion.levelBonus?.speed || 0) + statBonus.speed
      };

      const newCurrency = (currentUser.currency || 0) - effectiveCost;

      await Promise.all([
      Fusion.update(fusion.id, {
        level: fusion.level + 1,
        levelBonus: newLevelBonus
      }),
      User.updateMyUserData({ currency: newCurrency })]
      );

      onLevelUp(newLevelBonus, newCurrency);
    } catch (error) {
      console.error('Error leveling up abomination:', error);
    } finally {
      setLeveling(false);
    }
  };

  const actions = [
  {
    text: "Cancel",
    icon: X,
    onClick: onClose,
    variant: "outline",
    className: "border-gray-600 text-gray-300 hover:bg-gray-700"
  },
  {
    text: "Empower",
    loadingText: "Empowering...",
    icon: ArrowUp,
    loadingIcon: Loader2,
    onClick: handleLevelUp,
    disabled: !canAfford || fusion.level >= 25, // Disabled if max level reached or can't afford
    loading: leveling,
    className: "game-button-primary"
  }];


  return (
    <PopupDialog
      open={!!fusion}
      onClose={onClose}
      title={`Empower ${fusion.fusedName}`}
      titleIcon={Star}
      actions={actions}
      loading={leveling}>

      {/* Fusion Preview */}
      <PopupPreview>
        <img src={fusion.generatedImage} alt={fusion.fusedName}
          className="w-24 h-24 rounded-lg mx-auto mb-3 border-2 border-border" />

        <div className="font-title text-4xl font-bold text-primary mb-2">
          Level {fusion.level} → {fusion.level + 1}
        </div>
        <p className="text-gray-400">Channel forbidden energies into your abomination.</p>
      </PopupPreview>

      {/* Stat Bonuses Information */}
      <PopupSection
        title="Stat Bonuses (2% of Base Stats)"
        titleIcon={TrendingUp}
        bgColor="bg-green-500/10"
        borderColor="border-green-500/50"
        titleColor="text-green-300">

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-400" />
            <span>HP: +{statBonus.hp}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span>Attack: +{statBonus.attack}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <span>Defense: +{statBonus.defense}</span>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-green-400" />
            <span>Speed: +{statBonus.speed}</span>
          </div>
        </div>
      </PopupSection>

      {/* Cost and Balance Information */}
      <PopupSection title="Empowerment Cost" titleIcon={Gem}>
        {/* effectiveCost is guaranteed to be not null if dialog is rendered, simplifies logic */}
        <PopupCostBreakdown
          items={[
          ...(effectiveCost < baseLevelUpCost ? [
          { label: "Base cost", value: `${baseLevelUpCost} Echoes` },
          { label: "Talent reduction", value: `-${baseLevelUpCost - effectiveCost} Echoes`, color: "text-green-300" },
          { label: "Effective cost", value: `${effectiveCost} Echoes`, color: "text-purple-300" }] :
          [
          { label: "Required Echoes", value: `${effectiveCost} Echoes` }]),

          { label: "Your current balance", value: `${currentUser.currency || 0} Echoes` }]
          }
          totalLabel="Balance after ritual"
          totalValue={`${(currentUser.currency || 0) - effectiveCost} Echoes`}
          totalColor={canAfford ? 'text-green-300' : 'text-red-300'} />

      </PopupSection>

      {/* Warning if can't afford or max level */}
      {!canAfford && // No need to check `effectiveCost !== null` as it's a prop
      <PopupWarning message="Insufficient Echoes for this ritual" />
      }
      {fusion.level >= 25 &&
      <PopupWarning message="This abomination has reached its maximum power (Level 25)." type="info" />
      }
    </PopupDialog>);

};

const DeletionConfirmModal = ({ fusion, onConfirm, onCancel, currentUser, economySettings }) => {
  const [deleting, setDeleting] = useState(false);
  const [effectiveRefunds, setEffectiveRefunds] = useState({ base: 0, leveling: 0 });

  // Calculate effective refunds based on what was actually paid
  useEffect(() => {
    const calculateEffectiveRefunds = async () => {
      if (!fusion || !economySettings || !currentUser) return;

      // Base fusion refund - calculate what they actually paid to create it
      const baseFusionCost = economySettings.fusionCost;
      const effectiveCreationCost = await getEffectiveCost(baseFusionCost, currentUser.learnedTalents || []);
      const baseRefund = Math.floor(effectiveCreationCost * (economySettings.fusionRefundAmount / economySettings.fusionCost));

      // Leveling refund - calculate what they would have paid for each level
      const levelsGained = (fusion.level || 1) - 1;
      let totalLevelingRefund = 0;

      if (levelsGained > 0) {
        // For each level, calculate what they would have paid with their current talents
        const baseLevelUpCost = 10; // This is a fixed base cost for level up
        const effectiveLevelUpCost = await getEffectiveCost(baseLevelUpCost, currentUser.learnedTalents || []);
        const totalLevelingCost = levelsGained * effectiveLevelUpCost;
        totalLevelingRefund = Math.floor(totalLevelingCost * economySettings.fusionLevelingRefundRate);
      }

      setEffectiveRefunds({
        base: baseRefund,
        leveling: totalLevelingRefund
      });
    };

    calculateEffectiveRefunds();
  }, [fusion, economySettings, currentUser]);

  if (!fusion || !economySettings || !currentUser) return null; // Ensure currentUser is available before rendering

  const totalRefund = effectiveRefunds.base + effectiveRefunds.leveling;

  const handleConfirm = async () => {
    setDeleting(true);
    await onConfirm(totalRefund); // Pass the calculated refund
    setDeleting(false);
  };

  const actions = [
  {
    text: "Keep Abomination",
    icon: X,
    onClick: onCancel,
    variant: "outline",
    className: "border-gray-600 text-gray-300 hover:bg-gray-700"
  },
  {
    text: "Banish Forever",
    loadingText: "Banishing...",
    icon: Skull,
    loadingIcon: Loader2,
    onClick: handleConfirm,
    loading: deleting,
    className: "bg-red-600 hover:bg-red-700 text-white"
  }];


  return (
    <PopupDialog
      open={!!fusion}
      onClose={onCancel}
      title="Banish Abomination"
      titleIcon={Skull}
      titleColor="text-red-400"
      actions={actions}
      loading={deleting}>

      {/* Fusion Preview */}
      <PopupPreview>
        <img src={fusion.generatedImage} alt={fusion.fusedName}
          className="w-24 h-24 rounded-lg mx-auto mb-3 border-2 border-red-500/30" />

        <h3 className="font-bold text-lg mb-1">{fusion.fusedName}</h3>
        <p className="text-gray-400 text-sm">Level {fusion.level || 1}</p>
      </PopupPreview>

      {/* Warning Message */}
      <PopupWarning message="This ritual cannot be undone. Your abomination will be permanently banished to the void." />

      {/* Refund Information */}
      <PopupSection
        title="Echo Refund"
        titleIcon={Gem}
        bgColor="bg-green-500/10"
        borderColor="border-green-500/50"
        titleColor="text-green-300">

        <PopupCostBreakdown
          items={[
          { label: "Base refund", value: `${effectiveRefunds.base} Echoes`, color: "text-green-300" },
          ...(effectiveRefunds.leveling > 0 ? [{
            label: "Leveling refund",
            value: `${effectiveRefunds.leveling} Echoes`,
            color: "text-green-300"
          }] : []),
          { label: "Your current balance", value: `${currentUser?.currency || 0} Echoes` }]
          }
          totalLabel="New balance after refund"
          totalValue={`${(currentUser?.currency || 0) + totalRefund} Echoes`}
          totalColor="text-green-300" />

      </PopupSection>
    </PopupDialog>);

};

export default function MyFusions() {
  const { currentUser, economySettings, updateUserData } = useAppContext();
  const [fusions, setFusions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fusionToAscend, setFusionToAscend] = useState(null);
  const [fusionToDelete, setFusionToDelete] = useState(null);
  const [fusionToLevelUp, setFusionToLevelUp] = useState(null);
  const [preCalculatedCosts, setPreCalculatedCosts] = useState(null);
  const [empoweringFusion, setEmpoweringFusion] = useState(null);
  const [banishingFusions, setBanishingFusions] = useState(new Set());

  // Start ambient music when component mounts
  useEffect(() => {
    playAmbientSanctum();
  }, []);

  // Retry function with exponential backoff
  const retryWithBackoff = useCallback(async (fn, maxRetries = 3, baseDelay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const isRateLimit = error.message?.includes('429') || error.message?.includes('Rate limit');

        if (isRateLimit && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
          console.warn(`Rate limit hit, retrying in ${Math.round(delay)}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      if (!currentUser || !economySettings) return;
      setError(null);

      // 1. Fetch ALL necessary data in parallel to be efficient
      const [talentsData, userFusions, allPlayerOrbs] = await Promise.all([
      retryWithBackoff(() => Talent.list()),
      retryWithBackoff(() => Fusion.filter({ playerOwner: currentUser.id }, '-created_date')),
      retryWithBackoff(() => PlayerOrb.filter({ playerId: currentUser.id, equippedToFusion: { $ne: null } }))]
      );

      // 2. Efficiently look up all required base orb details at once
      const equippedOrbIds = [...new Set(allPlayerOrbs.map((po) => po.orbId))];
      const orbsById = await lookupOrbsById(equippedOrbIds);

      // 3. Group player orbs by the fusion they are equipped to
      const orbsByFusionId = allPlayerOrbs.reduce((acc, playerOrb) => {
        const fusionId = playerOrb.equippedToFusion;
        if (!acc[fusionId]) {
          acc[fusionId] = [];
        }
        const orbDetails = orbsById[playerOrb.orbId];
        if (orbDetails) {
          acc[fusionId].push({
            ...orbDetails,
            playerOrbId: playerOrb.id
          });
        }
        return acc;
      }, {});

      // 4. Process fusions with all data pre-fetched, including calculating talent bonuses
      const processedFusions = await Promise.all(
        (userFusions || []).map(async (fusion) => {
          // Get equipped orbs from our pre-processed map
          const loadedEquippedOrbs = orbsByFusionId[fusion.id] || [];

          // Calculate talent bonus with pre-fetched talent data
          const talentBonus = await calculateTalentBonuses(
            currentUser.learnedTalents || [],
            fusion.stats,
            talentsData
          );

          return {
            ...fusion,
            talentBonus,
            loadedEquippedOrbs
          };
        })
      );

      setFusions(processedFusions);

      // 5. Pre-calculate costs using pre-fetched talent data
      const baseLevelUpCost = 10;
      const effectiveLevelUpCost = await getEffectiveCost(baseLevelUpCost, currentUser.learnedTalents || [], talentsData);
      setPreCalculatedCosts({
        base: baseLevelUpCost,
        effective: effectiveLevelUpCost,
        reduction: baseLevelUpCost - effectiveLevelUpCost
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      setError(`Failed to load fusions: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [currentUser, economySettings, retryWithBackoff]);


  // Modified refresh function for specific fusion (used after empowering)
  const refreshSpecificFusion = useCallback(async (fusionId) => {
    try {
      if (!currentUser) return;

      // Fetch all necessary data for a single fusion efficiently
      const [talentsData, updatedFusionResults] = await Promise.all([
      retryWithBackoff(() => Talent.list()),
      retryWithBackoff(() => Fusion.filter({ id: fusionId }))]
      );

      if (updatedFusionResults.length === 0) {
        console.warn(`Fusion with ID ${fusionId} not found during refresh.`);
        return;
      }
      const updatedFusion = updatedFusionResults[0];

      // Use the service to get equipped orbs
      const equippedOrbs = await getPlayerEquippedOrbs(currentUser.id, updatedFusion.id);

      // Calculate talent bonus with pre-fetched data
      const talentBonus = await calculateTalentBonuses(
        currentUser.learnedTalents || [],
        updatedFusion.stats,
        talentsData
      );

      const fusionWithBonuses = {
        ...updatedFusion,
        talentBonus,
        loadedEquippedOrbs: equippedOrbs
      };

      // Update only this fusion in the state
      setFusions((prevFusions) =>
      prevFusions.map((f) => f.id === fusionId ? fusionWithBonuses : f)
      );
    } catch (error) {
      console.error('Error refreshing specific fusion:', error);
      await loadData(); // Fallback to full refresh
    }
  }, [currentUser, loadData, retryWithBackoff]);

  useEffect(() => {
    if (currentUser && economySettings) {
      loadData();
    }
  }, [currentUser, economySettings, loadData]);

  const handleDeleteFusion = (fusion) => {
    playButtonClick();
    setFusionToDelete(fusion);
  };

  const confirmDeletion = async (calculatedRefund) => {
    if (!fusionToDelete) return;

    const fusionId = fusionToDelete.id;

    // Add this fusion to banishing set to prevent duplicate deletions
    setBanishingFusions((prev) => new Set(prev).add(fusionId));
    // Close the dialog immediately
    setFusionToDelete(null);

    try {
      const totalRefund = calculatedRefund;

      await Fusion.delete(fusionId);

      await User.updateMyUserData({
        currency: (currentUser.currency || 0) + totalRefund
      });

      // Update local state and context
      setFusions((prev) => prev.filter((f) => f.id !== fusionId));
      updateUserData({ currency: (currentUser.currency || 0) + totalRefund });

    } catch (error) {
      console.error('Error deleting abomination:', error);
      alert('Failed to delete abomination. Please try again.');
    } finally {
      // Remove from banishing set after the operation is fully complete
      setBanishingFusions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fusionId);
        return newSet;
      });
    }
  };

  const cancelDeletion = () => {
    setFusionToDelete(null);
  };

  const handleLevelUpClick = (fusion) => {
    playButtonClick();
    if (fusion.level < 25) {
      setFusionToLevelUp(fusion);
    }
  };

  const handleLevelUpClose = () => {
    playButtonClick();
    setFusionToLevelUp(null);
  };

  const handleLevelUpSuccess = async (newLevelBonus, newCurrency) => {
    const empoweredFusionId = fusionToLevelUp.id;

    // Play level up sound
    playLevelUp();

    // Close the dialog immediately
    setFusionToLevelUp(null);

    // Set empowering state to prevent multiple clicks on the card button
    setEmpoweringFusion(empoweredFusionId);

    // Optimistically update the currency, which is displayed globally
    updateUserData({ currency: newCurrency });

    // Refresh the single empowered fusion from the database to update its state.
    // Since this is very fast, we no longer need the optimistic update for the fusion itself.
    await refreshSpecificFusion(empoweredFusionId);

    // Clear empowering state to allow future empowerments
    setEmpoweringFusion(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
      </div>);

  }

  // Add error display
  if (error) {
    return (
      <div className="container mx-auto">
        <Card className="bg-red-900/20 border-red-500/50 mb-8">
          <CardHeader>
            <CardTitle className="text-red-400">Error Loading Fusions</CardTitle>
            <p className="text-red-300">{error}</p>
            <Button
              onClick={() => {
                setError(null);
                setLoading(true);
                loadData();
              }}
              className="mt-4 bg-red-600 hover:bg-red-700">

              Retry
            </Button>
          </CardHeader>
        </Card>
      </div>);

  }

  return (
    <div className="container mx-auto">
      {/* Header */}
      <Card className="game-hero game-hero--collection mb-8">
        <CardHeader>
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div>
              <CardTitle className="flex items-center gap-3">
                <Star className="w-8 h-8 text-purple-400" />
                <span className="text-3xl">My Abominations</span>
              </CardTitle>
              <p className="text-gray-400 mt-2">Manage and empower your collection of horrors.</p>
            </div>
            {currentUser &&
            <div className="flex items-center gap-4">
                <WalletBadge amount={currentUser.currency} />
                <WalletBadge amount={currentUser.voidFragments} fragments />
              </div>
            }
          </div>
        </CardHeader>
      </Card>

      {fusions.length === 0 ?
      <div className="text-center py-16">
          <p className="text-gray-400 text-lg mb-6">You have not conjured any abominations yet.</p>
          <Link to={createPageUrl('FusionLab')}>
            <Button className="game-button-primary">Visit the Flesh Altar</Button>
          </Link>
        </div> :

      <div className="game-card-grid gap-4 xl:gap-6 game-gallery relative rounded-lg p-3 sm:p-5 xl:p-8 border">
          <AnimatePresence>
            {fusions.map((fusion) => {
            const isMaxLevel = fusion.level >= MAX_FUSION_LEVEL;
            const canAscend = Boolean(ascensionOffer(fusion));
            const isEmpowering = empoweringFusion === fusion.id;
            const isBanishing = banishingFusions.has(fusion.id);

            return (
              <motion.div
                key={fusion.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }} className="min-w-0 w-full flex flex-col">


                  <FusionCard
                  fusion={fusion}
                  equippedOrbs={fusion.loadedEquippedOrbs}
                  headerContent={
                  <Button
                    variant="destructive"
                    size="icon" className="bg-red-900/70 text-red-300 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 w-8 h-8 hover:bg-red-800 border border-red-700/80 hover:text-white"

                    onClick={() => handleDeleteFusion(fusion)}
                    disabled={isBanishing}>

                        {isBanishing ?
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" /> :

                    <Trash2 className="w-4 h-4" />
                    }
                      </Button>
                  } />

                  
                  {/* Empower Controls Card */}
                  <Card className="bg-gray-800/60 text-card-foreground mt-4 w-full shadow-sm backdrop-blur-sm border border-gray-600/50 rounded-lg">
                    <CardContent className="p-6 pt-2 pr-2 pb-2 pl-2">
                      <div className="flex flex-col gap-3">
                        {/* Empower Button */}
                        <Button
                        onClick={() => isMaxLevel ? setFusionToAscend(fusion) : handleLevelUpClick(fusion)}
                        className={`game-button-primary text-sm w-full ${(isMaxLevel && !canAscend) || isEmpowering || isBanishing ? 'opacity-50' : ''}`}
                        disabled={(isMaxLevel && !canAscend) || isEmpowering || isBanishing}>

                          {isEmpowering ?
                        <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              Empowering...
                            </> :
                        isMaxLevel ?
                        <><Star className="w-4 h-4" />{canAscend ? "Ascend" : "Fully Ascended"}</> :

                        <>
                              <TrendingUp className="w-4 h-4 mr-1" />
                              Empower
                            </>
                        }
                        </Button>

                        {/* Ability Status */}
                        <div className="flex justify-center items-center pt-2 border-t border-gray-600/50">
                          <div className="text-xs text-gray-400">
                            {!fusion.abilities || fusion.abilities.length === 0 ?
                          <span className="text-red-400">No abilities assigned</span> :

                          <span className="text-green-400">Battle ready</span>
                          }
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>);

          })}
          </AnimatePresence>
        </div>
      }

      {fusionToAscend && <AscendDialog fusion={fusionToAscend}
        fragments={currentUser?.voidFragments ?? 0}
        onClose={() => setFusionToAscend(null)}
        onAscended={({ fusion, voidFragments }) => {
          setFusions(rows => rows.map(row => row.id === fusion.id ? { ...row, ...fusion } : row));
          updateUserData({ voidFragments });
          setFusionToAscend(null);
        }} />}

      {/* Level Up Confirmation Modal */}
      {fusionToLevelUp && preCalculatedCosts &&
      <LevelUpDialog
        fusion={fusionToLevelUp}
        currentUser={currentUser}
        effectiveCost={preCalculatedCosts.effective}
        onLevelUp={handleLevelUpSuccess}
        onClose={handleLevelUpClose} />

      }

      {/* Deletion Confirmation Modal */}
      {fusionToDelete &&
      <DeletionConfirmModal
        fusion={fusionToDelete}
        onConfirm={confirmDeletion}
        onCancel={cancelDeletion}
        currentUser={currentUser}
        economySettings={economySettings} />

      }
    </div>);

}