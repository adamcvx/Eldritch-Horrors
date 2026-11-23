import { useAccountEmail } from '@/components/user/IdentityGate';

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/entities/User';
import { GitMerge, Swords, Star, BarChart3, Trophy, ClipboardList, ShieldCheck, Settings, ChevronDown, ChevronRight, Beaker, Zap, Users, BookOpen, Gem, Image, Eye, Menu, X, Aperture, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppProvider, useAppContext } from './components/context/AppContext';
import { playMenuClick, playMenuHover, playAmbientMenu } from './components/sounds/SoundService';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navigationCategories = [
{
  name: 'The Sanctum',
  icon: Beaker,
  color: 'text-purple-400',
  items: [
  { name: 'Flesh Altar', href: createPageUrl('FusionLab'), icon: GitMerge },
  { name: 'Abominations', href: createPageUrl('MyFusions'), icon: Star },
  { name: 'Void Altar', href: createPageUrl('VoidAltar'), icon: Aperture },
  { name: 'Blasphemous Relics', href: createPageUrl('Equipment'), icon: Zap },
  { name: 'Forbidden Knowledge', href: createPageUrl('TalentTree'), icon: BookOpen }]

},
{
  name: 'The Maw',
  icon: Zap,
  color: 'text-red-400',
  items: [
  { name: 'Abyssal Crucible', href: createPageUrl('QuickMatch'), icon: Swords },
  { name: 'Forbidden Path', href: createPageUrl('Campaign'), icon: ShieldCheck }]

},
{
  name: 'The Congregation',
  icon: Users,
  color: 'text-blue-400',
  items: [
  { name: 'Rituals', href: createPageUrl('Quests'), icon: ClipboardList },
  { name: 'Sanity Report', href: createPageUrl('PlayerStats'), icon: BarChart3 },
  { name: 'Crucible Ascension', href: createPageUrl('Leaderboard'), icon: Trophy },
  { name: 'Codex of Amalgam', href: createPageUrl('Codex'), icon: BookOpen },
  { name: 'The Black Register', href: createPageUrl('BlackRegister'), icon: Gem }]

}];


// Admin category - only shown to admin users
const adminCategory = {
  name: 'Admin Tools',
  icon: Settings,
  color: 'text-orange-400',
  items: [
  { name: 'Economy Management', href: createPageUrl('AdminEconomyManagement'), icon: Gem },
  { name: 'Ability Management', href: createPageUrl('AdminAbilityManagement'), icon: Zap },
  { name: 'Orb Management', href: createPageUrl('AdminOrbManagement'), icon: Eye },
  { name: 'Image Management', href: createPageUrl('AdminImageManagement'), icon: Image }]

};

