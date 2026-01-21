/**
 * Nostr client-side operations using Applesauce SDK
 * 
 * This module provides all client-side Nostr functionality using the
 * Applesauce library for reactive, modular Nostr development.
 * 
 * @see https://hzrd149.github.io/applesauce/
 */

import * as nip19 from 'nostr-tools/nip19';
import { bech32 } from '@scure/base';
import { cacheEvent, getCachedEvent } from './event-cache.js';
import {
	getRelayPool,
	getEventStore,
	fetchEvents,
	fetchFirstEvent,
	publishEvent,
	subscribeToEvents,
	subscribeToMany,
	addEventToStore,
	addEventsToStore,
	RELAY_URL,
	PROFILE_RELAYS,
	SOCIAL_RELAYS,
	COMMENT_RELAYS,
	KIND_PROFILE,
	KIND_COMMENT,
	KIND_FILE_METADATA,
	KIND_ZAP_REQUEST,
	KIND_ZAP_RECEIPT,
	KIND_RELEASE,
	KIND_APP_STACK,
	KIND_APP,
	CONNECTION_TIMEOUT,
	getDiscoverPageState,
	setDiscoverPageState
} from './applesauce.js';

// Re-export discover page state functions
export { getDiscoverPageState, setDiscoverPageState };

// ============================================================================
// App Caching
// ============================================================================

/**
 * Gets a cached app by pubkey and dTag
 * @param {string} pubkey - The app's pubkey
 * @param {string} dTag - The app's d-tag
 * @returns {Promise<Object|null>} Cached app or null
 */
export async function getCachedApp(pubkey, dTag) {
	const cacheKey = `${pubkey}:${dTag}`;
	return await getCachedEvent(KIND_APP, cacheKey);
}

/**
 * Caches an app in IndexedDB
 * @param {Object} app - The app to cache
 */
export function cacheApp(app) {
	if (app && app.pubkey && app.dTag) {
		const cacheKey = `${app.pubkey}:${app.dTag}`;
		cacheEvent(KIND_APP, cacheKey, app);
	}
}

/**
 * Gets a cached release by pubkey and dTag
 * @param {string} pubkey - The release's pubkey
 * @param {string} dTag - The app's d-tag
 * @returns {Promise<Object|null>} Cached release or null
 */
export async function getCachedRelease(pubkey, dTag) {
	const cacheKey = `${pubkey}:${dTag}`;
	return await getCachedEvent(KIND_RELEASE, cacheKey);
}

/**
 * Caches a release in IndexedDB
 * @param {Object} release - The release to cache
 * @param {string} appDTag - The app's d-tag (for cache key)
 */
export function cacheRelease(release, appDTag) {
	if (release && release.pubkey && appDTag) {
		const cacheKey = `${release.pubkey}:${appDTag}`;
		cacheEvent(KIND_RELEASE, cacheKey, release);
	}
}

// ============================================================================
// Zaps Caching
// ============================================================================

function getZapsCacheKey(appEventId, pubkey, appId) {
	return appEventId || `${pubkey}:${appId}`;
}

export async function getCachedZaps(appEventId, pubkey, appId) {
	const key = getZapsCacheKey(appEventId, pubkey, appId);
	if (!key) return null;
	return await getCachedEvent(KIND_ZAP_RECEIPT, key);
}

export function cacheZaps(appEventId, pubkey, appId, zapsData) {
	const key = getZapsCacheKey(appEventId, pubkey, appId);
	if (!key || !zapsData) return;
	cacheEvent(KIND_ZAP_RECEIPT, key, zapsData);
}

// ============================================================================
// Comments Caching
// ============================================================================

function getCommentsCacheKey(pubkey, appId) {
	return pubkey && appId ? `${pubkey}:${appId}` : null;
}

export async function getCachedComments(pubkey, appId) {
	const key = getCommentsCacheKey(pubkey, appId);
	if (!key) return null;
	return await getCachedEvent(KIND_COMMENT, key);
}

export function cacheComments(pubkey, appId, comments) {
	const key = getCommentsCacheKey(pubkey, appId);
	if (!key || !comments) return;
	cacheEvent(KIND_COMMENT, key, comments);
}

// ============================================================================
// Profile Fetching
// ============================================================================

/**
 * Fetches profile information for a given pubkey
 * @param {string} pubkey - The user's public key
 * @returns {Promise<Object|null>} Profile object or null if not found
 */
export async function fetchProfile(pubkey) {
	// Check IndexedDB cache first
	const cached = await getCachedEvent(KIND_PROFILE, pubkey);
	if (cached) {
		return cached;
	}

		try {
			const filter = {
				kinds: [KIND_PROFILE],
				authors: [pubkey],
				limit: 1
			};

			console.log('Fetching profile for:', pubkey);

		const event = await fetchFirstEvent(PROFILE_RELAYS, filter);
		
		if (!event) {
			console.log('No profile found for:', pubkey);
			return null;
		}
						
						let content = {};
						try {
							content = JSON.parse(event.content);
						} catch (e) {
							console.warn('Failed to parse profile content for', pubkey);
						}

		const profile = {
							pubkey: event.pubkey,
							name: content.name || content.display_name || '',
							displayName: content.display_name || content.name || '',
							picture: content.picture || '',
							about: content.about || '',
							nip05: content.nip05 || '',
			lud16: content.lud16 || '',
			lud06: content.lud06 || '',
							createdAt: event.created_at
						};

						// Cache in IndexedDB
		cacheEvent(KIND_PROFILE, pubkey, profile);
		
		// Add to EventStore for reactive access
		addEventToStore(event);

		return profile;
		} catch (err) {
			console.error('Error in fetchProfile:', err);
		return null;
		}
}

/**
 * Fetches profile information for a given pubkey, bypassing cache
 * @param {string} pubkey - The user's public key
 * @returns {Promise<Object|null>} Profile object or null if not found
 */
