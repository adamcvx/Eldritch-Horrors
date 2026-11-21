
import React, { useState, useEffect, useMemo } from 'react';
import { Talent } from '@/entities/Talent';
import { User } from '@/entities/User';
import { Loader2, Gem, Check, Lock, X, BookOpen, HelpCircle, Heart, Zap, Shield, Wind, Trash2, AlertCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import PopupDialog, { PopupSection, PopupPreview, PopupCostBreakdown, PopupWarning } from '@/components/ui/PopupDialog';
import { getEffectiveCost } from '../components/talents/TalentService';
import TalentNode from '../components/talents/TalentNode'; // New import for the refactored component

const LearnTalentDialog = ({ talent, currentUser, onConfirm, onCancel, dependenciesMet, isLearned }) => {
  const [learning, setLearning] = useState(false);
  const [effectiveCost, setEffectiveCost] = useState(null);

  // Calculate effective cost with talent reductions
  useEffect(() => {
    const calculateCost = async () => {
      if (talent && currentUser) {
        const reducedCost = await getEffectiveCost(
          talent.cost,
          currentUser.learnedTalents || []
        );
        setEffectiveCost(reducedCost);
      } else {
        setEffectiveCost(null); // Reset effectiveCost when dialog is closed or talent/user is null
      }
    };
    calculateCost();
  }, [talent, currentUser]);

  const canAfford = currentUser && effectiveCost !== null && (currentUser.currency || 0) >= effectiveCost;

  const handleConfirm = async () => {
    setLearning(true);
    await onConfirm();
    setLearning(false);
  };

  if (!talent) return null;

  const actions = [
  {
    text: "Cancel",
    icon: X,
    onClick: onCancel,
    variant: "outline",
    className: "border-gray-600 text-gray-300 hover:bg-gray-700"
  },
  {
    text: "Learn Talent",
    loadingText: "Learning...",
    icon: BookOpen,
    loadingIcon: Loader2,
    onClick: handleConfirm,
    disabled: !canAfford || !dependenciesMet || isLearned || effectiveCost === null, // Disable if cost not yet calculated
    loading: learning,
    className: "bg-purple-600 hover:bg-purple-700"
  }];


  return (
    <PopupDialog
      open={!!talent}
      onClose={onCancel}
      title="Learn Forbidden Knowledge"
      titleIcon={BookOpen}
      actions={actions}
      loading={learning}
      dialogClassName="max-w-md">
      
            {/* Talent Preview */}
            <PopupPreview>
                <div className="w-24 h-24 rounded-lg mx-auto mb-3 border-2 border-purple-500/30 bg-gray-800 flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-purple-400" />
                </div>
                <h3 className="font-bold text-lg mb-1">{talent.name}</h3>
                <p className="text-gray-400 text-sm">{talent.description}</p>
            </PopupPreview>

            {/* Stat Bonuses */}
            {talent.statBonus && Object.keys(talent.statBonus).length > 0 &&
      <PopupSection
        title="Power Bonuses"
        titleIcon={Zap}
        bgColor="bg-green-500/10"
        borderColor="border-green-500/50"
        titleColor="text-green-300">
        
                    <div className="space-y-1">
                        {Object.entries(talent.statBonus).map(([key, value]) =>
          <div key={key} className="flex items-center justify-between text-sm">
                                <span className="text-gray-400 capitalize">
                                    {key.replace(/_/g, ' ').replace('all ', 'All ').replace(' boost', '')}:
                                </span>
                                <span className="text-green-400 font-semibold">
                                    +{(value * 100).toFixed(0)}%
                                </span>
                            </div>
          )}
                    </div>
                </PopupSection>
      }

            {/* Dependencies */}
            {talent.dependencies && talent.dependencies.length > 0 &&
      <PopupSection
        title="Prerequisites"
        titleIcon={Lock}
        bgColor="bg-yellow-500/10"
        borderColor="border-yellow-500/50"
        titleColor="text-yellow-300">
        
                    <div className="text-sm text-gray-400">
                        Requires {talent.dependencies.length} talent{talent.dependencies.length > 1 ? 's' : ''} from previous tier
                    </div>
                </PopupSection>
      }

            {/* Cost Information */}
            <PopupSection title="Ritual Cost" titleIcon={Gem}>
                {effectiveCost !== null ?
        <PopupCostBreakdown
          items={[
          ...(effectiveCost < talent.cost ? [
          { label: "Base cost", value: `${talent.cost} Echoes` },
          { label: "Talent reduction", value: `${talent.cost - effectiveCost} Echoes`, color: "text-green-300" },
          { label: "Effective cost", value: `${effectiveCost} Echoes`, color: "text-purple-300" }] :
          [
          { label: "Required Echoes", value: `${effectiveCost} Echoes` }]),

          { label: "Your current balance", value: `${currentUser.currency || 0} Echoes` }]
          }
          totalLabel="Balance after ritual"
          totalValue={`${(currentUser.currency || 0) - effectiveCost} Echoes`}
          totalColor={canAfford ? 'text-green-300' : 'text-red-300'} /> :


        <div className="text-center text-gray-400">Calculating cost...</div>
        }
            </PopupSection>

            {/* Warnings */}
            {!dependenciesMet &&
      <PopupWarning message="You have not learned the required prerequisite knowledge." />
      }
            {isLearned &&
      <PopupWarning message="You have already learned this knowledge." type="info" />
      }
            {!canAfford &&
      <PopupWarning message="Insufficient Echoes for this knowledge." />
      }
        </PopupDialog>);

};

const UnlearnTalentDialog = ({ talent, currentUser, onConfirm, onCancel, refundAmount }) => {
  const [unlearning, setUnlearning] = useState(false);

  const handleConfirm = async () => {
    setUnlearning(true);
    await onConfirm();
    setUnlearning(false);
  };

  if (!talent) return null;

  const actions = [
  {
    text: "Keep knowledge",
    icon: X,
    onClick: onCancel,
    variant: "outline",
    className: "border-gray-600 text-gray-300 hover:bg-gray-700"
  },
  {
    text: "Forget Knowledge",
    loadingText: "Forgetting...",
    icon: Trash2,
    loadingIcon: Loader2,
    onClick: handleConfirm,
    loading: unlearning,
    className: "bg-red-600 hover:bg-red-700"
  }];


  return (
    <PopupDialog
      open={!!talent}
      onClose={onCancel}
      title="Forget Forbidden Knowledge"
      titleIcon={AlertCircle}
      titleColor="text-red-400"
      actions={actions}
      loading={unlearning}
      dialogClassName="max-w-md">
      
            {/* Talent Preview */}
            <PopupPreview>
                <div className="w-24 h-24 rounded-lg mx-auto mb-3 border-2 border-red-500/30 bg-gray-800 flex items-center justify-center">
                    <Trash2 className="w-12 h-12 text-red-400" />
                </div>
                <h3 className="font-bold text-lg mb-1">{talent.name}</h3>
                <p className="text-gray-400 text-sm">{talent.description}</p>
            </PopupPreview>

            {/* Warning */}
            <PopupWarning message="⚠️ This action cannot be undone ⚠️. You will lose this talent's bonuses permanently." />

            {/* Refund Information */}
            <PopupSection
        title="Echo Refund"
        titleIcon={Gem}
        bgColor="bg-green-500/10"
        borderColor="border-green-500/50"
        titleColor="text-green-300">
        
                <PopupCostBreakdown
          items={[
          { label: "Effective cost paid", value: `${Math.round(refundAmount / 0.5)} Echoes` },
          { label: "Refund amount (50%)", value: `${refundAmount} Echoes`, color: "text-green-300" },
          { label: "Your current balance", value: `${currentUser?.currency || 0} Echoes` }]
          }
          totalLabel="New balance"
          totalValue={`${(currentUser?.currency || 0) + refundAmount} Echoes`}
          totalColor="text-green-300" />
        
            </PopupSection>
        </PopupDialog>);

};

export default function TalentTreePage() {
  const [talents, setTalents] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTalent, setSelectedTalent] = useState(null);
  const [unlearnTalent, setUnlearnTalent] = useState(null);
  const [unlearnRefund, setUnlearnRefund] = useState(0);

  const loadData = async () => {
    try {
      const [user, talentList] = await Promise.all([User.me(), Talent.list()]);
      setCurrentUser(user);
      setTalents(talentList);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const talentsByTree = useMemo(() => {
    return talents.reduce((acc, talent) => {
      const treeName = talent.tree || 'General';
      if (!acc[treeName]) {
        acc[treeName] = {};
      }
      const tier = talent.tier || 1;
      if (!acc[treeName][tier]) {
        acc[treeName][tier] = [];
      }
      acc[treeName][tier].push(talent);
      return acc;
    }, {});
  }, [talents]);

  const handleSelectTalent = (talent) => {
    setSelectedTalent(talent);
  };

  const handleUnlearnTalent = (talent, refundAmount) => {
    setUnlearnTalent(talent);
    setUnlearnRefund(refundAmount);
  };

  const handleLearnTalent = async () => {
    if (!selectedTalent || !currentUser) return;

    // Calculate effective cost and deduct it
    const effectiveCost = await getEffectiveCost(
      selectedTalent.cost,
      currentUser.learnedTalents || []
    );

    const newLearnedTalents = [...(currentUser.learnedTalents || []), selectedTalent.name];
    const newCurrency = (currentUser.currency || 0) - effectiveCost;

    try {
      await User.updateMyUserData({
        learnedTalents: newLearnedTalents,
        currency: newCurrency
      });
      await loadData();
      setSelectedTalent(null);
    } catch (error) {
      console.error("Error learning talent:", error);
    }
  };

  const handleConfirmUnlearn = async () => {
    if (!unlearnTalent || !currentUser) return;

    const newLearnedTalents = (currentUser.learnedTalents || []).filter((name) => name !== unlearnTalent.name);
    const newCurrency = (currentUser.currency || 0) + unlearnRefund;

    try {
      await User.updateMyUserData({
        learnedTalents: newLearnedTalents,
        currency: newCurrency
      });
      await loadData();
      setUnlearnTalent(null);
      setUnlearnRefund(0);
    } catch (error) {
      console.error("Error unlearning talent:", error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-12 h-12 animate-spin text-purple-500" /></div>;
  }

  return (
    <div className="container mx-auto max-w-7xl">
            <Card className="bg-gray-800/50 border-gray-700 mb-8">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-3">
                      <BookOpen className="w-8 h-8 text-purple-400" />
                      <span className="text-3xl">Forbidden Knowledge</span>
                    </CardTitle>
                    <p className="text-gray-400 mt-2">Unlock permanent power by studying the maddening tomes.</p>
                  </div>
                  {currentUser &&
            <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-purple-500/20 px-4 py-2 rounded-lg border border-purple-500/50">
                          <Gem className="w-5 h-5 text-purple-400" />
                          <span className="font-bold text-purple-300">{currentUser.currency || 0}</span>
                          <span className="text-gray-400 text-sm">Echoes</span>
                      </div>
                      <div className="flex items-center gap-2 bg-indigo-500/20 px-4 py-2 rounded-lg border border-indigo-500/50">
                          <Star className="w-5 h-5 text-indigo-400" />
                          <span className="font-bold text-indigo-300">{currentUser.voidFragments || 0}</span>
                          <span className="text-gray-400 text-sm">Fragments</span>
                      </div>
                    </div>
            }
                </div>
              </CardHeader>
            </Card>

            {/* Side by Side Trees */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {Object.keys(talentsByTree).sort().map((treeName) =>
        <div key={treeName} className="bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 rounded-2xl border border-purple-500/30">
                        <div className="p-6 border-b border-purple-500/30">
                            <h2 className="text-3xl font-title text-center">{treeName} Tree</h2>
                        </div>
                        <div className="max-h-[800px] overflow-y-auto p-6">
                            <div className="space-y-8">
                                {Object.keys(talentsByTree[treeName]).sort((a, b) => a - b).map((tier) =>
              <div key={tier}>
                                        <h3 className="text-lg font-bold text-center mb-4 border-b border-purple-500/30 pb-2 text-purple-200">Tier {tier}</h3>
                                        <div className="flex flex-col items-center gap-4">
                                            {talentsByTree[treeName][tier].map((talent) => {
                    const isLearned = (currentUser.learnedTalents || []).includes(talent.name);
                    const dependenciesMet = (talent.dependencies || []).every((depName) => (currentUser.learnedTalents || []).includes(depName));
                    const isLocked = !dependenciesMet;

                    const refundAmount = Math.round(talent.cost * (currentUser?.economySettings?.talentRefundPercentage || 0.5));

                    return (
                      <TalentNode
                        key={talent.id}
                        talent={talent}
                        isLearned={isLearned}
                        isLocked={isLocked}
                        onSelect={handleSelectTalent}
                        onUnlearn={() => handleUnlearnTalent(talent, refundAmount)} />);


                  })}
                                        </div>
                                    </div>
              )}
                            </div>
                        </div>
                    </div>
        )}
            </div>

            {selectedTalent &&
      <LearnTalentDialog
        talent={selectedTalent}
        currentUser={currentUser}
        onConfirm={handleLearnTalent}
        onCancel={() => setSelectedTalent(null)}
        dependenciesMet={(selectedTalent.dependencies || []).every((depName) => (currentUser.learnedTalents || []).includes(depName))}
        isLearned={(currentUser.learnedTalents || []).includes(selectedTalent.name)} />

      }

            {unlearnTalent &&
      <UnlearnTalentDialog
        talent={unlearnTalent}
        currentUser={currentUser}
        onConfirm={handleConfirmUnlearn}
        onCancel={() => {
          setUnlearnTalent(null);
          setUnlearnRefund(0);
        }}
        refundAmount={unlearnRefund} />

      }
        </div>);

}