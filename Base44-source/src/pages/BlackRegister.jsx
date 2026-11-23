import { cloudEnabled } from '@/api/cloudSave';
import { initializeMarketSave, refreshCloudPlayerSave } from '@/api/localBase44';
import WalletBadge from '@/components/user/WalletBadge';

import React, { useState, useEffect, useCallback } from 'react';
import { Listing } from '@/entities/Listing';
import { Bid } from '@/entities/Bid';
import { Fusion } from '@/entities/Fusion';
import { PlayerOrb } from '@/entities/PlayerOrb';
import { User } from '@/entities/User';
import { useAppContext } from '../components/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Gem, Timer, Eye, Plus, Gavel, ShoppingCart, TrendingUp, Filter, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FusionCard from '../components/cards/FusionCard';
import OrbCard from '../components/orbs/OrbCard';
import PopupDialog, { PopupSection, PopupPreview, PopupCostBreakdown, PopupWarning } from '../components/ui/PopupDialog';
import { playButtonClick, playAmbientMenu, playCurrencyGain } from '../components/sounds/SoundService';
import { lookupOrbsById } from '../components/orbs/OrbService';
import { calculateTalentBonuses } from '../components/talents/TalentService';
import { Talent } from '@/entities/Talent';
import { purchaseListing } from '@/functions/purchaseListing';
import { createListing } from '@/functions/createListing';
import { cancelListing } from '@/functions/cancelListing';

