import React from 'react';
import { motion } from 'framer-motion';
import { Gem, Lock, Check } from 'lucide-react';
import { 
  Heart, Swords, Shield, Wind, Zap, BrainCircuit, HeartPulse, Sparkles, Star, Anchor, Atom, Feather, Scale, Sun, Moon, HelpCircle 
} from 'lucide-react';

const iconMap = {
  Heart,
  Swords,
  Shield,
  Wind,
  Zap,
  BrainCircuit,
  HeartPulse,
  Sparkles,
  Star,
  Anchor,
  Atom,
  Feather,
  Scale,
  Sun,
  Moon,
  HelpCircle, // Fallback
};

const TalentNode = ({ talent, isLearned, isLocked, onSelect, onUnlearn }) => {
    const Icon = iconMap[talent.icon] || iconMap.HelpCircle;

    const getStatBonusText = (statBonus) => {
        const bonus = Object.entries(statBonus)[0];
        if (!bonus) return null;
        const [key, value] = bonus;
        const formattedKey = key
            .replace('all_', '')
            .replace('_boost', '')
            .replace('_', ' ')
            .replace('cost reduction', 'Cost Reduction')
            .toUpperCase();
        return `${formattedKey}: +${value * 100}%`;
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: isLocked ? 1 : 1.02 }}
            className={`group cursor-pointer transition-all duration-300 w-56
                ${isLocked ? 'cursor-not-allowed opacity-60' : ''}`}
            onClick={() => !isLocked && !isLearned && onSelect(talent)}
        >
            <div className={`bg-gray-800/90 backdrop-blur-sm rounded-xl border-2 transition-all duration-300 overflow-hidden h-full
                ${isLearned ? 'border-green-500/70 shadow-lg shadow-green-500/20' :
                  isLocked ? 'border-gray-700/50' :
                  'border-purple-500/50 hover:border-purple-400/70 hover:shadow-lg hover:shadow-purple-500/20'}`}
            >
                {/* Header with Icon and Title */}
                <div className="p-4 pb-3">
                    <div className="flex items-start gap-3 mb-3">
                        <div className={`p-3 rounded-lg flex-shrink-0 ${
                            isLearned ? 'bg-green-500/20 border border-green-500/30' : 
                            isLocked ? 'bg-gray-700/30 border border-gray-600/30' :
                            'bg-purple-500/20 border border-purple-500/30'
                        }`}>
                            <Icon className={`w-6 h-6 ${
                                isLearned ? 'text-green-400' : 
                                isLocked ? 'text-gray-500' :
                                'text-purple-400'
                            }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white text-sm leading-tight mb-1">{talent.name}</h3>
                            <div className="flex items-center gap-2">
                                <Gem className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                                <span className="text-yellow-300 font-medium text-xs">{talent.cost} Echoes</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="px-4 pb-3">
                    <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">
                        {talent.description}
                    </p>
                </div>

                {/* Stat Bonus */}
                {talent.statBonus && (
                    <div className="px-4 pb-3">
                        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-2 text-center">
                            <span className="text-xs font-semibold text-cyan-300">
                                {getStatBonusText(talent.statBonus)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Dependencies */}
                {!isLearned && talent.dependencies && talent.dependencies.length > 0 && (
                    <div className="px-4 pb-3">
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2">
                            <div className="text-xs font-medium text-yellow-300 mb-1">Prerequisites:</div>
                            <div className="text-xs text-yellow-200/80">
                                {talent.dependencies.join(', ')}
                            </div>
                        </div>
                    </div>
                )}

                {/* Status/Action Section */}
                <div className="p-4 pt-2 border-t border-gray-700/50 bg-gray-900/30">
                    {isLearned ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2 text-green-400 text-xs font-medium">
                                <Check className="w-3 h-3" />
                                <span>Learned</span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onUnlearn(); }}
                                className="w-full text-xs py-2 px-3 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 transition-colors"
                            >
                                Unlearn
                            </button>
                        </div>
                    ) : isLocked ? (
                        <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
                            <Lock className="w-3 h-3" />
                            <span>Prerequisites Required</span>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="text-xs text-gray-400 mb-2">Click to learn</div>
                            <div className="w-full h-1 bg-gray-700/50 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 w-0 group-hover:w-full transition-all duration-300"></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default TalentNode;