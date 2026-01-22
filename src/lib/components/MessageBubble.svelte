<script>
  import { onMount } from "svelte";
  import ProfilePic from "./ProfilePic.svelte";
  import Timestamp from "./Timestamp.svelte";
  import {
    hexToColor,
    stringToColor,
    getProfileTextColor,
    rgbToCssString,
  } from "$lib/utils/color.js";

  /**
   * MessageBubble - A chat-like message bubble component
   *
   * Displays a message with:
   * - Bottom-aligned profile picture on the left
   * - Chat bubble on the right with asymmetric border radius
   * - Profile name in profile color + timestamp row
   * - Message content below
   *
   * @example
   * <MessageBubble
   *   pictureUrl="https://..."
   *   name="Alice"
   *   pubkey="abc123..."
   *   timestamp={1234567890}
   *   profileUrl="/p/npub..."
   * >
   *   Message content here
   * </MessageBubble>
   */

  /** @type {string|null} - Profile picture URL */
  export let pictureUrl = null;

  /** @type {string} - Display name */
  export let name = "";

  /** @type {string|null} - Hex pubkey for color generation */
  export let pubkey = null;

  /** @type {number|string|Date|null} - Timestamp for the message */
  export let timestamp = null;

  /** @type {string} - URL to profile page */
  export let profileUrl = "";

  /** @type {string} - Additional CSS classes */
  export let className = "";

  /** @type {boolean} - Whether profile data is still loading */
  export let loading = false;

  // Dark mode detection
  let isDarkMode = true;

  onMount(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    isDarkMode = mediaQuery.matches;

    const handleChange = (e) => (isDarkMode = e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  });

  // Generate profile color from pubkey or name
  $: profileColor = getProfileColor(pubkey, name);

  /**
   * Get profile color based on pubkey or name
   * @param {string|null} pubkey
   * @param {string} name
   * @returns {{r: number, g: number, b: number}}
   */
  function getProfileColor(pubkey, name) {
    if (pubkey && pubkey.trim()) {
      // Use hexToColor for pubkeys (hex strings)
      return hexToColor(pubkey);
    }
    if (name && name.trim()) {
      // Use stringToColor for names
      return stringToColor(name);
    }
    // Default gray
    return { r: 128, g: 128, b: 128 };
  }

  // Get text-readable color (brightened in dark mode, darkened in light mode)
  $: textColor = getProfileTextColor(profileColor, isDarkMode);
  $: nameColorStyle = rgbToCssString(textColor);
</script>

<div class="message-bubble {className}">
  <!-- Profile picture (bottom-aligned) -->
  <div class="profile-column">
    {#if profileUrl}
      <a href={profileUrl} class="profile-link">
        <ProfilePic {pictureUrl} {name} {pubkey} {loading} size="md" />
      </a>
    {:else}
      <ProfilePic {pictureUrl} {name} {pubkey} {loading} size="md" />
    {/if}
  </div>

  <!-- Chat bubble -->
  <div class="bubble">
    <!-- Header row: name + timestamp -->
    <div class="bubble-header">
      {#if profileUrl}
        <a
          href={profileUrl}
          class="author-name"
          style="color: {nameColorStyle};"
        >
          {name || "Anonymous"}
        </a>
      {:else}
        <span class="author-name" style="color: {nameColorStyle};">
          {name || "Anonymous"}
        </span>
      {/if}

      <Timestamp {timestamp} size="xs" />
    </div>

    <!-- Content -->
    <div class="bubble-content">
      <slot />
    </div>
  </div>
</div>

<style>
  .message-bubble {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }

  .profile-column {
    flex-shrink: 0;
  }

  .profile-link {
    display: block;
    transition: opacity 0.15s ease;
  }

  .profile-link:hover {
    opacity: 0.8;
  }

  .bubble {
    /* Hug content instead of full width */
    width: fit-content;
    max-width: 100%;
    min-width: 200px; /* Prevent header clipping */
    background-color: hsl(var(--gray66));
    border-radius: 16px 16px 16px 4px;
    padding: 12px;
  }

  .bubble-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 4px;
  }

  .author-name {
    font-weight: 600;
    font-size: 0.875rem;
    line-height: 1.2;
    text-decoration: none;
    transition: opacity 0.15s ease;
    white-space: nowrap;
    /* Brightness adjustment handled by getProfileTextColor() in color.js */
  }

  a.author-name:hover {
    opacity: 0.8;
  }

  .bubble-content {
    font-size: 0.9375rem;
    line-height: 1.5;
    color: hsl(var(--foreground) / 0.85);
  }

  /* Handle HTML content from comments */
  .bubble-content :global(p) {
    margin: 0;
  }

  .bubble-content :global(p + p) {
    margin-top: 0.5rem;
  }

  .bubble-content :global(a) {
    color: hsl(var(--primary));
    text-decoration: none;
  }

  .bubble-content :global(a:hover) {
    text-decoration: underline;
  }
</style>
