import { isLocalPreview } from '@/api/base44Client';
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Star,
  Heart,
  Zap,
  Shield,
  Wind,
  Swords,
  HeartPulse,
  BrainCircuit,
  Eye,
  Lock,
  Circle
} from 'lucide-react';
import RarityBadge from '../RarityBadge';
import { getSynergyDetails } from '../synergy/SynergyService';
import { calculateOrbSlots } from '../orbs/OrbService';
import { motion } from 'framer-motion';

const StatIcon = ({ stat }) => {
  const icons = {
    hp: <Heart className="w-4 h-4 text-red-400" />,
    attack: <Swords className="w-4 h-4 text-yellow-400" />,
    defense: <Shield className="w-4 h-4 text-blue-400" />,
    speed: <Wind className="w-4 h-4 text-green-400" />
  };
  return icons[stat] || null;
};

const getEffectiveStats = (fusion) => {
  if (!fusion || !fusion.stats) return { hp: 0, attack: 0, defense: 0, speed: 0 };
  return {
    hp: fusion.stats.hp + (fusion.levelBonus?.hp || 0) + (fusion.talentBonus?.hp || 0),
    attack: fusion.stats.attack + (fusion.levelBonus?.attack || 0) + (fusion.talentBonus?.attack || 0),
    defense: fusion.stats.defense + (fusion.levelBonus?.defense || 0) + (fusion.talentBonus?.defense || 0),
    speed: fusion.stats.speed + (fusion.levelBonus?.speed || 0) + (fusion.talentBonus?.speed || 0)
  };
};

const getFontSize = (name) => {
  if (!name) return "0.75rem";
  if (name.length > 20) return "0.75rem";
  if (name.length > 30) return "0.75rem";
  return "0.75rem";
};

// Orb rarity colors for display
const getOrbRarityColor = (rarity) => {
  switch (rarity) {
    case 'Outer':
      return 'from-orange-500 to-red-600';
    case 'Cosmic':
      return 'from-purple-500 to-pink-600';
    case 'Abyssal':
      return 'from-blue-500 to-cyan-600';
    case 'Uncanny':
      return 'from-green-500 to-emerald-600';
    case 'Ephemeral':
    default:
      return 'from-gray-400 to-gray-600';
  }
};

// Individual equipped orb display component
const EquippedOrbDisplay = ({ orb, index }) => {
  if (!orb) return null;
  const colorClass = getOrbRarityColor(orb.rarity);

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: index * 0.1 }}
      className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-900 to-gray-600 border border-black/30 shadow-md flex items-center justify-center"
      title={`${orb.name} (${orb.rarity})`}>

      {/* Orb Graphic */}
      {orb.iconUrl ?
        <img
          src={orb.iconUrl}
          alt={orb.name}
          className="w-7 h-7 object-contain rounded-full" /> :

        <Circle className="w-3 h-3 text-white opacity-70" />
      }
    </motion.div>);

};

