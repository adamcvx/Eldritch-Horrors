
import React, { useState, useEffect, useCallback } from 'react';
import { Orb } from '@/entities/Orb';
import { Ability } from '@/entities/Ability';
import { Fusion } from '@/entities/Fusion';
import { User } from '@/entities/User';
import { PlayerOrb } from '@/entities/PlayerOrb';
import { Talent } from '@/entities/Talent';
import { Input } from '@/components/ui/input';
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
  const [search, setSearch] = useState('');
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

  const query = search.trim().toLowerCase();
  const matchesSearch = item => [item.name, item.description, item.type, item.orbType]
    .some(value => typeof value === 'string' && value.toLowerCase().includes(query));
  const orbTypes = [...new Set(availablePlayerOrbs.map(orb => orb.orbType).filter(Boolean))].sort();

  const filteredAvailableOrbs = (availablePlayerOrbs || []).
  filter((orb) => {
    const rarityMatch = filterRarity === 'all' || orb.rarity === filterRarity;
    const typeMatch = filterType === 'all' || orb.orbType === filterType;
    return !orb.isEquipped && rarityMatch && typeMatch && matchesSearch(orb);
  });

  const getAvailableAbilities = () => {
    const equippedIds = (equippedAbilities || []).map((a) => a.id);
    return (allAbilities || []).filter((ability) => !equippedIds.includes(ability.id) && matchesSearch(ability));
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
      <header className="game-hero equipment-hero mb-6 rounded-lg border">
        <h1 className="text-3xl font-bold text-primary sm:text-4xl">Abomination Equipment</h1>
        <p className="mt-1 text-muted-foreground">Choose an abomination and manage its orbs and ability glyphs.</p>
      </header>

      <div className="equipment-workbench">
        <aside className="equipment-station min-w-0 self-start">
          <label id="loadout-fighter-label" className="block text-sm font-semibold text-primary">Abomination</label>
          <Select value={selectedFusion?.id || ''} onValueChange={handleFusionSelect}>
            <SelectTrigger aria-labelledby="loadout-fighter-label">
              <SelectValue placeholder="Choose abomination" />
            </SelectTrigger>
            <SelectContent>
              {playerFusions.map(fusion => <SelectItem key={fusion.id} value={fusion.id}>{fusion.fusedName}</SelectItem>)}
            </SelectContent>
          </Select>
          {selectedFusion && <>
            <div className="flex min-w-0 items-center gap-3 border-y py-3">
              {selectedFusion.generatedImage && <img className="size-14 shrink-0 rounded border object-cover"
                src={selectedFusion.generatedImage} alt="" />}
              <div className="min-w-0">
                <h2 className="break-words text-xl font-bold">{selectedFusion.fusedName}</h2>
                <p className="text-sm text-muted-foreground">Level {selectedFusion.level} · {selectedFusion.originType}</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div><dt className="text-muted-foreground">Orb slots</dt><dd>{equippedOrbs.length} / {orbSlots}</dd></div>
              <div><dt className="text-muted-foreground">Glyph slots</dt><dd>{equippedAbilities.length} / 4</dd></div>
            </dl>
            <details className="min-w-0">
              <summary className="cursor-pointer text-sm font-semibold text-primary">View stats and card</summary>
              <div className="mt-3"><FusionCard fusion={selectedFusion} equippedOrbs={equippedOrbs} /></div>
            </details>
          </>}
        </aside>

        <Tabs value={activeTab} onValueChange={tab => { setActiveTab(tab); setSearch(''); }} className="min-w-0">
          <TabsList className="equipment-tabs grid h-auto w-full grid-cols-2 gap-2">
            <TabsTrigger value="orbs"><Eye className="size-4" /> Eldritch Orbs</TabsTrigger>
            <TabsTrigger value="abilities"><Zap className="size-4" /> Ability Glyphs</TabsTrigger>
          </TabsList>

          <TabsContent value="orbs" className="space-y-4">
            <section className="equipment-station" aria-labelledby="equipped-orbs">
              <h2 id="equipped-orbs" className="text-2xl font-bold">Equipped orbs <span>{equippedOrbs.length}/{orbSlots}</span></h2>
              {equippedOrbs.length ? <div className="equipment-items">{equippedOrbs.map(orb => <OrbCard
                key={orb.playerOrbId} orb={orb} fusionOriginType={selectedFusion?.originType}
                onUnequip={handleUnequipOrb} isEquipped />)}</div>
                : <p className="text-sm text-muted-foreground">No orbs equipped. Choose an orb from your inventory below.</p>}
            </section>
            <section className="equipment-station" aria-labelledby="orb-inventory">
              <h2 id="orb-inventory" className="text-2xl font-bold">Orb inventory <span>{filteredAvailableOrbs.length}</span></h2>
              <div className="equipment-filters">
                <Input aria-label="Search orbs" placeholder="Search orbs" value={search} onChange={event => setSearch(event.target.value)} />
                <Select value={filterRarity} onValueChange={setFilterRarity}>
                  <SelectTrigger aria-label="Filter by rarity"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All rarities</SelectItem>
                    {['Ephemeral', 'Uncanny', 'Abyssal', 'Cosmic', 'Outer'].map(rarity =>
                      <SelectItem key={rarity} value={rarity}>{rarity}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger aria-label="Filter by orb type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {orbTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {equippedOrbs.length >= orbSlots && <p className="text-sm text-muted-foreground">Orb slots are full. Unequip an orb to make room.</p>}
              {filteredAvailableOrbs.length ? <div className="equipment-items">{filteredAvailableOrbs.map(orb => <OrbCard
                key={orb.playerOrbId} orb={orb} fusionOriginType={selectedFusion?.originType}
                onEquip={handleEquipOrbRequest} onDestroy={handleDestroyOrbRequest}
                canEquip={Boolean(selectedFusion) && equippedOrbs.length < orbSlots && !equipAction} />)}</div>
                : <p className="text-sm text-muted-foreground">No unequipped orbs match this view.</p>}
            </section>
          </TabsContent>

          <TabsContent value="abilities" className="space-y-4">
            <section className="equipment-station" aria-labelledby="equipped-glyphs">
              <h2 id="equipped-glyphs" className="text-2xl font-bold">Equipped glyphs <span>{equippedAbilities.length}/4</span></h2>
              {equippedAbilities.length ? <div className="equipment-items">{equippedAbilities.map(ability => <AbilityCard
                key={ability.id} ability={ability} fusion={selectedFusion} onAction={handleUnequipAbility}
                isEquipped disabled={Boolean(equipAction)} />)}</div>
                : <p className="text-sm text-muted-foreground">Equip at least one glyph to use this abomination in battle.</p>}
            </section>
            <section className="equipment-station" aria-labelledby="glyph-library">
              <h2 id="glyph-library" className="text-2xl font-bold">Glyph library <span>{availableAbilities.length}</span></h2>
              <Input aria-label="Search glyphs" placeholder="Search glyphs" value={search} onChange={event => setSearch(event.target.value)} />
              {equippedAbilities.length >= 4 && <p className="text-sm text-muted-foreground">Glyph slots are full. Unequip a glyph to make room.</p>}
              {availableAbilities.length ? <div className="equipment-items">{availableAbilities.map(ability => <AbilityCard
                key={ability.id} ability={ability} fusion={selectedFusion} onAction={handleEquipAbility}
                disabled={!selectedFusion || equippedAbilities.length >= 4 || Boolean(equipAction)} />)}</div>
                : <p className="text-sm text-muted-foreground">No available glyphs match this view.</p>}
            </section>
          </TabsContent>
        </Tabs>
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
          className: "game-button-primary"
        }]
        }>

          <PopupSection title="Orb Details" titleIcon={Eye}>
            <div className="flex items-center gap-4 p-4 bg-gray-700/30 rounded-lg">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center border-2 border-border">
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
            { label: "Effective cost", value: `${orbEquipCost.effective} Echoes`, color: "text-primary" }] :
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