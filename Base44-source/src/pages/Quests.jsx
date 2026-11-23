
import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Quest } from '@/entities/Quest';
import { generateDailyQuests } from '../components/quests/QuestService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gem, Check, Loader2, RefreshCw, ClipboardList } from 'lucide-react'; // Add ClipboardList
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentUserWithDefaults, getGlobalEconomySettings } from '../components/user/UserService';
import { Badge } from '@/components/ui/badge'; // Import Badge component

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function QuestsPage() {
  const [quests, setQuests] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [economySettings, setEconomySettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);
  const [timeToReset, setTimeToReset] = useState('');

  const loadQuestData = async () => {
    setLoading(true);
    try {
      const [user, economy] = await Promise.all([
        getCurrentUserWithDefaults(),
        getGlobalEconomySettings()
      ]);
      setCurrentUser(user);
      setEconomySettings(economy);

      const today = getTodayDateString();
      if (user.lastQuestGenerationDate !== today) {
        await generateDailyQuests(user);
        await User.updateMyUserData({ lastQuestGenerationDate: today });
      }

      const userQuests = await Quest.filter({ user: user.id, type: 'daily' }, '-created_date');
      setQuests(userQuests);

    } catch (error) {
      console.error('Error loading quest data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestData();

    const interval = setInterval(() => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor(diff % (1000 * 60 * 60) / (1000 * 60));
      const seconds = Math.floor(diff % (1000 * 60) / 1000);

      setTimeToReset(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleClaimReward = async (quest) => {
    if (quest.status !== 'completed' || claiming) return;

    setClaiming(quest.id);
    try {
      const multiplier = economySettings?.dailyQuestMultiplier || 1;
      const finalReward = Math.floor(quest.baseReward * multiplier);

      // Update user currency
      const newCurrency = (currentUser.currency || 0) + finalReward;
      await User.updateMyUserData({ currency: newCurrency });

      // Update quest status
      await Quest.update(quest.id, { status: 'claimed' });

      // Refresh data
      loadQuestData();

    } catch (error) {
      console.error('Error claiming reward:', error);
    } finally {
      setClaiming(null);
    }
  };

  const completedQuests = quests.filter(q => q.status === 'claimed');

  return (
    <div className="container mx-auto max-w-7xl"> {/* Changed max-w-4xl to max-w-7xl */}
      {/* Header */}
      <Card className="bg-card border-border mb-8">
        <CardHeader>
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div>
              <CardTitle className="flex items-center gap-3">
                <ClipboardList className="w-8 h-8 text-purple-400" />
                <span className="text-3xl">Daily Rituals</span>
              </CardTitle>
              <p className="text-gray-400 mt-2">Appease the outer gods to earn their favor. New rituals daily!</p>
              {economySettings?.dailyQuestMultiplier > 1 && (
                <div className="mt-3">
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/50">
                    {economySettings.dailyQuestMultiplier}x Reward Bonus Active!
                  </Badge>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2 rounded-lg border text-card-foreground shadow-sm bg-card border-border p-3">
                <RefreshCw className="w-4 h-4 text-purple-400" />
                <span className="text-primary text-sm font-bold">Resets in: {timeToReset}</span>
              </div>
              {currentUser && (
                <p className="text-sm text-gray-400">
                  Completed: {completedQuests.length} of {quests.length}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading ?
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto" />
        </div> :

        <div className="relative game-gallery rounded-lg p-3 sm:p-5 lg:p-8 border">
          <AnimatePresence>
            {quests.map((quest, index) => {
              const progress = quest.progress.count || 0;
              const required = quest.requirement.count;
              const isCompleted = quest.status === 'completed';
              const isClaimed = quest.status === 'claimed';

              const multiplier = economySettings?.dailyQuestMultiplier || 1;
              const finalReward = Math.floor(quest.baseReward * multiplier);

              return (
                <motion.div
                  key={quest.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}>

                  <Card className="bg-gray-800/50 text-card-foreground my-6 rounded-lg shadow-sm border-2 transition-all border-gray-700">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <p className={`font-semibold ${isClaimed ? 'text-gray-400' : 'text-white'}`}>
                          {quest.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="w-full bg-gray-700 rounded-full h-2.5">
                            <motion.div
                              className={`h-2.5 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-primary'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${progress / required * 100}%` }} />
                          </div>
                          <span className="text-sm text-gray-300 font-mono">
                            {Math.min(progress, required)}/{required}
                          </span>
                        </div>
                      </div>
                      <div className="w-40 text-right ml-6">
                        {isClaimed ?
                          <div className="flex items-center justify-end gap-2 text-gray-500">
                            <Check className="w-5 h-5" />
                            Claimed
                          </div> :
                          isCompleted ?
                            <Button
                              onClick={() => handleClaimReward(quest)}
                              disabled={claiming === quest.id}
                              className="bg-green-600 hover:bg-green-700">
                              {claiming === quest.id ?
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :
                                <>
                                  <Gem className="w-4 h-4 mr-2" />
                                  Claim {finalReward}
                                </>
                              }
                            </Button> :
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-2 text-purple-400">
                                <Gem className="w-5 h-5" />
                                <span>{finalReward} Echoes</span>
                              </div>
                              {multiplier > 1 && (
                                <div className="text-xs text-green-400">
                                  {quest.baseReward} × {multiplier} = {finalReward}
                                </div>
                              )}
                            </div>
                        }
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>);
            })}
          </AnimatePresence>
        </div>
      }
    </div>);
}
