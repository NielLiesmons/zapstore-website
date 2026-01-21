/**
 * Applesauce Nostr SDK - Centralized client setup
 * 
 * This module provides a unified interface for all Nostr operations using
 * the Applesauce library for reactive, modular Nostr development.
 * 
 * @see https://hzrd149.github.io/applesauce/
 */

import { EventStore } from 'applesauce-core/event-store';
import { RelayPool } from 'applesauce-relay';
import { createEventLoaderForStore } from 'applesauce-loaders/loaders';

// ============================================================================
// Constants & Configuration
// ============================================================================

export const RELAY_URL = 'wss://relay.zapstore.dev';
export const PROFILE_RELAY_URL = 'wss://relay.vertexlab.io';
export const SOCIAL_RELAYS = [
	'wss://relay.damus.io',
	'wss://relay.primal.net',
	'wss://relay.nostr.band',
	'wss://nos.lol'
];

// All relays for profile lookups
export const PROFILE_RELAYS = Array.from(new Set([PROFILE_RELAY_URL, RELAY_URL, ...SOCIAL_RELAYS]));
// Comments should only go to social relays
export const COMMENT_RELAYS = Array.from(new Set(SOCIAL_RELAYS));

// Event kinds
export const KIND_PROFILE = 0;
export const KIND_COMMENT = 1111;
export const KIND_FILE_METADATA = 1063;
export const KIND_ZAP_REQUEST = 9734;
export const KIND_ZAP_RECEIPT = 9735;
export const KIND_RELEASE = 30063;
export const KIND_APP_STACK = 30267;
export const KIND_APP = 32267;

// Timeouts
export const CONNECTION_TIMEOUT = 10000; // 10 seconds
export const SUBSCRIPTION_TIMEOUT = 8000; // 8 seconds for subscriptions

// ============================================================================
// Singleton Instances (Client-side)
// ============================================================================

let eventStore = null;
let relayPool = null;
let eventLoader = null;

/**
 * Gets or creates the singleton EventStore instance
 * @returns {EventStore} The event store
 */
export function getEventStore() {
	if (!eventStore) {
		eventStore = new EventStore();
	}
	return eventStore;
}

/**
 * Gets or creates the singleton RelayPool instance
 * @returns {RelayPool} The relay pool
 */
export function getRelayPool() {
	if (!relayPool) {
		relayPool = new RelayPool();
	}
	return relayPool;
}

/**
 * Gets or creates the event loader connected to the store and pool
 * @returns {Object} The event loader
 */
export function getEventLoader() {
	if (!eventLoader) {
		const store = getEventStore();
		const pool = getRelayPool();
		eventLoader = createEventLoaderForStore(store, pool, {
			lookupRelays: PROFILE_RELAYS
		});
	}
	return eventLoader;
}

// ============================================================================
// Subscription Utilities (using RxJS Observables)
// ============================================================================

/**
 * Creates a subscription and collects events until EOSE or timeout
 * Uses Applesauce's request() which completes after EOSE
 * @param {string[]} relays - Relays to subscribe to
 * @param {Object} filter - Nostr filter
 * @param {Object} options - Options
 * @param {number} options.timeout - Timeout in ms (default: SUBSCRIPTION_TIMEOUT)
 * @returns {Promise<Array>} Array of events
 */
export async function fetchEvents(relays, filterObj, options = {}) {
	const pool = getRelayPool();
	const timeoutMs = options.timeout || SUBSCRIPTION_TIMEOUT;
	
	console.log('[Applesauce] fetchEvents:', { relays, filter: filterObj, timeout: timeoutMs });
	
	return new Promise((resolve) => {
		const events = [];
		let resolved = false;
		
		const resolveWith = (result) => {
			if (resolved) return;
			resolved = true;
			console.log('[Applesauce] fetchEvents result:', result.length, 'events');
			resolve(result);
		};
		
		// Set a timeout
		const timeoutId = setTimeout(() => {
			console.warn('[Applesauce] fetchEvents timeout after', timeoutMs, 'ms');
			resolveWith(events);
		}, timeoutMs);
		
		try {
			// Use request() which completes after EOSE
			const subscription = pool.request(relays, filterObj).subscribe({
				next(event) {
					console.log('[Applesauce] Received event:', event?.id?.substring(0, 8));
					if (event && typeof event === 'object' && event.id) {
						events.push(event);
					}
				},
				error(err) {
					console.warn('[Applesauce] fetchEvents error:', err.message);
					clearTimeout(timeoutId);
					resolveWith(events);
				},
				complete() {
					console.log('[Applesauce] fetchEvents complete, got', events.length, 'events');
					clearTimeout(timeoutId);
					resolveWith(events);
				}
			});
			
			// Cleanup subscription on timeout
			setTimeout(() => {
				if (!resolved) {
					subscription.unsubscribe();
				}
			}, timeoutMs + 100);
		} catch (err) {
			console.warn('[Applesauce] fetchEvents catch error:', err.message);
			clearTimeout(timeoutId);
			resolveWith(events);
		}
	});
}

/**
 * Creates a subscription and returns the first event matching criteria
 * @param {string[]} relays - Relays to subscribe to
 * @param {Object} filter - Nostr filter
 * @param {Object} options - Options
 * @returns {Promise<Object|null>} First event or null
 */
