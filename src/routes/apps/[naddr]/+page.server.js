import { fetchAppServer, fetchAppByDTagServer, fetchProfileServer } from '$lib/nostr-server.js';
import { parseAppSlug, getAppSlug } from '$lib/nostr.js';
import { redirect } from '@sveltejs/kit';

export const prerender = false;

export async function load({ params }) {
	try {
		console.log('[Server] Loading app details for naddr:', params.naddr);
		const naddr = params.naddr;
		
		let app = null;
		let pubkey = '';
		let dTag = '';
		
		// Try to parse the naddr
		try {
			const parsed = parseAppSlug(naddr);
			pubkey = parsed.pubkey;
			dTag = parsed.dTag;
			
			// Fetch the app from the relay
			app = await fetchAppServer(pubkey, dTag);
			
		} catch (parseErr) {
			console.log('[Server] Failed to parse naddr, trying as plain d-tag:', parseErr.message);
			
			// Fallback: treat as plain d-tag (appId) and resolve
			const resolved = await fetchAppByDTagServer(naddr);
			
			if (resolved && resolved.pubkey && resolved.dTag) {
				pubkey = resolved.pubkey;
				dTag = resolved.dTag;
				app = resolved;
				
				// Redirect to canonical naddr URL
				try {
					const canonicalNaddr = getAppSlug(pubkey, dTag);
					if (!naddr.startsWith('naddr1')) {
						throw redirect(301, `/apps/${canonicalNaddr}`);
					}
				} catch (e) {
					console.warn('[Server] Failed to encode naddr or redirect:', e);
				}
			} else {
				console.error('[Server] App not found for naddr:', naddr);
				return {
					app: null,
					loading: false,
					error: 'App not found'
				};
			}
		}
		
		if (!app) {
			console.error('[Server] App not found after fetch');
			return {
				app: null,
				loading: false,
				error: 'App not found'
			};
		}
		
		console.log('[Server] Successfully loaded app:', app.name);
		
		// Optionally fetch the profile too for immediate display
		// (though ProfileInfo component can handle this client-side)
		
		return {
			app,
			naddr: params.naddr, // Pass the naddr for deep linking
			loading: false,
			error: null
		};
		
	} catch (err) {
		console.error('[Server] Error loading app details:', err);
		return {
			app: null,
			loading: false,
			error: err.message || 'Failed to load app'
		};
	}
}
