import OnlineMatch from './OnlineMatch';
import { cloudEnabled } from '@/api/cloudSave';

import React, { useState, useEffect } from 'react';
import { Match } from '@/entities/Match';
import { Fusion } from '@/entities/Fusion';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Swords, Users, Clock, Play, Search, Zap, Trophy, Target, X } from 'lucide-react';
import { motion } from 'framer-motion';
import RankBadge from '../components/RankBadge';
import { getEffectiveStats } from '../components/talents/TalentService';
import { getCurrentUserWithDefaults } from '../components/user/UserService';
import { playButtonClick, playBattleStart, playAmbientMaw } from '../components/sounds/SoundService';

export default function QuickMatch() {
  return cloudEnabled ? <OnlineMatch /> : <LegacyQuickMatch />;
}

function LegacyQuickMatch() {
  const [fusions, setFusions] = useState([]);
  const [selectedFusion, setSelectedFusion] = useState('');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('casual');
  const [searchingMatchId, setSearchingMatchId] = useState(null);
  const [matchDetails, setMatchDetails] = useState({}); // Store opponent and fusion details

  // Start ambient music when component mounts
  useEffect(() => {
    playAmbientMaw();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await getCurrentUserWithDefaults(); // Use the new function
        setCurrentUser(user);

        const [userFusions, allMatches] = await Promise.all([
          Fusion.filter({ playerOwner: user.id }),
          Match.list('-created_date')]
        );

        const activeMatches = allMatches.filter((m) => m.state !== 'canceled');
        setFusions(userFusions);
        setMatches(activeMatches);

        // Load detailed information for active battles
        const activeBattles = activeMatches.filter((match) =>
          match.state === 'in_progress' &&
          match.players &&
          match.players.includes(user.id)
        );

        const detailsPromises = activeBattles.map(async (match) => {
          try {
            const opponentId = match.players.find(id => id !== user.id);
            const playerFusionId = match.fusionMonsters?.[user.id];
            const opponentFusionId = match.fusionMonsters?.[opponentId];

            const [opponent, playerFusion, opponentFusion] = await Promise.all([
              opponentId ? User.filter({ id: opponentId }).then(res => res[0]) : null,
              playerFusionId ? Fusion.filter({ id: playerFusionId }).then(res => res[0]) : null,
              opponentFusionId ? Fusion.filter({ id: opponentFusionId }).then(res => res[0]) : null
            ]);

            // Determine whose turn it is
            const lastAction = match.log?.[match.log.length - 1];
            let isPlayerTurn;
            if (!lastAction) {
              // If no actions yet, it's the first player's turn (assuming players[0] starts)
              isPlayerTurn = match.players[0] === user.id;
            } else {
              // It's the turn of the player who did NOT act last
              isPlayerTurn = lastAction.actor !== user.id;
            }

            return {
              matchId: match.id,
              opponent,
              playerFusion,
              opponentFusion,
              isPlayerTurn
            };
          } catch (error) {
            console.error(`Error loading details for match ${match.id}:`, error);
            return { matchId: match.id, opponent: null, playerFusion: null, opponentFusion: null, isPlayerTurn: false };
          }
        });

        const details = await Promise.all(detailsPromises);
        const detailsMap = {};
        details.forEach(detail => {
          detailsMap[detail.matchId] = detail;
        });
        setMatchDetails(detailsMap);

        // Check if user has an existing waiting match
        const existingWaitingMatch = activeMatches.find((match) =>
          match.state === 'waiting' &&
          match.players && match.players.includes(user.id) &&
          match.players.length === 1
        );

        if (existingWaitingMatch) {
          setSearching(true);
          setSearchingMatchId(existingWaitingMatch.id);
          // Ensure the selected fusion is set to the one used in the waiting match
          if (existingWaitingMatch.fusionMonsters && existingWaitingMatch.fusionMonsters[user.id]) {
            setSelectedFusion(existingWaitingMatch.fusionMonsters[user.id]);
          }
          setActiveTab(existingWaitingMatch.matchType || 'casual');

          // Start polling for opponent
          const checkForOpponent = async () => {
            try {
              const results = await Match.filter({ id: existingWaitingMatch.id });
              if (results.length > 0 && results[0].state === 'in_progress') {
                setSearching(false); // Clear searching state before navigation
                setSearchingMatchId(null);
                window.location.href = createPageUrl(`Battle?matchId=${existingWaitingMatch.id}`);
              } else if (results.length > 0 && results[0].state === 'waiting') {
                setTimeout(checkForOpponent, 3000);
              } else {
                // Match might have been canceled or completed by another means
                setSearching(false);
                setSearchingMatchId(null);
              }
            } catch (error) {
              console.error('Error checking for opponent:', error);
              setSearching(false);
              setSearchingMatchId(null);
            }
          };
          checkForOpponent();
        }

      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Simplified match cancellation - only cancel when explicitly stopping search
  useEffect(() => {
    // Only set up cleanup for beforeunload (actual page close/refresh)
    const handleBeforeUnload = () => {
      if (searching && searchingMatchId) {
        // Use navigator.sendBeacon for more reliable cleanup on page unload
        // This sends a small HTTP request in the background without delaying page unload.
        // It's important that this endpoint handles the match cancellation on the server side.
        try {
          navigator.sendBeacon('/api/cancel-match', JSON.stringify({ matchId: searchingMatchId }));
        } catch (e) {
          console.error("Error sending beacon:", e);
          // Fallback if sendBeacon fails or isn't supported, though less reliable
          // if (navigator.sendBeacon === undefined) {
          //   // Old browsers might need XMLHttpRequest with async: false, but that's blocking
          //   // For modern apps, sendBeacon is preferred for this scenario.
          // }
        }
      }
    };

    // Only listen for actual page unload, not navigation within app
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Don't automatically cancel matches on component unmount or visibility change
      // This allows normal navigation to battle screen without premature cancellation.
    };
  }, [searching, searchingMatchId]);

  const getEffectiveStatsForMatch = (fusion) => {
    // Use the centralized effective stats calculation
    return getEffectiveStats(fusion);
  };

  const cancelSearch = async () => {
    playButtonClick();
    setSearching(false);

    if (searchingMatchId) {
      try {
        await Match.update(searchingMatchId, { state: 'canceled' });
        setMatches((prevMatches) => prevMatches.filter((m) => m.id !== searchingMatchId)); // Optimistically update UI
      } catch (error) {
        console.error('Error canceling match:', error);
      }
    }
    setSearchingMatchId(null);
  };

  const findBattle = async (matchType = 'casual') => {
    if (!selectedFusion || !currentUser) return;

    playBattleStart(); // Play sound when starting to find battle
    setSearching(true);
    try {
      const fusion = fusions.find((f) => f.id === selectedFusion);

      // 1. Search for existing waiting matches of the same type
      const waitingMatches = await Match.filter({ state: 'waiting', matchType });

      // 2. Find available match (not including current user)
      const availableMatch = waitingMatches.find((match) =>
        match.players &&
        match.players.length === 1 &&
        !match.players.includes(currentUser.id)
      );

      if (availableMatch) {
        // 3. Join existing match as second player and set state to in_progress
        const updatedMatch = {
          players: [...availableMatch.players, currentUser.id],
          fusionMonsters: {
            ...availableMatch.fusionMonsters,
            [currentUser.id]: selectedFusion
          },
          state: 'in_progress',
          hp: {
            ...availableMatch.hp,
            [selectedFusion]: getEffectiveStatsForMatch(fusion).hp
          },
          cooldowns: {
            ...availableMatch.cooldowns,
            [currentUser.id]: {}
          }
        };

        await Match.update(availableMatch.id, updatedMatch);
        setSearching(false);
        setSearchingMatchId(null);
        window.location.href = createPageUrl(`Battle?matchId=${availableMatch.id}`);
      } else {
        // 4. Create new match with state = waiting
        const matchData = {
          players: [currentUser.id],
          fusionMonsters: { [currentUser.id]: selectedFusion },
          state: 'waiting',
          matchType,
          hp: { [selectedFusion]: getEffectiveStatsForMatch(fusion).hp },
          cooldowns: { [currentUser.id]: {} },
          log: [],
          created_date: new Date().toISOString() // Ensure created_date is set for accurate display
        };

        const newMatch = await Match.create(matchData);
        setSearchingMatchId(newMatch.id);

        // Simple polling - check every 3 seconds for opponent
        const checkForOpponent = async () => {
          try {
            const results = await Match.filter({ id: newMatch.id });
            if (results.length > 0 && results[0].state === 'in_progress') {
              // Clear searching state before navigation
              setSearching(false);
              setSearchingMatchId(null);
              window.location.href = createPageUrl(`Battle?matchId=${newMatch.id}`);
            } else if (results.length > 0 && results[0].state === 'waiting') {
              setTimeout(checkForOpponent, 3000);
            } else {
              // Match might have been canceled externally or completed
              setSearching(false);
              setSearchingMatchId(null);
            }
          } catch (error) {
            console.error('Error checking for opponent:', error);
            setSearching(false);
            setSearchingMatchId(null);
          }
        };
        checkForOpponent();
      }
    } catch (error) {
      console.error('Error finding battle:', error);
      setSearching(false);
      setSearchingMatchId(null);
    }
  };

  const createMatch = async (matchType = 'casual') => {
    if (!selectedFusion || !currentUser) return;

    playButtonClick();

    try {
      const fusion = fusions.find((f) => f.id === selectedFusion);

      const matchData = {
        players: [currentUser.id],
        fusionMonsters: { [currentUser.id]: selectedFusion },
        state: 'waiting',
        matchType,
        hp: { [selectedFusion]: getEffectiveStatsForMatch(fusion).hp },
        cooldowns: { [currentUser.id]: {} },
        log: [],
        created_date: new Date().toISOString() // Ensure created_date is set
      };

      const newMatch = await Match.create(matchData);
      window.location.href = createPageUrl(`Battle?matchId=${newMatch.id}`);
    } catch (error) {
      console.error('Error creating match:', error);
    }
  };

  const joinMatch = async (matchId) => {
    if (!selectedFusion || !currentUser) return;

    playBattleStart();

    try {
      const results = await Match.filter({ id: matchId });
      if (results.length === 0) {
        console.error("Match not found");
        return;
      }
      const match = results[0];
      const fusion = fusions.find((f) => f.id === selectedFusion);

      const updatedMatch = {
        players: [...match.players, currentUser.id],
        fusionMonsters: { ...match.fusionMonsters, [currentUser.id]: selectedFusion },
        state: 'in_progress',
        hp: { ...match.hp, [selectedFusion]: getEffectiveStatsForMatch(fusion).hp },
        cooldowns: { ...match.cooldowns, [currentUser.id]: {} }
      };

      await Match.update(matchId, updatedMatch);
      window.location.href = createPageUrl(`Battle?matchId=${matchId}`);
    } catch (error) {
      console.error('Error joining match:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>);
  }

  return (
    <div className="container mx-auto max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Abyssal Crucible</h1>
        <p className="text-gray-400">Pit your abominations against others in ritual combat.</p>
      </div>

      {fusions.length === 0 ?
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg mb-6">You must conjure an abomination to do battle.</p>
          <Link to={createPageUrl('FusionLab')}>
            <Button className="game-button-primary">Go to the Flesh Altar</Button>
          </Link>
        </div> :

        <div className="space-y-8">
          {/* Player Stats */}
          {currentUser &&
            <Card className="rounded-lg border text-card-foreground shadow-sm bg-card border-border">
              <CardHeader>
                <CardTitle>Your Battle Record</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center gap-4">
                    <RankBadge rank={currentUser.rank} points={currentUser.rankingPoints} showPoints={true} size="large" />
                  </div>
                  <div className="flex gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-400">{currentUser.wins || 0}</p>
                      <p className="text-sm text-gray-400">Total Wins</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-400">{currentUser.losses || 0}</p>
                      <p className="text-sm text-gray-400">Total Losses</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          }

          {/* Battle Mode Selection */}
          <Card className="
              relative game-gallery rounded-lg p-3 sm:p-5 lg:p-8 border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Swords className="w-5 h-5" />
                Select Battle Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={searching ? undefined : setActiveTab} className="w-full">
                <TabsList className={`grid w-full grid-cols-2 mb-6 ${searching ? 'opacity-50' : ''}`}>
                  <TabsTrigger value="casual" className="flex items-center gap-2" disabled={searching}>
                    <Target className="w-4 h-4" />
                    Casual
                  </TabsTrigger>
                  <TabsTrigger value="ranked" className="flex items-center gap-2" disabled={searching}>
                    <Trophy className="w-4 h-4" />
                    Ranked
                  </TabsTrigger>
                </TabsList>

                <div className="space-y-6">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <Select value={selectedFusion} onValueChange={searching ? undefined : setSelectedFusion} disabled={searching}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose your abomination" />
                        </SelectTrigger>
                        <SelectContent>
                          {fusions.map((fusion) => {
                            const effectiveStats = getEffectiveStatsForMatch(fusion);
                            const hasAbilities = fusion.abilities && fusion.abilities.length > 0;

                            return (
                              <SelectItem
                                key={fusion.id}
                                value={fusion.id}
                                disabled={!hasAbilities}
                                className={!hasAbilities ? "text-red-500/70 focus:bg-red-500/20" : ""}>

                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-semibold ${!hasAbilities ? 'text-red-500' : ''}`}>
                                      {fusion.fusedName} (Lv.{fusion.level || 1})
                                    </span>
                                    {!hasAbilities && <span className="text-red-500 text-xs">- No abilities</span>}
                                  </div>
                                  <div className="text-xs text-gray-400 flex gap-3 mt-1">
                                    <span>HP: {effectiveStats.hp}</span>
                                    <span>ATK: {effectiveStats.attack}</span>
                                    <span>DEF: {effectiveStats.defense}</span>
                                    <span>SPD: {effectiveStats.speed}</span>
                                  </div>
                                </div>
                              </SelectItem>);
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <TabsContent value="casual" className="space-y-4">
                    <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-300 mb-2">Casual Mode</h4>
                      <p className="text-sm text-gray-400">Play for fun without affecting your rank. Perfect for trying new strategies!</p>
                    </div>

                    {selectedFusion &&
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center">

                        <div className="flex gap-3 justify-center">
                          <Button
                            onClick={() => findBattle('casual')}
                            disabled={searching}
                            size="lg"
                            className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-xl font-bold px-12 py-6 h-auto shadow-2xl shadow-blue-500/30">

                            {searching ?
                              <>
                                <Search className="w-6 h-6 mr-3 animate-spin" />
                                Finding Casual Match...
                              </> :

                              <>
                                <Target className="w-6 h-6 mr-3" />
                                Find Casual Battle
                              </>
                            }
                          </Button>

                          {searching &&
                            <Button
                              onClick={cancelSearch}
                              variant="outline"
                              size="lg"
                              className="border-red-600 text-red-300 hover:bg-red-700/20">

                              <X className="w-6 h-6 mr-2" />
                              Cancel
                            </Button>
                          }
                        </div>
                      </motion.div>
                    }
                  </TabsContent>

                  <TabsContent value="ranked" className="space-y-4">
                    <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-300 mb-2">Ranked Mode</h4>
                      <p className="text-sm text-gray-400">Competitive battles that affect your rank and ranking points. Win to climb the ladder!</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-yellow-400">Your Rank:</span>
                        <RankBadge rank={currentUser?.rank} points={currentUser?.rankingPoints} showPoints={true} size="small" />
                      </div>
                    </div>

                    {selectedFusion &&
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center">

                        <div className="flex gap-3 justify-center">
                          <Button
                            onClick={() => findBattle('ranked')}
                            disabled={searching}
                            size="lg"
                            className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-xl font-bold px-12 py-6 h-auto shadow-2xl shadow-yellow-500/30">

                            {searching ?
                              <>
                                <Search className="w-6 h-6 mr-3 animate-spin" />
                                Finding Ranked Match...
                              </> :

                              <>
                                <Trophy className="w-6 h-6 mr-3" />
                                Find Ranked Battle
                              </>
                            }
                          </Button>

                          {searching &&
                            <Button
                              onClick={cancelSearch}
                              variant="outline"
                              size="lg"
                              className="border-red-600 text-red-300 hover:bg-red-700/20">

                              <X className="w-6 h-6 mr-2" />
                              Cancel
                            </Button>
                          }
                        </div>
                      </motion.div>
                    }
                  </TabsContent>

                  {searching &&
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-gray-400 text-center">

                      Looking for opponents or creating a new match...
                    </motion.p>
                  }
                </div>
              </Tabs>

              {/* Manual Options */}
              <div className="border-t border-gray-600 pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4 text-center text-gray-300">Or create a private match:</h3>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => createMatch('casual')}
                    disabled={!selectedFusion || searching}
                    variant="outline"
                    className="border-blue-600 text-blue-300 hover:bg-blue-700/20">

                    Create Casual Match
                  </Button>
                  <Button
                    onClick={() => createMatch('ranked')}
                    disabled={!selectedFusion || searching}
                    variant="outline"
                    className="border-yellow-600 text-yellow-300 hover:bg-yellow-700/20">

                    Create Ranked Match
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Matches */}
          <Card className="
              relative game-gallery rounded-lg p-3 sm:p-5 lg:p-8 border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Available Matches ({matches.filter((match) => match.state === 'waiting' && match.players && !match.players.includes(currentUser?.id)).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matches.filter((match) => match.state === 'waiting' &&
                match.players && !match.players.includes(currentUser?.id)).length === 0 ?
                <p className="text-gray-400 text-center py-8">No matches waiting for players.</p> :

                <div className="space-y-3">
                  {matches.filter((match) => match.state === 'waiting' &&
                    match.players && !match.players.includes(currentUser?.id)).map((match) =>
                      <motion.div
                        key={match.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600 hover:border-gray-500 transition-all">

                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-yellow-400" />
                          <span>Player waiting...</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            match.matchType === 'ranked' ?
                              'bg-yellow-500/20 text-yellow-300' :
                              'bg-blue-500/20 text-blue-300'}`
                          }>
                            {match.matchType?.toUpperCase() || 'CASUAL'}
                          </span>
                          <span className="text-xs text-gray-400">
                            Created {new Date(match.created_date).toLocaleTimeString()}
                          </span>
                        </div>
                        <Button
                          onClick={() => joinMatch(match.id)}
                          disabled={!selectedFusion || searching}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700">

                          <Play className="w-4 h-4 mr-2" />
                          Join Battle
                        </Button>
                      </motion.div>
                    )}
                </div>
              }
            </CardContent>
          </Card>

          {/* Active Matches */}
          {matches.filter((match) => match.state === 'in_progress' &&
            match.players && match.players.includes(currentUser?.id)).length > 0 &&
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Your Active Battles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {matches.filter((match) => match.state === 'in_progress' &&
                    match.players && match.players.includes(currentUser?.id)).map((match) => {
                      const details = matchDetails[match.id];
                      const opponent = details?.opponent;
                      const playerFusion = details?.playerFusion;
                      const opponentFusion = details?.opponentFusion;
                      const isPlayerTurn = details?.isPlayerTurn;

                      return (
                        <motion.div
                          key={match.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-4 bg-green-500/20 rounded-lg border border-green-500/50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-green-300 font-semibold">Battle in progress</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                match.matchType === 'ranked' ?
                                  'bg-yellow-500/20 text-yellow-300' :
                                  'bg-blue-500/20 text-blue-300'}`
                              }>
                                {match.matchType?.toUpperCase() || 'CASUAL'}
                              </span>
                              {details && ( // Only show turn info if details are loaded
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  isPlayerTurn ? 'bg-green-500/20 text-green-300' : 'bg-orange-500/20 text-orange-300'}`
                                }>
                                  {isPlayerTurn ? 'Your Turn' : 'Opponent Turn'}
                                </span>
                              )}
                            </div>

                            <div className="text-sm text-gray-300">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">You:</span>
                                  <span className="text-blue-300 font-medium">{playerFusion?.fusedName || 'Loading...'}</span>
                                </div>
                                <span className="text-gray-500">vs</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">Opponent:</span>
                                  <span className="text-red-300 font-medium">{opponent?.displayName || opponent?.full_name || 'Unknown'}</span>
                                  <span className="text-gray-400">({opponentFusion?.fusedName || 'Loading...'})</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <Link to={createPageUrl(`Battle?matchId=${match.id}`)}>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              Continue Battle
                            </Button>
                          </Link>
                        </motion.div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          }
        </div>
      }
    </div>);
}