export async function fetchProfileFresh(pubkey) {
		try {
			const filter = {
				kinds: [KIND_PROFILE],
				authors: [pubkey],
				limit: 1
			};

			console.log('Fetching profile fresh (no cache) for:', pubkey);

		const event = await fetchFirstEvent(PROFILE_RELAYS, filter);
		
		if (!event) {
			console.log('No profile found for:', pubkey);
			return null;
		}
						
						let content = {};
						try {
							content = JSON.parse(event.content);
						} catch (e) {
							console.warn('Failed to parse profile content for', pubkey);
						}

		const profile = {
							pubkey: event.pubkey,
							name: content.name || content.display_name || '',
							displayName: content.display_name || content.name || '',
							picture: content.picture || '',
							about: content.about || '',
							nip05: content.nip05 || '',
			lud16: content.lud16 || '',
			lud06: content.lud06 || '',
							createdAt: event.created_at
						};

						// Update cache with fresh data
		cacheEvent(KIND_PROFILE, pubkey, profile);
		addEventToStore(event);

		return profile;
		} catch (err) {
			console.error('Error in fetchProfileFresh:', err);
		return null;
		}
}

// ============================================================================
// NIP-19 Encoding/Decoding
// ============================================================================

/**
 * Converts a hex pubkey to npub format
 * @param {string} pubkey - Hex public key
 * @returns {string} npub encoded public key
 */
export function pubkeyToNpub(pubkey) {
	try {
		return nip19.npubEncode(pubkey);
	} catch (err) {
		console.warn('Failed to encode pubkey to npub:', err);
		return pubkey;
	}
}

/**
 * Generates an app URL slug using naddr encoding
 * @param {string} pubkey - Hex public key
 * @param {string} dTag - App d-tag identifier
 * @returns {string} URL slug as naddr
 */
export function getAppSlug(pubkey, dTag) {
	try {
		return nip19.naddrEncode({
			kind: KIND_APP,
			pubkey: pubkey,
			identifier: dTag
		});
	} catch (err) {
		console.warn('Failed to encode naddr:', err);
		const npub = pubkeyToNpub(pubkey);
		return `${npub}-${dTag}`;
	}
}

/**
 * Parses an app URL slug to extract pubkey and d-tag
 * @param {string} slug - URL slug (naddr format or legacy npub-appid format)
 * @returns {Object} Object with pubkey and dTag properties
 */
export function parseAppSlug(slug) {
	// Try to decode as naddr first
	if (slug.startsWith('naddr1')) {
		try {
			const decoded = nip19.decode(slug);
			if (decoded.type === 'naddr' && decoded.data.kind === KIND_APP) {
				return {
					pubkey: decoded.data.pubkey,
					dTag: decoded.data.identifier
				};
			}
		} catch (err) {
			console.warn('Failed to decode naddr, trying legacy format:', err);
		}
	}
	
	// Fallback to legacy npub-appid format
	const npubLength = 63;
	
	if (slug.length < npubLength + 2) {
		throw new Error('Invalid app URL format: too short');
	}
	
	if (!slug.startsWith('npub1')) {
		throw new Error('Invalid app URL format: must start with npub or naddr');
	}

	const npub = slug.substring(0, npubLength);
	const dTag = slug.substring(npubLength + 1);

	let pubkey;
	try {
		const decoded = nip19.decode(npub);
		if (decoded.type !== 'npub') {
			throw new Error('Invalid npub format');
		}
		pubkey = decoded.data;
	} catch (err) {
		throw new Error('Failed to decode npub: ' + err.message);
	}

	return { pubkey, dTag };
}

// ============================================================================
// Markdown Rendering
// ============================================================================

/**
 * Renders markdown content to HTML
 * @param {string} markdown - Markdown content
 * @returns {string} HTML content
 */
