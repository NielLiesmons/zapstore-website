/**
 * Server-side Nostr operations using Applesauce SDK
 * 
 * This module re-exports the server-side Applesauce functionality
 * for backwards compatibility with existing imports.
 * 
 * @see https://hzrd149.github.io/applesauce/
 */

// Re-export all server-side functions from the Applesauce server module
export {
	fetchAppsServer,
	fetchAppServer,
	fetchAppByDTagServer,
	fetchProfileServer
} from './applesauce-server.js';
