/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminAbilityManagement from './pages/AdminAbilityManagement';
import AdminEconomyManagement from './pages/AdminEconomyManagement';
import AdminImageManagement from './pages/AdminImageManagement';
import AdminOrbManagement from './pages/AdminOrbManagement';
import Battle from './pages/Battle';
import BlackRegister from './pages/BlackRegister';
import Campaign from './pages/Campaign';
import Codex from './pages/Codex';
import Equipment from './pages/Equipment';
import FusionLab from './pages/FusionLab';
import Home from './pages/Home';
import HorrorTome from './pages/HorrorTome';
import Leaderboard from './pages/Leaderboard';
import MyFusions from './pages/MyFusions';
import PlayerStats from './pages/PlayerStats';
import Profile from './pages/Profile';
import Quests from './pages/Quests';
import QuickMatch from './pages/QuickMatch';
import TalentTree from './pages/TalentTree';
import Tutorial from './pages/Tutorial';
import Welcome from './pages/Welcome';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminAbilityManagement": AdminAbilityManagement,
    "AdminEconomyManagement": AdminEconomyManagement,
    "AdminImageManagement": AdminImageManagement,
    "AdminOrbManagement": AdminOrbManagement,
    "Battle": Battle,
    "BlackRegister": BlackRegister,
    "Campaign": Campaign,
    "Codex": Codex,
    "Equipment": Equipment,
    "FusionLab": FusionLab,
    "Home": Home,
    "HorrorTome": HorrorTome,
    "Leaderboard": Leaderboard,
    "MyFusions": MyFusions,
    "PlayerStats": PlayerStats,
    "Profile": Profile,
    "Quests": Quests,
    "QuickMatch": QuickMatch,
    "TalentTree": TalentTree,
    "Tutorial": Tutorial,
    "Welcome": Welcome,
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
    Layout: __Layout,
};