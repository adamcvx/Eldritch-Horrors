
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronUp,
  Gem,
  Trophy,
  Skull,
  Star,
  Home,
  RotateCcw,
  TrendingUp,
  Info
} from 'lucide-react';
import FusionCard from '../cards/FusionCard';
import BattleEffect, { battleEffectFor } from './BattleEffect';
import ParticleSystem from './ParticleSystem';
import { createPageUrl } from '@/utils';
import { getGlobalEconomySettings } from '../user/UserService';
import PopupDialog, {
  PopupSection,
  PopupPreview
} from '../ui/PopupDialog';
import AbilityCard from '../abilities/AbilityCard';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

// New sub-component for the profile display
const PlayerProfile = ({ user, fusion, isPve, alignment = 'left' }) => {
  if (!user && !fusion) return <div className="w-64 h-16" />; // Placeholder for loading state or missing data

  const name = isPve ? fusion?.fusedName || 'Campaign Foe' : user?.displayName || user?.full_name || 'Nameless Cultist';
  const rank = isPve ? 'Campaign Foe' : user?.rank || 'Initiate';
  const avatarUrl = isPve ? fusion?.generatedImage : user?.avatar;
  const avatarFallback = isPve ? (fusion?.fusedName || 'C').charAt(0) : (name || 'U').charAt(0);

  const content = (
    <>
      <div className={`text-${alignment} overflow-hidden`}>
        <h3 className="font-bold text-white truncate font-title text-lg">{name}</h3>
        <p className="text-sm text-purple-300">{rank}</p>
      </div>
      <Avatar className="w-16 h-16 border-2 border-gray-600 shadow-lg">
        <AvatarImage src={avatarUrl} alt={name} className="object-cover" />
        <AvatarFallback className="bg-purple-800 text-white">{avatarFallback}</AvatarFallback>
      </Avatar>
    </>
  );

  return (
    <div className={`flex items-center gap-4 ${alignment === 'right' ? 'flex-row-reverse' : ''}`}>
      {content}
    </div>
  );
};


const getFormattedRewardAmount = (
  isPve,
  isWin,
  matchType,
  economySettings,
  campaignStage
) => {
  if (!economySettings) return 'Loading...';

  if (isPve) {
    return isWin ? `+${campaignStage?.rewardShards || 0}` : '+0';
  }

  const reward = isWin
    ? matchType === 'ranked'
      ? economySettings.rankedWinReward
      : economySettings.casualWinReward
    : matchType === 'ranked'
      ? economySettings.rankedLossReward
      : economySettings.casualLossReward;
  return `${reward >= 0 ? '+' : ''}${reward}`;
};

const BattleRewards = ({ currency, fragments, isWin }) => {
  const rewardAmount = `+${currency || 0}`;
  const rewardColor = isWin ? 'text-green-400' : 'text-gray-400';

  return (
    <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 space-y-3">
      {/* Echoes Row */}
      <div className="flex justify-between items-center text-lg">
        <div className="flex items-center gap-3">
          <Gem className="w-5 h-5 text-purple-400" />
          <span className="font-semibold text-white">Echoes Cache</span>
        </div>
        <span className={`font-bold ${rewardColor}`}>{rewardAmount}</span>
      </div>

      {/* Fragments Row */}
      {fragments > 0 && (
        <div className="flex justify-between items-center text-lg">
          <div className="flex items-center gap-3">
            <Star className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-white">Fragments Cache</span>
          </div>
          <span className={`font-bold ${rewardColor}`}>+{fragments}</span>
        </div>
      )}
    </div>
  );
};

