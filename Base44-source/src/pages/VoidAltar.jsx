
import React, { useState, useEffect } from 'react';
import { Fusion } from '@/entities/Fusion';
import { User } from '@/entities/User';
import { useAppContext } from '../components/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Aperture, Star, ArrowRight, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FusionCard from '../components/cards/FusionCard';
import PopupDialog, { PopupSection, PopupPreview, PopupCostBreakdown, PopupWarning } from '../components/ui/PopupDialog';
import { playAmbientSanctum, playButtonClick, playFusionSuccess, playFusionStart } from '../components/sounds/SoundService';
import { calculateTalentBonuses } from '../components/talents/TalentService'; // Removed calculateAscensionBonuses
import { Talent } from '@/entities/Talent';
import { PlayerOrb } from '@/entities/PlayerOrb';
import { lookupOrbsById } from '../components/orbs/OrbService';

const ASCENSION_COSTS = [25, 50, 75, 100, 125]; // 0->1, 1->2, 2->3, 3->4, 4->5

export default function VoidAltar() {
  const { currentUser, updateUserData } = useAppContext();
  const [fusions, setFusions] = useState([]);
  const [selectedFusion, setSelectedFusion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAscending, setIsAscending] = useState(false);
  const [ascensionSuccess, setAscensionSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    playAmbientSanctum();
  }, []);

  useEffect(() => {
    const loadFusions = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        // Get ALL user fusions first, then filter in JavaScript
        const [userFusions, talentsData, allPlayerOrbs] = await Promise.all([
        Fusion.filter({ playerOwner: currentUser.id }),
        Talent.list(),
        PlayerOrb.filter({ playerId: currentUser.id, equippedToFusion: { $ne: null } })]
        );

        // Filter for fusions that can still be ascended (ascensionLevel < 5 or undefined)
        const ascendableFusions = userFusions.filter((fusion) => {
          const currentLevel = fusion.ascensionLevel || 0;
          return currentLevel < 5;
        });

        const equippedOrbIds = [...new Set(allPlayerOrbs.map((po) => po.orbId))];
        const orbsById = await lookupOrbsById(equippedOrbIds);
        const orbsByFusionId = allPlayerOrbs.reduce((acc, playerOrb) => {
          const fusionId = playerOrb.equippedToFusion;
          if (!acc[fusionId]) acc[fusionId] = [];
          const orbDetails = orbsById[playerOrb.orbId];
          if (orbDetails) {
            acc[fusionId].push({ ...orbDetails, playerOrbId: playerOrb.id });
          }
          return acc;
        }, {});

        const processedFusions = await Promise.all(
          (ascendableFusions || []).map(async (fusion) => {
            const talentBonus = await calculateTalentBonuses(currentUser.learnedTalents || [], fusion.stats, talentsData);
            const loadedEquippedOrbs = orbsByFusionId[fusion.id] || [];
            return { ...fusion, talentBonus, loadedEquippedOrbs };
          })
        );

        setFusions(processedFusions);
      } catch (e) {
        setError('Failed to load your abominations.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadFusions();
  }, [currentUser, ascensionSuccess]);

  const handleSelectFusion = (fusion) => {
    playButtonClick();
    setSelectedFusion(fusion);
    setAscensionSuccess(false);
  };

  const handleAscension = async () => {
    const currentLevel = selectedFusion?.ascensionLevel || 0;
    if (currentLevel >= 5) return;

    const cost = ASCENSION_COSTS[currentLevel];
    if (!selectedFusion || !currentUser || (currentUser.voidFragments || 0) < cost) return;

    setIsAscending(true);
    playFusionStart();

    try {
      const newAscensionLevel = currentLevel + 1;

      // Calculate 10% bonus for current base stats
      const statIncrease = {
        hp: Math.round(selectedFusion.stats.hp * 0.10),
        attack: Math.round(selectedFusion.stats.attack * 0.10),
        defense: Math.round(selectedFusion.stats.defense * 0.10),
        speed: Math.round(selectedFusion.stats.speed * 0.10)
      };

      // Apply the bonus directly to base stats
      const newBaseStats = {
        hp: selectedFusion.stats.hp + statIncrease.hp,
        attack: selectedFusion.stats.attack + statIncrease.attack,
        defense: selectedFusion.stats.defense + statIncrease.defense,
        speed: selectedFusion.stats.speed + statIncrease.speed
      };

      await Fusion.update(selectedFusion.id, {
        ascensionLevel: newAscensionLevel,
        stats: newBaseStats
      });

      const newFragments = (currentUser.voidFragments || 0) - cost;
      await User.updateMyUserData({ voidFragments: newFragments });

      updateUserData({ voidFragments: newFragments });

      // Update the selected fusion in-place for the success screen
      setSelectedFusion((prev) => ({
        ...prev,
        ascensionLevel: newAscensionLevel,
        stats: newBaseStats // Directly update stats
      }));
      setAscensionSuccess(true);
      playFusionSuccess();

    } catch (e) {
      setError('The ritual failed. The connection to the void was unstable.');
      console.error(e);
    } finally {
      setIsAscending(false);
    }
  };

  const resetAltar = () => {
    playButtonClick();
    setSelectedFusion(null);
    setAscensionSuccess(false);
  };

  const renderSelectionState = () =>
  <>
      <Card className="bg-gray-800/50 border-gray-700 mb-8">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-3">
                <Aperture className="w-8 h-8 text-purple-400" />
                <span className="text-3xl">Void Altar</span>
              </CardTitle>
              <p className="text-gray-400 mt-2">Offer Void Fragments to ascend your abominations, granting them permanent power.</p>
            </div>
            {currentUser &&
          <div className="flex items-center gap-2 bg-indigo-500/20 px-4 py-2 rounded-lg border border-indigo-500/50">
                <Star className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-indigo-300">{currentUser.voidFragments || 0}</span>
                <span className="text-gray-400 text-sm">Fragments</span>
              </div>
          }
          </div>
        </CardHeader>
      </Card>

      {loading && <div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}
      
      {fusions.length === 0 && !loading &&
    <div className="text-center py-16">
          <p className="text-gray-400 text-lg mb-6">All your abominations are fully ascended, or you have none to empower.</p>
        </div>
    }

      <div className="game-card-grid gap-4 xl:gap-6 relative bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 rounded-2xl p-3 sm:p-5 xl:p-8 border border-purple-500/30">
        {fusions.map((fusion) =>
      <motion.div key={fusion.id} layout className="min-w-0 flex flex-col items-center gap-3">
            <FusionCard fusion={fusion} />
            <Button onClick={() => handleSelectFusion(fusion)} aria-label={'Ascend ' + fusion.fusedName}>Ascend</Button>
          </motion.div>
      )}
      </div>
    </>;


  const renderConfirmationState = () => {
    const currentLevel = selectedFusion.ascensionLevel || 0;
    if (currentLevel >= 5) return renderSelectionState(); // Should not happen with filters, but safe

    const cost = ASCENSION_COSTS[currentLevel];
    const canAfford = (currentUser?.voidFragments || 0) >= cost;

    // Calculate what the stat increases will be (10% of current base stats)
    const statIncrease = {
      hp: Math.round(selectedFusion.stats.hp * 0.10),
      attack: Math.round(selectedFusion.stats.attack * 0.10),
      defense: Math.round(selectedFusion.stats.defense * 0.10),
      speed: Math.round(selectedFusion.stats.speed * 0.10)
    };

    return (
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <motion.div layoutId={`fusion-card-${selectedFusion.id}`}>
            <FusionCard fusion={selectedFusion} />
          </motion.div>
          <Card className="bg-gray-800/80 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-purple-300 text-2xl flex items-center gap-2">
                Ascend 
                <div className="flex items-center gap-1">
                  {[...Array(currentLevel)].map((_, i) => <Star key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" />)}
                </div>
                <ArrowRight />
                <div className="flex items-center gap-1">
                  {[...Array(currentLevel + 1)].map((_, i) => <Star key={i} className="w-5 h-5 text-yellow-300" fill="currentColor" />)}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <PopupSection title="Stat Enhancement (+10% per Star)" titleIcon={TrendingUp} bgColor="bg-green-900/20" borderColor="border-green-500/30" titleColor="text-green-300">
                 <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.keys(selectedFusion.stats).map((stat) =>
                  <div key={stat} className="flex items-center gap-2">
                      <span className="capitalize text-gray-400">{stat}:</span>
                      <span className="text-gray-300">{selectedFusion.stats[stat]}</span>
                      <ArrowRight className="w-4 h-4 text-gray-500" />
                      <span className="font-bold text-green-300">+{statIncrease[stat]}</span>
                    </div>
                  )}
                 </div>
              </PopupSection>
              
              <PopupSection title="Ritual Cost" titleIcon={Star}>
                <PopupCostBreakdown
                  items={[
                  { label: "Required Fragments", value: `${cost}` },
                  { label: "Your Fragments", value: `${currentUser?.voidFragments || 0}` }]
                  }
                  totalLabel="Fragments After Ritual"
                  totalValue={`${(currentUser?.voidFragments || 0) - cost}`}
                  totalColor={canAfford ? 'text-green-300' : 'text-red-400'} />
              </PopupSection>
              
              {!canAfford && <PopupWarning message="You lack the Void Fragments. Defeat Forbidden Path chapter bosses to earn more." />}

              <div className="flex gap-4">
                <Button variant="outline" onClick={resetAltar} className="w-full">Back</Button>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={!canAfford || isAscending}
                  onClick={handleAscension}>
                  {isAscending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Aperture className="w-4 h-4 mr-2" />}
                  {isAscending ? 'Ascending...' : 'Begin Ritual'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>);

  };

  const renderSuccessState = () =>
  <div className="max-w-md mx-auto text-center">
      <h2 className="text-3xl font-bold text-purple-300 mb-4">Ascension Complete!</h2>
      <p className="text-gray-400 mb-6">{selectedFusion.fusedName} has reached a new level of power!</p>
      <motion.div layoutId={`fusion-card-${selectedFusion.id}`} className="max-w-md mx-auto text-center flex-shrink-0 flex flex-col p-8 space-y-6">
        <FusionCard fusion={selectedFusion} />
      </motion.div>
      <Button onClick={resetAltar} className="mt-8 w-full bg-purple-600 hover:bg-purple-700">
        Return to the Altar
      </Button>
    </div>;


  return (
    <div className="container mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedFusion ? ascensionSuccess ? 'success' : 'confirm' : 'select'}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}>
          {selectedFusion ? ascensionSuccess ? renderSuccessState() : renderConfirmationState() : renderSelectionState()}
        </motion.div>
      </AnimatePresence>
    </div>);

}