/**
 * Authentication store using Applesauce signers
 * 
 * This module provides authentication state management using the
 * Applesauce signers package for NIP-07 browser extension support.
 * 
 * @see https://hzrd149.github.io/applesauce/
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { ExtensionSigner } from 'applesauce-signers/signers/extension-signer';
import { fetchProfile, pubkeyToNpub } from '$lib/nostr.js';

const STORAGE_KEY = 'zapstore_auth_pubkey';

// Initial state
const initialState = {
	pubkey: null,
	npub: null,
	profile: null,
	isConnected: false,
	isConnecting: false,
	error: null,
	signer: null // Applesauce signer instance
};

// Singleton ExtensionSigner instance
let extensionSigner = null;

/**
 * Gets or creates the NIP-07 extension signer instance
 * @returns {ExtensionSigner|null}
 */
function getExtensionSigner() {
	if (!browser) return null;
	
	if (!extensionSigner && typeof window.nostr !== 'undefined') {
		extensionSigner = new ExtensionSigner();
	}
	
	return extensionSigner;
}

// Create the store
function createAuthStore() {
	const { subscribe, set, update } = writable(initialState);

	// Try to restore session from localStorage on init
	if (browser) {
		const savedPubkey = localStorage.getItem(STORAGE_KEY);
		if (savedPubkey) {
			// Attempt to reconnect with saved pubkey
			reconnect(savedPubkey);
		}
	}

	async function reconnect(savedPubkey) {
		update(state => ({ ...state, isConnecting: true }));

		try {
			// Verify we still have NIP-07 extension available
			const signer = getExtensionSigner();
			if (!signer) {
				// Extension not available, clear saved state
				localStorage.removeItem(STORAGE_KEY);
				set(initialState);
				return;
			}

			// Try to get current pubkey from extension using Applesauce signer
			const currentPubkey = await signer.getPublicKey();
			
			// If pubkey matches saved one, restore session
			if (currentPubkey === savedPubkey) {
				const npub = pubkeyToNpub(currentPubkey);
				const profile = await fetchProfile(currentPubkey);
				
				update(state => ({
					...state,
					pubkey: currentPubkey,
					npub,
					profile,
					isConnected: true,
					isConnecting: false,
					error: null,
					signer
				}));
			} else {
				// Different account, update localStorage
				localStorage.setItem(STORAGE_KEY, currentPubkey);
				const npub = pubkeyToNpub(currentPubkey);
				const profile = await fetchProfile(currentPubkey);
				
				update(state => ({
					...state,
					pubkey: currentPubkey,
					npub,
					profile,
					isConnected: true,
					isConnecting: false,
					error: null,
					signer
				}));
			}
		} catch (err) {
			console.warn('Failed to reconnect:', err);
			localStorage.removeItem(STORAGE_KEY);
			set(initialState);
		}
	}

	async function connect() {
		if (!browser) return;

		update(state => ({ ...state, isConnecting: true, error: null }));

		try {
			// Get Applesauce extension signer
			const signer = getExtensionSigner();
			if (!signer) {
				throw new Error('No Nostr extension found. Please install Alby, nos2x, or similar.');
			}

			// Get public key from extension using Applesauce signer
			const pubkey = await signer.getPublicKey();
			const npub = pubkeyToNpub(pubkey);

			// Save to localStorage for session persistence
			localStorage.setItem(STORAGE_KEY, pubkey);

			// Fetch user profile
			const profile = await fetchProfile(pubkey);

			update(state => ({
				...state,
				pubkey,
				npub,
				profile,
				isConnected: true,
				isConnecting: false,
				error: null,
				signer
			}));

			return { pubkey, npub, profile, signer };
		} catch (err) {
			console.error('Failed to connect:', err);
			update(state => ({
				...state,
				isConnecting: false,
				error: err.message || 'Failed to connect to Nostr extension'
			}));
			throw err;
		}
	}

	function disconnect() {
		if (browser) {
			localStorage.removeItem(STORAGE_KEY);
		}
		extensionSigner = null;
		set(initialState);
	}

	// Check if NIP-07 extension is available
	function isExtensionAvailable() {
		return browser && typeof window.nostr !== 'undefined';
	}

	/**
	 * Sign an event using the connected signer
	 * @param {Object} event - Unsigned event
	 * @returns {Promise<Object>} Signed event
	 */
	async function signEvent(event) {
		const state = get({ subscribe });
		if (!state.signer) {
			throw new Error('Not connected. Please sign in first.');
		}
		return state.signer.signEvent(event);
	}

	/**
	 * Get the current signer instance
	 * @returns {ExtensionSigner|null}
	 */
	function getSigner() {
		const state = get({ subscribe });
		return state.signer;
	}

	return {
		subscribe,
		connect,
		disconnect,
		isExtensionAvailable,
		signEvent,
		getSigner,
		// Get current state synchronously
		getState: () => get({ subscribe })
	};
}

export const authStore = createAuthStore();

// Convenience exports
export const connect = () => authStore.connect();
export const disconnect = () => authStore.disconnect();
export const isExtensionAvailable = () => authStore.isExtensionAvailable();
export const signEvent = (event) => authStore.signEvent(event);
export const getSigner = () => authStore.getSigner();
