/**
 * Applesauce Nostr SDK - Server-side module
 * 
 * This module provides server-side Nostr operations for SSR using
 * the Applesauce RelayPool with WebSocket polyfill for Node.js.
 * 
 * @see https://hzrd149.github.io/applesauce/
 */

import { WebSocket } from 'ws';

// Polyfill WebSocket for Node.js environment
if (typeof global !== 'undefined' && !global.WebSocket) {
	global.WebSocket = WebSocket;
}

import { RelayPool } from 'applesauce-relay';
import { firstValueFrom, toArray, timeout, catchError, of, take } from 'rxjs';
import * as nip19 from 'nostr-tools/nip19';
import { renderMarkdown } from '$lib/nostr.js';

// ============================================================================
// Constants
// ============================================================================

const RELAY_URL = 'wss://relay.zapstore.dev';
const PROFILE_RELAY_URL = 'wss://relay.vertexlab.io';
const CONNECTION_TIMEOUT = 10000;

// Event kinds
const KIND_PROFILE = 0;
const KIND_APP = 32267;

// ============================================================================
// Server-side Fetch Utilities
// ============================================================================

/**
 * Creates a fresh RelayPool for server-side use
 * Each request gets its own pool to avoid state issues
 * @returns {RelayPool}
 */
function createServerPool() {
	return new RelayPool();
}

/**
 * Cleanup a pool by removing relay connections
 * @param {RelayPool} pool 
 * @param {string[]} relays 
 */
function cleanupPool(pool, relays) {
	try {
		for (const url of relays) {
			pool.remove(url, true); // true = close the connection
		}
	} catch (e) {
		// Ignore cleanup errors
	}
}

/**
 * Fetch events from relays using Applesauce Observable API (server-side)
 * @param {RelayPool} pool - The relay pool
 * @param {string[]} relays - Relays to query
 * @param {Object} filter - Nostr filter
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Array>}
 */
async function fetchEventsServer(pool, relays, filter, timeoutMs = CONNECTION_TIMEOUT) {
	try {
		// Use request() which completes after EOSE
		const events$ = pool.request(relays, filter).pipe(
			timeout(timeoutMs),
			toArray(),
			catchError((err) => {
				console.warn('[Server] Fetch events error:', err.message);
				return of([]);
			})
		);
		
		const events = await firstValueFrom(events$);
		return events || [];
	} catch (err) {
		console.warn('[Server] Fetch events error:', err.message);
		return [];
	}
}

/**
 * Fetch first matching event using Applesauce Observable API (server-side)
 * @param {RelayPool} pool - The relay pool
 * @param {string[]} relays - Relays to query
 * @param {Object} filter - Nostr filter
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Object|null>}
 */
async function fetchFirstEventServer(pool, relays, filter, timeoutMs = CONNECTION_TIMEOUT) {
	try {
		// Use request() and take the first event
		const event$ = pool.request(relays, filter).pipe(
			take(1),
			timeout(timeoutMs),
			catchError((err) => {
				// Timeout or empty is normal for "not found"
				return of(null);
			})
		);
		
		const event = await firstValueFrom(event$, { defaultValue: null });
		return event;
	} catch (err) {
		console.warn('[Server] Fetch first event error:', err.message);
		return null;
	}
}

// ============================================================================
// App Fetching (Server-side)
// ============================================================================

/**
 * Server-side fetch apps from Nostr relay
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of apps to fetch
 * @param {string[]} options.authors - Filter by specific authors
 * @param {string[]} options.dTags - Filter by specific d-tags
 * @param {number} options.until - Fetch events created before this timestamp
 * @param {string} options.search - Free-text search (NIP-50)
 * @returns {Promise<Array>} Array of app objects
 */
export async function fetchAppsServer({ limit = 12, authors, dTags, until, search } = {}) {
	const pool = createServerPool();
	const relays = [RELAY_URL];
	
	try {
		const filter = {
			kinds: [KIND_APP],
			limit,
			'#f': ['android-arm64-v8a']
		};

		if (authors) filter.authors = authors;
		if (dTags) filter['#d'] = dTags;
		if (until) filter.until = until;
		if (search && typeof search === 'string' && search.trim().length > 0) {
			filter.search = search.trim();
		}

		console.log('[Server] Fetching apps with filter:', filter);

		const events = await fetchEventsServer(pool, relays, filter);
		const apps = events.map(parseAppEventServer);
		const sortedApps = apps.sort((a, b) => b.createdAt - a.createdAt);
		
		console.log('[Server] Got', sortedApps.length, 'apps');
		
		// Clean up
		cleanupPool(pool, relays);
		
		return sortedApps;
	} catch (err) {
		console.error('[Server] Error in fetchAppsServer:', err);
		cleanupPool(pool, relays);
		return [];
	}
}

/**
 * Fetches a specific app by pubkey and d-tag (server-side)
 * @param {string} pubkey - The author's public key
 * @param {string} dTag - The app's d-tag identifier
 * @returns {Promise<Object|null>} App object or null if not found
 */
