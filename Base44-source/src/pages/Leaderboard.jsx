
import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Crown, TrendingUp, Users, Eye, BookOpen, Star, Gem, Skull } from 'lucide-react';
import { motion } from 'framer-motion';
import RankBadge from '../components/RankBadge';

export default function Leaderboard() {
  const [topPlayers, setTopPlayers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const [allUsers, user] = await Promise.all([
        User.list('-rankingPoints', 50), // Top 50 players by ranking points
        User.me()]
        );

        // Filter out players with no ranked matches and sort
        const rankedPlayers = allUsers.filter((player) =>
        (player.rankedWins || 0) + (player.rankedLosses || 0) > 0
        );

        setTopPlayers(rankedPlayers);
        setCurrentUser(user);
      } catch (error) {
        console.error('Error loading leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  const getTrophyIcon = (position) => {
    if (position === 0) return <Crown className="w-6 h-6 text-yellow-400" />;
    if (position === 1) return <Trophy className="w-6 h-6 text-gray-300" />;
    if (position === 2) return <Medal className="w-6 h-6 text-amber-600" />;
    return <Award className="w-5 h-5 text-gray-500" />;
  };

  const getRankedWinRate = (player) => {
    const total = (player.rankedWins || 0) + (player.rankedLosses || 0);
    if (total === 0) return 0;
    return Math.round((player.rankedWins || 0) / total * 100);
  };

  const rankTiers = [
  { name: 'Initiate', range: '0-1199', icon: Eye, color: 'text-gray-400', description: 'New to the forbidden arts' },
  { name: 'Cultist', range: '1200-1499', icon: BookOpen, color: 'text-amber-400', description: 'Student of dark knowledge' },
  { name: 'Acolyte', range: '1500-1799', icon: Star, color: 'text-blue-400', description: 'Devoted practitioner' },
  { name: 'Occultist', range: '1800-2099', icon: Gem, color: 'text-purple-400', description: 'Master of arcane secrets' },
  { name: 'Herald', range: '2100-2399', icon: Skull, color: 'text-red-400', description: 'Harbinger of eldritch truth' },
  { name: 'Elder', range: '2400+', icon: Crown, color: 'text-yellow-400', description: 'Enlightened beyond mortal comprehension' }];


  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>);

  }

  return (
    <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold mb-2">Crucible Ascension</h1>
                <p className="text-gray-400">The hierarchy of the enlightened cultists</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column: Current Player Position */}
                <div className="space-y-6">
                    {currentUser &&
          <Card className="rounded-lg border text-card-foreground shadow-sm bg-gray-800/50 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-center">Your Standing</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                                            <span className="text-lg font-bold">
                                                {(currentUser.displayName || currentUser.full_name)?.charAt(0) || currentUser.email?.charAt(0) || '?'}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">{currentUser.displayName || currentUser.full_name || 'You'}</h3>
                                            <p className="text-gray-400 text-sm">
                                                Position: #{topPlayers.findIndex((p) => p.id === currentUser.id) + 1 || 'Unranked'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <RankBadge
                    rank={currentUser.rank}
                    points={currentUser.rankingPoints}
                    showPoints={true}
                    size="large" />

                                        <p className="text-gray-400 text-sm text-center">
                                            {getRankedWinRate(currentUser)}% Win Rate
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
          }

                    {/* Rank Tiers */}
                    <Card className="\nrelative bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 rounded-2xl p-8 border border-purple-500/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-purple-400" />
                                Hierarchy of Enlightenment
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-5">
                            <div className="mx-3 py-4 space-y-3">
                                {rankTiers.map((tier, index) =>
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }} className="bg-gray-700/30 mx-1 my-1 px-3 py-3 flex items-center justify-between rounded-lg">


                                        <div className="flex items-center gap-3">
                                            <tier.icon className={`w-5 h-5 ${tier.color}`} />
                                            <div>
                                                <h4 className="font-semibold text-white">{tier.name}</h4>
                                                <p className="text-left text-xs">{tier.description}</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                            {tier.range}
                                        </Badge>
                                    </motion.div>
                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Top Players */}
                <div className="lg:col-span-2">
                    <Card className="\nrelative bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 rounded-2xl p-8 border border-purple-500/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-yellow-400" />
                                Most Enlightened Cultists
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {topPlayers.length === 0 ?
              <div className="text-center py-8">
                                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-400">No cultists have yet entered the rankings. Be the first to ascend!</p>
                                </div> :

              <div className="space-y-3">
                                    {topPlayers.map((player, index) =>
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-lg border transition-all ${
                  player.id === currentUser?.id ?
                  'border-purple-500/50 bg-purple-500/10' :
                  'border-gray-600 bg-gray-700/30 hover:border-gray-500'}`
                  }>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        {getTrophyIcon(index)}
                                                        <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                                                    </div>
                                                    <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                                                        <span className="font-bold">
                                                            {(player.displayName || player.full_name)?.charAt(0) || player.email?.charAt(0) || '?'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold">{player.displayName || player.full_name || 'Cultist'}</h3>
                                                        <p className="text-gray-400 text-sm">
                                                            {player.rankedWins || 0}W - {player.rankedLosses || 0}L 
                                                            ({getRankedWinRate(player)}% WR)
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <RankBadge
                        rank={player.rank}
                        points={player.rankingPoints}
                        showPoints={true}
                        size="default" />

                                                </div>
                                            </div>
                                        </motion.div>
                )}
                                </div>
              }
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>);

}