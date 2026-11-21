
import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/entities/User';
import { EconomySettings } from '@/entities/EconomySettings';
import { generateDailyQuests } from '../components/quests/QuestService';
import { generateWeeklyCampaign } from '@/functions/generateWeeklyCampaign'; // Updated import
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldAlert, RefreshCw, Gem, Map, Star } from 'lucide-react';

// Add retry logic with exponential backoff for rate limit handling
const retryWithBackoff = async (fn, maxRetries = 4, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimit = error.message?.includes('429') || error.message?.includes('Rate limit');
      
      if (isRateLimit && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.warn(`Rate limit hit, retrying in ${Math.round(delay)}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
};

// Add a delay function to throttle requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Define default settings as a constant to avoid dependency issues
const DEFAULT_ECONOMY_SETTINGS = {
    talentRefundPercentage: 0.5,
    fusionRefundAmount: 25,
    dailyQuestMultiplier: 1.0,
    fusionCost: 50,
    fusionLevelingRefundRate: 0.5,
    casualWinReward: 5,
    casualLossReward: 2,
    rankedWinReward: 15,
    rankedLossReward: 5,
    campaignBossRewardFragments: 5
};

const AdminEconomyManagement = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [resettingQuests, setResettingQuests] = useState(false);
    const [regeneratingCampaign, setRegeneratingCampaign] = useState(false);
    
    // Global Economy Settings
    const [economySettings, setEconomySettings] = useState(null);
    const [newEconomySettings, setNewEconomySettings] = useState(DEFAULT_ECONOMY_SETTINGS);
    const [updatingEconomy, setUpdatingEconomy] = useState(false);

    const loadData = useCallback(async () => {
        try {
            console.log('Loading admin data...');
            const user = await retryWithBackoff(() => User.me());
            setIsAdmin(user.role === 'admin');
            
            if (user.role === 'admin') {
                // Add small delays between requests to avoid rate limiting
                console.log('Fetching user list...');
                const userList = await retryWithBackoff(() => User.list());
                setAllUsers(userList);
                
                // Add delay before next request
                await delay(500);
                
                // Load global economy settings
                try {
                    console.log('Fetching economy settings...');
                    const globalSettings = await retryWithBackoff(() => 
                        EconomySettings.filter({ settingName: 'global' })
                    );
                    
                    if (globalSettings.length > 0) {
                        const settings = globalSettings[0];
                        setEconomySettings(settings);
                        setNewEconomySettings({
                            talentRefundPercentage: settings.talentRefundPercentage || 0.5,
                            fusionRefundAmount: settings.fusionRefundAmount || 25,
                            dailyQuestMultiplier: settings.dailyQuestMultiplier || 1.0,
                            fusionCost: settings.fusionCost || 50,
                            fusionLevelingRefundRate: settings.fusionLevelingRefundRate || 0.5,
                            casualWinReward: settings.casualWinReward || 5,
                            casualLossReward: settings.casualLossReward || 2,
                            rankedWinReward: settings.rankedWinReward || 15,
                            rankedLossReward: settings.rankedLossReward || 5,
                            campaignBossRewardFragments: settings.campaignBossRewardFragments || 5
                        });
                    } else {
                        // Create default global settings if they don't exist
                        console.log('Creating default economy settings...');
                        await delay(300); // Small delay before creation
                        const defaultSettings = await retryWithBackoff(() => 
                            EconomySettings.create({
                                settingName: 'global',
                                ...DEFAULT_ECONOMY_SETTINGS // Use constant instead of state
                            })
                        );
                        setEconomySettings(defaultSettings);
                    }
                } catch (error) {
                    console.error('Error loading economy settings:', error);
                    // Show user-friendly error message
                    if (error.message?.includes('429')) {
                        alert('Server is busy. Please wait a moment and try refreshing the page.');
                    }
                }
            }
        } catch (error) {
            console.error("Error loading admin data:", error);
            if (error.message?.includes('429')) {
                alert('Server is busy. Please wait a moment and try refreshing the page.');
            }
            setIsAdmin(false);
        } finally {
            setLoading(false);
        }
    }, []); // Now empty dependency array is correct

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Quest Management Functions
    const handleResetQuests = async () => {
        if (!selectedUser) {
            alert("Please select a user.");
            return;
        }
        
        if (!window.confirm("Are you sure you want to reset this user's daily quests? This will delete their current quests and generate new ones.")) {
            return;
        }

        setResettingQuests(true);
        try {
            const user = allUsers.find(u => u.id === selectedUser);
            
            // Add delay and retry logic for quest generation
            await delay(200);
            await retryWithBackoff(() => generateDailyQuests(user));
            
            // Update user's last quest generation date
            const today = new Date();
            const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            
            await delay(200);
            await retryWithBackoff(() => 
                User.update(user.id, { lastQuestGenerationDate: dateString })
            );
            
            alert("Daily quests have been reset successfully!");
        } catch (error) {
            console.error("Error resetting quests:", error);
            if (error.message?.includes('429')) {
                alert("Server is busy. Please try again in a few moments.");
            } else {
                alert("Failed to reset quests. Check console for details.");
            }
        } finally {
            setResettingQuests(false);
        }
    };

    // Campaign Management Functions with improved error handling
    const handleRegenerateCampaign = async () => {
        if (!window.confirm("Are you sure you want to regenerate the weekly campaign? This will delete all existing stages and create new ones. This process may take 1-2 minutes.")) {
            return;
        }

        setRegeneratingCampaign(true);
        try {
            console.log('Starting campaign regeneration...');
            // Call the backend function instead of the frontend service
            const response = await generateWeeklyCampaign();
            
            if (response.data && response.data.success) {
                alert(`Weekly campaign has been regenerated successfully! ${response.data.message}`);
            } else {
                throw new Error(response.data?.error || 'Unknown error occurred');
            }
        } catch (error) {
            console.error("Error regenerating campaign:", error);
            if (error.message?.includes('429')) {
                alert("Server is too busy to regenerate the campaign right now. Please try again in a few minutes.");
            } else if (error.message?.includes('Image generation failed')) {
                alert("Campaign regenerated but some images may be missing. The campaign is still playable.");
            } else {
                alert(`Failed to regenerate campaign: ${error.message}`);
            }
        } finally {
            setRegeneratingCampaign(false);
        }
    };

    // Global Economy Settings Functions
    const updateEconomySettings = async () => {
        setUpdatingEconomy(true);
        try {
            await delay(200); // Small delay before update
            
            if (economySettings && economySettings.id) {
                // Update existing settings
                await retryWithBackoff(() => 
                    EconomySettings.update(economySettings.id, newEconomySettings)
                );
            } else {
                // Create new settings
                const createdSettings = await retryWithBackoff(() => 
                    EconomySettings.create({
                        settingName: 'global',
                        ...newEconomySettings
                    })
                );
                setEconomySettings(createdSettings);
            }
            
            // Refresh the current settings
            await delay(300);
            const updatedSettings = await retryWithBackoff(() => 
                EconomySettings.filter({ settingName: 'global' })
            );
            if (updatedSettings.length > 0) {
                setEconomySettings(updatedSettings[0]);
            }
            
            alert("Economy settings updated successfully!");
        } catch (error) {
            console.error('Error updating economy settings:', error);
            if (error.message?.includes('429')) {
                alert("Server is busy. Please try again in a few moments.");
            } else {
                alert("Failed to update economy settings. Check console for details.");
            }
        } finally {
            setUpdatingEconomy(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="w-12 h-12 animate-spin text-purple-500" /></div>;
    }
    
    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">This page is for administrators only.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-7xl space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold">Economy Management</h1>
                <p className="text-gray-400 mt-2">Manage game economy settings, quests, and campaigns.</p>
            </div>

            {/* Rate Limit Warning */}
            <Card className="bg-yellow-900/20 border-yellow-500/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-400">
                        <RefreshCw className="w-5 h-5" />
                        Server Load Notice
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-yellow-200 text-sm">
                        This admin panel makes many API calls. If you encounter "server busy" messages, 
                        please wait a few moments between actions. Campaign regeneration is especially intensive 
                        and may take 1-2 minutes to complete.
                    </p>
                </CardContent>
            </Card>

            {/* Global Economy Settings */}
            <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Gem className="w-5 h-5 text-yellow-400" />
                        Global Economy Settings
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Current Economy Settings Display */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-gray-700/30 rounded-lg p-3">
                            <h4 className="font-semibold text-sm text-gray-300 mb-1">Talent Refund</h4>
                            <p className="text-xl font-bold text-green-400">
                                {Math.round((economySettings?.talentRefundPercentage || 0.5) * 100)}%
                            </p>
                        </div>
                        <div className="bg-gray-700/30 rounded-lg p-3">
                            <h4 className="font-semibold text-sm text-gray-300 mb-1">Fusion Cost</h4>
                            <p className="text-xl font-bold text-purple-400">
                                {economySettings?.fusionCost || 50} Echoes
                            </p>
                        </div>
                        <div className="bg-gray-700/30 rounded-lg p-3">
                            <h4 className="font-semibold text-sm text-gray-300 mb-1">Casual Win</h4>
                            <p className="text-xl font-bold text-blue-400">
                                {economySettings?.casualWinReward || 5} Echoes
                            </p>
                        </div>
                        <div className="bg-gray-700/30 rounded-lg p-3">
                            <h4 className="font-semibold text-sm text-gray-300 mb-1">Ranked Win</h4>
                            <p className="text-xl font-bold text-yellow-400">
                                {economySettings?.rankedWinReward || 15} Echoes
                            </p>
                        </div>
                        <div className="bg-gray-700/30 rounded-lg p-3">
                            <h4 className="font-semibold text-sm text-gray-300 mb-1">Campaign Boss</h4>
                            <p className="text-xl font-bold text-cyan-400 flex items-center justify-center gap-1">
                                {economySettings?.campaignBossRewardFragments || 5} <Star className="w-4 h-4" />
                            </p>
                        </div>
                    </div>

                    {/* Economy Settings Form */}
                    <div className="space-y-6 p-6 bg-gray-900/50 rounded-lg border border-gray-600">
                        <h4 className="text-lg font-semibold text-yellow-300 mb-4">Update All Economy Settings</h4>
                        
                        {/* Talent & Fusion Economy */}
                        <div className="space-y-4">
                            <h5 className="text-md font-semibold text-purple-300 border-b border-purple-500/30 pb-2">Talent & Fusion Economy</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label className="block text-sm font-medium text-gray-300 mb-2">
                                        Talent Refund Percentage (0-1)
                                    </Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={newEconomySettings.talentRefundPercentage}
                                        onChange={(e) => setNewEconomySettings(prev => ({
                                            ...prev,
                                            talentRefundPercentage: parseFloat(e.target.value) || 0
                                        }))}
                                        className="bg-gray-700 border-gray-600"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        Refund when unlearning talents
                                    </p>
                                </div>

                                <div>
                                    <Label className="block text-sm font-medium text-gray-300 mb-2">
                                        Fusion Creation Cost
                                    </Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={newEconomySettings.fusionCost}
                                        onChange={(e) => setNewEconomySettings(prev => ({
                                            ...prev,
                                            fusionCost: parseInt(e.target.value) || 50
                                        }))}
                                        className="bg-gray-700 border-gray-600"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        Echoes required to create fusions
                                    </p>
                                </div>

                                <div>
                                    <Label className="block text-sm font-medium text-gray-300 mb-2">
                                        Fusion Base Refund
                                    </Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={newEconomySettings.fusionRefundAmount}
                                        onChange={(e) => setNewEconomySettings(prev => ({
                                            ...prev,
                                            fusionRefundAmount: parseInt(e.target.value) || 0
                                        }))}
                                        className="bg-gray-700 border-gray-600"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        Base echoes when deleting fusions
                                    </p>
                                </div>

                                <div>
                                    <Label htmlFor="fusionLevelingRefundRate">Leveling Cost Refund Rate (0.0-1.0)</Label>
                                    <Input
                                        id="fusionLevelingRefundRate"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="1"
                                        value={newEconomySettings.fusionLevelingRefundRate}
                                        onChange={(e) => setNewEconomySettings(prev => ({
                                            ...prev,
                                            fusionLevelingRefundRate: parseFloat(e.target.value) || 0
                                        }))}
                                        className="max-w-32 bg-gray-700 border-gray-600"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        Percentage of leveling cost refunded
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Battle Rewards */}
                        <div className="space-y-4">
                            <h5 className="text-md font-semibold text-red-300 border-b border-red-500/30 pb-2">Battle Rewards</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h6 className="text-sm font-semibold text-blue-300">Casual Matches</h6>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="block text-sm font-medium text-gray-300 mb-2">
                                                Victory Reward
                                            </Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={newEconomySettings.casualWinReward}
                                                onChange={(e) => setNewEconomySettings(prev => ({
                                                    ...prev,
                                                    casualWinReward: parseInt(e.target.value) || 0
                                                }))}
                                                className="bg-gray-700 border-gray-600"
                                            />
                                        </div>
                                        <div>
                                            <Label className="block text-sm font-medium text-gray-300 mb-2">
                                                Defeat Reward
                                            </Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={newEconomySettings.casualLossReward}
                                                onChange={(e) => setNewEconomySettings(prev => ({
                                                    ...prev,
                                                    casualLossReward: parseInt(e.target.value) || 0
                                                }))}
                                                className="bg-gray-700 border-gray-600"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h6 className="text-sm font-semibold text-yellow-300">Ranked Matches</h6>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="block text-sm font-medium text-gray-300 mb-2">
                                                Victory Reward
                                            </Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={newEconomySettings.rankedWinReward}
                                                onChange={(e) => setNewEconomySettings(prev => ({
                                                    ...prev,
                                                    rankedWinReward: parseInt(e.target.value) || 0
                                                }))}
                                                className="bg-gray-700 border-gray-600"
                                            />
                                        </div>
                                        <div>
                                            <Label className="block text-sm font-medium text-gray-300 mb-2">
                                                Defeat Reward
                                            </Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={newEconomySettings.rankedLossReward}
                                                onChange={(e) => setNewEconomySettings(prev => ({
                                                    ...prev,
                                                    rankedLossReward: parseInt(e.target.value) || 0
                                                }))}
                                                className="bg-gray-700 border-gray-600"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quest Economy & Management */}
                        <div className="space-y-4">
                            <h5 className="text-md font-semibold text-green-300 border-b border-green-500/30 pb-2">Quest Economy & Management</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="block text-sm font-medium text-gray-300 mb-2">
                                        Daily Quest Multiplier
                                    </Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={newEconomySettings.dailyQuestMultiplier}
                                        onChange={(e) => setNewEconomySettings(prev => ({
                                            ...prev,
                                            dailyQuestMultiplier: parseFloat(e.target.value) || 1
                                        }))}
                                        className="bg-gray-700 border-gray-600"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        Multiplier for all daily quest rewards
                                    </p>
                                </div>
                            </div>
                            
                            {/* Quest Reset Section */}
                            <div className="mt-6 pt-4 border-t border-gray-600/50">
                                <h6 className="text-sm font-semibold text-green-200 mb-2">Manual Quest Reset</h6>
                                <div>
                                    <Label htmlFor="userSelect" className="block text-sm font-medium text-gray-300 mb-2">Select User to Reset Daily Quests</Label>
                                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                                        <SelectTrigger className="max-w-md">
                                            <SelectValue placeholder="Choose a user to manage" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allUsers.map(user => (
                                                <SelectItem key={user.id} value={user.id}>
                                                    {user.full_name || user.email} ({user.email})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-4 mt-2">
                                    <Button 
                                        onClick={handleResetQuests}
                                        disabled={!selectedUser || resettingQuests}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {resettingQuests ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Resetting...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="w-4 h-4 mr-2" />
                                                Reset Daily Quests
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4 mt-4">
                                    <p className="text-sm text-gray-400">
                                        This deletes the user's current daily quests and generates 5 new random ones. Use this if a player is stuck or for testing purposes.
                                    </p>
                                </div>
                            </div>

                            {/* Campaign Management Section */}
                            <div className="mt-6 pt-4 border-t border-gray-600/50">
                                <h6 className="text-sm font-semibold text-orange-200 mb-2">Campaign Management</h6>
                                <div className="space-y-4">
                                    <div>
                                        <Label className="block text-sm font-medium text-gray-300 mb-2">
                                            Boss Reward (Void Fragments)
                                        </Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={newEconomySettings.campaignBossRewardFragments}
                                            onChange={(e) => setNewEconomySettings(prev => ({
                                                ...prev,
                                                campaignBossRewardFragments: parseInt(e.target.value) || 0
                                            }))}
                                            className="bg-gray-700 border-gray-600"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">
                                            Amount of Void Fragments awarded for defeating a campaign boss.
                                        </p>
                                    </div>
                                    <div className="flex gap-4 mt-2">
                                        <Button 
                                            onClick={handleRegenerateCampaign}
                                            disabled={regeneratingCampaign}
                                            className="bg-orange-600 hover:bg-orange-700"
                                        >
                                            {regeneratingCampaign ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Regenerating... (1-2 min)
                                                </>
                                            ) : (
                                                <>
                                                    <Map className="w-4 h-4 mr-2" />
                                                    Regenerate Weekly Campaign
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                    <div className="bg-orange-500/10 border border-orange-500/50 rounded-lg p-4 mt-4">
                                        <p className="text-sm text-gray-400">
                                            This deletes all existing campaign stages and generates a completely new weekly campaign with fresh chapters, stages, and enemies. 
                                            <strong className="text-orange-300"> This process is intensive and may take 1-2 minutes to complete.</strong> 
                                            Use this to refresh content or for testing purposes.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button 
                            onClick={updateEconomySettings}
                            disabled={updatingEconomy}
                            className="w-full bg-yellow-600 hover:bg-yellow-700"
                        >
                            {updatingEconomy ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Updating Economy...
                                </>
                            ) : (
                                <>
                                    <Gem className="w-4 h-4 mr-2" />
                                    Update All Economy Settings
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminEconomyManagement;