export async function fetchAppServer(pubkey, dTag) {
	const pool = createServerPool();
	const relays = [RELAY_URL];
	
	try {
		const filter = {
			kinds: [KIND_APP],
			authors: [pubkey],
			'#d': [dTag]
		};

		console.log('[Server] Fetching app with filter:', filter);

		const event = await fetchFirstEventServer(pool, relays, filter);
		const app = event ? parseAppEventServer(event) : null;
		
		console.log('[Server] App found:', !!app);
		
		cleanupPool(pool, relays);
		return app;
	} catch (err) {
		console.error('[Server] Error in fetchAppServer:', err);
		cleanupPool(pool, relays);
		return null;
	}
}

/**
 * Fetch an app by d-tag (android app id) regardless of author (server-side)
 * @param {string} dTag - The app's d-tag identifier
 * @returns {Promise<Object|null>} App object or null if not found
 */
export async function fetchAppByDTagServer(dTag) {
	const pool = createServerPool();
	const relays = [RELAY_URL];
	
	try {
		const filter = {
			kinds: [KIND_APP],
			'#d': [dTag],
			limit: 1
		};

		const event = await fetchFirstEventServer(pool, relays, filter);
		const app = event ? parseAppEventServer(event) : null;
		
		cleanupPool(pool, relays);
		return app;
	} catch (err) {
		console.error('[Server] Error in fetchAppByDTagServer:', err);
		cleanupPool(pool, relays);
		return null;
	}
}

// ============================================================================
// Profile Fetching (Server-side)
// ============================================================================

/**
 * Fetch profile information for a given pubkey (server-side)
 * @param {string} pubkey - The user's public key
 * @returns {Promise<Object|null>} Profile object or null if not found
 */
export async function fetchProfileServer(pubkey) {
	const pool = createServerPool();
	const relays = [PROFILE_RELAY_URL];
	
	try {
		const filter = {
			kinds: [KIND_PROFILE],
			authors: [pubkey],
			limit: 1
		};

		console.log('[Server] Fetching profile for:', pubkey);

		const event = await fetchFirstEventServer(pool, relays, filter);
		
		let profile = null;
		if (event) {
			let content = {};
			try {
				content = JSON.parse(event.content);
			} catch (e) {
				console.warn('[Server] Failed to parse profile content for', pubkey);
			}

			profile = {
				pubkey: event.pubkey,
				name: content.name || content.display_name || '',
				displayName: content.display_name || content.name || '',
				picture: content.picture || '',
				about: content.about || '',
				nip05: content.nip05 || '',
				createdAt: event.created_at
			};
		}
		
		console.log('[Server] Profile found:', !!profile);
		
		cleanupPool(pool, relays);
		return profile;
	} catch (err) {
		console.error('[Server] Error in fetchProfileServer:', err);
		cleanupPool(pool, relays);
		return null;
	}
}

// ============================================================================
// Event Parsing
// ============================================================================

/**
 * Parses a nostr event into an app object (server-side)
 * @param {Object} event - Raw nostr event
 * @returns {Object} Parsed app object
 */
function parseAppEventServer(event) {
	const tagMap = {};
	const imageTags = [];
	
	event.tags.forEach(tag => {
		if (tag.length >= 2) {
			const [key, value] = tag;
			if (key === 'image') {
				imageTags.push(value);
			} else if (!tagMap[key]) {
				tagMap[key] = value;
			}
		}
	});
	
	let content = {};
	try {
		content = JSON.parse(event.content);
	} catch (e) {
		console.warn('[Server] Failed to parse content for event', event.id);
		content = { description: event.content };
	}

	const icon = tagMap.icon || content.icon || content.picture || '';
	const images = imageTags.length > 0 ? imageTags : (content.images || []);
	const description = content.description || content.about || content.summary || event.content || 'No description available';

	// Normalize license
	const rawLicense = content.license || tagMap.license || '';
	const license = (typeof rawLicense === 'string' && rawLicense.trim().toUpperCase() === 'NOASSERTION') ? '' : rawLicense;

	// Generate slug using naddr encoding
	let slug;
	try {
		slug = nip19.naddrEncode({
			kind: KIND_APP,
			pubkey: event.pubkey,
			identifier: tagMap.d || ''
		});
	} catch (err) {
		console.warn('[Server] Failed to encode naddr:', err);
		const npub = nip19.npubEncode(event.pubkey);
		slug = `${npub}-${tagMap.d || ''}`;
	}

	// Serialize the event to strip any symbolic keys for SvelteKit SSR
	const serializedEvent = JSON.parse(JSON.stringify({
		id: event.id,
		pubkey: event.pubkey,
		created_at: event.created_at,
		kind: event.kind,
		tags: event.tags,
		content: event.content,
		sig: event.sig
	}));

	return {
		id: event.id,
		pubkey: event.pubkey,
		npub: nip19.npubEncode(event.pubkey),
		dTag: tagMap.d || '',
		name: content.name || tagMap.name || 'Unknown App',
		description,
		descriptionHtml: renderMarkdown(description),
		icon,
		images,
		url: content.url || content.website || tagMap.url || '',
		downloadUrl: content.downloadUrl || content.download || tagMap.download || '',
		repository: content.repository || content.repo || content.source || tagMap.repository || '',
		createdAt: event.created_at,
		category: content.category || tagMap.category || '',
		license,
		developer: content.developer || content.publisher || content.author || tagMap.developer || '',
		platform: content.platform || tagMap.platform || '',
		slug,
		fullEvent: serializedEvent
	};
}