const CategorySection = ({ category, isExpanded, onToggle, currentPath, onItemClick }) => {
  const CategoryIcon = category.icon;

  return (
    <div className="mb-2">
      <button
        onClick={() => {onToggle();playMenuClick();}}
        onMouseEnter={playMenuHover}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors duration-200 text-left
          ${isExpanded ? 'bg-muted/30' : 'hover:bg-muted/20'}`}>

        <div className="flex items-center gap-3">
          <CategoryIcon className={`w-5 h-5 ${category.color}`} />
          <span className="eldritch-nav-title font-semibold">{category.name}</span>
        </div>
        {isExpanded ?
        <ChevronDown className="w-4 h-4 text-muted-foreground" /> :

        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        }
      </button>
      
      <AnimatePresence>
        {isExpanded &&
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden">

            <div className="ml-4 mt-2 space-y-1">
              {category.items.map((item) =>
            <Link
              key={item.name}
              to={item.href}
              onClick={() => {onItemClick();playMenuClick();}}
              onMouseEnter={playMenuHover}
              aria-current={currentPath === item.href ? "page" : undefined}
              className={`eldritch-nav-link flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 text-sm
                    ${currentPath === item.href ?
              'font-semibold' :
              'text-muted-foreground hover:bg-muted/30 hover:text-foreground'}`
              }>

                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
            )}
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

};

// Main Layout Content Component
function LayoutContent({ children, currentPageName }) {
  const accountEmail = useAccountEmail();
  const location = useLocation();
  const { currentUser, loading } = useAppContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showFirstTimeGuide, setShowFirstTimeGuide] = useState(false);

  const [expandedCategories, setExpandedCategories] = React.useState({
    'The Sanctum': false,
    'The Maw': false,
    'The Congregation': false,
    'Admin Tools': false
  });

  React.useEffect(() => {
    // Collapse all categories when path changes, except the one for the current page
    const newExpandedState = {};
    let foundCategory = false;

    // Check regular categories
    navigationCategories.forEach((category) => {
      const isCurrentCategory = category.items.some((item) => location.pathname === item.href);
      newExpandedState[category.name] = isCurrentCategory;
      if (isCurrentCategory) {
        foundCategory = true;
      }
    });

    // Check admin category if user is admin
    const isAdmin = currentUser?.role === 'admin';
    if (isAdmin) {
      const isCurrentAdminCategory = adminCategory.items.some((item) => location.pathname === item.href);
      newExpandedState[adminCategory.name] = isCurrentAdminCategory;
      if (isCurrentAdminCategory) {
        foundCategory = true;
      }
    }

    // If no category matches the current path, default to 'The Sanctum' and 'The Maw' expanded
    if (!foundCategory) {
      newExpandedState['The Sanctum'] = true;
      newExpandedState['The Maw'] = true;
      if (isAdmin) {
        newExpandedState[adminCategory.name] = false;
      }
    }

    setExpandedCategories(newExpandedState);
  }, [location.pathname, currentUser?.role]);

  // Check if user is new and should see the guide tooltip
  React.useEffect(() => {
    if (currentUser && !loading) {
      // Consider user "new" if they have no fusions and haven't dismissed the guide
      const isNewUser = !currentUser.hasSeenTutorial &&
      currentUser.currency <= 150 && // Still has starting currency
      currentUser.wins === 0 && // No wins yet
      currentUser.campaignProgress === 0; // No campaign progress

      setShowFirstTimeGuide(isNewUser);
    }
  }, [currentUser, loading]);

  const dismissGuide = async () => {
    setShowFirstTimeGuide(false);
    if (currentUser) {
      try {
        await User.updateMyUserData({ hasSeenTutorial: true });
      } catch (error) {
        console.error('Error updating tutorial flag:', error);
      }
    }
  };

  // Close mobile menu when route changes
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Play ambient music based on current page
  React.useEffect(() => {
    const currentPath = location.pathname;

    // Determine which ambient track to play based on the current page
    if (currentPath.includes('FusionLab') ||
    currentPath.includes('MyFusions') ||
    currentPath.includes('VoidAltar') ||
    currentPath.includes('Equipment') ||
    currentPath.includes('TalentTree')) {












      // Don't change ambient here as individual pages handle it
    } else if (currentPath.includes('QuickMatch') || currentPath.includes('Battle') || currentPath.includes('Campaign')) {


      // Don't change ambient here as individual pages handle it
    } else {// Default ambient for other pages
      playAmbientMenu();}}, [location.pathname]);const isAdmin = currentUser?.role === 'admin';const toggleCategory = (categoryName) => {setExpandedCategories((prev) => ({ ...prev, [categoryName]: !prev[categoryName] }));};

  const handleMobileItemClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>

      <div className="eldritch-shell min-h-screen w-full text-foreground flex relative">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-b border-border/50 z-40 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 hover:bg-muted/30 rounded-lg transition-colors">

              {isMobileMenuOpen ?
              <X className="w-6 h-6 text-foreground" /> :

              <Menu className="w-6 h-6 text-foreground" />
              }
            </button>
            <h1 className="text-lg font-bold text-primary font-title">
              Eldritch Horrors
            </h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Mobile Menu Backdrop */}
        {isMobileMenuOpen &&
        <div
          className="lg:hidden fixed inset-0 mobile-menu-backdrop z-30"
          onClick={() => setIsMobileMenuOpen(false)} />

        }

        {/* Sidebar */}
        <aside className={`
          eldritch-sidebar fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
          w-80 max-w-[calc(100vw-2rem)] shrink-0 lg:w-64 bg-background/95 lg:bg-background/80 backdrop-blur-lg
          border-r border-border/50 flex flex-col p-4
          transform transition-transform duration-300 ease-in-out lg:transform-none
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Desktop Title */}
          <div className="text-center p-4 hidden lg:block">
            <div className="eldritch-brand"><Eye size={27} aria-hidden="true" /> <span>Eldritch Horrors</span></div>
          </div>

          {/* Mobile Title */}
          <div className="lg:hidden flex items-center justify-between gap-2 p-2 mb-4 border-b border-border/30">
            <h1 className="text-xl font-bold text-primary font-title">
              Eldritch-Horrors
            </h1>
            <button type="button" className="shrink-0 rounded p-2 hover:bg-muted/30" aria-label="Close menu" onClick={() => setIsMobileMenuOpen(false)}>
              <X className="size-5" />
            </button>
          </div>

          {/* User Profile Section - At Top */}
          <div className="mb-6 pb-4 border-b border-border/50">
            {loading ?
            <div className="flex items-center gap-3 p-2">
                <div className="w-10 h-10 bg-muted rounded-full animate-pulse"></div>
                <div className="flex-1 space-y-2">
                    <div className="w-3/4 h-4 bg-muted rounded animate-pulse"></div>
                    <div className="w-1/2 h-3 bg-muted rounded animate-pulse"></div>
                </div>
              </div> :
            currentUser &&
            <Link
              to={createPageUrl('Profile')}
              className="block p-2 rounded-lg hover:bg-muted/30 transition-colors"
              onClick={playMenuClick}
              onMouseEnter={playMenuHover}>

                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={currentUser.avatar} alt={currentUser.displayName || currentUser.full_name || currentUser.email} />
                    <AvatarFallback className="bg-purple-600 text-white font-bold">
                        {(currentUser.displayName || currentUser.full_name || currentUser.email || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="overflow-hidden">
                    <p className="font-semibold text-sm truncate text-foreground">{currentUser.displayName || currentUser.full_name || 'Nameless Cultist'}</p>
                    <p className="text-xs truncate text-muted-foreground" title={accountEmail ?? currentUser.email}>{accountEmail ?? currentUser.email}</p>
                  </div>
                </div>
              </Link>
            }
          </div>
          
          <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
            {navigationCategories.map((category) =>
            <CategorySection
              key={category.name}
              category={category}
              isExpanded={expandedCategories[category.name]}
              onToggle={() => toggleCategory(category.name)}
              onItemClick={handleMobileItemClick}
              currentPath={location.pathname} />

            )}
            
            {isAdmin &&
            <>
                <div className="border-t border-border/50 my-4"></div>
                <CategorySection
                key={adminCategory.name}
                category={adminCategory}
                isExpanded={expandedCategories[adminCategory.name]}
                onToggle={() => toggleCategory(adminCategory.name)}
                onItemClick={handleMobileItemClick}
                currentPath={location.pathname} />

              </>
            }
          </nav>

          {/* Beginner's Guide - Standalone at bottom */}
          <div className="my-4 pt-4 border-t border-border/50 relative">
            <Link
              to={createPageUrl('Tutorial')}
              onClick={() => {handleMobileItemClick();playMenuClick();dismissGuide();}}
              onMouseEnter={playMenuHover}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 text-sm w-full
                ${location.pathname === createPageUrl('Tutorial') ?
              'bg-primary/20 text-primary-foreground border-l-2 border-primary' :
              'text-muted-foreground hover:bg-muted/30 hover:text-foreground bg-purple-600/10 border border-purple-500/30'}`}>

              <HelpCircle className="w-4 h-4" />
              <span className="text-slate-50 font-semibold">Beginner's Guide</span>
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 flex-1 overflow-x-auto">
          <div className="px-3 pb-4 pt-20 sm:px-4 lg:px-6 lg:pt-4">
            {children}
          </div>
        </main>

        {/* First-Time User Welcome Modal */}
        <AnimatePresence>
          {showFirstTimeGuide &&
          <>
              {/* Dark overlay */}
              <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
              onClick={dismissGuide} />

              
              {/* Welcome modal */}
              <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[101] w-[calc(100%-2rem)] max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">

                <div className="bg-gray-800/50 text-card-foreground pt-6 pr-6 pb-6 pl-6 rounded-lg border shadow-sm border-gray-700">
                  {/* Welcome header */}
                  <div className="text-center mb-4">
                    <div className="text-2xl mb-2">👋</div>
                    <h2 className="text-xl font-bold text-white mb-2">Welcome, New Cultist!</h2>
                    <p className="text-slate-100 text-sm leading-relaxed">Start here to learn the forbidden arts and master your eldritch powers.

                  </p>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <Link
                    to={createPageUrl('Tutorial')}
                    onClick={dismissGuide}
                    className="flex-1 px-4 py-3 bg-white/20 rounded-lg text-center text-sm font-semibold text-white hover:bg-white/30 transition-colors backdrop-blur-sm border border-white/20">

                      Start Guide
                    </Link>
                    <button
                    onClick={dismissGuide} className="bg-black/20 text-slate-100 px-4 py-3 text-sm flex-1 rounded-lg hover:bg-black/30 transition-colors backdrop-blur-sm border border-black/20">


                      Dismiss
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          }
        </AnimatePresence>
      </div>
    </>);

}

// Main Layout component that wraps everything with AppProvider
export default function Layout({ children, currentPageName }) {
  return (
    <AppProvider>
      {currentPageName === 'Welcome' ?
      <>{children}</> :

      <LayoutContent children={children} currentPageName={currentPageName} />
      }
    </AppProvider>);

}