const BattleEndModal = ({
  isVisible,
  isVictory,
  playerFusion,
  opponentFusion,
  opponentName,
  rewards,
  rewardError,
  onReturnHome,
  onPlayAgain,
  matchType,
  isPve,
  economySettings,
  campaignStage
}) => {
  if (!isVisible) return null;

  const actions = [
    {
      text: 'Back To Campaign',
      icon: Home,
      onClick: onReturnHome,
      variant: 'outline',
      className: 'border-gray-600 text-gray-300 hover:bg-gray-700'
    },
    {
      text: 'Play Again',
      icon: RotateCcw,
      onClick: onPlayAgain,
      className: 'bg-purple-600 hover:bg-purple-700'
    }
  ];

  return (
    <PopupDialog
      open={isVisible}
      onClose={onReturnHome}
      title={isVictory ? 'Victory Achieved!' : 'Defeat Suffered'}
      titleIcon={isVictory ? Trophy : Skull}
      titleColor={isVictory ? 'text-yellow-400' : 'text-red-400'}
      actions={actions}
      maxWidth="max-w-lg"
    >
      <PopupPreview>
        <div
          className={`text-6xl mb-4 ${
            isVictory ? 'text-yellow-400' : 'text-red-400'
          }`}
        >
          {isVictory ? '🏆' : '💀'}
        </div>
        <p className="text-gray-400 mb-4 text-center">
          {isVictory
            ? `Your ${playerFusion?.fusedName || 'Fusion'} has triumphed over ${
                opponentName
              }'s ${opponentFusion?.fusedName || 'Fusion'}!`
            : `${opponentName}'s ${
                opponentFusion?.fusedName || 'Fusion'
              } has defeated your ${playerFusion?.fusedName || 'Fusion'}.`}
        </p>
        <Badge
          className={`${
            matchType === 'ranked'
              ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
              : 'bg-blue-500/20 text-blue-300 border-blue-500/50'
          } mb-4`}
        >
          {matchType?.toUpperCase() || 'CASUAL'} MATCH
        </Badge>
      </PopupPreview>

      {rewardError && <p role="alert" className="text-red-300">{rewardError}</p>}

      {rewards &&
        (rewards.currency || rewards.rankingPoints || rewards.newRank) && (
          <PopupSection
            title="Battle Rewards"
            titleIcon={Gem}
            bgColor={isVictory ? 'bg-green-500/10' : 'bg-orange-500/10'}
            borderColor={isVictory ? 'border-green-500/50' : 'border-orange-500/50'}
            titleColor={isVictory ? 'text-green-300' : 'text-orange-300'}
          >
            <div className="space-y-3">
              {rewards.currency !== undefined && (
                <BattleRewards
                  currency={rewards.currency}
                  fragments={rewards.fragments}
                  isPve={isPve}
                  isWin={isVictory}
                  matchType={matchType}
                  economySettings={economySettings}
                  campaignStage={campaignStage}
                />
              )}
              {/* Rank Gain Row */}
              {rewards.rankingPoints !== undefined && (
                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp
                      className={`w-5 h-5 ${
                        rewards.rankingPoints > 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    />
                    <span className="font-semibold">Ranking Points</span>
                  </div>
                  <span
                    className={`text-lg font-bold ${
                      rewards.rankingPoints > 0 ? 'text-green-300' : 'text-red-300'
                    }`}
                  >
                    {rewards.rankingPoints > 0 ? '+' : ''}
                    {rewards.rankingPoints}
                  </span>
                </div>
              )}
              {/* Rank Up Row */}
              {rewards.newRank && (
                <div className="flex items-center justify-between p-3 bg-yellow-500/20 rounded-lg border border-yellow-500/50">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <span className="font-semibold text-yellow-300">
                      Rank Advanced!
                    </span>
                  </div>
                  <span className="text-lg font-bold text-yellow-300">
                    {rewards.newRank}
                  </span>
                </div>
              )}
              {/* Orbs Row */}
              {Array.isArray(rewards.orbs) && rewards.orbs.length > 0 && (
                <div className="p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-5 h-5 text-purple-400" />
                    <span className="font-semibold text-white">Orb Rewards</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rewards.orbs.map((orb) => (
                      <div
                        key={orb.id}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-800/60 rounded-lg border border-purple-500/30"
                      >
                        {/* optional rarity badge if you have one */}
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/50">
                          {orb.rarity}
                        </Badge>
                        <span className="text-sm text-gray-200">{orb.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </PopupSection>
        )}
      <PopupSection title="Battle Summary" titleIcon={Info}>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center p-2 bg-gray-700/30 rounded">
            <div className="font-semibold text-blue-300">Your Fighter</div>
            <div className="text-xs text-gray-400 mt-1">
              {playerFusion?.fusedName}
            </div>
          </div>
          <div className="text-center p-2 bg-gray-700/30 rounded">
            <div className="font-semibold text-red-300">Opponent</div>
            <div className="text-xs text-gray-400 mt-1">
              {opponentFusion?.fusedName}
            </div>
          </div>
        </div>
      </PopupSection>
    </PopupDialog>
  );
};

export default function BattleUI({
  match,
  playerFusion,
  opponentFusion,
  opponentUser, // New prop for opponent's user data
  playerAbilities = [],
  allAbilities, // <-- Receive allAbilities prop
  activeCooldowns = {},
  isPlayerTurn,
  onUseAbility,
  onEndTurn,
  battleLog = [],
  currentUser,
  isPve,
  playerHp,
  opponentHp,
  maxPlayerHp,
  maxOpponentHp,
  campaignStage,
  statusEffects = {},
  backgroundImage,
  loadingBackground,
  onPlayAgain,
  battleResults,
  playerOrbs = [],
  opponentOrbs = []
}) {
  const [showLog, setShowLog] = useState(true);
  const logContainerRef = useRef(null);
  const [showAbilityInfo, setShowAbilityInfo] = useState(null); // Added this state
  const [economySettings, setEconomySettings] = useState(null);
  const [combatAction, setCombatAction] = useState(null);

  // Ensure battleLog is always an array for safety
  const safeBattleLog = Array.isArray(battleLog) ? battleLog : [];

  // Helper function to get display name for status effects
  const getStatusEffectDisplayName = (effectName, abilityId) => {
    // Find the ability from the master list of all abilities
    const ability = allAbilities?.find(a => a.id === abilityId);

    // Use the custom name if it exists, otherwise format the technical name
    if (ability?.statEffectName) {
      return ability.statEffectName;
    }

    // Otherwise fall back to a formatted version of the effect name
    // Replace underscores with spaces and capitalize each word
    return effectName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop =
        logContainerRef.current.scrollHeight;
    }
  }, [battleLog]);

  const logCursor = useRef({ matchId: match?.id, length: safeBattleLog.length });

  useEffect(() => {
    const previous = logCursor.current;
    logCursor.current = { matchId: match?.id, length: safeBattleLog.length };
    if (previous.matchId !== match?.id || previous.length > safeBattleLog.length) {
      setCombatAction(null);
      return;
    }
    for (let index = safeBattleLog.length - 1; index >= previous.length; index--) {
      const entry = safeBattleLog[index];
      const type = entry.abilityType ?? allAbilities?.find(ability => ability.name === entry.action)?.type;
      if (!entry.actor || entry.actor === 'system' || !['attack', 'buff', 'debuff'].includes(type)) continue;
      setCombatAction({ key: index, type, actor: entry.actor === currentUser?.id ? 'player' : 'opponent' });
      break;
    }
  }, [safeBattleLog, match?.id, currentUser?.id, allAbilities]);

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
  }, []);

  const renderFusionCard = (fusion, hp, maxHp, statusEffects, orbs) => {
    if (!fusion) return <div className="game-card bg-gray-800/50 rounded-lg animate-pulse" />;
    
    return (
      <FusionCard
        fusion={fusion}
        mode="battle"
        hp={hp}
        maxHp={maxHp}
        statusEffects={statusEffects}
        equippedOrbs={orbs}
        allAbilities={allAbilities} // Pass the prop down to FusionCard
        getEffectDisplayName={getStatusEffectDisplayName} // Pass the helper down
      />
    );
  };

  const getActorNameForLog = (playerId) => {
    if (!playerId) return 'System';
    if (isPve && playerId === 'ai_opponent') return opponentFusion?.fusedName || 'Opponent';
    if (playerId === currentUser?.id) return 'You';
    if (isPve) return opponentFusion?.fusedName || 'Opponent'; // Fallback for PvE opponent
    return 'Opponent';
  };

  const getRewardText = () => {
    if (isPve && campaignStage) {
      return `Echoes: ${campaignStage.rewardShards}`;
    }
    if (!isPve && economySettings) {
      const winReward =
        match?.matchType === 'ranked'
          ? economySettings.rankedWinReward
          : economySettings.casualWinReward;
      const loseReward =
        match?.matchType === 'ranked'
          ? economySettings.rankedLossReward
          : economySettings.casualLossReward;
      return `Win: ${winReward} | Lose: ${loseReward} Echoes`;
    }
    return '';
  };

  const getRewardFragText = () => {
    if (isPve && campaignStage) {
      if (campaignStage.rewardFragments > 0) {
        return `Fragments: ${campaignStage.rewardFragments}`;
      } else {
        return 'Fragments: 0';
      }
    }
    return '';
  };

  const battleRewards = React.useMemo(() => {
    if (!match || match.state !== 'finished') return null;

    const isWin = match.winner === currentUser?.id;
    const isRanked = match.matchType === 'ranked';
    if (isPve) {
      if (!isWin) return { currency: 0, fragments: 0 };
      const earned = battleResults?.rewards;
      return earned ? { currency: earned.totalEchoes, fragments: earned.fragments, orbs: earned.orbs } : null;
    }
    if (!economySettings) return null;

    const currencyReward = isRanked
      ? (isWin ? economySettings.rankedWinReward : economySettings.rankedLossReward)
      : (isWin ? economySettings.casualWinReward : economySettings.casualLossReward);
    const rankingPoints = match.rankingChange ?? (isWin ? 50 : -25);
    const orbRewards = Array.isArray(match.orbRewards) ? match.orbRewards : [];

    return {
      currency: currencyReward,
      fragments: 0,
      rankingPoints: isRanked ? rankingPoints : undefined,
      newRank: match.newRank || undefined,
      orbs: orbRewards
    };
  }, [match, economySettings, currentUser, isPve, battleResults]);

  return (
    <>
      <div className="relative min-h-dvh w-full flex flex-col items-center gap-4 text-white p-2 sm:p-4">
        <ParticleSystem />

        {/* Top Bar Info */}
        <div className="w-full p-2 sm:p-4 z-20 bg-black/30 backdrop-blur-sm">
          <div className="flex flex-wrap justify-between items-center gap-3 w-full max-w-7xl mx-auto">

            {/* Player Profile (Left) */}
            <PlayerProfile user={currentUser} />
            
            <AnimatePresence>
              {match?.state !== 'finished' && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="text-center"
                >
                  <div>
                    <h2 className="text-2xl font-bold font-title">
                      Eldritch Combat
                    </h2>
                    <div className="flex justify-center items-center gap-4 text-sm text-gray-400">
                      <span
                        className={`capitalize px-2 py-1 rounded-full text-xs font-semibold ${
                          isPve
                            ? 'bg-purple-500/20 text-purple-300'
                            : match?.matchType === 'ranked'
                              ? 'bg-yellow-500/20 text-yellow-300'
                              : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {isPve
                          ? `Campaign: ${campaignStage?.name}`
                          : `${match?.matchType} Match`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Gem className="w-3 h-3 text-purple-400" />{' '}
                        {getRewardText()}
                        <Star className="w-3 h-3 text-blue-400" />{' '}
                        {getRewardFragText()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
             {/* Opponent Profile (Right) */}
            <PlayerProfile user={opponentUser} fusion={opponentFusion} isPve={isPve} alignment="right" />
          </div>
        </div>

        {/* Center Area: Fusions and VS */}
        <div className="w-full flex-1 flex items-center justify-center max-w-7xl mx-auto z-10">
          <div className="grid w-full min-w-0 grid-cols-1 justify-items-center items-center gap-3 lg:grid-cols-[minmax(0,var(--game-card-width))_auto_minmax(0,var(--game-card-width))] lg:justify-center sm:gap-4">
            {/* Player Fusion */}
            <div className="relative w-full max-w-[var(--game-card-width)] rounded-lg">
              {renderFusionCard(
                playerFusion,
                playerHp,
                maxPlayerHp,
                statusEffects.player,
                playerOrbs
              )}
              <BattleEffect key={combatAction?.key} effect={battleEffectFor(combatAction, "player")} />
            </div>

            {/* VS Circle */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="grid place-items-center"
            >
              <div className="px-1 text-center sm:px-2">
                {match?.state !== 'finished' && (
                  <>
                    <div className="w-10 h-10 sm:w-20 sm:h-20 bg-purple-600/50 rounded-full flex items-center justify-center border-2 border-purple-500 shadow-2xl shadow-purple-500/30">
                      <span className="text-lg sm:text-4xl font-bold font-title">
                        VS
                      </span>
                    </div>
                    <div
                      className={`mt-2 font-semibold text-lg ${
                        isPlayerTurn ? 'text-green-400 animate-pulse' : 'text-red-400'
                      }`}
                    >
                      {isPlayerTurn ? 'Your Turn' : 'Opponent Turn'}
                    </div>
                  </>
                )}
              </div>
            </motion.div>

            {/* Opponent Fusion */}
			      <div className="relative w-full max-w-[var(--game-card-width)] rounded-lg">
              {renderFusionCard(
                opponentFusion,
                opponentHp,
                maxOpponentHp,
                statusEffects.opponent,
                opponentOrbs
              )}
              <BattleEffect key={combatAction?.key} effect={battleEffectFor(combatAction, "opponent")} />
            </div>
            
          </div>
        </div>

        {/* Bottom Area: Actions and Log */}
        <div className="w-full z-20">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Battle Log */}
            <div className="min-w-0 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg font-title">Battle Log</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLog(!showLog)}
                  className="text-gray-400 hover:text-white flex items-center gap-1"
                >
                  {showLog ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                  {showLog ? 'Hide' : 'Show'}
                </Button>
              </div>
              <AnimatePresence>
                {showLog && (
                  <motion.div
                    initial={{ opacity: 0, maxHeight: 0 }}
                    animate={{ opacity: 1, maxHeight: 256 }}
                    exit={{ opacity: 0, maxHeight: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-black/30 backdrop-blur-sm rounded-lg border border-gray-700 h-64 flex flex-col"
                  >
                    <div
                      ref={logContainerRef}
                      className="battle-log-scrollbar flex-1 p-3 space-y-2 text-sm overflow-y-auto pr-4"
                    >
                      {safeBattleLog.map((entry, index) => (
                        <div
                          key={`log-${index}`}
                          className={`flex items-start gap-2 ${
                            getActorNameForLog(entry?.actor) === 'You'
                              ? 'text-green-300'
                              : 'text-red-300'
                          }`}
                        >
                          <span className="font-bold w-12 text-right">
                            {entry?.turn === 0 ? '' : `Turn ${entry?.turn || index + 1}:`}
                          </span>

                          <p className="flex-1 text-gray-300">
                            {entry?.turn === 0 ? (
                              // 🔹 Effect log (turn 0)
                              <span className="italic text-purple-300">
                                {entry?.result || ''}
                              </span>
                            ) : (
                              // 🔹 Normal turn log
                              <>
                                <span className="font-semibold mr-1 text-purple-300">
                                  {getActorNameForLog(entry?.actor)}
                                </span>
                                <span className="font-light text-white-300">
                                  {entry?.action === 'End Turn'
                                    ? 'passed their turn'
                                    : // Show "used {action}" and optionally append result
                                      `used ${entry?.action}`}
                                </span>
                                {entry?.action !== 'End Turn' && entry?.result && (
                                  <span className="italic text-blue-400 ml-1">
                                    {entry.result}
                                  </span>
                                )}
                              </>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="min-w-0 flex flex-col">
              <AnimatePresence mode="wait">
                {match?.state !== 'finished' ? (
                  <motion.div
                    key="actions"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full h-full flex flex-col"
                  >
                    <h3 className="font-bold text-lg text-center mb-2 font-title">
                      Choose Your Action
                    </h3>
                    <div className="grid grid-cols-1 gap-3 mb-3 flex-grow sm:grid-cols-2">
                      {playerAbilities.map((ability) => (
                        <AbilityCard
                          key={ability.id}
                          ability={ability}
                          mode="battle"
                          onAction={onUseAbility}
                          activeCooldown={activeCooldowns[ability.id] || 0}
                        />
                      ))}
                    </div>
                    <Button
                      onClick={onEndTurn}
                      disabled={!isPlayerTurn}
                      className="w-full bg-gray-700 hover:bg-gray-600 border border-gray-500"
                    >
                      End Turn
                    </Button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* End Modal */}
        <BattleEndModal
          isVisible={match?.state === 'finished'}
          isVictory={match?.winner === currentUser?.id}
          playerFusion={playerFusion}
          opponentFusion={opponentFusion}
          opponentName={opponentFusion?.fusedName || 'Opponent'}
          rewards={battleRewards}
          rewardError={battleResults?.isError ? battleResults.message : null}
          onReturnHome={() => (window.location.href = createPageUrl('Campaign'))}
          onPlayAgain={
            onPlayAgain ||
            (() => console.log('Play Again functionality not implemented.'))
          }
          matchType={match?.matchType}
          isPve={isPve}
          economySettings={economySettings}
          campaignStage={campaignStage}
        />
      </div>
    </>
  );
}