export async function fetchFirstEvent(relays, filterObj, options = {}) {
	const pool = getRelayPool();
	const timeoutMs = options.timeout || SUBSCRIPTION_TIMEOUT;
	
	return new Promise((resolve) => {
		let resolved = false;
		
		const resolveWith = (result) => {
			if (resolved) return;
			resolved = true;
			resolve(result);
		};
		
		// Set a timeout
		const timeoutId = setTimeout(() => {
			resolveWith(null);
		}, timeoutMs);
		
		try {
			const subscription = pool.request(relays, filterObj).subscribe({
				next(event) {
					if (event && typeof event === 'object' && event.id) {
						clearTimeout(timeoutId);
						subscription.unsubscribe();
						resolveWith(event);
					}
				},
				error(err) {
					console.warn('[Applesauce] fetchFirstEvent error:', err.message);
					clearTimeout(timeoutId);
					resolveWith(null);
				},
				complete() {
					clearTimeout(timeoutId);
					resolveWith(null);
				}
			});
			
			// Cleanup subscription on timeout
			setTimeout(() => {
				if (!resolved) {
					subscription.unsubscribe();
				}
			}, timeoutMs + 100);
		} catch (err) {
			console.warn('[Applesauce] fetchFirstEvent catch error:', err.message);
			clearTimeout(timeoutId);
			resolveWith(null);
		}
	});
}

/**
 * Adds an event to the store for reactive access
 * @param {Object} event - Nostr event
 */
export function addEventToStore(event) {
	const store = getEventStore();
	store.add(event);
}

/**
 * Adds multiple events to the store
 * @param {Array} events - Array of Nostr events
 */
export function addEventsToStore(events) {
	const store = getEventStore();
	events.forEach(event => store.add(event));
}

// ============================================================================
// Publishing
// ============================================================================

/**
 * Publish an event to multiple relays
 * @param {Object} event - Signed Nostr event
 * @param {string[]} relays - Relays to publish to (default: COMMENT_RELAYS)
 * @returns {Promise<Object>} Result with okCount and failCount
 */
export async function publishEvent(event, relays = COMMENT_RELAYS) {
	const pool = getRelayPool();
	const uniqueRelays = Array.from(new Set(relays));
	
	console.log('[Applesauce] publishEvent to', uniqueRelays.length, 'relays, kind:', event.kind);
	
	const results = await Promise.allSettled(
		uniqueRelays.map(async url => {
			try {
				const result = await pool.publish([url], event);
				console.log('[Applesauce] Publish to', url, ':', result);
				return result;
			} catch (err) {
				console.error('[Applesauce] Publish to', url, 'failed:', err.message);
				throw err;
			}
		})
	);
	
	const okCount = results.filter(r => r.status === 'fulfilled').length;
	const failCount = results.length - okCount;
	
	console.log('[Applesauce] publishEvent results: ok=', okCount, 'fail=', failCount);
	
	if (okCount === 0) {
		throw new Error('Failed to publish event to any relay');
	}
	
	// Add to local store for immediate UI update
	addEventToStore(event);
	
	return { okCount, failCount };
}

// ============================================================================
// Reactive Subscriptions (using RxJS)
// ============================================================================

/**
 * Creates a real-time subscription that calls a callback on each event
 * Uses Applesauce's subscription() Observable
 * @param {string[]} relays - Relays to subscribe to
 * @param {Object} filter - Nostr filter
 * @param {Function} onEvent - Callback for each event
 * @param {Object} options - Options
 * @returns {Function} Unsubscribe function
 */
export function subscribeToEvents(relays, filterObj, onEvent, options = {}) {
	const pool = getRelayPool();
	
	// subscription() returns Observable<NostrEvent | "EOSE">
	const subscription = pool.subscription(relays, filterObj).subscribe({
		next(response) {
			// response is either a NostrEvent or the string "EOSE"
			if (response && response !== 'EOSE') {
				addEventToStore(response);
				onEvent(response);
			}
		},
		error(err) {
			console.warn('[Applesauce] Subscription error:', err);
		}
	});
	
	// Return unsubscribe function
	return () => {
		subscription.unsubscribe();
	};
}

/**
 * Subscribe to multiple filters at once
 * @param {string[]} relays - Relays to subscribe to
 * @param {Object[]} filters - Array of Nostr filters
 * @param {Function} onEvent - Callback for each event
 * @returns {Function} Unsubscribe function
 */
export function subscribeToMany(relays, filters, onEvent) {
	const pool = getRelayPool();
	
	// Subscribe to each filter - response is NostrEvent | "EOSE"
	const subscriptions = filters.map(filterObj => 
		pool.subscription(relays, filterObj).subscribe({
			next(response) {
				if (response && response !== 'EOSE') {
					addEventToStore(response);
					onEvent(response);
				}
			},
			error(err) {
				console.warn('[Applesauce] Subscription error:', err);
			}
		})
	);
	
	// Return combined unsubscribe function
	return () => {
		subscriptions.forEach(sub => sub.unsubscribe());
	};
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Closes all relay connections and cleans up
 */
export function cleanup() {
	if (relayPool) {
		// Remove each relay from the pool
		try {
			for (const url of PROFILE_RELAYS) {
				relayPool.remove(url, true);
			}
		} catch (e) {
			// Ignore cleanup errors
		}
		relayPool = null;
	}
	eventStore = null;
	eventLoader = null;
}

// ============================================================================
// Discover Page State (simple in-memory cache)
// ============================================================================

let discoverPageState = {
	apps: [],
	hasMore: true,
	expanded: false,
	query: ''
};

export function getDiscoverPageState() {
	return discoverPageState;
}

export function setDiscoverPageState(state) {
	discoverPageState = { ...discoverPageState, ...state };
}
