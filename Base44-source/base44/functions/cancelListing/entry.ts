import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const { listingId } = await req.json();
        if (!listingId) {
            return new Response(JSON.stringify({ success: false, error: 'listingId is required' }), { status: 400 });
        }

        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
        }

        const serviceRoleClient = base44.asServiceRole;

        // Fetch the listing
        const listings = await serviceRoleClient.entities.Listing.filter({ id: listingId });
        if (listings.length === 0) {
            return new Response(JSON.stringify({ success: false, error: 'Listing not found.' }), { status: 404 });
        }
        const listing = listings[0];

        // Verify user is the seller
        if (listing.sellerId !== user.id) {
            return new Response(JSON.stringify({ success: false, error: 'You are not the seller of this item.' }), { status: 403 });
        }

        // Check if listing is already sold or cancelled
        if (listing.status !== 'active') {
             return new Response(JSON.stringify({ success: false, error: `This listing cannot be cancelled as it is already ${listing.status}.` }), { status: 400 });
        }
        
        let itemOwner;
        if (listing.itemType === 'fusion') {
            const fusions = await serviceRoleClient.entities.Fusion.filter({ id: listing.itemId });
            itemOwner = fusions[0]?.playerOwner;
        } else {
            const orbs = await serviceRoleClient.entities.PlayerOrb.filter({ id: listing.itemId });
            itemOwner = orbs[0]?.playerId;
        }

        // CRITICAL CHECK: Ensure item is still in escrow
        if (itemOwner !== 'auction_lister') {
            // The item has been sold or transferred already. Update listing and inform user.
            await serviceRoleClient.entities.Listing.update(listing.id, { status: 'sold' });
            return new Response(JSON.stringify({ success: false, error: 'This item has already been sold and cannot be cancelled.' }), { status: 400 });
        }
        
        // Proceed with cancellation: transfer item back and update listing
        if (listing.itemType === 'fusion') {
            await serviceRoleClient.entities.Fusion.update(listing.itemId, { playerOwner: user.id });
        } else {
            await serviceRoleClient.entities.PlayerOrb.update(listing.itemId, { playerId: user.id });
        }

        await serviceRoleClient.entities.Listing.update(listing.id, { status: 'cancelled' });

        return new Response(JSON.stringify({ success: true, message: 'Listing successfully cancelled.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Error in cancelListing function:', error);
        return new Response(JSON.stringify({ success: false, error: `An unexpected error occurred: ${error.message}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});