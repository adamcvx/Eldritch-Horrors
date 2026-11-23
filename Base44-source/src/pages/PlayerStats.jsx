
import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Match } from '@/entities/Match';
import { Fusion } from '@/entities/Fusion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, Swords, TrendingUp, Users, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import RankBadge from '../components/RankBadge';

export default function PlayerStats() {
  const [currentUser, setCurrentUser] = useState(null);
  const [detailedMatches, setDetailedMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlayerData = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);

        // Fetch a larger number of matches to filter out canceled ones client-side
        const playerMatchesResults = await Match.filter({ players: user.id }, '-created_date', 20);
        const playerMatches = playerMatchesResults.
        filter((match) => match.state !== 'canceled').
        slice(0, 10);

        if (playerMatches.length > 0) {
          const opponentIds = new Set(playerMatches.map((m) => m.players.find((p) => p !== user.id)).filter(Boolean));
          const fusionIds = new Set(playerMatches.flatMap((m) => Object.values(m.fusionMonsters)));

          const opponentDataPromises = [...opponentIds].map((id) => User.filter({ id }));
          const fusionDataPromises = [...fusionIds].map((id) => Fusion.filter({ id }));

          const [opponentResults, fusionResults] = await Promise.all([
          Promise.all(opponentDataPromises),
          Promise.all(fusionDataPromises)]
          );

          const opponentsMap = new Map(opponentResults.flat().map((o) => [o.id, o]));
          const fusionsMap = new Map(fusionResults.flat().map((f) => [f.id, f]));

          const detailedData = playerMatches.map((match) => {
            const opponentId = match.players.find((p) => p !== user.id);
            const playerFusionId = match.fusionMonsters[user.id];
            const opponentFusionId = match.fusionMonsters[opponentId];

            return {
              ...match,
              opponent: opponentsMap.get(opponentId),
              playerFusion: fusionsMap.get(playerFusionId),
              opponentFusion: fusionsMap.get(opponentFusionId)
            };
          });
          setDetailedMatches(detailedData);
        }

      } catch (error) {
        console.error('Error loading player data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPlayerData();
  }, []);

  const getMatchResultText = (match) => {
    if (match.state === 'abandoned') {
      return match.winner === currentUser?.id ? 'Win (Abandoned)' : 'Loss (Abandoned)';
    }
    if (match.state === 'finished') {
      // Keep original, correct logic: match.playerFusion is available from detailedMatches
      const playerHp = match.hp[match.playerFusion?.id];
      if (playerHp === undefined) return 'Unknown'; // Should not happen for finished matches, but as fallback
      return playerHp > 0 ? 'Win' : 'Loss';
    }
    return 'Ongoing';
  };

  const getResultBadgeClass = (resultText) => {
    if (resultText.includes('Win')) return 'border-green-500/50 bg-green-500/10 text-green-300';
    if (resultText.includes('Loss')) return 'border-red-500/50 bg-red-500/10 text-red-300';
    if (resultText === 'Ongoing') return 'border-blue-500/50 bg-blue-500/10 text-blue-300';
    return 'border-gray-500/50 bg-gray-500/10 text-gray-300';
  };

  const overallWinRate = currentUser && currentUser.wins + currentUser.losses > 0 ?
  Math.round(currentUser.wins / (currentUser.wins + currentUser.losses) * 100) : 0;

  const rankedWinRate = currentUser && currentUser.rankedWins + currentUser.rankedLosses > 0 ?
  Math.round(currentUser.rankedWins / (currentUser.rankedWins + currentUser.rankedLosses) * 100) : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>);

  }

  return (
    <div className="container mx-auto max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Sanity Report</h1>
        <p className="text-gray-400">Track your combat effectiveness and standing among the cults.</p>
        {currentUser && (
          <div className="mt-4 flex justify-center">
            <RankBadge
              rank={currentUser?.rank}
              points={currentUser?.rankingPoints}
              showPoints={true}
              size="large"
            />
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Performance Stats */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Overall Win Rate</span>
                  <span>{overallWinRate}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div
                    className="bg-green-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${overallWinRate}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Ranked Win Rate</span>
                  <span>{rankedWinRate}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div
                    className="bg-yellow-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${rankedWinRate}%` }}
                    transition={{ duration: 1, delay: 0.7 }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Battle Statistics */}
        <Card className="game-gallery rounded-lg p-3 sm:p-5 lg:p-8 border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Battle Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div className="text-center p-3 bg-gray-700/30 rounded-lg" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-green-400">{currentUser?.wins || 0}</div>
                <div className="text-xs text-gray-400">Total Wins</div>
              </motion.div>
              <motion.div className="text-center p-3 bg-gray-700/30 rounded-lg" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-red-400">{currentUser?.losses || 0}</div>
                <div className="text-xs text-gray-400">Total Losses</div>
              </motion.div>
              <motion.div className="text-center p-3 bg-gray-700/30 rounded-lg" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-yellow-400">{currentUser?.rankedWins || 0}</div>
                <div className="text-xs text-gray-400">Ranked Wins</div>
              </motion.div>
              <motion.div className="text-center p-3 bg-gray-700/30 rounded-lg" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-orange-400">{currentUser?.rankedLosses || 0}</div>
                <div className="text-xs text-gray-400">Ranked Losses</div>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Matches - Full Width */}
      <Card className="game-gallery rounded-lg p-3 sm:p-5 lg:p-8 border mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Recent Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          {detailedMatches.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No battles recorded yet</p>
          ) : (
            <div className="space-y-4">
              {detailedMatches.map((match, index) => {
                const resultText = getMatchResultText(match);
                const badgeClass = getResultBadgeClass(resultText);

                return (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg border-2 ${badgeClass.split(' ')[0]}`}
                  >
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={badgeClass}>
                          {resultText}
                        </Badge>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          match.matchType === 'ranked' ?
                          'bg-yellow-500/20 text-yellow-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {match.matchType?.toUpperCase() || 'CASUAL'}
                        </span>
                        <p className="text-xs text-gray-400">
                          {new Date(match.created_date).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm text-gray-400">vs</p>
                          <p className="font-semibold">{match.opponent?.displayName || match.opponent?.full_name || 'Unknown'}</p>
                        </div>
                        {match.opponent && (
                          <RankBadge
                            rank={match.opponent.rank}
                            points={match.opponent.rankingPoints}
                            size="small"
                          />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm bg-gray-900/50 p-3 rounded-md">
                      <div className="text-center">
                        <p className="font-bold text-green-400">{match.playerFusion?.fusedName || 'N/A'}</p>
                        <p className="text-xs text-gray-400">Your Horror</p>
                      </div>
                      <Swords className="w-5 h-5 text-purple-400 mx-4" />
                      <div className="text-center">
                        <p className="font-bold text-red-400">{match.opponentFusion?.fusedName || 'N/A'}</p>
                        <p className="text-xs text-gray-400">Their Horror</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