export function renderMarkdown(markdown) {
    if (!markdown) return '';

    try {
        const text = String(markdown).replace(/\r\n?/g, '\n');
        const lines = text.split('\n');
        const htmlParts = [];

        let inCodeBlock = false;
        let codeFenceLang = '';
        let inUL = false;
        let inOL = false;
        let paraBuffer = [];

        function flushParagraph() {
            if (paraBuffer.length > 0) {
                const content = paraBuffer.join(' ').trim();
                if (content.length > 0) {
                    htmlParts.push(`<p>${applyInlineMarkdown(content)}</p>`);
                }
                paraBuffer = [];
            }
        }

        function closeLists() {
            if (inUL) { htmlParts.push('</ul>'); inUL = false; }
            if (inOL) { htmlParts.push('</ol>'); inOL = false; }
        }

        function applyInlineMarkdown(s) {
			// Fix existing <a> tags without target="_blank"
            s = s.replace(/<a\s+href=["']([^"']+)["'](?![^>]*target=)([^>]*)>/gi, '<a href="$1" target="_blank" rel="noopener noreferrer"$2>');
            // Links [text](url)
            s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
			// Plain URLs
            s = s.replace(/(^|[^"'>])(https?:\/\/[^\s<>"'\)]+)/g, function(match, prefix, url) {
                if (prefix === '=' || prefix === '/') return match;
                return prefix + '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
            });
            // Bold **text**
            s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            // Italic *text*
            s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
            // Inline code `code`
            s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
            return s;
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Fenced code blocks
            const fenceMatch = line.match(/^```\s*([\w-]*)\s*$/);
            if (fenceMatch) {
                if (!inCodeBlock) {
                    flushParagraph();
                    closeLists();
                    inCodeBlock = true;
                    codeFenceLang = fenceMatch[1] || '';
                    htmlParts.push(`<pre><code${codeFenceLang ? ` class="language-${codeFenceLang}"` : ''}>`);
                } else {
                    inCodeBlock = false;
                    codeFenceLang = '';
                    htmlParts.push('</code></pre>');
                }
                continue;
            }

            if (inCodeBlock) {
                const escaped = line
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
                htmlParts.push(`${escaped}\n`);
                continue;
            }

			// Blank line
            if (/^\s*$/.test(line)) {
                flushParagraph();
                closeLists();
                continue;
            }

            // Headings
            const heading = line.match(/^(#{1,6})\s+(.*)$/);
            if (heading) {
                flushParagraph();
                closeLists();
                const level = heading[1].length;
                const content = applyInlineMarkdown(heading[2].trim());
                htmlParts.push(`<h${level}>${content}</h${level}>`);
                continue;
            }

            // Ordered list
            const olMatch = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
            if (olMatch) {
                flushParagraph();
                if (inUL) { htmlParts.push('</ul>'); inUL = false; }
                if (!inOL) { htmlParts.push('<ol>'); inOL = true; }
                htmlParts.push(`<li>${applyInlineMarkdown(olMatch[2].trim())}</li>`);
                continue;
            }

            // Unordered list
            const ulMatch = line.match(/^\s*[-*+]\s+(.*)$/);
            if (ulMatch) {
                flushParagraph();
                if (inOL) { htmlParts.push('</ol>'); inOL = false; }
                if (!inUL) { htmlParts.push('<ul>'); inUL = true; }
                htmlParts.push(`<li>${applyInlineMarkdown(ulMatch[1].trim())}</li>`);
                continue;
            }

            // Default: part of a paragraph
            paraBuffer.push(line.trim());
        }

		// Flush remaining structures
        flushParagraph();
        closeLists();
        if (inCodeBlock) {
            htmlParts.push('</code></pre>');
        }

        return htmlParts.join('');
    } catch (err) {
        console.warn('Failed to parse markdown:', err);
        return String(markdown).replace(/\n/g, '<br>');
    }
}

// ============================================================================
// Date Formatting
// ============================================================================

import { formatTimestampSeconds } from '$lib/date.js';

export function formatDate(timestamp, options = {}) {
	const seconds = typeof timestamp === 'number' && timestamp > 1e12
		? Math.floor(timestamp / 1000)
		: timestamp;
	const month = options.month === 'long' ? 'long' : options.month === 'short' ? 'short' : 'short';
	return formatTimestampSeconds(seconds, { month });
}

// ============================================================================
// App Fetching
// ============================================================================

/**
 * Fetches apps from the relay with optional filters
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of app objects
 */
export async function fetchApps({ limit = 12, authors, dTags, until, search } = {}) {
		try {
            const filter = {
			kinds: [KIND_APP],
				limit
			};

		if (authors) filter.authors = authors;
		if (dTags) filter['#d'] = dTags;
		if (until) filter.until = until;
            if (search && typeof search === 'string' && search.trim().length > 0) {
                filter.search = search.trim();
            }
            filter['#f'] = ['android-arm64-v8a'];

			console.log('Fetching apps with filter:', filter);

		const events = await fetchEvents([RELAY_URL], filter);
		const apps = events.map(parseAppEvent);
		
		// Add to store for reactive access
		addEventsToStore(events);
						
						// Sort by creation date (newest first)
		return apps.sort((a, b) => b.createdAt - a.createdAt);
		} catch (err) {
			console.error('Error in fetchApps:', err);
		return [];
		}
}

/**
 * Parses an App Stack event (kind 30267) into a structured object
 * @param {Object} event - Nostr event
 * @returns {Object} Parsed app stack object
 */
function parseAppStackEvent(event) {
	const tags = event.tags || [];
	
	// Get name from content (title is stored in content field)
	const name = event.content || null;
	
	// Get d-tag (identifier)
	const dTag = tags.find(t => t[0] === 'd');
	const identifier = dTag ? dTag[1] : null;
	
	// Get app references from 'a' tags (format: 32267:pubkey:identifier)
	const appRefs = tags
		.filter(t => t[0] === 'a' && t[1]?.startsWith('32267:'))
		.map(t => {
			const parts = t[1].split(':');
			return {
				kind: parseInt(parts[0]),
				pubkey: parts[1],
				identifier: parts[2]
			};
		});
	
	// Placeholder description for now
	const description = "A curated collection of apps for your needs.";
	
	return {
		id: event.id,
		pubkey: event.pubkey,
		identifier,
		name,
		description,
		appRefs,
		createdAt: event.created_at,
		event
	};
}

/**
 * Fetches App Stacks (kind 30267) from the relay
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of app stack objects with resolved apps
 */
export async function fetchAppStacks({ limit = 20, authors } = {}) {
	try {
		const filter = {
			kinds: [KIND_APP_STACK],
			limit
		};

		if (authors) filter.authors = authors;

		console.log('Fetching app stacks with filter:', filter);

		const events = await fetchEvents([RELAY_URL], filter);
		const stacks = events.map(parseAppStackEvent);
		
		// Add to store for reactive access
		addEventsToStore(events);
		
		// Sort by creation date (newest first)
		return stacks.sort((a, b) => b.createdAt - a.createdAt);
	} catch (err) {
		console.error('Error in fetchAppStacks:', err);
		return [];
	}
}

/**
 * Resolves app references in a stack to actual app objects
 * @param {Object} stack - App stack with appRefs
 * @param {Array} availableApps - Array of app objects to match against
 * @returns {Object} Stack with resolved apps array
 */
export function resolveStackApps(stack, availableApps) {
	const apps = stack.appRefs
		.map(ref => availableApps.find(app => 
			app.pubkey === ref.pubkey && app.dTag === ref.identifier
		))
		.filter(Boolean);
	
	return {
		...stack,
		apps
	};
}

/**
 * Fetches a specific app by pubkey and d-tag
 * @param {string} pubkey - The author's public key
 * @param {string} dTag - The app's d-tag identifier
 * @returns {Promise<Object|null>} App object or null if not found
 */
export async function fetchApp(pubkey, dTag) {
		try {
			const filter = {
			kinds: [KIND_APP],
				authors: [pubkey],
				'#d': [dTag]
			};

			console.log('Fetching app with filter:', filter);

		const event = await fetchFirstEvent([RELAY_URL], filter);
		
		if (!event) {
			return null;
		}

		const app = parseAppEvent(event);
		addEventToStore(event);
		
		return app;
		} catch (err) {
			console.error('Error in fetchApp:', err);
		return null;
		}
}

/**
 * Fetch an app by d-tag regardless of author
 * @param {string} dTag - The app's d-tag identifier
 * @returns {Promise<Object|null>} App object or null if not found
 */
export async function fetchAppByDTag(dTag) {
        try {
            const filter = {
			kinds: [KIND_APP],
                '#d': [dTag],
                limit: 1
            };

		const event = await fetchFirstEvent([RELAY_URL], filter);
		
		if (!event) {
			return null;
		}

		const app = parseAppEvent(event);
		addEventToStore(event);
		
		return app;
        } catch (err) {
            console.error('Error in fetchAppByDTag:', err);
		return null;
        }
}

/**
 * Parses a nostr event into an app object
 * @param {Object} event - Raw nostr event
 * @returns {Object} Parsed app object
 */
export function parseAppEvent(event) {
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
		console.warn('Failed to parse content for event', event.id);
		content = { description: event.content };
	}

	const icon = tagMap.icon || content.icon || content.picture || '';
	const images = imageTags.length > 0 ? imageTags : (content.images || []);
	const description = content.description || content.about || content.summary || event.content || 'No description available';

	// Normalize license
	const rawLicense = content.license || tagMap.license || '';
	const license = (typeof rawLicense === 'string' && rawLicense.trim().toUpperCase() === 'NOASSERTION') ? '' : rawLicense;

	return {
		id: event.id,
		pubkey: event.pubkey,
		npub: pubkeyToNpub(event.pubkey),
		dTag: tagMap.d || '',
		name: content.name || tagMap.name || 'Unknown App',
		description: description,
		descriptionHtml: renderMarkdown(description),
		icon: icon,
		images: images,
		url: content.url || content.website || tagMap.url || '',
		downloadUrl: content.downloadUrl || content.download || tagMap.download || '',
		repository: content.repository || content.repo || content.source || tagMap.repository || '',
		createdAt: event.created_at,
		tags: event.tags,
		content: content,
		fullContent: event.content,
		fullEvent: event,
		category: content.category || tagMap.category || '',
		license: license,
		developer: content.developer || content.publisher || content.author || tagMap.developer || '',
		requirements: content.requirements || content.systemRequirements || '',
		changelog: content.changelog || content.releaseNotes || '',
		platform: content.platform || tagMap.platform || '',
		price: content.price || tagMap.price || '',
		rating: content.rating || tagMap.rating || '',
		downloads: content.downloads || tagMap.downloads || ''
	};
}

// ============================================================================
// Release & File Metadata
// ============================================================================

/**
 * Fetches the latest release (kind 30063) for an app
 * @param {Object} app - Parsed app object
 * @param {Object} options - Options
 * @returns {Promise<Object|null>} Parsed release object or null
 */
export async function fetchLatestReleaseForApp(app, { skipCache = false } = {}) {
    if (!app || !app.pubkey || !app.dTag) return null;

	// Check cache first
    if (!skipCache) {
        const cached = await getCachedRelease(app.pubkey, app.dTag);
        if (cached) {
            console.log('Using cached release for', app.dTag);
            return cached;
        }
    }

        try {
		const aValue = `32267:${app.pubkey}:${app.dTag}`;
            const filter = {
                kinds: [KIND_RELEASE],
                '#a': [aValue],
                authors: [app.pubkey],
                limit: 5
            };

		const events = await fetchEvents([RELAY_URL], filter);
		const releases = events.map(parseReleaseEvent);
                        releases.sort((a, b) => b.createdAt - a.createdAt);
		
                            const latestRelease = releases[0] || null;
		
                    if (latestRelease) {
                        cacheRelease(latestRelease, app.dTag);
			addEventsToStore(events);
                    }
		
		return latestRelease;
        } catch (err) {
            console.error('Error fetching latest release:', err);
		return null;
        }
}

/**
 * Parses a 30063 release event
 * @param {Object} event - Raw nostr event
 * @returns {Object} Parsed release object
 */
export function parseReleaseEvent(event) {
    const tagMap = {};
    const allATags = [];
    const allETags = [];
	
    for (const tag of event.tags || []) {
        if (Array.isArray(tag) && tag.length >= 2) {
            const [k, v] = tag;
            if (k === 'a') allATags.push(v);
            if (k === 'e') allETags.push(v);
            if (!tagMap[k]) tagMap[k] = v;
        }
    }

    const dTag = tagMap.d || '';
    const url = tagMap.url || '';
    const content = event.content || '';

    return {
        id: event.id,
        kind: event.kind,
        createdAt: event.created_at,
        pubkey: event.pubkey,
        npub: pubkeyToNpub(event.pubkey),
        dTag: dTag,
        aTags: allATags,
		eTags: allETags,
        url: url,
        notes: content,
        notesHtml: renderMarkdown(content),
        fullEvent: event
    };
}

/**
 * Gets a cached file metadata event by event ID
 * @param {string} eventId - The event ID
 * @returns {Promise<Object|null>}
 */
export async function getCachedFileMetadata(eventId) {
    return await getCachedEvent(KIND_FILE_METADATA, eventId);
}

/**
 * Caches a file metadata event
 * @param {Object} fileMeta - The file metadata to cache
 */
export function cacheFileMetadata(fileMeta) {
    if (fileMeta && fileMeta.id) {
        cacheEvent(KIND_FILE_METADATA, fileMeta.id, fileMeta);
    }
}

/**
 * Fetches file metadata events (kind 1063) by their event IDs
 * @param {string[]} eventIds - Array of event IDs
 * @returns {Promise<Array>}
 */
export async function fetchFileMetadata(eventIds) {
    if (!eventIds || eventIds.length === 0) return [];

	// Check cache first
    const results = [];
    const missingIds = [];
    
    for (const eventId of eventIds) {
        const cached = await getCachedFileMetadata(eventId);
        if (cached) {
            results.push(cached);
        } else {
            missingIds.push(eventId);
        }
    }
    
    if (missingIds.length === 0) {
        console.log('All file metadata found in cache');
        return results;
    }

        try {
            const filter = {
                kinds: [KIND_FILE_METADATA],
                ids: missingIds
            };

            console.log('Fetching file metadata with filter:', filter);

		const events = await fetchEvents([RELAY_URL], filter);
		
		for (const event of events) {
                        const parsed = parseFileMetadataEvent(event);
			results.push(parsed);
                        cacheFileMetadata(parsed);
		}
		
		addEventsToStore(events);
		
		return results;
        } catch (err) {
            console.error('Error in fetchFileMetadata:', err);
		return results;
        }
}

/**
 * Fetches the version for an app from its FileMetadata
 * @param {Object} app - The app object
 * @returns {Promise<string|null>}
 */
export async function fetchAppVersion(app) {
    if (!app || !app.pubkey || !app.dTag) return null;
    
    try {
        const release = await fetchLatestReleaseForApp(app);
        if (!release || !release.eTags || release.eTags.length === 0) {
            return null;
        }
        
        const fileMetadata = await fetchFileMetadata(release.eTags);
        if (!fileMetadata || fileMetadata.length === 0) {
            return null;
        }
        
        for (const f of fileMetadata) {
            if (f?.version && String(f.version).trim().length > 0) {
                return f.version;
            }
            if (f?.fullEvent?.tags) {
                const versionTag = f.fullEvent.tags.find(t => t[0] === 'version');
                if (versionTag && versionTag[1] && String(versionTag[1]).trim().length > 0) {
                    return versionTag[1];
                }
            }
        }
        
        return null;
    } catch (err) {
        console.warn('Error fetching app version:', err);
        return null;
    }
}

/**
 * Parses a file metadata event (kind 1063)
 * @param {Object} event - Raw nostr event
 * @returns {Object}
 */
export function parseFileMetadataEvent(event) {
    const tagMap = {};
    for (const tag of event.tags || []) {
        if (Array.isArray(tag) && tag.length >= 2) {
            const [k, v] = tag;
            if (!tagMap[k]) tagMap[k] = v;
        }
    }

    return {
        id: event.id,
        kind: event.kind,
        createdAt: event.created_at,
        pubkey: event.pubkey,
        npub: pubkeyToNpub(event.pubkey),
        url: tagMap.url || '',
        mimeType: tagMap.m || '',
        hash: tagMap.x || '',
        size: tagMap.size || '',
        version: tagMap.version || '',
        fullEvent: event
    };
}

// ============================================================================
// Zaps
// ============================================================================

/**
 * Fetches zap events for a specific app
 * @param {string} pubkey - The app publisher's public key
 * @param {string} appId - The app's d-tag identifier
 * @returns {Promise<Array>}
 */
export async function fetchAppZaps(pubkey, appId) {
	try {
		const aTagValue = `32267:${pubkey}:${appId}`;
		const filter = {
			kinds: [KIND_ZAP_RECEIPT],
			'#a': [aTagValue],
			limit: 100
		};

		console.log('Fetching zaps with filter:', filter);

		const events = await fetchEvents(SOCIAL_RELAYS, filter);
		const zapEvents = events.map(parseZapEvent);
		
		const uniqueZaps = removeDuplicateZaps(zapEvents);
		const sortedZaps = uniqueZaps.sort((a, b) => b.createdAt - a.createdAt);
		
		addEventsToStore(events);
		
		return sortedZaps;
	} catch (err) {
		console.error('Error in fetchAppZaps:', err);
		return [];
	}
}

/**
 * Parses a zap event into a usable object
 * @param {Object} event - Raw zap event
 * @returns {Object}
 */
export function parseZapEvent(event) {
	const tagMap = {};
	event.tags.forEach(tag => {
		if (tag.length >= 2) {
			const [key, value] = tag;
			if (!tagMap[key]) {
				tagMap[key] = value;
			}
		}
	});

	let amountSats = 0;
	const bolt11 = tagMap.bolt11;
	if (bolt11) {
		try {
			const amountMatch = bolt11.match(/lnbc(\d+)([munp]?)/i);
			if (amountMatch) {
				const value = parseInt(amountMatch[1]);
				const unit = amountMatch[2]?.toLowerCase() || '';
				
				switch (unit) {
					case 'm': amountSats = value * 100000; break;
					case 'u': amountSats = value * 100; break;
					case 'n': amountSats = Math.floor(value / 10); break;
					case 'p': amountSats = Math.floor(value / 10000); break;
					default: amountSats = value * 100000000; break;
				}
			}
		} catch (e) {
			console.warn('Failed to parse bolt11 amount:', e);
		}
	}

	let description = '';
	try {
		const descriptionTag = event.tags.find(tag => tag[0] === 'description');
		if (descriptionTag && descriptionTag[1]) {
			const descEvent = JSON.parse(descriptionTag[1]);
			description = descEvent.content || '';
		}
	} catch (e) {
		console.warn('Failed to parse zap description:', e);
	}

	return {
		id: event.id,
		pubkey: event.pubkey,
		npub: pubkeyToNpub(event.pubkey),
		createdAt: event.created_at,
		amountSats: amountSats,
		description: description,
		preimage: tagMap.preimage || '',
		bolt11: bolt11 || '',
		fullEvent: event
	};
}

function removeDuplicateZaps(zapEvents) {
	const seen = new Set();
	return zapEvents.filter(zap => {
		if (seen.has(zap.id)) {
			return false;
		}
		seen.add(zap.id);
		return true;
	});
}

/**
 * Formats satoshi amount to a human-readable string
 * @param {number} sats - Amount in satoshis
 * @returns {string}
 */
export function formatSats(sats) {
	if (sats >= 100000000) {
		return `${(sats / 100000000).toFixed(2)} BTC`;
	} else if (sats >= 1000000) {
		return `${(sats / 1000000).toFixed(1)}M sats`;
	} else if (sats >= 1000) {
		return `${(sats / 1000).toFixed(1)}K sats`;
	}
	return `${sats} sats`;
}

/**
 * Fetches zaps for app and file metadata events
 * @param {string} appEventId - The app event ID
 * @param {string} pubkey - The app publisher's public key
 * @param {string} appId - The app's d-tag identifier
 * @param {string[]} fileEventIds - Optional array of file metadata event IDs
 * @returns {Promise<Object>}
 */
export async function fetchAppAndFileZaps(appEventId, pubkey, appId, fileEventIds = []) {
        try {
            const aTagValue = `32267:${pubkey}:${appId}`;
            const allEventIds = [appEventId, ...fileEventIds].filter(Boolean);
            
            const filter = {
			kinds: [KIND_ZAP_RECEIPT],
                '#p': [pubkey],
                limit: 200
            };

            console.log('Fetching zaps with filter:', JSON.stringify(filter));

		const events = await fetchEvents(SOCIAL_RELAYS, filter);
		
		// Filter to only relevant zaps
		const relevantZaps = events.filter(event => {
			const hasMatchingATag = event.tags.some(t => t[0] === 'a' && t[1] === aTagValue);
			const hasMatchingETag = allEventIds.length > 0 && event.tags.some(t => t[0] === 'e' && allEventIds.includes(t[1]));
			return hasMatchingATag || hasMatchingETag;
		});

		const zapEvents = relevantZaps.map(parseZapEventWithSender);
                const uniqueZaps = removeDuplicateZaps(zapEvents);
                const sortedZaps = uniqueZaps.sort((a, b) => b.createdAt - a.createdAt);
                const totalSats = sortedZaps.reduce((sum, zap) => sum + zap.amountSats, 0);
                
                console.log('Zap fetch complete:', sortedZaps.length, 'unique zaps, total:', totalSats, 'sats');
                
                const result = {
                    zaps: sortedZaps,
                    totalSats: totalSats,
                    count: sortedZaps.length
                };

                cacheZaps(appEventId, pubkey, appId, result);
		addEventsToStore(events);
		
		return result;
        } catch (err) {
            console.error('Error in fetchAppAndFileZaps:', err);
		return { zaps: [], totalSats: 0, count: 0 };
        }
}

/**
 * Parses a zap event and extracts the sender pubkey
 * @param {Object} event - Raw zap event
 * @returns {Object}
 */
export function parseZapEventWithSender(event) {
    const baseZap = parseZapEvent(event);
    
    let senderPubkey = '';
    try {
        const descriptionTag = event.tags.find(tag => tag[0] === 'description');
        if (descriptionTag && descriptionTag[1]) {
            const descEvent = JSON.parse(descriptionTag[1]);
            senderPubkey = descEvent.pubkey || '';
        }
    } catch (e) {
        console.warn('Failed to parse zap sender:', e);
    }
    
    return {
        ...baseZap,
        senderPubkey: senderPubkey,
        senderNpub: senderPubkey ? pubkeyToNpub(senderPubkey) : ''
    };
}

// ============================================================================
// Comments
// ============================================================================

/**
 * Fetch comments (kind 1111) for an app
 * @param {string} pubkey - App publisher pubkey
 * @param {string} appId - App d-tag identifier
 * @param {Object} options - Additional options
 * @returns {Promise<Array>}
 */
export async function fetchAppComments(pubkey, appId, { limit = 200 } = {}) {
	console.log('[Comments] fetchAppComments called:', { pubkey, appId, limit });
	
	if (!pubkey || !appId) {
		console.warn('[Comments] Missing pubkey or appId');
		return [];
	}

	try {
            const appAddress = `32267:${pubkey}:${appId}`;

		// Try with uppercase A tag first (NIP-1111 root reference)
		const filterA = {
                kinds: [KIND_COMMENT],
                '#A': [appAddress],
                limit
            };

		console.log('[Comments] Fetching with #A filter:', filterA, 'from relays:', COMMENT_RELAYS);
		let events = await fetchEvents(COMMENT_RELAYS, filterA, { timeout: 15000 });
		console.log('[Comments] Raw events from #A filter:', events.length);
		
		// If no results, try lowercase a tag as fallback (older comments or different relay support)
		if (events.length === 0) {
			const filterLowerA = {
				kinds: [KIND_COMMENT],
				'#a': [appAddress],
				limit
			};
			console.log('[Comments] No results from #A, trying #a filter:', filterLowerA);
			events = await fetchEvents(COMMENT_RELAYS, filterLowerA, { timeout: 15000 });
			console.log('[Comments] Raw events from #a filter:', events.length);
		}
		
		const comments = events.map(parseCommentEvent);
		
		// Deduplicate by event id
                const uniqueById = new Map();
		for (const comment of comments) {
			if (!uniqueById.has(comment.id)) {
				uniqueById.set(comment.id, comment);
			}
		}

		const finalComments = Array.from(uniqueById.values()).sort(
                    (a, b) => b.createdAt - a.createdAt
                );

		console.log('[Comments] Final comments after dedup:', finalComments.length);
		
		cacheComments(pubkey, appId, finalComments);
		addEventsToStore(events);

		return finalComments;
        } catch (err) {
		console.error('[Comments] Error fetching comments:', err);
		return [];
        }
}

/**
 * Publish a comment (kind 1111) for an app
 * @param {Object} app - App object
 * @param {string} content - Comment text
 * @param {Object} signer - NIP-07 signer
 * @param {string} version - Version string
 * @param {Object} parentComment - Optional parent comment for replies
 * @returns {Promise<Object>}
 */
export async function publishAppComment(app, content, signer, version, parentComment = null) {
    console.log('[Comments] publishAppComment called:', { appDTag: app?.dTag, version, hasParent: !!parentComment });
    
    const nostrSigner = signer || (typeof window !== 'undefined' ? window.nostr : null);
    if (!nostrSigner?.signEvent) {
        throw new Error('Nostr extension not available. Please install/enable it.');
    }

    const trimmed = (content || '').trim();
    if (!trimmed) {
        throw new Error('Comment cannot be empty.');
    }

    if (!app?.pubkey || !app?.dTag) {
        throw new Error('Missing app information for comment.');
    }

    if (!version) {
        throw new Error('Version is required as thread key.');
    }

    const appAddress = `32267:${app.pubkey}:${app.dTag}`;
    const rootKind = String(KIND_APP);
    const tags = [
        ['A', appAddress, RELAY_URL],
        ['K', rootKind],
        ['P', app.pubkey, RELAY_URL],
        ['v', version]
    ];

    if (parentComment?.id && parentComment?.pubkey) {
        tags.push(['e', parentComment.id, RELAY_URL, parentComment.pubkey]);
        tags.push(['k', String(KIND_COMMENT)]);
        tags.push(['p', parentComment.pubkey, RELAY_URL]);
    } else {
        tags.push(['a', appAddress, RELAY_URL, app.pubkey]);
        if (app.id) {
            tags.push(['e', app.id, RELAY_URL, app.pubkey]);
        }
        tags.push(['k', rootKind]);
        tags.push(['p', app.pubkey, RELAY_URL]);
    }
    
    console.log('[Comments] Comment tags:', tags);

    const unsignedEvent = {
        kind: KIND_COMMENT,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content: trimmed
    };

    console.log('[Comments] Signing event...');
    const signedEvent = await nostrSigner.signEvent(unsignedEvent);
    console.log('[Comments] Event signed:', signedEvent.id);
    
    console.log('[Comments] Publishing to relays:', COMMENT_RELAYS);
    const result = await publishEvent(signedEvent, COMMENT_RELAYS);
    console.log('[Comments] Publish result:', result);
    
    return signedEvent;
}

/**
 * Parses a comment event (kind 1111)
 * @param {Object} event - Raw nostr event
 * @returns {Object}
 */
export function parseCommentEvent(event) {
    const tagMap = {};
    for (const tag of event.tags || []) {
        if (Array.isArray(tag) && tag.length >= 2) {
            const [k, v] = tag;
            if (!tagMap[k]) tagMap[k] = v;
        }
    }

    return {
        id: event.id,
        pubkey: event.pubkey,
        npub: pubkeyToNpub(event.pubkey),
        createdAt: event.created_at,
        content: event.content || '',
        contentHtml: renderMarkdown(event.content || ''),
        appAddress: tagMap.A || '',
        appKind: tagMap.K || '',
        appPubkey: tagMap.P || '',
        version: tagMap.v || '',
        parentAddress: tagMap.a || '',
        parentId: tagMap.e || null,
        parentKind: tagMap.k || null,
        parentPubkey: tagMap.p || null,
        isReply: String(tagMap.k || '') === String(KIND_COMMENT),
        fullEvent: event
    };
}

// ============================================================================
// Publishing
// ============================================================================

/**
 * Publish a signed event to relays
 * @param {Object} event - Signed nostr event
 * @param {string[]} relays - Relays to publish to
 * @returns {Promise<Object>}
 */
export async function publishToRelays(event, relays = COMMENT_RELAYS) {
	return publishEvent(event, relays);
}

// ============================================================================
// NIP-57 Zapping
// ============================================================================

/**
 * Parses a Lightning Address (lud16) to get the LNURL endpoint
 * @param {string} lud16 - Lightning address
 * @returns {string|null}
 */
function parseLud16ToUrl(lud16) {
    if (!lud16 || typeof lud16 !== 'string') return null;
    const [name, domain] = lud16.split('@');
    if (!name || !domain) return null;
    return `https://${domain}/.well-known/lnurlp/${name}`;
}

/**
 * Decodes a bech32-encoded LNURL (lud06)
 * @param {string} lud06 - Bech32-encoded LNURL
 * @returns {string|null}
 */
function decodeLud06(lud06) {
    if (!lud06 || typeof lud06 !== 'string') return null;
	const normalized = lud06.trim().toLowerCase();
	if (!normalized.startsWith('lnurl1')) return null;
    
    try {
		const { words } = bech32.decode(normalized, 2000);
		const data = bech32.fromWords(words);
		const url = new TextDecoder().decode(Uint8Array.from(data));
		
		if (!url.startsWith('http')) {
			console.warn('Decoded lud06 is not a valid http(s) URL:', url);
			return null;
		}

		return url;
    } catch (err) {
        console.warn('Failed to decode lud06:', err);
        return null;
    }
}

/**
 * Gets the zap endpoint URL for a given pubkey
 * @param {string} pubkey - The recipient's public key
 * @returns {Promise<Object|null>}
 */
export async function getZapEndpoint(pubkey) {
    if (!pubkey) return null;

    try {
        const profile = await fetchProfileFresh(pubkey);
        if (!profile) {
            console.warn('No profile found for pubkey:', pubkey);
            return null;
        }

        console.log('Profile for zap:', { pubkey, lud16: profile.lud16, lud06: profile.lud06 });

        let lnurlEndpoint = null;
        if (profile.lud16) {
            lnurlEndpoint = parseLud16ToUrl(profile.lud16);
        } else if (profile.lud06) {
            lnurlEndpoint = decodeLud06(profile.lud06);
        }

        if (!lnurlEndpoint) {
            console.warn('No lightning address found in profile:', profile);
            return null;
        }

        const response = await fetch(lnurlEndpoint);
        if (!response.ok) {
            throw new Error(`LNURL fetch failed: ${response.status}`);
        }

        const lnurlData = await response.json();
        
        if (!lnurlData.allowsNostr || !lnurlData.nostrPubkey) {
            console.warn('LNURL endpoint does not support Nostr zaps');
            return null;
        }

        return {
            callback: lnurlData.callback,
			minSendable: lnurlData.minSendable || 1000,
			maxSendable: lnurlData.maxSendable || 100000000000,
            nostrPubkey: lnurlData.nostrPubkey,
            allowsNostr: lnurlData.allowsNostr,
            lnurlEndpoint
        };
    } catch (err) {
        console.error('Error getting zap endpoint:', err);
        return null;
    }
}

/**
 * Creates and signs a zap request event (kind 9734)
 * @param {Object} app - The app object
 * @param {number} amountSats - Amount in satoshis
 * @param {string} comment - Optional zap comment
 * @param {Object} signer - NIP-07 signer
 * @returns {Promise<Object>}
 */
export async function createZapRequest(app, amountSats, comment = '', signer = null) {
    const nostrSigner = signer || (typeof window !== 'undefined' ? window.nostr : null);
    if (!nostrSigner?.signEvent) {
        throw new Error('Nostr extension not available. Please install/enable it.');
    }

    if (!app?.pubkey || !app?.dTag) {
        throw new Error('Missing app information for zap request.');
    }

    if (!amountSats || amountSats <= 0) {
        throw new Error('Invalid zap amount.');
    }

    const amountMillisats = amountSats * 1000;
    const appAddress = `32267:${app.pubkey}:${app.dTag}`;

    const tags = [
        ['p', app.pubkey],
        ['a', appAddress],
        ['amount', String(amountMillisats)],
        ['relays', ...SOCIAL_RELAYS]
    ];

    if (app.id) {
        tags.push(['e', app.id]);
    }

    const unsignedEvent = {
        kind: KIND_ZAP_REQUEST,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content: comment.trim()
    };

    const signedEvent = await nostrSigner.signEvent(unsignedEvent);
    return signedEvent;
}

/**
 * Requests a Lightning invoice from the LNURL callback
 * @param {string} callback - The LNURL callback URL
 * @param {Object} zapRequest - Signed zap request event
 * @param {number} amountSats - Amount in satoshis
 * @returns {Promise<Object>}
 */
export async function requestZapInvoice(callback, zapRequest, amountSats) {
    if (!callback || !zapRequest) {
        throw new Error('Missing callback or zap request.');
    }

    const amountMillisats = amountSats * 1000;
    const zapRequestJson = JSON.stringify(zapRequest);

    const url = new URL(callback);
    url.searchParams.set('amount', String(amountMillisats));
    url.searchParams.set('nostr', zapRequestJson);

    try {
        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`Invoice request failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status === 'ERROR') {
            throw new Error(data.reason || 'Failed to get invoice');
        }

        if (!data.pr) {
            throw new Error('No invoice returned from LNURL endpoint');
        }

        return {
            invoice: data.pr,
            successAction: data.successAction,
            routes: data.routes
        };
    } catch (err) {
        console.error('Error requesting zap invoice:', err);
        throw err;
    }
}

/**
 * Full zap flow: get endpoint, create request, get invoice
 * @param {Object} app - The app to zap
 * @param {number} amountSats - Amount in satoshis
 * @param {string} comment - Optional comment
 * @param {Object} signer - NIP-07 signer
 * @returns {Promise<Object>}
 */
export async function createZap(app, amountSats, comment = '', signer = null) {
    const endpoint = await getZapEndpoint(app.pubkey);
    if (!endpoint) {
        throw new Error('This publisher has not set up a Lightning address for receiving zaps.');
    }

    const amountMillisats = amountSats * 1000;
    if (amountMillisats < endpoint.minSendable) {
        throw new Error(`Minimum zap amount is ${Math.ceil(endpoint.minSendable / 1000)} sats.`);
    }
    if (amountMillisats > endpoint.maxSendable) {
        throw new Error(`Maximum zap amount is ${Math.floor(endpoint.maxSendable / 1000)} sats.`);
    }

    const zapRequest = await createZapRequest(app, amountSats, comment, signer);
    const invoiceData = await requestZapInvoice(endpoint.callback, zapRequest, amountSats);

    return {
        invoice: invoiceData.invoice,
        zapRequest,
        endpoint,
        amountSats,
        successAction: invoiceData.successAction
    };
}

/**
 * Subscribe to zap receipts (kind 9735) for a specific recipient
 * @param {string} recipientPubkey - The pubkey receiving the zap
 * @param {string} zapRequestId - The ID of our zap request event
 * @param {Function} onReceipt - Callback when receipt is received
 * @param {Object} options - Extra matching hints
 * @returns {Function} Unsubscribe function
 */
export function subscribeToZapReceipt(recipientPubkey, zapRequestId, onReceipt, options = {}) {
    let foundReceipt = false;
    const { invoice, appAddress, appEventId } = options;
    
    const zapRelays = [
        ...SOCIAL_RELAYS,
        RELAY_URL,
        'wss://nos.lol',
        'wss://relay.nostr.band',
        'wss://nostr.wine'
    ];
    const allRelays = [...new Set(zapRelays)];
    
	const since = Math.floor(Date.now() / 1000) - 300;
    
    const filters = [
		{ kinds: [KIND_ZAP_RECEIPT], '#p': [recipientPubkey], since },
		{ kinds: [KIND_ZAP_RECEIPT], '#P': [recipientPubkey], since }
    ];

    console.log('=== ZAP RECEIPT SUBSCRIPTION ===');
    console.log('Relays:', allRelays);
    console.log('Recipient pubkey:', recipientPubkey);
    console.log('Zap request ID to match:', zapRequestId);

	const unsubscribe = subscribeToMany(allRelays, filters, (event) => {
		if (foundReceipt) return;
                
                console.log('=== RECEIVED ZAP RECEIPT ===');
                console.log('Event ID:', event.id);
                
                const finalizeMatch = () => {
                    console.log('*** MATCHING ZAP RECEIPT FOUND! ***');
                    foundReceipt = true;
                    const parsedZap = parseZapEventWithSender(event);
                    onReceipt(parsedZap);
                };
                
		// Primary match: description tag contains zap request JSON with matching id
                const descriptionTag = event.tags.find(t => t[0] === 'description');
                if (descriptionTag && descriptionTag[1]) {
                    try {
                        const zapRequest = JSON.parse(descriptionTag[1]);
                        if (zapRequest.id === zapRequestId) {
                            finalizeMatch();
                            return;
                        }
                    } catch (e) {
                        console.log('Failed to parse description tag:', e);
                    }
                }
                
		// Fallback: bolt11 tag matches
                if (invoice) {
                    const bolt11Tag = event.tags.find(t => t[0] === 'bolt11');
                    if (bolt11Tag && bolt11Tag[1] && bolt11Tag[1].toLowerCase() === invoice.toLowerCase()) {
                        finalizeMatch();
                        return;
                    }
                }
                
		// Fallback: a-tag matches
                if (appAddress) {
                    const aTag = event.tags.find(t => t[0] === 'a' && t[1] === appAddress);
                    if (aTag) {
                        finalizeMatch();
                        return;
                    }
                }
                
		// Fallback: e-tag matches
                if (appEventId) {
                    const eTag = event.tags.find(t => t[0] === 'e' && t[1] === appEventId);
                    if (eTag) {
                        finalizeMatch();
                        return;
                    }
                }
	});

	return unsubscribe;
}

// ============================================================================
// Cleanup
// ============================================================================

import { cleanup as applesauceCleanup } from './applesauce.js';

/**
 * Closes the global pool and cleans up connections
 */
export function closePool() {
	applesauceCleanup();
}
