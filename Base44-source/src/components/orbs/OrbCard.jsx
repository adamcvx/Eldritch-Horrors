
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Sparkles, Zap, Heart, Shield, Skull, Star, Gem, Trash2 } from 'lucide-react';
import RarityBadge from '../RarityBadge';
import { hasOriginSynergy, formatOrbDescription } from './OrbService';
import { motion } from 'framer-motion';

const getOrbTypeIcon = (orbType) => {
  const icons = {
    Unstable: <Zap className="w-6 h-6 text-red-400" />,
    Parasitic: <Heart className="w-6 h-6 text-blue-400" />,
    Chaos: <Skull className="w-6 h-6 text-purple-400" />
  };
  return icons[orbType] || <Eye className="w-6 h-6 text-gray-400" />;
};

const getOrbTypeColor = (orbType) => {
  const colors = {
    Unstable: 'from-red-900/30 via-red-800/20 to-red-900/30',
    Parasitic: 'from-blue-900/30 via-blue-800/20 to-blue-900/30',
    Chaos: 'from-purple-900/30 via-purple-800/20 to-purple-900/30'
  };
  return colors[orbType] || 'from-gray-900/30 via-gray-800/20 to-gray-900/30';
};

// Centralized Trigger Configuration
export const ORB_TRIGGER_CONFIG = {
  OnStart: {
    label: 'On Start',
    color: 'text-green-300 bg-green-500/20 border-green-500/50'
  },
  OnAttack: {
    label: 'On Attack',
    color: 'text-yellow-300 bg-yellow-500/20 border-yellow-500/50'
  },
  OnHit: {
    label: 'On Hit',
    color: 'text-blue-300 bg-blue-500/20 border-blue-500/50'
  },
  OnTurnEnd: {
    label: 'On Turn End',
    color: 'text-orange-300 bg-orange-500/20 border-orange-500/50'
  },
  Passive: {
    label: 'Passive',
    color: 'text-white-300 bg-white-500/20 border-white-500/50'
  },
  default: {
    label: 'Trigger',
    color: 'text-gray-300 bg-gray-500/20 border-gray-500/50'
  }
};

