import { getCampaignReplayFragments } from '../components/loot/LootService';

import React, { useState, useEffect, useCallback } from 'react';
import { Fusion } from '@/entities/Fusion';
import { Orb } from '@/entities/Orb';
import { loadCampaign } from '../components/campaign/CampaignService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Star, ShieldCheck, Gem, Lock, CheckCircle2, Play, Crown, MapPin, Loader2, BookOpen, Eye, Skull, RefreshCw, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FusionCard from '../components/cards/FusionCard';
import { calculateTalentBonuses } from '../components/talents/TalentService';
import { Talent } from '@/entities/Talent';
import PopupDialog from '../components/ui/PopupDialog';
import { useAppContext } from '../components/context/AppContext';


export default function CampaignPage() {
  const { currentUser } = useAppContext();
  const [campaignStages, setCampaignStages] = useState([]);
  const [enemyFusions, setEnemyFusions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeToReset, setTimeToReset] = useState('');
  const [selectedStoryStage, setSelectedStoryStage] = useState(null);

  const loadCampaignData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading campaign data...');
      const fetchedCampaignStages = await loadCampaign();

      if (fetchedCampaignStages.length === 0) {
        console.warn('No campaign stages found. The weekly campaign may not have been generated yet.');
        setCampaignStages([]);
        setLoading(false);
        return;
      }

      setCampaignStages(fetchedCampaignStages);

      const fusionIds = fetchedCampaignStages.map((stage) => stage.enemyFusionId).filter(Boolean);
      if (fusionIds.length > 0) {
        const allFusions = await Fusion.filter({ id: { "$in": fusionIds } });
        const fusionsById = allFusions.reduce((acc, f) => ({ ...acc, [f.id]: f }), {});

        const allOrbIds = [...new Set(allFusions.flatMap((f) => f.equippedOrbs || []))];
        let orbsById = {};
        if (allOrbIds.length > 0) {
          const allOrbs = await Orb.filter({ id: { "$in": allOrbIds } });
          orbsById = allOrbs.reduce((acc, o) => ({ ...acc, [o.id]: o }), {});
        }

        const allTalents = await Talent.list();
        const finalEnemyFusionsMap = {};

        for (const stage of fetchedCampaignStages) {
          if (stage.enemyFusionId && fusionsById[stage.enemyFusionId]) {
            const fusion = fusionsById[stage.enemyFusionId];
            const loadedOrbs = (fusion.equippedOrbs || []).map((id) => orbsById[id]).filter(Boolean);
            const levelBonus = fusion.levelBonus || { hp: 0, attack: 0, defense: 0, speed: 0 };
            const talentBonus = await calculateTalentBonuses(fusion.learnedTalents || [], fusion.stats, allTalents);

            finalEnemyFusionsMap[stage.id] = {
              ...fusion,
              levelBonus,
              talentBonus,
              loadedEquippedOrbs: loadedOrbs
            };
          }
        }
        setEnemyFusions(finalEnemyFusionsMap);
      }

    } catch (error) {
      console.error('Error loading campaign data:', error);
      setError(`Failed to load campaign: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaignData();
  }, [loadCampaignData]);

  useEffect(() => {
    const updateResetTimer = () => {
      const now = new Date();
      const targetTimeZone = 'America/New_York'; // Handles EST/EDT automatically

      // Function to get the UTC timestamp for the upcoming reset (Sunday 23:59:59.999 in the target timezone)
      const getNextResetTimestamp = (currentRefDate) => {
        const resetHour = 23;
        const resetMinute = 59;
        const resetSecond = 59;
        const resetMillisecond = 999;

        // Step 1: Create a Date object representing 'now' but initialized with the target timezone's wall-clock time.
        // This leverages `toLocaleString` to correctly interpret the current moment in the target timezone,
        // effectively creating a Date object whose internal UTC value corresponds to the target timezone's current local time.
        let nowInTargetTZ = new Date(currentRefDate.toLocaleString('en-US', { timeZone: targetTimeZone }));

        // Step 2: Determine the day of the week for 'now' in the target timezone (0=Sunday, 6=Saturday).
        const dayOfWeek = nowInTargetTZ.getDay();

        let daysToAdvance = (7 - dayOfWeek) % 7; // Days until the next Sunday (0 if today is Sunday)

        // Step 3: If today is Sunday in the target timezone, check if the reset time has already passed for today.
        if (dayOfWeek === 0) {
          const todayResetTime = new Date(nowInTargetTZ); // Copy the Date object for today in target TZ
          todayResetTime.setHours(resetHour, resetMinute, resetSecond, resetMillisecond);

          if (nowInTargetTZ.getTime() > todayResetTime.getTime()) {
            daysToAdvance = 7; // Reset has passed for this Sunday, so target next Sunday
          } else {
            daysToAdvance = 0; // Reset is still today
          }
        }

        // Step 4: Advance the date part of `nowInTargetTZ` to the correct upcoming Sunday.
        nowInTargetTZ.setDate(nowInTargetTZ.getDate() + daysToAdvance);

        // Step 5: Set the time components of `nowInTargetTZ` to the reset time (23:59:59.999).
        // At this point, `nowInTargetTZ` is a Date object whose internal UTC timestamp correctly represents
        // "next Sunday 23:59:59.999 in America/New_York".
        nowInTargetTZ.setHours(resetHour, resetMinute, resetSecond, resetMillisecond);

        return nowInTargetTZ.getTime(); // Return its UTC timestamp
      };

      const resetTimeUTC = getNextResetTimestamp(now);

      if (resetTimeUTC === 0) {
        setTimeToReset("Error calculating reset time.");
        return;
      }

      const diff = resetTimeUTC - now.getTime();

      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        // Display the countdown and the local reset time with timezone info
        const resetLocalTime = new Date(resetTimeUTC).toLocaleString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        });

        setTimeToReset(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeToReset("Resetting soon...");
      }
    };

    updateResetTimer();
    const interval = setInterval(updateResetTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenStory = (stage) => {
    setSelectedStoryStage(stage);
  };

  const handleCloseStory = () => {
    setSelectedStoryStage(null);
  };

  const campaignProgress = currentUser?.campaignProgress || 0;

  const stagesByChapter = campaignStages.reduce((acc, stage) => {
    if (!acc[stage.chapter]) {
      acc[stage.chapter] = [];
    }
    acc[stage.chapter].push(stage);
    return acc;
  }, {});

  const totalChapters = Object.keys(stagesByChapter).length;

  if (loading) {
    return (
      <div className="container mx-auto flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-gray-300">Loading the Forbidden Path...</p>
        </div>
      </div>);

  }

  if (error) {
    return (
      <div className="container mx-auto max-w-2xl py-16 text-center text-red-400 bg-red-900/20 border border-red-700 rounded-lg p-8">
        <Skull className="w-12 h-12 mx-auto mb-4" />
        <p className="text-xl font-bold mb-2">Error encountered:</p>
        <p className="text-lg">{error}</p>
        <p className="text-sm mt-4 text-red-300">Please try refreshing the page or contact support if the issue persists.</p>
      </div>);

  }

  return (
    <>
      <div className="container mx-auto max-w-7xl">
        <Card className="bg-gray-800/50 border-gray-700 mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-purple-400" />
                  <span className="text-3xl">The Forbidden Path</span>
                </CardTitle>
                <p className="text-gray-400 mt-2">Descend through chapters of unspeakable trials.</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-2 rounded-lg border text-card-foreground shadow-sm bg-gray-800/50 border-gray-700 p-3">
                  <RefreshCw className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-300 text-sm font-bold">Resets in: {timeToReset}</span>
                </div>
                {currentUser &&
                  <p className="text-sm text-gray-400">
                    Progress: Stage {currentUser.campaignProgress + 1}
                  </p>
                }
              </div>
            </div>
          </CardHeader>
        </Card>

        {campaignStages.length === 0 ?
          <div className="text-center py-16 bg-gray-800/50 border border-gray-700 rounded-lg">
            <Clock className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <p className="text-gray-300 text-xl font-bold mb-2">The Stars Align</p>
            <p className="text-gray-400">The Forbidden Path is being woven from the threads of madness.</p>
            <p className="text-sm text-gray-500 mt-2">Check back soon, for the weekly trials will soon begin.</p>
          </div> :

          <div className="space-y-12">
            {Object.keys(stagesByChapter).
              sort((a, b) => parseInt(a) - parseInt(b)).
              map((chapterNum, chapterIndex) => {
                const chapterStages = stagesByChapter[chapterNum].sort((a, b) => a.stageNumber - b.stageNumber);
                const chapterTitle = chapterStages[0]?.chapterTitle || `Chapter ${chapterNum}`;
                const fullChapterTitle = `Chapter ${chapterNum}: ${chapterTitle}`;
                const isLastChapter = parseInt(chapterNum) === totalChapters;

                return (
                  <div key={chapterNum} className="space-y-6">
                    <div className="relative">
                      <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: chapterIndex * 0.1 }}
                        className="text-center">

                        <h2 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-red-400">
                          {fullChapterTitle}
                        </h2>
                        <div className="flex items-center justify-center gap-2 mb-4">
                          {isLastChapter &&
                            <Badge className="bg-red-500/20 text-red-300 border-red-500/50">
                              <Crown className="w-3 h-3 mr-1" />
                              Final Chapter
                            </Badge>
                          }
                          <Badge variant="outline" className="text-purple-300 border-purple-500/50">
                            {chapterStages.length} {chapterStages.length === 1 ? 'Trial' : 'Trials'}
                          </Badge>
                        </div>
                      </motion.div>

                      <div className="absolute left-1/2 transform -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent mb-6"></div>
                    </div>

                    <div className="relative overflow-hidden p-4">
                      <div className="absolute inset-0 opacity-20">
                        {[...Array(40)].map((_, i) =>
                          <motion.div
                            key={i}
                            className="absolute w-1 h-1 bg-purple-400 rounded-full"
                            style={{
                              left: `${Math.random() * 100}%`,
                              top: `${Math.random() * 100}%`
                            }}
                            animate={{ y: [-10, 10, -10], opacity: [0.3, 1, 0.3] }}
                            transition={{
                              duration: 3 + Math.random() * 2,
                              repeat: Infinity,
                              delay: Math.random() * 2 + chapterIndex
                            }} />
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 relative bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 rounded-2xl p-8 border border-purple-500/30" style={{ zIndex: 2 }}>
                        {chapterStages.map((stage, stageIndex) => {
                          const globalStageNumber = stage.stageNumber;
                          const isUnlocked = globalStageNumber <= campaignProgress + 1;
                          const isCompleted = globalStageNumber <= campaignProgress;
                          const isCurrent = globalStageNumber === campaignProgress + 1;
                          const enemyFusion = enemyFusions[stage.id];
                          const isClickable = isUnlocked;

                          let statusIcon;
                          if (isCompleted) {
                            statusIcon = <CheckCircle2 className="w-6 h-6 text-green-300" />;
                          } else if (isCurrent) {
                            statusIcon = <Play className="w-6 h-6 text-yellow-300" />;
                          } else {
                            statusIcon = <Lock className="w-6 h-6 text-gray-400" />;
                          }

                          if (!enemyFusion) {
                            return null;
                          }

                          return (
                            <div key={stage.id} className="flex-shrink-0 flex flex-col p-6">
                              <Link
                                aria-label={isCompleted ? 'Replay ' + stage.name : undefined}
                                to={isClickable ? createPageUrl(`Battle?campaignId=${stage.id}`) : '#'}
                                className={`${!isClickable ? 'pointer-events-none' : ''}`}>

                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  transition={{
                                    delay: chapterIndex * 0.3 + stageIndex * 0.1,
                                    duration: 0.5
                                  }} className="w-full rounded-lg border-2 transition-all duration-300 relative hover:scale-105 hover:shadow-xl border-yellow-500/60 shadow-yellow-500/20 overflow-visible">
                                  <div className="relative">
                                    <FusionCard
                                      fusion={enemyFusion}
                                      equippedOrbs={enemyFusion.loadedEquippedOrbs}
                                      className="!overflow-visible !border-none"
                                      headerContent={
                                        stage.isBoss &&
                                        <motion.div className="absolute top-2 left-2">
                                          <Crown className={`w-6 h-6 ${stage.isFinalBoss ? 'text-red-400' : 'text-orange-400'} drop-shadow-lg filter ${stage.isFinalBoss ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]'}`} />
                                          {stage.isFinalBoss &&
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                          }
                                        </motion.div>
                                      } />

                                    <div className="mx-5 my-4 absolute top-[148px] right-2 z-20">
                                      <div className={`
                                      w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm border-2
                                      ${isCompleted ? 'bg-green-500/30 border-green-400' :
                                          isCurrent ? 'bg-yellow-500/30 border-yellow-400' :
                                            'bg-gray-600/30 border-gray-500'}`
                                      }>
                                        {statusIcon}
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              </Link>

                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                  delay: chapterIndex * 0.3 + stageIndex * 0.1 + 0.2,
                                  duration: 0.3
                                }}
                                className="mt-4 p-4 bg-gray-800/60 backdrop-blur-sm border border-gray-600/50 rounded-lg">

                                <div className="text-center mb-3">
                                  <p className="text-sm text-purple-400 font-bold">
                                    {stage.isBoss ? stage.isFinalBoss ? 'FINAL BOSS' : 'BOSS' : `Stage ${stage.stageNumber}`}
                                  </p>
                                  <p className="text-xs text-gray-400 truncate">{stage.name}</p>
                                </div>

                                {stage.story && (isCompleted || isCurrent) &&
                                  <div className="mb-3 flex justify-center items-center gap-2">
                                    <button
                                      onClick={() => handleOpenStory(stage)}
                                      className="flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors cursor-pointer group">

                                      <BookOpen className="w-4 h-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
                                      <p className="text-xs italic">The void calls to you...</p>
                                    </button>
                                  </div>
                                }

                                <div className="flex items-center justify-center gap-1">
                                  <Gem className="w-3 h-3 text-purple-400" />
                                  <span
                                    className={`text-xs font-semibold ${stage.isFinalBoss ? 'text-red-300' : 'text-purple-300'}`
                                    }>
                                    {stage.rewardShards} Echoes
                                  </span>

                                  <Star className="w-3 h-3 text-blue-400" />
                                  <span className="text-blue-300 text-xs font-bold ml-1">
                                    {isCompleted ? getCampaignReplayFragments(stage) : stage.rewardFragments} Fragments
                                  </span>
                                </div>

                              </motion.div>
                            </div>);
                        })}
                      </div>
                    </div>

                    {chapterIndex < totalChapters - 1 &&
                      <div className="flex items-center justify-center">
                        <div className="flex items-center gap-4">
                          <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-purple-500/50 w-32"></div>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            className="w-8 h-8 border-2 border-purple-500/50 border-dashed rounded-full flex items-center justify-center">
                            <Eye className="w-4 h-4 text-purple-400" />
                          </motion.div>
                          <div className="h-px bg-gradient-to-l from-transparent via-gray-600 to-purple-500/50 w-32"></div>
                        </div>
                      </div>
                    }
                  </div>);
              })}
          </div>
        }

        <Card className="mt-8 bg-gradient-to-r from-gray-900 via-purple-900/30 to-gray-900 border-purple-500/30 shadow-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }}>
                <ShieldCheck className="w-7 h-7 text-purple-400" />
              </motion.div>
              Your Journey Through Madness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-gray-300 text-lg mb-4">
                  Trials Conquered: <span className="font-bold text-green-400 text-xl">{campaignProgress}</span> of {campaignStages.length}
                  {totalChapters > 1 &&
                    <span className="text-sm text-gray-400 ml-2">
                      ({totalChapters} chapters total)
                    </span>
                  }
                </p>
                <div className="relative w-full bg-gray-800 rounded-full h-4 overflow-visible border border-purple-500/30">
                  <motion.div
                    className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-purple-500 relative"
                    initial={{ width: 0 }}
                    animate={{ width: `${campaignProgress / campaignStages.length * 100}%` }}
                    transition={{ duration: 2.5, delay: 1 }}>
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </motion.div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedStoryStage &&
        <PopupDialog
          open={!!selectedStoryStage}
          onClose={handleCloseStory}
          title={selectedStoryStage.name}
          titleIcon={BookOpen}
          titleColor="text-purple-300"
          maxWidth="max-w-2xl"
          actions={[{
            text: "Close",
            icon: X,
            onClick: handleCloseStory,
            variant: "outline",
            className: "border-gray-600 text-gray-300 hover:bg-gray-700"
          }]}>

          <div className="text-center">
            <div className="text-lg font-bold text-purple-400 mb-2">
              Chapter {selectedStoryStage.chapter}: {selectedStoryStage.chapterTitle}
            </div>
            <div className="text-sm text-gray-400 mb-4">
              {selectedStoryStage.isBoss ? 'Boss Battle' : `Stage ${selectedStoryStage.stageNumber}`}
            </div>
            <div className="bg-gray-900/50 border border-purple-500/30 rounded-lg p-6 bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900">
              <p className="text-gray-300 leading-relaxed italic text-center text-sm">
                {selectedStoryStage.story}
              </p>
            </div>
            <div className="text-center text-xs text-gray-500 mt-4">
              The whispers of the void echo through time...
            </div>
          </div>
        </PopupDialog>
      }
    </>);
}
