
import React, { useState, useEffect, useCallback } from 'react';
import { Orb } from '@/entities/Orb';
import { Ability } from '@/entities/Ability';
import { Fusion } from '@/entities/Fusion';
import { User } from '@/entities/User';
import { PlayerOrb } from '@/entities/PlayerOrb';
import { Talent } from '@/entities/Talent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Eye, Filter, Gem, Star, Zap, X, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import OrbCard from '../components/orbs/OrbCard';
import AbilityCard from '../components/abilities/AbilityCard';
import FusionCard from '../components/cards/FusionCard';
import { getPlayerAvailableOrbs, getPlayerEquippedOrbs, equipOrbToFusion, unequipOrbFromFusion, calculateOrbSlots, lookupOrbsById } from '../components/orbs/OrbService';
import { useAppContext } from '../components/context/AppContext';
import { calculateTalentBonuses, getEffectiveCost } from '../components/talents/TalentService';
import { playButtonClick, playOrbEquip, playAbilityEquip, playAmbientSanctum } from '../components/sounds/SoundService';
import PopupDialog, { PopupSection, PopupCostBreakdown, PopupWarning } from '../components/ui/PopupDialog';

const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimit = error.message?.includes('429') || error.message?.includes('Rate limit');
      if (isRateLimit && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 500;
        console.warn(`Rate limit hit, retrying in ${delay.toFixed(0)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};

export default function Equipment() {
  const { currentUser, updateUserData, economySettings } = useAppContext();
  const [availablePlayerOrbs, setAvailablePlayerOrbs] = useState([]);
  const [allAbilities, setAllAbilities] = useState([]);
  const [playerFusions, setPlayerFusions] = useState([]);
  const [selectedFusion, setSelectedFusion] = useState(null);
  const [equippedOrbs, setEquippedOrbs] = useState([]);
  const [equippedAbilities, setEquippedAbilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRarity, setFilterRarity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [equipAction, setEquipAction] = useState(null);
  const [activeTab, setActiveTab] = useState('orbs');
  const [orbToEquip, setOrbToEquip] = useState(null); // New state for orb confirmation
  const [orbEquipCost, setOrbEquipCost] = useState(null); // New state for calculated cost
  const [orbToDestroy, setOrbToDestroy] = useState(null);

  useEffect(() => {
    playAmbientSanctum();
  }, []);

  const processOrbInventories = useCallback(async (currentFusion, allPlayerOrbInstances) => {
    const equipped = [];
    const available = [];

    const allOrbIds = [...new Set(allPlayerOrbInstances.map((po) => po.orbId))];
    const orbsById = await lookupOrbsById(allOrbIds);

    allPlayerOrbInstances.forEach((playerOrb) => {
      const details = orbsById[playerOrb.orbId];
      if (!details) {
        console.warn(`Orb details not found for playerOrbId: ${playerOrb.id}, orbId: ${playerOrb.orbId}`);
        return;
      }

      const orbData = {
        ...details,
        playerOrbId: playerOrb.id,
        isEquipped: !!playerOrb.equippedToFusion,
        equippedToFusion: playerOrb.equippedToFusion
      };

      if (currentFusion && playerOrb.equippedToFusion === currentFusion.id) {
        equipped.push(orbData);
      } else if (!playerOrb.equippedToFusion) {
        available.push(orbData);
      }
    });

    setEquippedOrbs(equipped);
    setAvailablePlayerOrbs(available);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);

        const [abilities, rawFusions, talentsData] = await Promise.all([
        retryWithBackoff(() => Ability.list()),
        retryWithBackoff(() => Fusion.filter({ playerOwner: currentUser.id })),
        retryWithBackoff(() => Talent.list())]
        );

        const fusions = await Promise.all(
          (rawFusions || []).map(async (fusion) => {
            const talentBonus = await calculateTalentBonuses(
              currentUser.learnedTalents || [],
              fusion.stats,
              talentsData
            );
            return { ...fusion, talentBonus };
          })
        );

        setAllAbilities(abilities || []);
        setPlayerFusions(fusions || []);

        setSelectedFusion(previous => fusions.find(fusion => fusion.id === previous?.id) ?? fusions[0] ?? null);

      } catch (error) {
        console.error('Error loading equipment data:', error);
        alert(`Failed to load equipment data. Please try again. Error: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [currentUser]);

  useEffect(() => {
    const updateDisplayForSelectedFusion = async () => {
      if (!currentUser || !selectedFusion) {
        setEquippedOrbs([]);
        setAvailablePlayerOrbs([]);
        setEquippedAbilities([]);
        return;
      }

      try {
        setLoading(true);
        const playerOrbs = await retryWithBackoff(() => PlayerOrb.filter({ playerId: currentUser.id }));
        await processOrbInventories(selectedFusion, playerOrbs || []);

        const currentEquippedAbilities = allAbilities.filter((ability) =>
        (selectedFusion.abilities || []).includes(ability.id)
        );
        setEquippedAbilities(currentEquippedAbilities);
      } catch (error) {
        console.error('Error updating display for selected fusion:', error);
      } finally {
        setLoading(false);
      }
    };

    updateDisplayForSelectedFusion();
  }, [selectedFusion, currentUser, allAbilities, processOrbInventories]);


  const handleFusionSelect = (fusionId) => {
    playButtonClick();
    const fusion = playerFusions.find((f) => f.id === fusionId);
    if (fusion) {
      setSelectedFusion(fusion);
    }
  };

  const handleEquipOrbRequest = async (orb) => {
    if (!selectedFusion || !currentUser) return;

    const currentEquippedCount = equippedOrbs.length;
    if (currentEquippedCount >= calculateOrbSlots(selectedFusion.level)) {
      alert('All orb slots are full! Unequip an orb first.');
      return;
    }

    const effectiveCost = await getEffectiveCost(orb.costToEquip, currentUser.learnedTalents || []);

    setOrbToEquip(orb);
    setOrbEquipCost({
      base: orb.costToEquip,
      effective: effectiveCost
    });
    playButtonClick();
  };

  const handleConfirmEquipOrb = async () => {
    if (!orbToEquip || !selectedFusion || !currentUser || !orbEquipCost) return;

    if ((currentUser.currency || 0) < orbEquipCost.effective) {
      alert('Insufficient Echoes to equip this orb!');
      return;
    }

    playOrbEquip();
    setEquipAction(`equip-orb-${orbToEquip.playerOrbId}`);

    try {
      const success = await retryWithBackoff(() =>
      equipOrbToFusion(orbToEquip.playerOrbId, selectedFusion.id)
      );

      if (!success) {
        throw new Error('Failed to equip orb');
      }

      await retryWithBackoff(() =>
      User.updateMyUserData({ currency: (currentUser.currency || 0) - orbEquipCost.effective })
      );
      updateUserData({ currency: (currentUser.currency || 0) - orbEquipCost.effective });

      const playerOrbs = await retryWithBackoff(() => PlayerOrb.filter({ playerId: currentUser.id }));
      await processOrbInventories(selectedFusion, playerOrbs || []);

    } catch (error) {
      console.error('Error equipping orb:', error);
      alert('Failed to equip orb. Please try again.');
    } finally {
      setEquipAction(null);
      setOrbToEquip(null);
      setOrbEquipCost(null);
    }
  };

  const handleCancelEquipOrb = () => {
    setOrbToEquip(null);
    setOrbEquipCost(null);
    playButtonClick();
  };

  const handleDestroyOrbRequest = (orb) => {
    setOrbToDestroy(orb);
    playButtonClick();
  };

  const handleCancelDestroyOrb = () => {
    setOrbToDestroy(null);
    playButtonClick();
  };

  const handleConfirmDestroyOrb = async () => {
    if (!orbToDestroy || !currentUser) return;

    playButtonClick();
    setEquipAction(`destroy-orb-${orbToDestroy.playerOrbId}`);

    try {
      // 1. Delete the PlayerOrb instance
      await retryWithBackoff(() => PlayerOrb.delete(orbToDestroy.playerOrbId));

      // 2. Calculate and apply refund
      const refundAmount = Math.floor(orbToDestroy.costToEquip * 0.5);
      if (refundAmount > 0) {
        await retryWithBackoff(() => User.updateMyUserData({
          currency: (currentUser.currency || 0) + refundAmount
        }));
        updateUserData({ currency: (currentUser.currency || 0) + refundAmount });
      }

      // 3. Refresh orb inventories
      const playerOrbs = await retryWithBackoff(() => PlayerOrb.filter({ playerId: currentUser.id }));
      await processOrbInventories(selectedFusion, playerOrbs || []);

    } catch (error) {
      console.error('Error destroying orb:', error);
      alert('Failed to destroy orb. Please try again.');
    } finally {
      setEquipAction(null);
      setOrbToDestroy(null);
    }
  };

  const handleUnequipOrb = async (orb) => {
    if (!selectedFusion || !currentUser || !economySettings) return;

    playButtonClick();
    setEquipAction(`unequip-orb-${orb.playerOrbId}`);

    try {
      const success = await retryWithBackoff(() =>
      unequipOrbFromFusion(orb.playerOrbId)
      );

      if (!success) {
        throw new Error('Failed to unequip orb');
      }

      const refundAmount = Math.floor(orb.costToEquip * 0.5);
      await retryWithBackoff(() =>
      User.updateMyUserData({ currency: (currentUser.currency || 0) + refundAmount })
      );
      updateUserData({ currency: (currentUser.currency || 0) + refundAmount });

      const playerOrbs = await retryWithBackoff(() => PlayerOrb.filter({ playerId: currentUser.id }));
      await processOrbInventories(selectedFusion, playerOrbs || []);

    } catch (error) {
      console.error('Error unequipping orb:', error);
      alert('Failed to unequip orb. Please try again.');
    } finally {
      setEquipAction(null);
    }
  };

  const handleEquipAbility = async (ability) => {
    if (!selectedFusion || (equippedAbilities || []).length >= 4) {
      alert('Maximum of 4 abilities can be equipped.');
      return;
    }

    playAbilityEquip();
    setEquipAction(`equip-ability-${ability.id}`);
    try {
      const currentAbilities = selectedFusion.abilities || [];
      const updatedAbilities = [...currentAbilities, ability.id];

      await retryWithBackoff(() =>
      Fusion.update(selectedFusion.id, { abilities: updatedAbilities })
      );

      const updatedFusion = { ...selectedFusion, abilities: updatedAbilities };

      setPlayerFusions((prev) => prev.map((f) => f.id === selectedFusion.id ? updatedFusion : f));

      setSelectedFusion(updatedFusion);

    } catch (error) {
      console.error('Error equipping ability:', error);
      alert('Failed to equip ability. Please try again.');
    } finally {
      setEquipAction(null);
    }
  };

  const handleUnequipAbility = async (ability) => {
    if (!selectedFusion) return;

    playButtonClick();
    setEquipAction(`unequip-ability-${ability.id}`);
    try {
      const currentAbilities = selectedFusion.abilities || [];
      const updatedAbilities = currentAbilities.filter((id) => id !== ability.id);

      await retryWithBackoff(() =>
      Fusion.update(selectedFusion.id, { abilities: updatedAbilities })
      );

      const updatedFusion = { ...selectedFusion, abilities: updatedAbilities };

      setPlayerFusions((prev) => prev.map((f) => f.id === selectedFusion.id ? updatedFusion : f));

      setSelectedFusion(updatedFusion);

    } catch (error) {
      console.error('Error unequipping ability:', error);
      alert('Failed to unequip ability. Please try again.');
    } finally {
      setEquipAction(null);
    }
  };

  const filteredAvailableOrbs = (availablePlayerOrbs || []).
  filter((orb) => {
    const rarityMatch = filterRarity === 'all' || orb.rarity === filterRarity;
    const typeMatch = filterType === 'all' || orb.orbType === filterType;
    return !orb.isEquipped && rarityMatch && typeMatch;
  });

  const getAvailableAbilities = () => {
    const equippedIds = (equippedAbilities || []).map((a) => a.id);
    return (allAbilities || []).filter((ability) => !equippedIds.includes(ability.id));
  };

  const availableAbilities = getAvailableAbilities();
  const orbSlots = selectedFusion ? calculateOrbSlots(selectedFusion.level) : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
      </div>);

  }

  if (playerFusions.length === 0) {
    return (
      <div className="container mx-auto max-w-4xl text-center py-16">
        <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Abominations Found</h2>
        <p className="text-gray-400">You need abominations to equip items. Visit the Flesh Altar to create one.</p>
      </div>);

  }

  return (
    <div className="container mx-auto max-w-7xl">
      <div className="text-left mb-8">
        <h1 className="text-4xl font-bold">Abomination Equipment</h1>
        <p className="text-gray-400 mt-2">Enhance your abominations with eldritch orbs and forbidden abilities.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6 p-16">
          <Card className="bg-gray-800/50 text-card-foreground rounded-lg border shadow-sm border-gray-700">
            <CardHeader><CardTitle>Select Abomination</CardTitle></CardHeader>
            <CardContent>
              <Select value={selectedFusion?.id || ''} onValueChange={handleFusionSelect}>
                <SelectTrigger><SelectValue placeholder="Choose abomination" /></SelectTrigger>
                <SelectContent>
                  {playerFusions.map((fusion) =>
                  <SelectItem key={fusion.id} value={fusion.id}>
                      <div className="flex flex-col">
                        <span className="font-semibold">{fusion.fusedName}</span>
                        <span className="text-xs text-gray-400">Level {fusion.level}</span>
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedFusion && <FusionCard fusion={selectedFusion} equippedOrbs={equippedOrbs} />}
        </div>

        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="orbs" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Eldritch Orbs
              </TabsTrigger>
              <TabsTrigger value="abilities" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Ability Glyphs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="orbs" className="space-y-6">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4">
                  <Select value={filterRarity} onValueChange={setFilterRarity}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Rarities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Rarities</SelectItem>
                      <SelectItem value="Ephemeral">Ephemeral</SelectItem>
                      <SelectItem value="Uncanny">Uncanny</SelectItem>
                      <SelectItem value="Abyssal">Abyssal</SelectItem>
                      <SelectItem value="Cosmic">Cosmic</SelectItem>
                      <SelectItem value="Outer">Outer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="attack">Attack</SelectItem>
                      <SelectItem value="lifesteal">Lifesteal</SelectItem>
                      <SelectItem value="selfdamage">Self Damage</SelectItem>
                      <SelectItem value="debuff">Debuff</SelectItem>
                      <SelectItem value="immunity">Immunity</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle>Equipped Orbs ({(equippedOrbs || []).length}/{calculateOrbSlots(selectedFusion?.level || 1)})</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 pr-6 pb-6 pl-6 lg:grid-cols-2 gap-4">
                  {(equippedOrbs || []).length === 0 ?
                  <p className="text-gray-400 text-center py-4">No orbs equipped</p> :
                  <div className="pt-8 pr-8 pb-8 pl-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                      {equippedOrbs.map((orb) =>
                    <OrbCard
                      key={orb.playerOrbId}
                      orb={orb}
                      fusionOriginType={selectedFusion?.originType}
                      onUnequip={handleUnequipOrb}
                      isEquipped={true}
                      size="small" />
                    )}
                    </div>
                  }
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle>Available Orbs ({filteredAvailableOrbs.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-8 pr-16 pb-8 pl-16">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                    {filteredAvailableOrbs.map((orb) =>
                    <OrbCard
                      key={orb.playerOrbId}
                      orb={orb}
                      fusionOriginType={selectedFusion?.originType}
                      onEquip={handleEquipOrbRequest}
                      onDestroy={handleDestroyOrbRequest}
                      canEquip={
                      (equippedOrbs || []).length < calculateOrbSlots(selectedFusion?.level || 1) &&
                      !equipAction
                      }
                      size="small" />

                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="abilities" className="space-y-6">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader><CardTitle>Equipped Abilities ({(equippedAbilities || []).length}/4)</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(equippedAbilities || []).length > 0 ?
                  equippedAbilities.map((ability) =>
                  <AbilityCard
                    key={ability.id}
                    ability={ability}
                    fusion={selectedFusion}
                    onAction={handleUnequipAbility}
                    isEquipped
                    disabled={equipAction === `unequip-ability-${ability.id}`} />
                  ) :
                  <p className="text-gray-400 text-center col-span-2 py-4">No abilities equipped.</p>
                  }
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader><CardTitle>Available Abilities</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableAbilities.map((ability) =>
                  <AbilityCard
                    key={ability.id}
                    ability={ability}
                    fusion={selectedFusion}
                    onAction={handleEquipAbility}
                    disabled={(equippedAbilities || []).length >= 4 || equipAction === `equip-ability-${ability.id}`} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {orbToEquip && orbEquipCost &&
      <PopupDialog
        open={true}
        onClose={handleCancelEquipOrb}
        title="Equip Eldritch Orb"
        titleIcon={Eye}
        actions={[
        {
          text: "Cancel",
          icon: X,
          onClick: handleCancelEquipOrb,
          variant: "outline",
          className: "border-gray-600 text-gray-300 hover:bg-gray-700"
        },
        {
          text: "Equip Orb",
          icon: Zap,
          onClick: handleConfirmEquipOrb,
          disabled: (currentUser?.currency || 0) < orbEquipCost.effective,
          className: "bg-purple-600 hover:bg-purple-700"
        }]
        }>

          <PopupSection title="Orb Details" titleIcon={Eye}>
            <div className="flex items-center gap-4 p-4 bg-gray-700/30 rounded-lg">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center border-2 border-purple-500/30">
                <Eye className="w-8 h-8 text-purple-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-lg">{orbToEquip.name}</h4>
                <p className="text-sm text-gray-400 mb-2">{orbToEquip.orbType} • {orbToEquip.rarity}</p>
                <p className="text-xs text-gray-300">{orbToEquip.description}</p>
              </div>
            </div>
          </PopupSection>

          <PopupSection
          title="Equip Cost"
          titleIcon={Gem}
          bgColor="bg-gray-700/30"
          borderColor="border-gray-600"
          titleColor="text-gray-300">

            <PopupCostBreakdown
            items={[
            ...(orbEquipCost.effective < orbEquipCost.base ? [
            { label: "Base cost", value: `${orbEquipCost.base} Echoes` },
            { label: "Talent reduction", value: `-${orbEquipCost.base - orbEquipCost.effective} Echoes`, color: "text-green-300" },
            { label: "Effective cost", value: `${orbEquipCost.effective} Echoes`, color: "text-purple-300" }] :
            [
            { label: "Required Echoes", value: `${orbEquipCost.effective} Echoes` }]),

            { label: "Your current balance", value: `${currentUser?.currency || 0} Echoes` }]
            }
            totalLabel="Balance after equip"
            totalValue={`${(currentUser?.currency || 0) - orbEquipCost.effective} Echoes`}
            totalColor={
            (currentUser?.currency || 0) >= orbEquipCost.effective ? 'text-green-300' : 'text-red-300'
            } />

          </PopupSection>

          {(currentUser?.currency || 0) < orbEquipCost.effective &&
        <PopupWarning message="Insufficient Echoes to equip this orb" />
        }
        </PopupDialog>
      }

      {orbToDestroy &&
      <PopupDialog
        open={true}
        onClose={handleCancelDestroyOrb}
        title="Destroy Eldritch Orb"
        titleIcon={Trash2}
        titleColor="text-red-400"
        actions={[
        {
          text: "Cancel",
          icon: X,
          onClick: handleCancelDestroyOrb,
          variant: "outline",
          className: "border-gray-600 text-gray-300 hover:bg-gray-700"
        },
        {
          text: "Destroy Orb",
          icon: Trash2,
          onClick: handleConfirmDestroyOrb,
          variant: "destructive",
          className: "bg-red-800 hover:bg-red-700"
        }]
        }>

          <PopupWarning message="This action is permanent and cannot be undone." />
          
          <PopupSection title="Orb to Destroy" titleIcon={Eye}>
            <div className="flex items-center gap-4 p-4 bg-gray-700/30 rounded-lg">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center border-2 border-red-500/30">
                <Trash2 className="w-8 h-8 text-red-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-lg">{orbToDestroy.name}</h4>
                <p className="text-sm text-gray-400 mb-2">{orbToDestroy.orbType} • {orbToDestroy.rarity}</p>
                <p className="text-xs text-gray-300">{orbToDestroy.description}</p>
              </div>
            </div>
          </PopupSection>

          <PopupSection title="Reclaimed Essence" titleIcon={Gem} bgColor="bg-gray-700/30" borderColor="border-gray-600" titleColor="text-gray-300">
            <PopupCostBreakdown
            items={[
            { label: "Base orb value", value: `${orbToDestroy.costToEquip} Echoes` },
            { label: "Refund amount (50%)", value: `${Math.floor(orbToDestroy.costToEquip * 0.5)} Echoes`, color: "text-green-300" },
            { label: "Your current balance", value: `${currentUser?.currency || 0} Echoes` }]
            }
            totalLabel="Balance after refund"
            totalValue={`${(currentUser?.currency || 0) + Math.floor(orbToDestroy.costToEquip * 0.5)} Echoes`}
            totalColor='text-green-300' />

          </PopupSection>
        </PopupDialog>
      }
    </div>);

}