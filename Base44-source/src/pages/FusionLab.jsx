import { isLocalPreview } from '@/api/base44Client';
import { cloudEnabled } from '@/api/cloudSave';

import React, { useState, useEffect } from 'react';
import { Horror } from '@/entities/Horror';
import { Fusion } from '@/entities/Fusion';
import { User } from '@/entities/User';
import { GenerateImage, InvokeLLM } from '@/integrations/Core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { GitMerge, Zap, Shield, Heart, Wind, Loader2, Swords, HeartPulse, BrainCircuit, Gem, X, Beaker, BookOpen, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import RarityBadge from '../components/RarityBadge';
import { getOriginType, getSynergyDetails } from '../components/synergy/SynergyService';
import { Images } from '@/entities/Images';
import FusionCard from '../components/cards/FusionCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PopupDialog, { PopupSection, PopupPreview, PopupGrid, PopupPreviewItem, PopupCostBreakdown, PopupWarning } from '../components/ui/PopupDialog';
import { getEffectiveCost } from '../components/talents/TalentService';
import { useAppContext } from '../components/context/AppContext';
import { playMenuClick, playMenuHover, playFusionStart, playFusionSuccess, playAmbientSanctum } from '../components/sounds/SoundService';

const StatIcon = ({ stat }) => {
  const icons = {
    hp: <Heart className="w-4 h-4 text-red-400" />,
    attack: <Zap className="w-4 h-4 text-yellow-400" />,
    defense: <Shield className="w-4 h-4 text-blue-400" />,
    speed: <Wind className="w-4 h-4 text-green-400" />
  };
  return icons[stat] || null;
};