export default function OrbCard({
  orb,
  fusionOriginType,
  onEquip,
  onUnequip,
  onDestroy,
  isEquipped = false,
  canEquip = true,
  showActions = true,
  size = 'default'
}) {
  if (!orb) return null;

  const synergyActive = fusionOriginType && hasOriginSynergy(orb, fusionOriginType);
  const formattedDescription = formatOrbDescription(orb, fusionOriginType);
  const isHolographic = orb.rarity === 'Cosmic' || orb.rarity === 'Outer';
  const triggerInfo = ORB_TRIGGER_CONFIG[orb.orbTrigger] || ORB_TRIGGER_CONFIG.default;

  // Adjusted card size classes
  const sizeClasses = {
    small: 'w-64 h-[22rem]',
    default: 'w-72 h-[26rem]',
    large: 'w-80 h-[28rem]'
  };

  return (
    <>
      <style jsx>{`
        .holographic-orb {
          background: linear-gradient(45deg, 
            rgba(139, 92, 246, 0.1) 0%, 
            rgba(219, 39, 119, 0.1) 25%,
            rgba(59, 130, 246, 0.1) 50%,
            rgba(16, 185, 129, 0.1) 75%,
            rgba(139, 92, 246, 0.1) 100%);
          background-size: 400% 400%;
          animation: holographic-shift 3s ease-in-out infinite;
        }
        
        .holographic-text {
          background: linear-gradient(45deg, #8b5cf6, #db2777, #3b82f6, #10b981);
          background-size: 400% 400%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: holographic-shift 3s ease-in-out infinite;
        }
        
        @keyframes holographic-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>

      <Card className="rounded-lg bg-card text-card-foreground shadow-sm game-card relative border-2 transition-all duration-300 hover:shadow-lg group border-gray-700 hover:border-gray-600 ring-2 ring-yellow-400/50 shadow-yellow-400/20 flex flex-col">
        
        {/* Background Gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${getOrbTypeColor(orb.orbType)} opacity-50`} />
        
        {/* Holographic Effect Layer */}
        {isHolographic &&
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 animate-pulse" />
        }

        <CardContent className="orb-card-content p-0 relative z-10 min-h-full flex flex-col">
          {/* Orb Visual - Reduced height */}
          <div className="orb-card-art relative h-40 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center border-b border-gray-700/50">
            {/* Destroy Button - Top Left */}
            {!isEquipped && onDestroy && (
                <div className="absolute top-3 left-3 z-20">
                    <Button
                        variant="destructive"
                        size="icon"
                        className="w-8 h-8 bg-red-900/70 hover:bg-red-800 border border-red-700/80 text-red-300 hover:text-white"
                        title="Destroy Orb"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDestroy(orb);
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            )}
            
            {/* Orb Icon with Effects */}
            <motion.div
              animate={{
                // rotate: orb.orbTrigger === 'Passive' ? [0, 360] : 0,
                scale: [1, 1.1, 1]
              }}
              transition={{
                rotate: { duration: 10, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }} className="relative rounded-full border-2 border-gray-600/50 bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm shadow-2xl">

              {/* Display custom orb icon if available, otherwise fallback to type icon */}
              {orb.iconUrl ?
              <img
                src={orb.iconUrl}
                alt={orb.name}
                className="orb-card-image w-32 h-32 object-contain"
              /> :
                getOrbTypeIcon(orb.orbType)
              }
              
              {/* Inner glow effect */}
              <div className={`absolute inset-2 rounded-full bg-gradient-to-br ${
                orb.orbType === 'Unstable' ? 'from-red-500/20 to-transparent' :
                orb.orbType === 'Parasitic' ? 'from-blue-500/20 to-transparent' :
                orb.orbType === 'Chaos' ? 'from-purple-500/20 to-transparent' : 'from-blue-500/20 to-transparent'}`
              } />
            </motion.div>

            {/* Badges - Top Right */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
                {synergyActive &&
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-yellow-500/20 border border-yellow-500/50 rounded-full p-1.5"
                  title="Synergy Active!"
                >
                    <Star className="w-4 h-4 text-yellow-300" />
                  </motion.div>
                }
                <RarityBadge rarity={orb.rarity} size="small" />
            </div>
          </div>

          {/* Content - flex-1 allows this part to grow and push actions to bottom */}
          <div className="orb-card-body p-4 flex flex-col flex-1">
            {/* Name */}
            <h3 className={`font-bold text-xl mb-2 ${isHolographic ? 'holographic-text' : 'text-white'} ${
            synergyActive ? 'text-yellow-300' : ''}`
            }>
              {orb.name}
            </h3>

            {/* Trigger Badge */}
            <div className="mb-3">
              <Badge className={`text-xs font-semibold ${triggerInfo.color}`}>
                {triggerInfo.label}
              </Badge>
            </div>

            {/* Description */}
            <p className="orb-card-description text-sm text-gray-300 mb-3 leading-relaxed flex-1">
              {formattedDescription}
            </p>

            {/* Cost and Synergy Info */}
            <div className="orb-card-meta space-y-2 mb-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Equip Cost:</span>
                <div className="flex items-center gap-1">
                  <Gem className="w-3 h-3 text-purple-400" />
                  <span className="font-semibold text-purple-300">{orb.costToEquip}</span>
                </div>
              </div>

              {orb.originSynergy &&
              <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Synergy:</span>
                  <Badge
                  variant="outline"
                  className={`text-xs ${
                  synergyActive ? 'border-yellow-500/50 text-yellow-300 bg-yellow-500/10' : 'border-gray-500/50 text-gray-300'}`
                  }>

                    {orb.originSynergy} {synergyActive && <Star className="w-3 h-3 ml-1" />}
                  </Badge>
                </div>
              }
            </div>

            {/* Actions - mt-auto pushes to the bottom of the flex container */}
            {showActions &&
            <div className="flex gap-2 mt-auto">
                {isEquipped ?
              <Button
                onClick={() => onUnequip(orb)}
                variant="outline"
                size="sm" className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-destructive-foreground h-9 rounded-md px-3 w-full mt-4 bg-red-600/80 hover:bg-red-600">
                

                    Unequip
                  </Button> :

              <Button
                onClick={() => onEquip(orb)}
                disabled={!canEquip}
                size="sm" className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-9 rounded-md px-3 w-full mt-4">




                

                    Equip
                  </Button>
              }
              </div>
            }

            {/* Synergy Active Banner */}
            {synergyActive &&
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="orb-card-synergy mt-2 text-center">

                <Badge className="bg-gold-500/20 text-gold-300 border-gold-500/50 text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Origin Synergy Active!
                </Badge>
              </motion.div>
            }
          </div>
        </CardContent>
      </Card>
    </>);

}
