
import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Orb } from '@/entities/Orb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldAlert, X, Settings, Trash2, Save, Eye, Plus } from 'lucide-react';
import { ORB_TRIGGER_CONFIG } from '../components/orbs/OrbCard';

const AdminOrbManagement = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orbs, setOrbs] = useState([]);
  const [showOrbForm, setShowOrbForm] = useState(false);
  const [editingOrb, setEditingOrb] = useState(null);
  const [newOrb, setNewOrb] = useState({
    name: '',
    description: '',
    rarity: 'Ephemeral',
    orbType: 'attack',
    orbBenefitValue: 0,
    orbDrawbackValue: 0,
    originSynergy: '',
    orbTrigger: 'Passive',
    costToEquip: 10,
    iconUrl: ''
  });
  const [savingOrb, setSavingOrb] = useState(false);
  const [deletingOrbId, setDeletingOrbId] = useState(null);

  const loadData = async () => {
    try {
      const user = await User.me();
      setIsAdmin(user.role === 'admin');
      
      if (user.role === 'admin') {
        const orbList = await Orb.list();
        setOrbs(orbList);
      }
    } catch (error) {
      console.error('Error loading admin orb data:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Orb Management Functions
  const handleCreateOrb = () => {
    setEditingOrb(null);
    setNewOrb({
      name: '',
      description: '',
      rarity: 'Ephemeral',
      orbType: 'attack',
      orbBenefitValue: 0,
      orbDrawbackValue: 0,
      originSynergy: '',
      orbTrigger: 'Passive',
      costToEquip: 10,
      iconUrl: ''
    });
    setShowOrbForm(true);
  };

  const handleEditOrb = (orb) => {
    setEditingOrb(orb);
    setNewOrb({
      name: orb.name,
      description: orb.description,
      rarity: orb.rarity,
      orbType: orb.orbType,
      orbBenefitValue: orb.orbBenefitValue,
      orbDrawbackValue: orb.orbDrawbackValue || 0,
      originSynergy: orb.originSynergy || '',
      orbTrigger: orb.orbTrigger,
      costToEquip: orb.costToEquip,
      iconUrl: orb.iconUrl || ''
    });
    setShowOrbForm(true);
  };

  const handleSaveOrb = async () => {
    if (!newOrb.name.trim() || !newOrb.description.trim()) {
      alert('Name and description are required!');
      return;
    }

    setSavingOrb(true);
    try {
      const orbData = {
        ...newOrb,
        orbBenefitValue: parseFloat(newOrb.orbBenefitValue) || 0,
        orbDrawbackValue: parseFloat(newOrb.orbDrawbackValue) || 0,
        costToEquip: parseInt(newOrb.costToEquip) || 10,
        originSynergy: newOrb.originSynergy || undefined, // Convert empty string to undefined
        iconUrl: newOrb.iconUrl || undefined // Add iconUrl, convert empty to undefined
      };

      if (editingOrb) {
        await Orb.update(editingOrb.id, orbData);
      } else {
        await Orb.create(orbData);
      }

      setShowOrbForm(false);
      await loadData();
    } catch (error) {
      console.error('Error saving orb:', error);
      alert('Failed to save orb. Please try again.');
    } finally {
      setSavingOrb(false);
    }
  };

  const handleDeleteOrb = async (orb) => {
    if (!confirm(`Are you sure you want to delete the orb "${orb.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingOrbId(orb.id);
    try {
      await Orb.delete(orb.id);
      await loadData();
    } catch (error) {
      console.error('Error deleting orb:', error);
      alert('Failed to delete orb. Please try again.');
    } finally {
      setDeletingOrbId(null);
    }
  };

  const cancelOrbForm = () => {
    setShowOrbForm(false);
    setEditingOrb(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="container mx-auto max-w-4xl">
        <div className="text-center py-16">
          <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-400">You must be an administrator to access orb management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">Orb Management</h1>
        <p className="text-gray-400">Create and manage eldritch orbs for player abominations.</p>
      </div>

      {/* Orbs Management */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-400" />
              Orb Management ({orbs.length} orbs)
            </div>
            <Button
              onClick={handleCreateOrb}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Orb
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showOrbForm && (
            <div className="mb-6 p-6 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">
                {editingOrb ? 'Edit Orb' : 'Create New Orb'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orb-name">Name</Label>
                  <Input
                    id="orb-name"
                    value={newOrb.name}
                    onChange={(e) => setNewOrb({ ...newOrb, name: e.target.value })}
                    placeholder="Orb name (e.g., Unstable)"
                  />
                </div>

                <div>
                  <Label htmlFor="orb-rarity">Rarity</Label>
                  <Select value={newOrb.rarity} onValueChange={(value) => setNewOrb({ ...newOrb, rarity: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rarity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ephemeral">Ephemeral</SelectItem>
                      <SelectItem value="Uncanny">Uncanny</SelectItem>
                      <SelectItem value="Abyssal">Abyssal</SelectItem>
                      <SelectItem value="Cosmic">Cosmic</SelectItem>
                      <SelectItem value="Outer">Outer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="orb-type">Orb Type</Label>
                  <Select value={newOrb.orbType} onValueChange={(value) => setNewOrb({ ...newOrb, orbType: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attack">Attack</SelectItem>
                      <SelectItem value="lifesteal">Lifesteal</SelectItem>
                      <SelectItem value="selfdamage">Self Damage</SelectItem>
                      <SelectItem value="debuff">Debuff</SelectItem>
                      <SelectItem value="immunity">Immunity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="orb-trigger">Trigger</Label>
                  <Select value={newOrb.orbTrigger} onValueChange={(value) => setNewOrb({ ...newOrb, orbTrigger: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ORB_TRIGGER_CONFIG)
                        .filter(([key]) => key !== 'default')
                        .map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="orb-benefit">Benefit Value (%)</Label>
                  <Input
                    id="orb-benefit"
                    type="number"
                    step="0.1"
                    value={newOrb.orbBenefitValue}
                    onChange={(e) => setNewOrb({ ...newOrb, orbBenefitValue: parseFloat(e.target.value) || 0 })}
                    placeholder="20"
                  />
                </div>

                <div>
                  <Label htmlFor="orb-drawback">Drawback Value (%)</Label>
                  <Input
                    id="orb-drawback"
                    type="number"
                    step="0.1"
                    value={newOrb.orbDrawbackValue}
                    onChange={(e) => setNewOrb({ ...newOrb, orbDrawbackValue: parseFloat(e.target.value) || 0 })}
                    placeholder="5"
                  />
                </div>

                <div>
                  <Label htmlFor="orb-synergy">Origin Synergy (Optional)</Label>
                  <Select value={newOrb.originSynergy} onValueChange={(value) => setNewOrb({ ...newOrb, originSynergy: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>None</SelectItem>
                      <SelectItem value="Void">Void</SelectItem>
                      <SelectItem value="Dream">Dream</SelectItem>
                      <SelectItem value="Flesh">Flesh</SelectItem>
                      <SelectItem value="Sunken">Sunken</SelectItem>
                      <SelectItem value="Dimension">Dimension</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="orb-cost">Equip Cost (Echoes)</Label>
                  <Input
                    id="orb-cost"
                    type="number"
                    value={newOrb.costToEquip}
                    onChange={(e) => setNewOrb({ ...newOrb, costToEquip: parseInt(e.target.value) || 10 })}
                    placeholder="10"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="orb-icon-url">Icon URL (Optional)</Label>
                  <Input
                    id="orb-icon-url"
                    value={newOrb.iconUrl}
                    onChange={(e) => setNewOrb({ ...newOrb, iconUrl: e.target.value })}
                    placeholder="https://example.com/icon.png"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="orb-description">Description</Label>
                  <Textarea
                    id="orb-description"
                    value={newOrb.description}
                    onChange={(e) => setNewOrb({ ...newOrb, description: e.target.value })}
                    placeholder="Describe the orb's effects (use {benefit} and {drawback} as placeholders)"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button onClick={handleSaveOrb} disabled={savingOrb} className="bg-green-600 hover:bg-green-700">
                  {savingOrb ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {editingOrb ? 'Update Orb' : 'Create Orb'}
                </Button>
                <Button onClick={cancelOrbForm} variant="outline" className="border-gray-600">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Orbs List */}
          <div className="space-y-3">
            {orbs.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No orbs created yet.</p>
            ) : (
              orbs.map(orb => (
                <div key={orb.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                  <div className="flex-1 flex items-start gap-4">
                    {orb.iconUrl && (
                      <img src={orb.iconUrl} alt={orb.name} className="w-12 h-12 object-contain rounded-md bg-black/20 p-1 mt-1" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h4 className="font-bold text-lg">{orb.name}</h4>
                        <Badge className={`
                          ${orb.rarity === 'Outer' ? 'bg-orange-500/20 text-orange-300' :
                            orb.rarity === 'Cosmic' ? 'bg-purple-500/20 text-purple-300' :
                            orb.rarity === 'Abyssal' ? 'bg-blue-500/20 text-blue-300' :
                            orb.rarity === 'Uncanny' ? 'bg-green-500/20 text-green-300' :
                            'bg-gray-500/20 text-gray-300'}
                        `}>
                          {orb.rarity}
                        </Badge>
                        <Badge variant="outline">{orb.orbType}</Badge>
                        <Badge variant="outline">{orb.orbTrigger}</Badge>
                      </div>
                      <p className="text-gray-300 text-sm mb-1">{orb.description}</p>
                      <div className="flex gap-4 text-xs text-gray-400">
                        <span>Benefit: +{orb.orbBenefitValue}%</span>
                        {orb.orbDrawbackValue > 0 && <span>Drawback: {orb.orbDrawbackValue}%</span>}
                        <span>Cost: {orb.costToEquip} Echoes</span>
                        {orb.originSynergy && <span>Synergy: {orb.originSynergy}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => handleEditOrb(orb)}
                      variant="outline"
                      size="sm"
                      className="border-gray-600"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteOrb(orb)}
                      variant="destructive"
                      size="sm"
                      disabled={deletingOrbId === orb.id}
                    >
                      {deletingOrbId === orb.id ? (
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
    </div>
  );
};

export default AdminOrbManagement;
