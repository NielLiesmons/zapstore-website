/**
 * Profile Search Service
 * 
 * Provides profile search functionality based on the logged-in user's:
 * - Contact list (kind 3)
 * - Follow sets (kind 30000) - e.g., "friends", "work", custom lists
 */

import { fetchProfile, fetchProfilesBatch } from '$lib/nostr.js';
import { fetchEvents, fetchFirstEvent, PROFILE_RELAYS, SOCIAL_RELAYS } from '$lib/applesauce.js';

const KIND_CONTACT_LIST = 3;
const KIND_FOLLOW_SET = 30000;

/**
 * Creates a profile search service for a given user
 * @param {string} userPubkey - The logged-in user's pubkey
 * @returns {Object} Profile search service
 */
export function createProfileSearch(userPubkey) {
  let allPubkeys = new Set();
  let profiles = new Map();
  let isInitialized = false;
  let initPromise = null;

  /**
   * Initialize the service by loading follows and their profiles
   */
  async function init() {
    if (isInitialized) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      try {
        console.log('[ProfileSearch] Initializing for user:', userPubkey);
        
        // Fetch in parallel: contact list (kind 3) and follow sets (kind 30000)
        const [contactListEvent, followSetEvents] = await Promise.all([
          fetchFirstEvent(SOCIAL_RELAYS, {
            kinds: [KIND_CONTACT_LIST],
            authors: [userPubkey],
            limit: 1
          }),
          fetchEvents(SOCIAL_RELAYS, {
            kinds: [KIND_FOLLOW_SET],
            authors: [userPubkey],
            limit: 50
          }, { timeout: 5000 })
        ]);

        // Extract pubkeys from contact list (kind 3)
        if (contactListEvent) {
          const contactPubkeys = contactListEvent.tags
            .filter(tag => tag[0] === 'p' && tag[1] && tag[1].length === 64)
            .map(tag => tag[1]);
          
          contactPubkeys.forEach(pk => allPubkeys.add(pk));
          console.log('[ProfileSearch] Found', contactPubkeys.length, 'contacts from kind 3');
        }

        // Extract pubkeys from follow sets (kind 30000)
        if (followSetEvents && followSetEvents.length > 0) {
          console.log('[ProfileSearch] Found', followSetEvents.length, 'follow sets (kind 30000)');
          
          for (const event of followSetEvents) {
            const setName = event.tags.find(t => t[0] === 'd')?.[1] || 'unnamed';
            const setPubkeys = event.tags
              .filter(tag => tag[0] === 'p' && tag[1] && tag[1].length === 64)
              .map(tag => tag[1]);
            
            setPubkeys.forEach(pk => allPubkeys.add(pk));
            console.log(`[ProfileSearch] Follow set "${setName}": ${setPubkeys.length} profiles`);
          }
        }

        console.log('[ProfileSearch] Total unique pubkeys:', allPubkeys.size);

        // Fetch profiles in batches
        const pubkeyArray = Array.from(allPubkeys);
        if (pubkeyArray.length > 0) {
          const batchSize = 100;
          const batches = [];
          
          for (let i = 0; i < pubkeyArray.length; i += batchSize) {
            batches.push(pubkeyArray.slice(i, i + batchSize));
          }

          // Fetch first batch immediately for fast results
          if (batches.length > 0) {
            const firstBatchProfiles = await fetchProfilesBatch(batches[0]);
            for (const [pubkey, profile] of Object.entries(firstBatchProfiles)) {
              if (profile) profiles.set(pubkey, profile);
            }
            console.log('[ProfileSearch] Loaded', profiles.size, 'profiles (first batch)');
          }

          // Fetch remaining batches in background
          if (batches.length > 1) {
            Promise.all(batches.slice(1).map(async (batch) => {
              const batchProfiles = await fetchProfilesBatch(batch);
              for (const [pubkey, profile] of Object.entries(batchProfiles)) {
                if (profile) profiles.set(pubkey, profile);
              }
            })).then(() => {
              console.log('[ProfileSearch] Background fetch complete, total:', profiles.size);
            }).catch(err => {
              console.warn('[ProfileSearch] Background profile fetch error:', err);
            });
          }
        }

        isInitialized = true;
      } catch (err) {
        console.error('[ProfileSearch] Init error:', err);
        isInitialized = true; // Mark as initialized even on error to prevent retries
      }
    })();

    return initPromise;
  }

  /**
   * Search profiles by query string
   * @param {string} query - Search query
   * @returns {Promise<Array>} Matching profiles
   */
  async function search(query) {
    // Ensure initialized
    await init();

    // If no query, return first few profiles
    if (!query || query.trim().length === 0) {
      const results = [];
      let count = 0;
      for (const [pubkey, profile] of profiles) {
        if (count >= 10) break;
        results.push(formatProfile(pubkey, profile));
        count++;
      }
      return results;
    }

    const normalizedQuery = query.toLowerCase().trim();

    // Search through profiles
    const matches = [];
    
    for (const [pubkey, profile] of profiles) {
      if (!profile) continue;
      
      // Check if query matches name, displayName, nip05, or pubkey
      const name = (profile.name || '').toLowerCase();
      const displayName = (profile.displayName || '').toLowerCase();
      const nip05 = (profile.nip05 || '').toLowerCase();
      const pubkeyLower = pubkey.toLowerCase();
      
      if (
        name.includes(normalizedQuery) ||
        displayName.includes(normalizedQuery) ||
        nip05.includes(normalizedQuery) ||
        pubkeyLower.startsWith(normalizedQuery)
      ) {
        // Calculate relevance score
        let score = 0;
        if (name.startsWith(normalizedQuery)) score += 100;
        else if (name.includes(normalizedQuery)) score += 50;
        if (displayName.startsWith(normalizedQuery)) score += 100;
        else if (displayName.includes(normalizedQuery)) score += 50;
        if (nip05.startsWith(normalizedQuery)) score += 80;
        else if (nip05.includes(normalizedQuery)) score += 30;
        if (pubkeyLower.startsWith(normalizedQuery)) score += 20;
        
        matches.push({
          pubkey,
          profile,
          score
        });
      }
    }

    // Sort by relevance score
    matches.sort((a, b) => b.score - a.score);

    // Return top results
    return matches.slice(0, 10).map(m => formatProfile(m.pubkey, m.profile));
  }

  /**
   * Format a profile for the search results
   * @param {string} pubkey 
   * @param {Object} profile 
   * @returns {Object}
   */
  function formatProfile(pubkey, profile) {
    return {
      pubkey,
      name: profile?.name || '',
      displayName: profile?.displayName || profile?.name || '',
      picture: profile?.picture || '',
      nip05: profile?.nip05 || ''
    };
  }

  /**
   * Get the number of loaded profiles
   * @returns {number}
   */
  function getProfileCount() {
    return profiles.size;
  }

  /**
   * Get the number of unique pubkeys
   * @returns {number}
   */
  function getPubkeyCount() {
    return allPubkeys.size;
  }

  /**
   * Check if a pubkey is in the lists
   * @param {string} pubkey 
   * @returns {boolean}
   */
  function isInLists(pubkey) {
    return allPubkeys.has(pubkey);
  }

  /**
   * Add a profile to the search index (useful for profiles seen in context)
   * @param {string} pubkey 
   * @param {Object} profile 
   */
  function addProfile(pubkey, profile) {
    if (pubkey && profile) {
      allPubkeys.add(pubkey);
      profiles.set(pubkey, profile);
    }
  }

  return {
    init,
    search,
    getProfileCount,
    getPubkeyCount,
    isInLists,
    addProfile
  };
}

// Cache for profile search instances per user
const profileSearchCache = new Map();

/**
 * Gets or creates a profile search service for a user
 * @param {string} userPubkey - The logged-in user's pubkey
 * @returns {Object} Profile search service
 */
export function getProfileSearch(userPubkey) {
  if (!userPubkey) {
    // Return a no-op search service if no user is logged in
    return {
      init: async () => {},
      search: async () => [],
      getProfileCount: () => 0,
      getPubkeyCount: () => 0,
      isInLists: () => false,
      addProfile: () => {}
    };
  }

  if (!profileSearchCache.has(userPubkey)) {
    const service = createProfileSearch(userPubkey);
    profileSearchCache.set(userPubkey, service);
  }
  
  return profileSearchCache.get(userPubkey);
}

/**
 * Clear the profile search cache (call when user logs out)
 */
export function clearProfileSearchCache() {
  profileSearchCache.clear();
}

/**
 * Convenience function to create a search function for use with CommentInput
 * @param {string} userPubkey - The logged-in user's pubkey
 * @returns {Function} Search function
 */
export function createSearchProfilesFunction(userPubkey) {
  const service = getProfileSearch(userPubkey);
  
  return async (query) => {
    return service.search(query);
  };
}