const HorrorCard = ({ horror, onSelect, isSelected, isDisabled }) => {
  const synergy = getSynergyDetails(horror.origin);

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.05, zIndex: 10 }}
      whileTap={{ scale: 0.95 }}
      className={`group cursor-pointer rounded-2xl overflow-hidden shadow-lg transition-all duration-300 
                ${isSelected ? 'ring-4 ring-purple-500' : 'ring-2 ring-gray-700'}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={() => !isDisabled && onSelect(horror)}>
      
      <div className="relative h-48 bg-gray-800 overflow-hidden">
        {/* Background fill (blurred & scaled) */}
        <img
          src={horror.image}
          alt={`${horror.name} background`}
          className="absolute inset-0 w-full h-full object-cover blur-md scale-110 opacity-60" />
        

        {/* Foreground art (uncropped) */}
        <img
          src={horror.image}
          alt={horror.name}
          className="relative z-10 w-full h-full object-contain" />
        

        {/* Origin badge */}
        <div className="absolute top-2 right-2 bg-cyan-600/20 text-cyan-300 px-2 py-1 rounded-full text-xs font-semibold z-20">
          {getOriginType(horror.origin)}
        </div>

        {/* Tome button */}
        <Link
          to={createPageUrl(`HorrorTome?horrorId=${horror.id}`)}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-2 left-2 z-20">

          <Button
            size="sm"
            variant="outline" className="bg-purple-600 text-primary-foreground px-2 py-2 text-sm font-medium border border-input hover:text-accent-foreground inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 hover:bg-purple-700 w-full"

            onMouseEnter={playMenuHover}
            onClick={playMenuClick}>

            <BookOpen className="w-3 h-3 mr-1" />
            Tome
          </Button>
        </Link>
      </div>

      {/* Card body */}
      <div className="p-4 bg-gray-900 backdrop-blur-sm">
        <h3 className="font-bold text-lg text-white">{horror.name}</h3>
        <p className="text-xs text-gray-400 mb-3 h-8">{horror.description}</p>

        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          {Object.entries(horror.baseStats).map(([stat, value]) =>
          <div key={stat} className="flex items-center gap-2 text-gray-300">
              <StatIcon stat={stat} />
              <span>{value}</span>
            </div>
          )}
        </div>

        <div className="border-t border-gray-600/50 pt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {synergy.strong &&
          <div className="text-emerald-200 flex items-center gap-1.5">
              <Swords className="w-3 h-3" /> Strong vs {synergy.strong}
            </div>
          }
          {synergy.weak &&
          <div className="flex items-center gap-1.5 text-red-400">
              <Shield className="w-3 h-3" /> Weak vs {synergy.weak}
            </div>
          }
          {synergy.resist &&
          <div className="flex items-center gap-1.5 text-blue-400">
              <HeartPulse className="w-3 h-3" /> Resists {synergy.resist}
            </div>
          }
          {synergy.vulnerable &&
          <div className="flex items-center gap-1.5 text-yellow-400">
              <BrainCircuit className="w-3 h-3" /> Vulnerable to {synergy.vulnerable}
            </div>
          }
        </div>
      </div>
    </motion.div>);

};

const RARITY_CONFIG = {
  Outer: { probability: 0.01, multiplier: 1.30 },
  Cosmic: { probability: 0.04, multiplier: 1.20 },
  Abyssal: { probability: 0.15, multiplier: 1.12 },
  Uncanny: { probability: 0.30, multiplier: 1.05 },
  Ephemeral: { probability: 0.50, multiplier: 1.00 }
};

const determineRarity = () => {
  const rand = Math.random();
  let cumulativeProbability = 0;
  for (const [rarity, config] of Object.entries(RARITY_CONFIG)) {
    cumulativeProbability += config.probability;
    if (rand < cumulativeProbability) {
      return rarity;
    }
  }
  return 'Ephemeral'; // Fallback
};

const FusionConfirmationModal = ({ selectedHorrors, currentUser, effectiveCost, onConfirm, onCancel, loading }) => {
  // effectiveCost is now passed as a prop, containing both base and effective values
  if (!selectedHorrors || selectedHorrors.length !== 2 || effectiveCost === null) return null;

  const canAfford = currentUser && (currentUser.currency || 0) >= effectiveCost.effective;

  const actions = [
  {
    text: "Cancel",
    icon: X,
    onClick: onCancel,
    variant: "outline",
    className: "border-gray-600 text-gray-300 hover:bg-gray-700"
  },
  {
    text: "Fuse Abominations!",
    loadingText: "Conjuring...",
    icon: GitMerge,
    loadingIcon: Loader2,
    onClick: onConfirm,
    disabled: !canAfford,
    loading: loading,
    className: "bg-purple-600 hover:bg-purple-700"
  }];


  return (
    <PopupDialog
      open={true}
      onClose={onCancel}
      title="Forge Abomination"
      titleIcon={GitMerge}
      actions={actions}
      loading={loading}>

      {/* Selected Horrors Preview */}
      <PopupPreview>
        <p className="text-gray-400 mb-3">Merging these unholy essences:</p>
        <PopupGrid columns={2}>
          {selectedHorrors.map((horror) =>
          <PopupPreviewItem
            key={horror.id}
            image={horror.image}
            title={horror.name}
            subtitle={getOriginType(horror.origin)}
            stats={[
            { icon: <StatIcon stat="hp" />, value: horror.baseStats.hp },
            { icon: <StatIcon stat="attack" />, value: horror.baseStats.attack },
            { icon: <StatIcon stat="defense" />, value: horror.baseStats.defense },
            { icon: <StatIcon stat="speed" />, value: horror.baseStats.speed }]
            } />

          )}
        </PopupGrid>
      </PopupPreview>

      {/* Fusion Information */}
      <PopupSection title="Fusion Ritual" titleIcon={Zap}>
        <div className="text-sm text-gray-300 space-y-2">
          <p>• A new abomination will be conjured</p>
          <p>• Base stats will be averaged from parents</p>
          <p>• Rarity will determine stat multiplier</p>
          <p>{isLocalPreview ? '• Randomly conjures an illustrated hybrid of both horrors' : '• A unique image will be generated'}</p>
        </div>
      </PopupSection>

      {/* Cost Information */}
      <PopupSection
        title="Ritual Cost"
        titleIcon={Gem}
        bgColor="bg-gray-700/30"
        borderColor="border-gray-600"
        titleColor="text-gray-300">

        <PopupCostBreakdown
          items={[
          ...(effectiveCost.effective < effectiveCost.base ? [
          { label: "Base cost", value: `${effectiveCost.base} Echoes` },
          { label: "Talent reduction", value: `-${effectiveCost.base - effectiveCost.effective} Echoes`, color: "text-green-300" },
          { label: "Effective cost", value: `${effectiveCost.effective} Echoes`, color: "text-purple-300" }] :
          [
          { label: "Required Echoes", value: `${effectiveCost.effective} Echoes` }]),

          { label: "Your current balance", value: `${currentUser?.currency || 0} Echoes` }]
          }
          totalLabel="Balance after ritual"
          totalValue={`${(currentUser?.currency || 0) - effectiveCost.effective} Echoes`}
          totalColor={canAfford ? 'text-green-300' : 'text-red-300'} />

      </PopupSection>

      {/* Warning if can't afford */}
      {!canAfford &&
      <PopupWarning message="Insufficient Echoes for this ritual" />
      }
    </PopupDialog>);

};

// New Fusion Loading Overlay Component
const FusionLoadingOverlay = ({ isVisible, fusionStep }) => {
  const steps = [
  {
    id: 'conjuring',
    title: 'Conjuring Eldritch Name...',
    description: 'The ancient tomes whisper forbidden nomenclature',
    icon: BookOpen,
    duration: 3000
  },
  {
    id: 'determining',
    title: 'Determining Cosmic Rarity...',
    description: 'The void decides the power of your creation',
    icon: Star,
    duration: 1000
  },
  {
    id: 'manifesting',
    title: 'Manifesting Physical Form...',
    description: 'Reality bends to birth your abomination',
    icon: Zap,
    duration: 8000
  },
  {
    id: 'binding',
    title: 'Binding to Your Will...',
    description: 'The creature accepts your dominion',
    icon: Gem,
    duration: 1000
  }];


  const currentStep = steps.find((step) => step.id === fusionStep) || steps[0];
  const currentStepIndex = steps.findIndex((step) => step.id === fusionStep);
  const CurrentIcon = currentStep.icon;

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">

      <motion.div
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        className="relative bg-gray-900 border-2 border-purple-500/50 rounded-2xl p-8 max-w-md w-full text-center">

        {/* Animated Icon */}
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1]
          }}
          transition={{
            rotate: { duration: 2, repeat: Infinity, ease: "linear" },
            scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
          }}
          className="w-20 h-20 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-500/50">

          <CurrentIcon className="w-10 h-10 text-purple-400" />
        </motion.div>

        {/* Step Title */}
        <h3 className="text-2xl font-bold text-purple-300 mb-2">
          {currentStep.title}
        </h3>
        
        {/* Step Description */}
        <p className="text-gray-400 mb-6 text-sm">
          {currentStep.description}
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
          <motion.div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${(currentStepIndex + 1) / steps.length * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }} />

        </div>

        {/* Step Counter */}
        <p className="text-xs text-gray-500">
          Step {currentStepIndex + 1} of {steps.length}
        </p>

        {/* Pulsing Animation */}
        <motion.div
          className="absolute inset-0 border-2 border-purple-500/30 rounded-2xl"
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.02, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }} />

      </motion.div>
    </motion.div>);

};

export default function FusionLabPage() {
  const { currentUser, economySettings, updateUserData } = useAppContext();
  const [horrors, setHorrors] = useState([]);
  const [selectedHorrors, setSelectedHorrors] = useState([]);
  const [isFusing, setIsFusing] = useState(false);
  const [fusionStep, setFusionStep] = useState('conjuring'); // New state for fusion step
  const [fusionResult, setFusionResult] = useState(null);
  const [error, setError] = useState(null);
  const [effectiveFusionCost, setEffectiveFusionCost] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const horrorList = await Horror.list();
        setHorrors(horrorList);

        if (currentUser && economySettings) {
          const cost = await getEffectiveCost(economySettings.fusionCost, currentUser.learnedTalents || []);
          setEffectiveFusionCost({
            base: economySettings.fusionCost,
            effective: cost
          });
        }

      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    fetchData();
  }, [currentUser, economySettings]);

  // Start ambient music when component mounts
  useEffect(() => {
    playAmbientSanctum();
    return () => {










      // Clean up when leaving the page - handled by layout
    };}, []);const handleSelectHorror = (horror) => {playMenuClick(); // Add sound feedback
    setSelectedHorrors((prev) => {if (prev.find((h) => h.id === horror.id)) {return prev.filter((h) => h.id !== horror.id);}if (prev.length < 2) {return [...prev, horror];}
        return prev;
      });
    setError(null);
  };

  const handleConfirmFusion = async () => {
    // The modal is closed by the Dialog's onOpenChange prop automatically when `loading` state changes, 
    // or manually by `onCancel`.
    playFusionStart(); // Play sound when starting fusion
    await handleFuse();
  };

  const handleCancelFusion = () => {
    // Clear selected horrors to close the modal
    setSelectedHorrors([]);
    setError(null);
  };


  const handleFuse = async () => {
    // Use the pre-calculated effectiveFusionCost from state
    if (selectedHorrors.length !== 2 || !effectiveFusionCost) return;

    const cost = effectiveFusionCost.effective; // Get the effective cost

    setIsFusing(true);
    setError(null);
    setFusionResult(null);

    try {
      const [horrorA, horrorB] = selectedHorrors;

      // Step 1: Generate name with LLM
      setFusionStep('conjuring');
      const namePrompt = `Generate a single, terrifying, Lovecraftian name for a new eldritch horror. It is a fusion of two abominations: a ${horrorA.origin}-origin horror named "${horrorA.name}" and a ${horrorB.origin}-origin horror named "${horrorB.name}". The name should sound ancient, unknowable, and sanity-shattering. Examples: 'The Gibbering Maw', 'Yog-Sothoth', 'The Crawling Chaos'. Respond with ONLY the generated name and nothing else.`;

      let hostedIdentity;
      if (cloudEnabled) {
        const response = await fetch('/api/fusion-identity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parents: [horrorA.id, horrorB.id] }),
        });
        hostedIdentity = await response.json();
        if (!response.ok) throw new Error(hostedIdentity.error || 'The fusion ritual failed. Try again.');
      }

      const nameResponse = hostedIdentity ?? await InvokeLLM({
        prompt: namePrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'The generated name for the fused horror' }
          },
          required: ['name']
        }
      });

      if (!nameResponse || !nameResponse.name) {
        throw new Error("Failed to conjure a sufficiently maddening name.");
      }
      const fusedName = nameResponse.name;

      // Step 2: Determine Rarity and apply stat multiplier
      setFusionStep('determining');
      await new Promise((resolve) => setTimeout(resolve, 500)); // Brief pause for UX

      const rarity = determineRarity();
      const multiplier = RARITY_CONFIG[rarity].multiplier;

      const baseStats = {
        hp: Math.round((horrorA.baseStats.hp + horrorB.baseStats.hp) / 2 * multiplier),
        attack: Math.round((horrorA.baseStats.attack + horrorB.baseStats.attack) / 2 * multiplier),
        defense: Math.round((horrorA.baseStats.defense + horrorB.baseStats.defense) / 2 * multiplier),
        speed: Math.round((horrorA.baseStats.speed + horrorB.baseStats.speed) / 2 * multiplier)
      };

      // 2.5 Determine Fusion Origin Type
      const parentOrigins = [horrorA.origin, horrorB.origin];
      const randomParentOrigin = parentOrigins[Math.floor(Math.random() * parentOrigins.length)];
      const originType = getOriginType(randomParentOrigin);

      // Step 3: Generate image using the new name
      setFusionStep('manifesting');
      const prompt = `An eldritch abomination named "${fusedName}", created by combining a ${horrorA.origin} horror (${horrorA.name}) and a ${horrorB.origin} horror (${horrorB.name}). cosmic horror, lovecraftian, surreal, dark fantasy, unsettling, detailed, Todd McFarlane comicbook style only, no text.`;
      let imageUrl = hostedIdentity?.imageUrl;
      if (!hostedIdentity) {
        try {
          const imageResult = await GenerateImage({ prompt });
          if (!imageResult || !imageResult.url) {
            throw new Error("Image generation failed, using fallback.");
          }
          imageUrl = imageResult.url;
        } catch (imageGenError) {
          console.warn("Image generation failed:", imageGenError.message, "Attempting to use pre-generated fallback image.");
          setError("The image conjuration ritual failed. A placeholder form will be used.");

          // New fallback logic: Check for pre-generated images for this specific pair
          const [results1, results2] = await Promise.all([
          Images.filter({ nameA: horrorA.name, nameB: horrorB.name }),
          Images.filter({ nameA: horrorB.name, nameB: horrorA.name })]
          );
          const fallbackImages = [...results1, ...results2];

          if (fallbackImages.length > 0) {
            const randomIndex = Math.floor(Math.random() * fallbackImages.length);
            imageUrl = fallbackImages[randomIndex].image;
            console.log(`Using pre-generated fallback image for ${horrorA.name} + ${horrorB.name}`);
          } else {
            imageUrl = "https://images.unsplash.com/photo-1505527299942-502069a2da3c?w=500&q=80"; // Final fallback image
            console.log(`No pre-generated fallback found for this pair. Using default placeholder.`);
          }
        }
      }

      // Step 4: Save Fusion entity
      setFusionStep('binding');
      const newFusionData = {
        parents: [horrorA.id, horrorB.id],
        fusedName,
        stats: baseStats,
        rarity: rarity,
        originType: originType,
        generatedImage: imageUrl,
        playerOwner: currentUser.id,
        abilities: []
      };
      const newFusion = await Fusion.create(newFusionData);

      // 5. Deduct effective fusion cost from user
      await User.updateMyUserData({
        currency: (currentUser.currency || 0) - cost
      });

      // Update context with new currency
      updateUserData({ currency: (currentUser.currency || 0) - cost });

      setFusionResult(newFusion);
      setSelectedHorrors([]);

      // Play success sound when fusion completes
      playFusionSuccess();

    } catch (err) {
      setError(err.message || "An unspeakable error occurred during the ritual.");
      console.error(err);
    } finally {
      setIsFusing(false);
      setFusionStep('conjuring'); // Reset step for next fusion
    }
  };

  const resetFusion = () => {
    playMenuClick(); // Add sound feedback
    setFusionResult(null);
    setSelectedHorrors([]);
    setError(null);
  };

  return (
    <div className="container mx-auto">
      <AnimatePresence mode="wait">
        {fusionResult ?
        <motion.div
          key="result"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }} className="my-1 py-1 pb-8">

            <div className="max-w-lg mx-auto p-3 sm:p-8">
              {/* Fusion Success Title */}
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-300 to-blue-400">
                  The Ritual is Complete!
                </h2>
                <p className="text-gray-400 mt-2">Your abomination has been forged in the cosmic fires!</p>
              </div>

              {/* Use the shared FusionCard component */}
              <FusionCard fusion={fusionResult}>
                {/* Fusion-specific UI elements */}
                <div className="mt-4 pt-4 border-t border-gray-600/50">
                  {/* Stat boost explanation */}
                  <div className="">
                    <p className="text-sm text-gray-300">
                      Base stats enhanced by <span className="font-bold text-purple-300">{fusionResult.rarity}</span> rarity
                    </p>
                  </div>

                  {/* Action Button */}
                  <Button
                  onClick={resetFusion} className="bg-purple-600 text-primary-foreground px-2 py-2 text-sm font-medium border border-input hover:text-accent-foreground inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 hover:bg-purple-700 w-full">


                    <GitMerge className="w-5 h-5 mr-2" />
                    Forge Another Abomination
                  </Button>
                </div>
              </FusionCard>
            </div>
          </motion.div> :

        <motion.div
          key="selection"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}>

            {/* Header */}
            <Card className="bg-gray-800/50 border-gray-700 mb-8">
              <CardHeader>
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-3">
                      <Beaker className="w-8 h-8 shrink-0 text-purple-400" />
                      <span className="text-2xl sm:text-3xl">The Flesh Altar</span>
                    </CardTitle>
                    <p className="text-gray-400 mt-2">Select two horrors to merge their unholy essences.</p>
                  </div>
                  {currentUser &&
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-2 bg-purple-500/20 px-4 py-2 rounded-lg border border-purple-500/50">
                        <Gem className="w-5 h-5 text-purple-400" />
                        <span className="font-bold text-purple-300">{currentUser.currency || 0}</span>
                        <span className="text-gray-400 text-sm">Echoes</span>
                      </div>
                      <div className="flex items-center gap-2 bg-indigo-500/20 px-4 py-2 rounded-lg border border-indigo-500/50">
                        <Star className="w-5 h-5 text-indigo-400" />
                        <span className="font-bold text-indigo-300">{currentUser.voidFragments || 0}</span>
                        <span className="text-gray-400 text-sm">Fragments</span>
                      </div>
                    </div>
                }
                </div>
              </CardHeader>
            </Card>
                        
            {error && <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg text-center mb-6">{error}</div>}

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-4 xl:gap-6 relative bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 rounded-2xl p-3 sm:p-5 xl:p-8 border border-purple-500/30">
              {horrors.map((horror) =>
            <HorrorCard
              key={horror.id}
              horror={horror}
              onSelect={handleSelectHorror}
              isSelected={!!selectedHorrors.find((h) => h.id === horror.id)}
              isDisabled={selectedHorrors.length >= 2 && !selectedHorrors.find((h) => h.id === horror.id)} />

            )}
            </div>
          </motion.div>
        }
            </AnimatePresence>
            {/* Fusion Loading Overlay */}
      <AnimatePresence>
        {isFusing && <FusionLoadingOverlay isVisible={isFusing} fusionStep={fusionStep} />}
      </AnimatePresence>
            {/* Fusion Confirmation Modal - only show when 2 horrors selected and not already fusing */}
            {selectedHorrors.length === 2 && !isFusing &&
      <FusionConfirmationModal
        selectedHorrors={selectedHorrors}
        currentUser={currentUser}
        effectiveCost={effectiveFusionCost} // Pass the pre-calculated effective cost
        onConfirm={handleConfirmFusion}
        onCancel={handleCancelFusion}
        loading={isFusing} />

      }
        </div>);

}