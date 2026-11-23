import React from 'react';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import TutorialSection from '../components/tutorial/TutorialSection';
import { 
  GitMerge, 
  Star, 
  Zap, 
  ShieldCheck, 
  ClipboardList, 
  Swords, 
  Gem, 
  Aperture, 
  BookOpen, 
  HelpCircle 
} from 'lucide-react';

export default function TutorialPage() {
  return (
    <div className="container mx-auto max-w-6xl">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-bold font-title mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
          Beginner's Guide
        </h1>
        <p className="text-lg text-gray-400">Welcome, Cultist. This tome will guide you on your path to mastering the forbidden arts.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Step 1: Abominations */}
        <TutorialSection
          icon={GitMerge}
          title="1. The Flesh Altar"
          description="Your journey begins by merging the essences of lesser horrors. Select two Horrors to fuse into a new, more powerful creation with unique stats and a terrifying new form called Abominations."
          linkTo={createPageUrl('FusionLab')}
          linkText="Go to the Flesh Altar"
        />

        {/* Step 2: Empowering */}
        <TutorialSection
          icon={Star}
          title="2. Empower Abominations"
          description="A newly-birthed horror is but a blank slate. Visit your collection to spend 'Echoes' and empower your Abominations, increasing their level and base stats to prepare them for the trials ahead."
          linkTo={createPageUrl('MyFusions')}
          linkText="View Your Abominations"
        />

        {/* Step 3: Abilities & Orbs */}
        <TutorialSection
          icon={Zap}
          title="3. Blasphemous Relics"
          description="Power is more than just raw stats. Equip your Abominations with powerful abilities and reality-bending Orbs. Manage your loadouts carefully to gain an edge in combat."
          linkTo={createPageUrl('Equipment')}
          linkText="Manage Equipment"
        />

        {/* Step 4: PvE */}
        <TutorialSection
          icon={ShieldCheck}
          title="4. The Forbidden Path"
          description="Test your creations against the terrifying guardians of the Forbidden Path. Progress through campaign stages to earn valuable rewards like Void Shards and Fragments for first-time victories."
          linkTo={createPageUrl('Campaign')}
          linkText="Begin the Campaign"
        />
        
        {/* Step 5: Daily Quests */}
        <TutorialSection
          icon={ClipboardList}
          title="5. Perform Daily Rituals"
          description="The Great Old Ones demand tribute. Complete daily rituals (quests) by playing and winning matches to earn a steady supply of Echoes and other resources."
          linkTo={createPageUrl('Quests')}
          linkText="Check Your Rituals"
        />

        {/* Step 6: PvP */}
        <TutorialSection
          icon={Swords}
          title="6. The Abyssal Crucible"
          description="When you are ready, enter the Abyssal Crucible to pit your Abominations against those of other cultists. Fight in casual or ranked matches to prove your dominance and climb the leaderboards."
          linkTo={createPageUrl('QuickMatch')}
          linkText="Enter the Crucible"
        />

        {/* Step 7: Black Register */}
        <TutorialSection
          icon={Gem}
          title="7. The Black Register"
          description="The marketplace for the mad. Here you can buy and sell powerful Abominations and rare Orbs with other players. A keen eye can find a bargain or a fortune."
          linkTo={createPageUrl('BlackRegister')}
          linkText="Visit the Market"
        />

        {/* Step 8: Ascension */}
        <TutorialSection
          icon={Aperture}
          title="8. Ascend an Abomination"
          description="Reach level 25 through Empower in Abominations. Empower becomes Ascend, which lets you spend Void Fragments to add a star and increase base stats by 10%. Earn Fragments from Forbidden Path bosses. Each abomination can ascend up to five times."
          linkTo={createPageUrl('MyFusions')}
          linkText="Open Abominations"
        />
        
        {/* Step 9: Talents */}
        <TutorialSection
          icon={BookOpen}
          title="9. Forbidden Knowledge"
          description="Unlock your true potential by learning powerful, permanent talents. These passive bonuses enhance all your Abominations, reduce costs, and provide significant advantages across the entire game."
          linkTo={createPageUrl('TalentTree')}
          linkText="Study Forbidden Knowledge"
        />
      </div>
    </div>
  );
}