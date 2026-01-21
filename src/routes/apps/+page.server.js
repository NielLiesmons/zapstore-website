import { fetchAppsServer } from '$lib/nostr-server.js';

// Load more apps for horizontal scroll display (columns of 3)
const PAGE_SIZE = 30;

export async function load({ url }) {
	try {
		console.log('[Server] Loading apps page data');
		
		const options = { limit: PAGE_SIZE + 1 };
		
		// Fetch one extra to check if there are more pages
		const allApps = await fetchAppsServer(options);
		
		// Determine if we have more pages
		const hasMore = allApps.length > PAGE_SIZE;
		const apps = allApps.slice(0, PAGE_SIZE);
		
		console.log('[Server] Loaded', apps.length, 'apps, hasMore:', hasMore);
		
		return {
			apps,
			hasMore,
			loading: false
		};
	} catch (err) {
		console.error('[Server] Failed to load apps:', err);
		return {
			apps: [],
			hasMore: false,
			loading: false,
			error: err.message
		};
	}
}

