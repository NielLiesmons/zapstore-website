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
   * ThreadComment - Thread-style comment display for modals
   *
   * Displays a comment in thread format with:
   * - Author profile pic + name + version pill + timestamp row
   * - Full-width content below (no bubble)
   */

  /** @type {string} - Version string (e.g., "v1.2.3") */
  export let version = "";

  /** @type {string|null} - Author profile picture URL */
  export let pictureUrl = null;

  /** @type {string} - Author display name */
  export let name = "";

  /** @type {string|null} - Author hex pubkey for color generation */
  export let pubkey = null;

  /** @type {number|string|Date|null} - Timestamp for the comment */
  export let timestamp = null;

  /** @type {string} - URL to author profile page */
  export let profileUrl = "";

  /** @type {boolean} - Whether profile data is still loading */
  export let loading = false;

  /** @type {string} - Additional CSS classes */
  export let className = "";

  // Unused but kept for API compatibility
  export let appIconUrl = null;
  export let appName = "";
  export let appIdentifier = null;

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
      return hexToColor(pubkey);
    }
    if (name && name.trim()) {
      return stringToColor(name);
    }
    return { r: 128, g: 128, b: 128 };
  }

  // Get text-readable color
  $: textColor = getProfileTextColor(profileColor, isDarkMode);
  $: nameColorStyle = rgbToCssString(textColor);
</script>

<div class="thread-comment {className}">
  <!-- Author row -->
  <div class="author-row">
    <div class="profile-column">
      {#if profileUrl}
        <a href={profileUrl} class="profile-link">
          <ProfilePic {pictureUrl} {name} {pubkey} {loading} size="md" />
        </a>
      {:else}
        <ProfilePic {pictureUrl} {name} {pubkey} {loading} size="md" />
      {/if}
    </div>
    <div class="author-info">
      <div class="author-left">
        {#if profileUrl}
          <a href={profileUrl} class="author-name" style="color: {nameColorStyle};">
            {name || "Anonymous"}
          </a>
        {:else}
          <span class="author-name" style="color: {nameColorStyle};">
            {name || "Anonymous"}
          </span>
        {/if}
        <Timestamp {timestamp} size="xs" />
      </div>
      {#if version}
        <span class="version-pill">{version}</span>
      {/if}
    </div>
  </div>

  <!-- Content (full width) -->
  <div class="content">
    <slot />
  </div>
</div>

<style>
  .thread-comment {
    display: flex;
    flex-direction: column;
  }

  /* Author row */
  .author-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
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

  .author-info {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex: 1;
    min-width: 0;
    padding-top: 4px;
  }

  .author-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .author-name {
    font-weight: 600;
    font-size: 0.875rem;
    line-height: 1.2;
    text-decoration: none;
    transition: opacity 0.15s ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  a.author-name:hover {
    opacity: 0.8;
  }

  .version-pill {
    font-size: 0.75rem;
    font-weight: 500;
    color: hsl(var(--white66));
    background-color: hsl(var(--white16));
    padding: 2px 8px;
    border-radius: 100px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* Content - full width */
  .content {
    margin-top: 12px;
    font-size: 0.9375rem;
    line-height: 1.5;
    color: hsl(var(--foreground) / 0.85);
  }

  /* Handle HTML content */
  .content :global(p) {
    margin: 0;
  }

  .content :global(p + p) {
    margin-top: 0.5rem;
  }

  .content :global(a) {
    color: hsl(var(--primary));
    text-decoration: none;
  }

  .content :global(a:hover) {
    text-decoration: underline;
  }
</style>
