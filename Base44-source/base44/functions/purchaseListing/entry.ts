import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const { listingId } = await req.json();
        if (!listingId) {
            return new Response(JSON.stringify({ error: 'listingId is required' }), { status: 400 });
        }

        const base44 = createClientFromRequest(req);
        const buyer = await base44.auth.me();

        if (!buyer) {
            return new Response(JSON.stringify({ error: 'Unauthorized: User not logged in' }), { status: 401 });
        }
        
        // Use service role for all subsequent operations for security and permissions
        const serviceRoleClient = base44.asServiceRole;

        // 1. Fetch the listing
        const listings = await serviceRoleClient.entities.Listing.filter({ id: listingId });
        if (listings.length === 0) {
            return new Response(JSON.stringify({ error: 'Listing not found' }), { status: 404 });
        }
        const listing = listings[0];

        // 2. Validate the purchase
        if (listing.status !== 'active') {
            return new Response(JSON.stringify({ error: 'This listing is no longer active.' }), { status: 400 });
        }
        if (listing.sellerId === buyer.id) {
            return new Response(JSON.stringify({ error: 'You cannot purchase your own item.' }), { status: 400 });
        }

        const price = listing.buyoutPrice || listing.startingPrice;
        const buyerCurrentCurrency = (await serviceRoleClient.entities.User.filter({ id: buyer.id }))[0]?.currency || 0;

        if (buyerCurrentCurrency < price) {
            return new Response(JSON.stringify({ error: 'You do not have enough Echoes for this purchase.' }), { status: 400 });
        }

        // 3. Fetch seller data
        const sellers = await serviceRoleClient.entities.User.filter({ id: listing.sellerId });
        if (sellers.length === 0) {
            return new Response(JSON.stringify({ error: 'Seller account not found.' }), { status: 500 });
        }
        const seller = sellers[0];
        
        // 4. Perform the transaction
        const buyerNewCurrency = buyerCurrentCurrency - price;
        const sellerNewCurrency = (seller.currency || 0) + price;
        
        await Promise.all([
            serviceRoleClient.entities.User.update(buyer.id, { currency: buyerNewCurrency }),
            serviceRoleClient.entities.User.update(seller.id, { currency: sellerNewCurrency }),
            serviceRoleClient.entities.Listing.update(listingId, { status: 'sold', currentBidderId: buyer.id, currentBid: price }),
            listing.itemType === 'fusion'
                ? serviceRoleClient.entities.Fusion.update(listing.itemId, { playerOwner: buyer.id })
                : serviceRoleClient.entities.PlayerOrb.update(listing.itemId, { playerId: buyer.id })
        ]);

        return new Response(JSON.stringify({ success: true, message: 'Purchase successful!' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Error in purchaseListing function:', error);
        return new Response(JSON.stringify({ error: `An unexpected error occurred: ${error.message}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});