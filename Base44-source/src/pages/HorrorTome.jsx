
import React, { useState, useEffect } from 'react';
import { Horror } from '@/entities/Horror';
import { Fusion } from '@/entities/Fusion';
import { User } from '@/entities/User';
import { Tome } from '@/entities/Tome'; // Import the new Tome entity
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ArrowLeft, Eye, Scroll, Star, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getOriginType } from '../components/synergy/SynergyService';
import { useAppContext } from '../components/context/AppContext';
import { playMenuClick, playAmbientSanctum } from '../components/sounds/SoundService';

// The generateLorePages function is now deprecated and will be removed.

export default function HorrorTome() {
  const { currentUser, loading: userLoading } = useAppContext();
  const [horror, setHorror] = useState(null);
  const [usageCount, setUsageCount] = useState(0);
  const [lorePages, setLorePages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Start ambient music when component mounts
  useEffect(() => {
    playAmbientSanctum();
  }, []);

  useEffect(() => {
    const loadHorrorData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const horrorId = urlParams.get('horrorId');

        if (!horrorId) {
          setError('No horror specified');
          return;
        }

        if (userLoading) {
          return;
        }

        if (!currentUser) {
          setError('Must be logged in to view tome');
          return;
        }

        // Fetch the horror details
        const horrorResults = await Horror.filter({ id: horrorId });
        if (horrorResults.length === 0) {
          setError('Horror not found');
          return;
        }

        const horrorData = horrorResults[0];
        setHorror(horrorData);

        // Fetch lore pages from the Tome entity for this specific horror
        const tomePages = await Tome.filter({ horrorName: horrorData.name });
        // Sort pages by their page number to ensure correct order
        tomePages.sort((a, b) => a.pageNumber - b.pageNumber);
        setLorePages(tomePages);

        // Count how many times this user has used this horror in fusions
        const allUserFusions = await Fusion.filter({ playerOwner: currentUser.id });
        const userFusions = allUserFusions.filter((fusion) => fusion.parents && fusion.parents.includes(horrorId));

        setUsageCount(userFusions.length);

      } catch (err) {
        console.error('Error loading horror data:', err);
        setError('Failed to load horror information');
      } finally {
        setLoading(false);
      }
    };

    loadHorrorData();
  }, [currentUser, userLoading]);

  // Show loading while user data is being fetched
  if (userLoading || loading) {
    return (
      <div className="container mx-auto flex justify-center items-center h-64">
        <div className="text-center">
          <BookOpen className="w-12 h-12 animate-pulse text-amber-500 mx-auto mb-4" />
          <p className="text-gray-400">Opening the tome...</p>
        </div>
      </div>);

  }

  if (error) {
    return (
      <div className="container mx-auto">
        <Card className="bg-red-900/20 border-red-500/50 mb-8">
          <CardHeader>
            <CardTitle className="text-red-400">Error</CardTitle>
            <p className="text-red-300">{error}</p>
            <Link to={createPageUrl('FusionLab')}>
              <Button className="mt-4 bg-red-600 hover:bg-red-700">
                Return to Flesh Altar
              </Button>
            </Link>
          </CardHeader>
        </Card>
      </div>);

  }

  if (!horror) return null;

  // The unlock logic now uses 'unlockRequirement' from the Tome entity
  const unlockedPages = lorePages.filter((page) => usageCount >= page.unlockRequirement);
  const nextLockedPage = lorePages.find((page) => usageCount < page.unlockRequirement);

  return (
    <div className="container mx-auto max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to={createPageUrl('FusionLab')}>
          <Button
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
            onClick={playMenuClick}>

            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Altar
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-title">Tome of {horror.name}</h1>
          <p className="text-gray-400">Bindings performed: {usageCount}</p>
        </div>
      </div>

      {/* Horror Preview */}
      <Card className="rounded-lg border text-card-foreground shadow-sm bg-card border-border mb-8">
        <CardContent className="p-6">
          <div className="flex gap-6">
            <div className="relative w-32 h-32 flex-shrink-0">
              <img
                src={horror.image}
                alt={horror.name}
                className="w-full h-full object-cover rounded-lg border-2 border-amber-500/30" />

              <Badge className="inline-flex items-center border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent text-primary-foreground hover:bg-primary/80 absolute top-0 right-0 bg-cyan-600/20 text-cyan-300  px-2 py-1 rounded-full text-xs font-semibold z-20">
                {getOriginType(horror.origin)}
              </Badge>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{horror.name}</h2>
              <p className="text-gray-300 mb-4">{horror.description}</p>
              <div className="grid grid-cols-4 gap-4 text-sm">
                {Object.entries(horror.baseStats).map(([stat, value]) =>
                  <div key={stat} className="flex items-center gap-2">
                    <span className="capitalize text-gray-400">{stat}:</span>
                    <span className="text-white font-semibold">{value}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lore Pages */}
      <div className="space-y-6">
        <AnimatePresence>
          {unlockedPages.map((page, index) =>
            <motion.div
              key={page.id} // Use the entity's unique ID for the key
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}>

              <Card className="rounded-lg border bg-card text-card-foreground shadow-sm game-gallery border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-3">
                    <Scroll className="w-5 h-5" />
                    {page.title}
                    <Badge variant="outline" className="border-amber-500/50 text-amber-400">
                      Page {page.pageNumber}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-invert prose-amber max-w-none">
                    <p className="text-gray-300 leading-relaxed italic">
                      {page.content}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next locked page preview */}
        {nextLockedPage &&
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: unlockedPages.length * 0.1 }}>

            <Card className="bg-gray-800/30 border-gray-600/50 opacity-60">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-gray-500">
                  <Lock className="w-5 h-5" />
                  {nextLockedPage.title}
                  <Badge variant="outline" className="border-gray-600 text-gray-500">
                    Locked
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-gray-500 text-sm">
                      Unlock this page by using {horror.name} in {nextLockedPage.unlockRequirement - usageCount} more fusion{nextLockedPage.unlockRequirement - usageCount !== 1 ? 's' : ''}.
                    </p>
                  </div>
                  <div className="text-2xl text-gray-600">???</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        }

        {/* Completion message */}
        {lorePages.length > 0 && unlockedPages.length === lorePages.length &&
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}>

            <Card className="bg-gradient-to-r from-amber-900/50 to-yellow-900/50 border-amber-400">
              <CardContent className="p-6 text-center">
                <Star className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-amber-300 mb-2">
                  Tome Complete
                </h3>
                <p className="text-amber-200">
                  You have unlocked all known secrets of {horror.name}.
                  Your mastery of this horror is unparalleled.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        }
      </div>
    </div>);

}