export default function FusionCard({
  fusion,
  headerContent,
  children,
  className,
  mode = 'default',
  hp,
  maxHp,
  statusEffects,
  equippedOrbs = null, // Default to null to detect when not provided
  allAbilities = [] // <-- Accept the new prop
}) {
  if (!fusion) return null;

  // Helper function to get display name for status effects
  const getStatusEffectDisplayName = (effectName, abilityId) => {
    const ability = allAbilities?.find((a) => a.id === abilityId);

    if (ability?.statEffectName) {
      return ability.statEffectName;
    }

    // Fallback to formatting the technical name
    return effectName.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const effectiveStats = getEffectiveStats(fusion);
  const synergy = fusion.originType ? getSynergyDetails(fusion.originType) : {};
  const isHolographic = fusion.rarity === 'Cosmic' || fusion.rarity === 'Outer';
  const cardBackgroundUrl = isLocalPreview ? "/Artwork/base44/8cc9a2d8749ff02939f0cb4e.png" : 'https://base44.app/api/apps/68aa514c64fc4f9604746607/files/faebc67be_cardBack_Lovecraftian_v2.png';

  // Use provided equippedOrbs prop, or fall back to loadedEquippedOrbs from fusion object
  const displayedOrbs = equippedOrbs || fusion.loadedEquippedOrbs || [];
  const totalOrbSlots = calculateOrbSlots(fusion.level || 1);
  const equippedOrbsCount = displayedOrbs.length;

  return (
    <>
      <style jsx>{`
        .shrink-text {
          font-size: clamp(0.8rem, 2vw, 1.25rem);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .card-background {
          position: absolute;
          inset: 0;
          background-image: url('${cardBackgroundUrl}');
          background-size: cover;
          background-position: center;
          z-index: 0;
        }

        .holographic-card {
          position: relative;
          overflow: visible;
        }
        .holographic-card::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(
            45deg,
            rgba(255, 0, 128, 0.6),
            rgba(255, 140, 0, 0.6),
            rgba(64, 224, 208, 0.6),
            rgba(255, 0, 128, 0.6)
          );
          background-size: 300% 300%;
          animation: holographicBorder 3s ease-in-out infinite;
          border-radius: inherit;
          z-index: 1;
          pointer-events: none;
        }
        @keyframes holographicBorder {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .holographic-overlay {
          background: linear-gradient(
            45deg,
            rgba(138, 43, 226, 0.6),
            rgba(255, 20, 147, 0.6),
            rgba(30, 144, 255, 0.6),
            rgba(138, 43, 226, 0.6)
          );
          background-size: 200% 200%;
          animation: holographicShimmer 2s ease-in-out infinite;
          z-index: 2;
        }
        @keyframes holographicShimmer {
          0%, 100% {
            opacity: 0.2;
            background-position: 0% 50%;
          }
          50% {
            opacity: 0.4;
            background-position: 100% 50%;
          }
        }
        .holographic-text {
          background: linear-gradient(
            45deg,
            #ffffff,
            #ff00ff,
            #00ffff,
            #ffffff,
            #ffff00,
            #ff00ff
          );
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: holographicTextShift 2s ease-in-out infinite;
          position: relative;
          z-index: 20;
          filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.5))
                  drop-shadow(0 0 8px rgba(138, 43, 226, 0.4));
        }
        @keyframes holographicTextShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        /* Eldritchborn Effects */
        .eldritch-card {
          position: relative;
          overflow: visible;
        }
        .eldritch-card::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(
            45deg,
            rgba(25, 0, 128, 0.6),
            rgba(0, 140, 255, 0.6),
            rgba(64, 208, 224, 0.6),
            rgba(25, 0, 128, 0.6)
          );
          background-size: 300% 300%;
          animation: eldritchBorder 3s ease-in-out infinite;
          border-radius: inherit;
          z-index: 1;
          pointer-events: none;
        }
        @keyframes eldritchBorder {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .eldritch-overlay {
          background: linear-gradient(
            45deg,
            rgba(200, 43, 255, 0.8),
            rgba(200, 20, 255, 0.6),
            rgba(200, 144, 255, 0.6),
            rgba(200, 43, 255, 0.8)
          );
          background-size: 200% 200%;
          animation: eldritchShimmer 2s ease-in-out infinite;
          z-index: 2;
        }
        @keyframes eldritchShimmer {
          0%, 100% {
            opacity: 0.2;
            background-position: 0% 50%;
          }
          50% {
            opacity: 0.4;
            background-position: 100% 50%;
          }
        }
        .eldritch-text {
          background: linear-gradient(
            45deg,
            #ffffff,
            #5100ff,
            #ff00ff,
            #ffffff,
            #5100ff,
            #ff00ff
          );
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: eldritchTextShift 2s ease-in-out infinite;
          position: relative;
          z-index: 20;
          filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.5))
                  drop-shadow(0 0 8px rgba(138, 43, 226, 0.4));
        }
        @keyframes eldritchTextShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .eldritch-particles {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 50%;
          pointer-events: none;
          z-index: 40;
          overflow: hidden;
        }

        .particle {
          position: absolute;
          bottom: -10px;
          left: var(--x-start);
          width: var(--size);
          height: var(--size);
          background-color: rgba(192, 132, 252, 0.7);
          border-radius: 50%;
          animation: rise var(--duration) var(--delay) linear infinite;
          filter: blur(2px);
        }

        @keyframes rise {
          to {
            transform: translateY(-200px);
            opacity: 0;
          }
        }
      `}</style>

      <Card className="game-card monster-card rounded-lg text-card-foreground relative transition-colors group p-2 sm:p-4">
        {/* Eldritchborn Glow & Particles */}
        {fusion.ascensionLevel > 0 &&
          <>
            <div className="absolute inset-0 rounded-lg eldritch-overlay pointer-events-none" />
            <div className="eldritch-particles">
              {[...Array(60)].map((_, i) =>
                <div
                  key={i}
                  className="particle"
                  style={{
                    '--x-start': `${Math.random() * 100}%`,
                    '--size': `${2 + Math.random() * 5}px`,
                    '--duration': `${3 + Math.random() * 10}s`,
                    '--delay': `${Math.random() * 4}s`
                  }} />
              )}
            </div>
          </>
        }

        {/* Background layer */}
        {cardBackgroundUrl &&
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${cardBackgroundUrl})` }} />
        }

        {/* Holographic effects layer */}
        {isHolographic &&
          <div className="absolute inset-0 rounded-lg holographic-overlay pointer-events-none" />
        }

        {/* Content */}
        <CardContent className="relative z-10 w-full px-3 sm:px-4">
          <div className="relative h-48">
            {/* Background fill */}
            <img src={fusion.generatedImage} alt="" className="my-2 absolute inset-0 w-full h-[90%] object-cover blur-sm scale-110 opacity-60" />




            {/* Foreground art (uncropped, full visible) */}
            <img src={fusion.generatedImage} alt={fusion.fusedName} className="my-2 py-2 relative z-0 w-full h-[95%] object-contain" />

            {/* Ascension Stars - Always show 5 slots */}
            <div className="absolute bottom-2 left-2 flex gap-1 z-20">
              {[...Array(5)].map((_, i) => {
                const isActive = i < (fusion.ascensionLevel || 0);
                return (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05, type: 'spring', stiffness: 200, damping: 10 }}
                  >
                    <Star
                      className={`w-4 h-4 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] ${
                        isActive 
                          ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]' 
                          : 'text-gray-500'
                      }`}
                      fill="currentColor"
                    />
                  </motion.div>
                );
              })}
            </div>


            {/* Battle HUD overlay (HP on top of image) */}
            {mode === 'battle' &&
              <div className="absolute bottom-0 left-0 right-0">
                {(() => {
                  const currentHp = hp ?? fusion.stats.hp;
                  const maximumHp = maxHp ?? fusion.stats.hp;

                  return (
                    <div className="relative h-4 w-full bg-gray-700/30 rounded-full overflow-hidden border border-gray-600">
                      <motion.div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-600 to-indigo-900"
                        initial={{ width: '100%' }}
                        animate={{ width: `${currentHp / maximumHp * 100}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }} />


                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-orange-100 text-sm font-light drop-shadow-sm">
                          {currentHp} / {maximumHp}
                        </span>
                      </div>
                    </div>);

                })()}
              </div>
            }

            {/* Level Badge */}
            <div className="absolute top-2 right-2 flex gap-2">
              <Badge className="level-badge text-xs font-bold inline-flex items-center rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-sm">
                <Star className="w-3 h-3 mr-1" />
                Level {fusion.level || 1}
              </Badge>
            </div>

            {/* Header Content (e.g., Delete Button) */}
            {headerContent &&
              <div className="absolute top-2 left-2">{headerContent}</div>
            }
          </div>

          <div className="py-2">
            {/* Name + Origin */}
            <div className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2">
              <h3
                style={{ fontSize: getFontSize(fusion.fusedName) }}
                className={`font-bold mb-3 relative z-20 break-words min-w-0 ${isHolographic ? 'holographic-text' : 'text-white'}`}>

                {fusion.fusedName}
              </h3>
              {fusion.originType &&
                <div className="monster-card__origin px-2 py-1 text-xs font-light rounded-full backdrop-blur-sm relative z-15">
                  {fusion.originType}
                </div>
              }
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {Object.entries(fusion.stats).map(([stat, baseValue]) => {
                const levelBonus = fusion.levelBonus?.[stat] || 0;
                const talentBonus = fusion.talentBonus?.[stat] || 0;

                return (
                  <div key={stat} className="flex min-w-0 items-center gap-1.5 text-gray-300">
                    <StatIcon stat={stat} />
                    <span className="text-sm">
                      {baseValue}
                      {levelBonus > 0 && (
                        <span className="text-emerald-200 ml-1 font-semibold">
                          (+{levelBonus})
                        </span>
                      )}
                      {talentBonus > 0 && (
                        <span className="text-purple-300 ml-1 font-semibold">
                          (+{talentBonus})
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Combined Rarity and Orb Slots */}
            <div className="mb-2">
              <div className={`p-3 rounded-lg border flex items-center justify-between ${
                fusion.rarity === 'Outer' ? 'bg-orange-500/20 border-orange-500 text-orange-300' :
                  fusion.rarity === 'Cosmic' ? 'bg-[#3b2929] border-[#996b61] text-[#f1c9b1]' :
                    fusion.rarity === 'Abyssal' ? 'bg-blue-500/20 border-blue-500 text-blue-300' :
                      fusion.rarity === 'Uncanny' ? 'bg-green-500/20 border-green-500 text-green-300' :
                        'bg-gray-700/30 border-gray-600 text-gray-300'}`
              }>
                <div className="text-sm font-semibold">
                  {fusion.rarity}{' '}
                  <span className="text-orange-100 text-xs opacity-75 font-bold">
                    {fusion.rarity === 'Outer' ? '(+30%)' :
                      fusion.rarity === 'Cosmic' ? '(+20%)' :
                        fusion.rarity === 'Abyssal' ? '(+12%)' :
                          fusion.rarity === 'Uncanny' ? '(+5%)' : ''}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 flex-wrap">
                    {/* Equipped Orbs - Show actual orbs */}
                    {displayedOrbs.map((orb, index) =>
                      // Use playerOrbId for a more stable key if available
                      <EquippedOrbDisplay
                        key={`equipped-${orb.playerOrbId || orb.id}-${index}`}
                        orb={orb}
                        index={index} />

                    )}

                    {/* Available Empty Slots */}
                    {Array.from({ length: Math.max(0, totalOrbSlots - equippedOrbsCount) }).map((_, index) =>
                      <div
                        key={`empty-${index}`}
                        className="w-4 h-4 bg-gray-700/50 border-2 border-dashed border-gray-500 rounded-full opacity-60 flex items-center justify-center"
                        title="Available Orb Slot">
                        <Circle className="w-2 h-2 text-gray-500" />
                      </div>
                    )}

                    {/* Locked Slots (for higher levels) */}
                    {fusion.level < 25 &&
                      Array.from({
                        length: Math.max(0, calculateOrbSlots(25) - totalOrbSlots)
                      }).map((_, index) =>
                        <div
                          key={`locked-${index}`} className="w-4 h-4 bg-gray-800/80 border-2 border-gray-600 rounded-full opacity-40 relative flex items-center justify-center"
                          title={`Unlocks at level ${(totalOrbSlots + index + 1) * 10 - 9}`}>
                          <Lock className="w-3 h-3 text-gray-500" />
                        </div>
                      )
                    }
                  </div>

                  <div className="text-orange-100 ml-2 text-xs font-bold">
                    {equippedOrbsCount}/{totalOrbSlots}
                  </div>
                </div>
              </div>
            </div>

            {/* Synergy Info */}
            {fusion.originType && Object.keys(synergy).length > 0 &&
              <div className="border-t border-gray-600/50 pt-3 mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {synergy.strong &&
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <Zap className="w-3 h-3" /> {synergy.strong}
                  </div>
                }
                {synergy.weak &&
                  <div className="flex items-center gap-1.5 text-red-400">
                    <Shield className="w-3 h-3" /> {synergy.weak}
                  </div>
                }
                {synergy.resist &&
                  <div className="flex items-center gap-1.5 text-blue-400">
                    <HeartPulse className="w-3 h-3" /> {synergy.resist}
                  </div>
                }
                {synergy.vulnerable &&
                  <div className="flex items-center gap-1.5 text-yellow-400">
                    <BrainCircuit className="w-3 h-3" /> {synergy.vulnerable}
                  </div>
                }
              </div>
            }

            {/* Status effects (battle mode only, below stats) */}
            {mode === 'battle' && (statusEffects?.buffs?.length > 0 || statusEffects?.debuffs?.length > 0) &&
              <div className="mt-3 flex flex-wrap gap-2 justify-center min-h-[24px]">
                {statusEffects.buffs?.map((buff, i) =>
                  <Badge
                    key={`buff-${i}`}
                    className="bg-green-500/20 text-green-300 border-green-500/50">

                    {getStatusEffectDisplayName(buff.name, buff.abilityId)} ({buff.turnsLeft})
                  </Badge>
                )}
                {statusEffects.debuffs?.map((debuff, i) =>
                  <Badge
                    key={`debuff-${i}`}
                    className="bg-purple-500/20 text-purple-300 border-purple-500/50">

                    {getStatusEffectDisplayName(debuff.name, debuff.abilityId)} ({debuff.turnsLeft})
                  </Badge>
                )}
              </div>
            }

            {children}
          </div>
        </CardContent>
      </Card>
    </>);
}