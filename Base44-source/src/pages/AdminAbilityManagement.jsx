
import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Ability } from '@/entities/Ability';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldAlert, X, Settings, Trash2, Save, Zap } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";

const STAT_EFFECT_OPTIONS = [
    "heal_over_time",
    "damage_over_time",
    "attack_up",
    "defense_up",
    "attack_down",
    "defense_down"
];

const AdminAbilityManagement = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    
    // Ability Management State
    const [abilities, setAbilities] = useState([]);
    const [showAbilityForm, setShowAbilityForm] = useState(false);
    const [editingAbility, setEditingAbility] = useState(null);
    const [newAbility, setNewAbility] = useState({
        name: '',
        type: 'attack',
        power: 0,
        cooldown: 0,
        turnLength: 1,
        statEffect: [], // Changed to array
        statEffectName: '', // New field for custom display name
        effect: ''
    });
    const [savingAbility, setSavingAbility] = useState(false);
    const [deletingAbilityId, setDeletingAbilityId] = useState(null);

    const loadData = async () => {
        try {
            const user = await User.me();
            setIsAdmin(user.role === 'admin');
            
            if (user.role === 'admin') {
                const abilityList = await Ability.list('-created_date');
                setAbilities(abilityList);
            }
        } catch (error) {
            console.error("Error loading admin data:", error);
            setIsAdmin(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Ability Management Functions
    const handleCreateAbility = () => {
        setEditingAbility(null);
        setNewAbility({
            name: '',
            type: 'attack',
            power: 0,
            cooldown: 0,
            turnLength: 1,
            statEffect: [], // Initialized as array
            statEffectName: '', // Add this field
            effect: ''
        });
        setShowAbilityForm(true);
    };

    const handleEditAbility = (ability) => {
        setEditingAbility(ability);
        setNewAbility({
            name: ability.name,
            type: ability.type,
            power: ability.power,
            cooldown: ability.cooldown,
            turnLength: ability.turnLength,
            statEffect: ability.statEffect || [], // Ensured is array
            statEffectName: ability.statEffectName || '', // Add this field
            effect: ability.effect
        });
        setShowAbilityForm(true);
    };

    const handleStatEffectChange = (effect, checked) => {
        setNewAbility(prev => {
            const currentEffects = Array.isArray(prev.statEffect) ? prev.statEffect : [];
            if (checked) {
                // Add the effect if it's not already there
                return { ...prev, statEffect: [...new Set([...currentEffects, effect])] };
            } else {
                // Remove the effect
                return { ...prev, statEffect: currentEffects.filter(e => e !== effect) };
            }
        });
    };

    const handleSaveAbility = async () => {
        if (!newAbility.name || !newAbility.effect) {
            alert('Please fill in all required fields (name and effect).');
            return;
        }

        setSavingAbility(true);
        try {
            const abilityData = {
                ...newAbility,
                power: parseFloat(newAbility.power) || 0,
                cooldown: parseInt(newAbility.cooldown) || 0,
                turnLength: parseInt(newAbility.turnLength) || 1,
                statEffect: newAbility.statEffect || [], // Saved as array
                statEffectName: newAbility.statEffectName || '' // Save the new field
            };

            if (editingAbility) {
                await Ability.update(editingAbility.id, abilityData);
            } else {
                await Ability.create(abilityData);
            }

            setShowAbilityForm(false);
            setEditingAbility(null);
            loadData();
            alert(`Ability ${editingAbility ? 'updated' : 'created'} successfully!`);
        } catch (error) {
            console.error('Error saving ability:', error);
            alert('Failed to save ability. Please check the console for details.');
        } finally {
            setSavingAbility(false);
        }
    };

    const handleDeleteAbility = async (ability) => {
        if (!window.confirm(`Are you sure you want to delete "${ability.name}"? This action cannot be undone and may affect existing fusions that use this ability.`)) {
            return;
        }

        setDeletingAbilityId(ability.id);
        try {
            await Ability.delete(ability.id);
            loadData();
            alert('Ability deleted successfully!');
        } catch (error) {
            console.error('Error deleting ability:', error);
            alert('Failed to delete ability. Please check the console for details.');
        } finally {
            setDeletingAbilityId(null);
        }
    };

    const cancelAbilityForm = () => {
        setShowAbilityForm(false);
        setEditingAbility(null);
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
                <h1 className="text-4xl font-bold">Ability Management</h1>
                <p className="text-gray-400 mt-2">Create and manage combat abilities for fusion creatures.</p>
            </div>

            {/* Abilities Management */}
            <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-400" />
                            Ability Management ({abilities.length} abilities)
                        </div>
                        <Button
                            onClick={handleCreateAbility}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <X className="w-4 h-4 mr-2 rotate-45" />
                            Create New Ability
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Ability Form */}
                    {showAbilityForm && (
                        <div className="border border-gray-600 rounded-lg p-6 mb-6 bg-gray-900/50">
                            <h3 className="text-lg font-semibold mb-4 text-yellow-300">
                                {editingAbility ? 'Edit Ability' : 'Create New Ability'}
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <Label htmlFor="abilityName">Name *</Label>
                                    <Input
                                        id="abilityName"
                                        value={newAbility.name}
                                        onChange={(e) => setNewAbility({...newAbility, name: e.target.value})}
                                        placeholder="e.g., Void Strike"
                                        className="bg-gray-700 border-gray-600"
                                    />
                                </div>
                                
                                <div>
                                    <Label htmlFor="abilityType">Type *</Label>
                                    <Select value={newAbility.type} onValueChange={(value) => setNewAbility({...newAbility, type: value})}>
                                        <SelectTrigger className="bg-gray-700 border-gray-600">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="attack">Attack</SelectItem>
                                            <SelectItem value="defense">Defense</SelectItem>
                                            <SelectItem value="buff">Buff</SelectItem>
                                            <SelectItem value="debuff">Debuff</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div>
                                    <Label htmlFor="abilityPower">Power</Label>
                                    <Input
                                        id="abilityPower"
                                        type="number"
                                        value={newAbility.power}
                                        onChange={(e) => setNewAbility({...newAbility, power: parseFloat(e.target.value) || 0})}
                                        className="bg-gray-700 border-gray-600"
                                    />
                                </div>
                                
                                <div>
                                    <Label htmlFor="abilityCooldown">Cooldown (turns)</Label>
                                    <Input
                                        id="abilityCooldown"
                                        type="number"
                                        value={newAbility.cooldown}
                                        onChange={(e) => setNewAbility({...newAbility, cooldown: parseInt(e.target.value) || 0})}
                                        className="bg-gray-700 border-gray-600"
                                    />
                                </div>
                                
                                <div>
                                    <Label htmlFor="abilityTurnLength">Duration (turns)</Label>
                                    <Input
                                        id="abilityTurnLength"
                                        type="number"
                                        value={newAbility.turnLength}
                                        onChange={(e) => setNewAbility({...newAbility, turnLength: parseInt(e.target.value) || 1})}
                                        className="bg-gray-700 border-gray-600"
                                    />
                                </div>
                                
                                <div className="col-span-1 md:col-span-2">
                                    <Label>Stat Effects</Label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 p-3 bg-gray-700/50 rounded-lg">
                                        {STAT_EFFECT_OPTIONS.map(effect => (
                                            <div key={effect} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`effect-${effect}`}
                                                    checked={newAbility.statEffect?.includes(effect)}
                                                    onCheckedChange={(checked) => handleStatEffectChange(effect, checked)}
                                                />
                                                <Label htmlFor={`effect-${effect}`} className="capitalize font-normal text-gray-300">
                                                    {effect.replace(/_/g, ' ')}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mb-4">
                                <Label htmlFor="abilityEffect">Effect Description *</Label>
                                <Textarea
                                    id="abilityEffect"
                                    value={newAbility.effect}
                                    onChange={(e) => setNewAbility({...newAbility, effect: e.target.value})}
                                    placeholder="Describe what this ability does..."
                                    className="bg-gray-700 border-gray-600"
                                    rows={3}
                                />
                            </div>

                            <div className="mb-4">
                                <Label htmlFor="abilityStatEffectName">Status Effect Display Name</Label>
                                <Input
                                    id="abilityStatEffectName"
                                    value={newAbility.statEffectName || ''}
                                    onChange={(e) => setNewAbility({...newAbility, statEffectName: e.target.value})}
                                    placeholder="e.g., 'Corrupted', 'Weakened', 'Burning' (optional)"
                                    className="bg-gray-700 border-gray-600"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Custom name shown in battle UI if this ability applies a stat effect. If empty, uses the technical effect name.
                                </p>
                            </div>
                            
                            <div className="flex gap-3">
                                <Button
                                    onClick={handleSaveAbility}
                                    disabled={savingAbility}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {savingAbility ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            {editingAbility ? 'Update' : 'Create'} Ability
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={cancelAbilityForm}
                                    variant="outline"
                                    className="border-gray-600"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Abilities List */}
                    <div className="space-y-3">
                        {abilities.length === 0 ? (
                            <p className="text-center text-gray-400 py-8">No abilities created yet.</p>
                        ) : (
                            abilities.map(ability => (
                                <div key={ability.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-4 mb-2">
                                            <h4 className="font-bold text-lg">{ability.name}</h4>
                                            <Badge className={`
                                                ${ability.type === 'attack' ? 'bg-red-500/20 text-red-300' :
                                                  ability.type === 'defense' ? 'bg-blue-500/20 text-blue-300' :
                                                  ability.type === 'buff' ? 'bg-green-500/20 text-green-300' :
                                                  'bg-purple-500/20 text-purple-300'}
                                            `}>
                                                {ability.type}
                                            </Badge>
                                            <Badge variant="outline">Power: {ability.power}</Badge>
                                            <Badge variant="outline">CD: {ability.cooldown}</Badge>
                                            <Badge variant="outline">Duration: {ability.turnLength}</Badge>
                                        </div>
                                        <p className="text-gray-300 text-sm mb-1">{ability.effect}</p>
                                        {Array.isArray(ability.statEffect) && ability.statEffect.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {ability.statEffect.map(effect => (
                                                    <Badge key={effect} variant="outline" className="text-xs text-yellow-300 border-yellow-500/50">
                                                        {ability.statEffectName && effect === ability.statEffect[0] ? ability.statEffectName : effect.replace(/_/g, ' ')}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <Button
                                            onClick={() => handleEditAbility(ability)}
                                            variant="outline"
                                            size="sm"
                                            className="border-gray-600"
                                        >
                                            <Settings className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            onClick={() => handleDeleteAbility(ability)}
                                            variant="destructive"
                                            size="sm"
                                            disabled={deletingAbilityId === ability.id}
                                        >
                                            {deletingAbilityId === ability.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-300 mb-2">Ability Management Info</h4>
                <div className="text-sm text-gray-400 space-y-1">
                    <p>• <strong>Power:</strong> Base damage/healing amount or effect strength</p>
                    <p>• <strong>Cooldown:</strong> Number of turns before the ability can be used again</p>
                    <p>• <strong>Duration:</strong> How many turns the effect lasts (for buffs/debuffs)</p>
                    <p>• <strong>Stat Effects:</strong> Additional ongoing effects like poison, regen, stat changes</p>
                    <p>• <strong>Status Effect Display Name:</strong> A custom name to display in the UI when this ability's stat effect is active.</p>
                    <p>• <strong>Warning:</strong> Deleting abilities may affect existing fusions that use them</p>
                </div>
            </div>
        </div>
    );
};

export default AdminAbilityManagement;