async function marketRequest(input) {
  if (input) await initializeMarketSave();
  const response = await fetch('/api/market', {
    method: input ? 'POST' : 'GET', cache: 'no-store',
    headers: input ? { 'Content-Type': 'application/json' } : undefined,
    body: input ? JSON.stringify(input) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The Black Register is unavailable.');
  return { data };
}

export default function BlackRegister() {
  const { currentUser, updateUserData } = useAppContext();
  const [activeTab, setActiveTab] = useState('browse');
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [myItems, setMyItems] = useState({ fusions: [], orbs: [] });
  const [loading, setLoading] = useState(true);
  const [marketError, setMarketError] = useState("");
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [showBidDialog, setShowBidDialog] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Create listing form state
  const [newListing, setNewListing] = useState({
    itemType: 'fusion',
    itemId: '',
    listingType: 'fixed',
    startingPrice: '',
    buyoutPrice: '',
    duration: 24,
    title: '',
    description: ''
  });

  useEffect(() => {
    playAmbientMenu();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      setMarketError('');
      if (cloudEnabled) {
        const { data } = await marketRequest();
        const player = await refreshCloudPlayerSave();
        if (player.currency !== currentUser.currency) updateUserData({ currency: player.currency });
        const [fusions, ownedOrbs] = await Promise.all([
          Fusion.filter({ playerOwner: player.id }),
          PlayerOrb.filter({ playerId: player.id }),
        ]);
        const available = ownedOrbs.filter(orb => !orb.equippedToFusion);
        const details = await lookupOrbsById([...new Set(available.map(orb => orb.orbId))]);
        setMyItems({ fusions, orbs: available.filter(orb => details[orb.orbId])
          .map(orb => ({ ...details[orb.orbId], playerOrbId: orb.id })) });
        setListings(data.listings);
        setMyListings(data.mine);
        return;
      }

      // Load active listings
      const activeListings = await Listing.filter({ 
        status: 'active',
        expiresAt: { $gt: new Date().toISOString() }
      }, '-created_date');
      
      console.log('Active listings loaded:', activeListings.length); // Debug log
      
      // Load detailed item data for listings
      const processedListings = await Promise.all(
        activeListings.map(async (listing) => {
          try {
            if (listing.itemType === 'fusion') {
              const fusion = await Fusion.filter({ id: listing.itemId });
              if (fusion.length > 0) {
                // Add talent bonuses to fusion
                try {
                  const talentsData = await Talent.list();
                  const seller = await User.filter({ id: listing.sellerId });
                  const sellerData = seller[0];
                  const talentBonus = await calculateTalentBonuses(
                    sellerData?.learnedTalents || [],
                    fusion[0].stats,
                    talentsData
                  );
                  return { ...listing, itemData: { ...fusion[0], talentBonus } };
                } catch (talentError) {
                  console.warn('Error calculating talent bonuses for fusion listing:', listing.id, talentError);
                  return { ...listing, itemData: fusion[0] }; // Still return fusion data even if talent bonus calculation fails
                }
              }
            } else if (listing.itemType === 'orb') {
              const playerOrb = await PlayerOrb.filter({ id: listing.itemId });
              if (playerOrb.length > 0) {
                const orbDetails = await lookupOrbsById([playerOrb[0].orbId]);
                const orbData = orbDetails[playerOrb[0].orbId];
                if (orbData) {
                  return { ...listing, itemData: { ...orbData, playerOrbId: playerOrb[0].id } };
                }
              }
            }
          } catch (error) {
            console.error(`Error processing listing ${listing.id}:`, error);
          }
          return null;
        })
      );
      
      const validListings = processedListings.filter(Boolean);
      console.log('Valid listings processed:', validListings.length); // Debug log
      setListings(validListings);
      
      // Load user's listings and items only if user exists
      if (currentUser) {
        const userListings = await Listing.filter({ 
          sellerId: currentUser.id 
        }, '-created_date');
        setMyListings(userListings);
        
        // Load user's items for creating listings - only items NOT in escrow (not owned by 'auction_lister')
        const [userFusions, userOrbs] = await Promise.all([
          Fusion.filter({ playerOwner: currentUser.id }),
          PlayerOrb.filter({ 
            playerId: currentUser.id,
            $or: [
              { equippedToFusion: null },
              { equippedToFusion: { $exists: false } }
            ]
          })
        ]);
        
        // Process orbs with details
        const orbIds = [...new Set(userOrbs.map(po => po.orbId))];
        const orbDetails = await lookupOrbsById(orbIds);
        const processedOrbs = userOrbs.map(playerOrb => ({
          ...orbDetails[playerOrb.orbId],
          playerOrbId: playerOrb.id
        })).filter(Boolean);
        
        setMyItems({ fusions: userFusions, orbs: processedOrbs });
      }
      
    } catch (error) {
      setMarketError(error.message || 'The Black Register could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, loadData]); // loadData is now stable due to useCallback

  const handleCreateListing = async () => {
    if (!currentUser || !newListing.itemId || !newListing.startingPrice || !newListing.title) {
      alert('Please fill in all required fields.');
      return;
    }
    
    setIsSubmitting(true);

    try {
      // The backend function 'createListing' will handle the escrow transfer and listing creation.
      const buyoutPrice = newListing.listingType === 'auction' && newListing.buyoutPrice ? newListing.buyoutPrice : null;

      const result = await (cloudEnabled ? input => marketRequest({ ...input, action: "create" }) : createListing)({
        itemId: newListing.itemId,
        itemType: newListing.itemType,
        listingType: newListing.listingType,
        startingPrice: Number(newListing.startingPrice),
        buyoutPrice: buyoutPrice ? Number(buyoutPrice) : null,
        duration: Number(newListing.duration),
        title: newListing.title,
        description: newListing.description,
      });
      
      const responseData = result.data;

      if (responseData.success) {
        alert('Listing created successfully!');
        // Reset form
        setNewListing({
          itemType: 'fusion',
          itemId: '',
          listingType: 'fixed',
          startingPrice: '',
          buyoutPrice: '',
          duration: 24,
          title: '',
          description: ''
        });
        setShowCreateListing(false);
        await loadData(); // Refresh data
        
      } else {
        throw new Error(responseData.error || 'Failed to create listing.');
      }

    } catch (error) {
      console.error('Error creating listing:', error);
      const errorMessage = error.response?.data?.error || error.message || 'An unknown error occurred.';
      alert(`Failed to create listing. Please try again. \nReason: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBid = async (listing) => {
    if (!currentUser || !bidAmount || parseInt(bidAmount) <= listing.currentBid) {
      alert('Bid must be higher than current bid.');
      return;
    }

    if (!cloudEnabled && (currentUser.currency || 0) < parseInt(bidAmount)) {
      alert('Insufficient Echoes for this bid.');
      return;
    }
    
    setIsSubmitting(true);

    try {
      if (cloudEnabled) await marketRequest({ action: "bid", listingId: listing.id, amount: Number(bidAmount) });
      else {
      await Bid.create({
        listingId: listing.id,
        bidderId: currentUser.id,
        amount: parseInt(bidAmount),
        isWinning: true
      });
      
      // Update listing
      await Listing.update(listing.id, {
        currentBid: parseInt(bidAmount),
        currentBidderId: currentUser.id
      });
      
      }
      setBidAmount('');
      setShowBidDialog(null);
      await loadData();
      playCurrencyGain();
      
    } catch (error) {
      console.error('Error placing bid:', error);
      alert(error.message || 'Failed to place bid. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyNow = async (listing) => {
    setIsSubmitting(true);
    try {
      const price = listing.listingType === 'fixed' ? listing.startingPrice : listing.buyoutPrice;

      if (!price) {
          alert('Purchase price not found for this listing.');
          setIsSubmitting(false);
          return;
      }
      
      if (!currentUser || (!cloudEnabled && (currentUser.currency || 0) < price)) {
        alert('You do not have enough Echoes to purchase this item.');
        setIsSubmitting(false);
        return;
      }

      // Call the secure backend function
      const result = await (cloudEnabled ? marketRequest({ action: "buy", listingId: listing.id }) : purchaseListing({ listingId: listing.id }));
      
      const responseData = result.data;

      if (responseData.success) {
        alert('Purchase successful!');
        // Optimistically update currency in context
        if (!cloudEnabled) updateUserData({ currency: (currentUser.currency || 0) - price });
        // Refresh all data to show changes
        await loadData();
        playCurrencyGain(); // Play sound for currency change (purchase confirmation)
      } else {
        throw new Error(responseData.error || 'Failed to complete purchase.');
      }

    } catch (error) {
      console.error('Error completing purchase:', error);
      const errorMessage = error.response?.data?.error || error.message || 'An unknown error occurred.';
      alert(`Failed to complete purchase. Please try again. \nReason: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCancelListing = async (listing) => {
    if (!currentUser || listing.sellerId !== currentUser.id) {
        alert("You can only cancel your own listings.");
        return;
    }
    
    setIsSubmitting(true);
    
    try {
        const result = await (cloudEnabled ? marketRequest({ action: "cancel", listingId: listing.id }) : cancelListing({ listingId: listing.id }));
        const responseData = result.data;

        if (responseData.success) {
            alert('Listing successfully cancelled!');
            await loadData();
        } else {
            throw new Error(responseData.error || 'Failed to cancel listing.');
        }
        
    } catch(error) {
        console.error("Error cancelling listing:", error);
        const errorMessage = error.response?.data?.error || error.message || 'An unknown error occurred.';
        alert(`Failed to cancel listing: ${errorMessage}`);
        // Refresh data even on failure, as the state on the server might have changed
        await loadData();
    } finally {
        setIsSubmitting(false);
    }
  }

  const filteredListings = listings.filter(listing => {
    // Always require valid item data
    if (!listing.itemData) {
      console.log('Listing missing itemData:', listing.id); // Debug log
      return false;
    }
    
    // Type filter
    const typeMatch = filterType === 'all' || listing.itemType === filterType;
    
    // Enhanced search logic
    const searchMatch = searchTerm === '' || 
      (listing.title && listing.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (listing.description && listing.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (listing.itemData.name && listing.itemData.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (listing.itemData.fusedName && listing.itemData.fusedName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (listing.itemType === 'fusion' && listing.itemData.originType && listing.itemData.originType.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (listing.itemType === 'orb' && listing.itemData.orbType && listing.itemData.orbType.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Don't show user's own listings in browse mode
    const notOwnListing = !currentUser || listing.sellerId !== currentUser.id;
    
    const shouldShow = typeMatch && searchMatch && notOwnListing;
    
    if (searchTerm && !shouldShow) {
      // console.log('Filtered out listing:', { // Uncomment for verbose debug
      //   title: listing.title,
      //   searchTerm,
      //   typeMatch,
      //   searchMatch,
      //   notOwnListing,
      //   itemType: listing.itemType,
      //   itemDataName: listing.itemData?.name,
      //   itemDataFusedName: listing.itemData?.fusedName,
      //   itemDataOriginType: listing.itemData?.originType,
      //   itemDataOrbType: listing.itemData?.orbType
      // }); 
    }
    
    return shouldShow;
  });

  const renderListingCard = (listing) => {
    const timeLeft = new Date(listing.expiresAt) - new Date();
    const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
    const isExpiringSoon = hoursLeft < 2;
    
    return (
      <Card key={listing.id} className="bg-card border-border hover:border-gray-600 transition-all">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg text-white">{listing.title}</CardTitle>
              <Badge className={`mt-1 ${listing.listingType === 'auction' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'}`}>
                {listing.listingType === 'auction' ? 'Auction' : 'Fixed Price'}
              </Badge>
            </div>
            <div className={`flex items-center gap-1 text-sm ${isExpiringSoon ? 'text-red-400' : 'text-gray-400'}`}>
              <Timer className="w-4 h-4" />
              {hoursLeft}h left
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Item Preview */}
          <div className="flex justify-center">
            {listing.itemType === 'fusion' ? (
              <div className="scale-75 origin-center">
                <FusionCard fusion={listing.itemData} />
              </div>
            ) : (
              <div className="scale-75 origin-center">
                <OrbCard orb={listing.itemData} showActions={false} />
              </div>
            )}
          </div>
          
          {/* Price Info */}
          <div className="space-y-2">
            {listing.listingType === 'auction' ? (
              <>
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className="text-gray-400">Current Bid:</span>
                  <div className="flex items-center gap-1">
                    <Gem className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-purple-300">{listing.currentBid}</span>
                  </div>
                </div>
                {listing.buyoutPrice && (
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <span className="text-gray-400">Buyout:</span>
                    <div className="flex items-center gap-1">
                      <Gem className="w-4 h-4 text-green-400" />
                      <span className="font-bold text-green-300">{listing.buyoutPrice}</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-wrap justify-between items-center gap-2">
                <span className="text-gray-400">Price:</span>
                <div className="flex items-center gap-1">
                  <Gem className="w-4 h-4 text-green-400" />
                  <span className="font-bold text-green-300">{listing.startingPrice}</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            {listing.listingType === 'auction' ? (
              <>
                <Button 
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                  onClick={() => setShowBidDialog(listing)}
                  disabled={isSubmitting}
                >
                  <Gavel className="w-4 h-4 mr-2" />
                  Place Bid
                </Button>
                {listing.buyoutPrice && (
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleBuyNow(listing)}
                    disabled={isSubmitting}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Buy Now
                  </Button>
                )}
              </>
            ) : (
              <Button 
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => handleBuyNow(listing)}
                disabled={isSubmitting}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Purchase
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl">
      {marketError && <p role="alert" className="mb-4 text-red-300">{marketError}</p>}
      <div className="text-left mb-8">
        <h1 className="text-4xl font-bold">The Black Register</h1>
        <p className="text-gray-400 mt-2">Trade your abominations and relics in the shadowy marketplace.</p>
        
        {currentUser && (
          <div className="flex items-center gap-4 mt-4">
            <WalletBadge amount={currentUser.currency} />
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="browse">Browse Market</TabsTrigger>
          <TabsTrigger value="sell">Sell Items</TabsTrigger>
          <TabsTrigger value="my-listings">My Listings</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          {/* Filters */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search listings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64 bg-gray-700 border-gray-600"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    <SelectItem value="fusion">Fusions</SelectItem>
                    <SelectItem value="orb">Orbs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Listings Grid */}
          <div className="game-card-grid [--game-card-track:23.125rem] gap-6">
            <AnimatePresence>
              {filteredListings.map((listing) => (
                <motion.div
                  key={listing.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  {renderListingCard(listing)}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredListings.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg">No items match your search criteria.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="sell" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Create New Listing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Item Type</label>
                  <Select value={newListing.itemType} onValueChange={(value) => setNewListing({...newListing, itemType: value, itemId: ''})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fusion">Fusion</SelectItem>
                      <SelectItem value="orb">Orb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Listing Type</label>
                  <Select value={newListing.listingType} onValueChange={(value) => setNewListing({...newListing, listingType: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Price</SelectItem>
                      <SelectItem value="auction">Auction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Select Item</label>
                <Select value={newListing.itemId} onValueChange={(value) => setNewListing({...newListing, itemId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an item to sell" />
                  </SelectTrigger>
                  <SelectContent>
                    {newListing.itemType === 'fusion' 
                      ? myItems.fusions.map(fusion => (
                          <SelectItem key={fusion.id} value={fusion.id}>
                            {fusion.fusedName} (Level {fusion.level})
                          </SelectItem>
                        ))
                      : myItems.orbs.map(orb => (
                          <SelectItem key={orb.playerOrbId} value={orb.playerOrbId}>
                            {orb.name} ({orb.rarity})
                          </SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <Input
                  placeholder="Give your listing an eye-catching title"
                  value={newListing.title}
                  onChange={(e) => setNewListing({...newListing, title: e.target.value})}
                  className="bg-gray-700 border-gray-600"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
                <Textarea
                  placeholder="Add details about your item..."
                  value={newListing.description}
                  onChange={(e) => setNewListing({...newListing, description: e.target.value})}
                  className="bg-gray-700 border-gray-600"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {newListing.listingType === 'auction' ? 'Starting Price' : 'Fixed Price'}
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newListing.startingPrice}
                    onChange={(e) => setNewListing({...newListing, startingPrice: e.target.value})}
                    className="bg-gray-700 border-gray-600"
                  />
                </div>
                {newListing.listingType === 'auction' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Buyout Price (Optional)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newListing.buyoutPrice}
                      onChange={(e) => setNewListing({...newListing, buyoutPrice: e.target.value})}
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Duration (Hours)</label>
                <Select value={newListing.duration.toString()} onValueChange={(value) => setNewListing({...newListing, duration: parseInt(value)})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 Hours</SelectItem>
                    <SelectItem value="12">12 Hours</SelectItem>
                    <SelectItem value="24">24 Hours</SelectItem>
                    <SelectItem value="48">48 Hours</SelectItem>
                    <SelectItem value="72">72 Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleCreateListing} disabled={isSubmitting} className="w-full game-button-primary">
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                {isSubmitting ? 'Listing...' : 'Create Listing'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-listings">
          <div className="game-card-grid [--game-card-track:23.125rem] gap-6">
            {myListings.map((listing) => (
              <Card key={listing.id} className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">{listing.title}</CardTitle>
                  <Badge className={`w-fit ${
                    listing.status === 'active' ? 'bg-green-500/20 text-green-300' :
                    listing.status === 'sold' ? 'bg-blue-500/20 text-blue-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {listing.status.toUpperCase()}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Type:</span>
                      <span className="capitalize">{listing.itemType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Price:</span>
                      <div className="flex items-center gap-1">
                        <Gem className="w-4 h-4 text-purple-400" />
                        <span>{listing.startingPrice}</span>
                      </div>
                    </div>
                    {listing.listingType === 'auction' && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current Bid:</span>
                        <div className="flex items-center gap-1">
                          <Gem className="w-4 h-4 text-yellow-400" />
                          <span>{listing.currentBid}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Expires:</span>
                      <span className="text-sm">
                        {new Date(listing.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                   {listing.status === 'active' && !listing.hasBid && (
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            className="mt-4 w-full"
                            onClick={() => handleCancelListing(listing)}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : "Cancel Listing"}
                        </Button>
                   )}
                </CardContent>
              </Card>
            ))}
          </div>

          {myListings.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg">You have no active listings.</p>
              <Button 
                onClick={() => setActiveTab('sell')} 
                className="mt-4 game-button-primary"
              >
                Create Your First Listing
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Bid Dialog */}
      {showBidDialog && (
        <PopupDialog
          open={true}
          onClose={() => setShowBidDialog(null)}
          title="Place Bid"
          titleIcon={Gavel}
          actions={[
            {
              text: "Cancel",
              icon: X,
              onClick: () => setShowBidDialog(null),
              variant: "outline"
            },
            {
              text: "Place Bid",
              icon: Gavel,
              onClick: () => handleBid(showBidDialog),
              disabled: isSubmitting || !bidAmount || parseInt(bidAmount) <= showBidDialog.currentBid
            }
          ]}
        >
          <PopupSection title="Current Auction">
            <div className="text-center mb-4">
              <h4 className="font-bold text-lg">{showBidDialog.title}</h4>
              <div className="flex justify-center items-center gap-2 mt-2">
                <span className="text-gray-400">Current bid:</span>
                <div className="flex items-center gap-1">
                  <Gem className="w-4 h-4 text-yellow-400" />
                  <span className="font-bold text-yellow-300">{showBidDialog.currentBid}</span>
                </div>
              </div>
            </div>
          </PopupSection>

          <PopupSection title="Your Bid">
            <div className="space-y-4">
              <Input
                type="number"
                placeholder={`Minimum: ${showBidDialog.currentBid + 1}`}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="bg-gray-700 border-gray-600"
              />
              <PopupCostBreakdown
                items={[
                  { label: "Your bid", value: `${bidAmount || 0} Echoes` },
                  { label: "Your balance", value: `${currentUser?.currency || 0} Echoes` }
                ]}
                totalLabel="Balance after bid"
                totalValue={`${(currentUser?.currency || 0) - (parseInt(bidAmount) || 0)} Echoes`}
                totalColor={
                  (currentUser?.currency || 0) >= (parseInt(bidAmount) || 0) ? 'text-green-300' : 'text-red-300'
                }
              />
            </div>
          </PopupSection>

          {(currentUser?.currency || 0) < (parseInt(bidAmount) || 0) && (
            <PopupWarning message="Insufficient Echoes for this bid" />
          )}
        </PopupDialog>
      )}
    </div>
  );
}
