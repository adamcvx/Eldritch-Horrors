import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const { itemId, itemType, listingType, startingPrice, buyoutPrice, duration, title, description } = await req.json();

        // Basic validation
        if (!itemId || !itemType || !listingType || !startingPrice || !duration || !title) {
            return new Response(JSON.stringify({ error: 'Missing required listing information.' }), { status: 400 });
        }

        const base44 = createClientFromRequest(req);
        const seller = await base44.auth.me();

        if (!seller) {
            return new Response(JSON.stringify({ error: 'Unauthorized: User not logged in' }), { status: 401 });
        }
        
        const serviceRoleClient = base44.asServiceRole;

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + duration);

        const listingData = {
            sellerId: seller.id,
            itemId,
            itemType,
            listingType,
            startingPrice,
            buyoutPrice: buyoutPrice || null,
            duration,
            expiresAt: expiresAt.toISOString(),
            title,
            description: description || '',
            status: 'active'
        };

        const newListing = await serviceRoleClient.entities.Listing.create(listingData);

        if (itemType === 'fusion') {
            await serviceRoleClient.entities.Fusion.update(itemId, { playerOwner: 'auction_lister' });
        } else {
            await serviceRolelient.entities.PlayerOrb.update(itemId, { playerId: 'auction_lister' });
        }

        return new Response(JSON.stringify({ success: true, listing: newListing }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Error in createListing function:', error);
        return new Response(JSON.stringify({ error: `An unexpected error occurred: ${error.message}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});