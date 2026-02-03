<script>
  import { onMount } from "svelte";
  import ProfilePic from "./ProfilePic.svelte";
  import Timestamp from "./Timestamp.svelte";
  import ZapIcon from "./icons/Zap.svelte";

  /**
   * ZapBubble - A chat-like bubble for displaying zaps
   *
   * Displays a zap with:
   * - Bottom-aligned profile picture on the left
   * - Gold gradient background bubble on the right
   * - Zap icon + amount (larger text) + profile name (gold gradient)
   * - Zap message/comment below
   *
   * @example
   * <ZapBubble
   *   pictureUrl="https://..."
   *   name="Alice"
   *   pubkey="abc123..."
   *   amount={1000}
   *   timestamp={1234567890}
   *   profileUrl="/p/npub..."
   * >
   *   Zap message here
   * </ZapBubble>
   */

  /** @type {string|null} - Profile picture URL */
  export let pictureUrl = null;

  /** @type {string} - Display name */
  export let name = "";

  /** @type {string|null} - Hex pubkey for color generation */
  export let pubkey = null;

  /** @type {number} - Zap amount in sats */
  export let amount = 0;

  /** @type {number|string|Date|null} - Timestamp for the zap */
  export let timestamp = null;

  /** @type {string} - URL to profile page */
  export let profileUrl = "";

  /** @type {string} - Additional CSS classes */
  export let className = "";

  /** @type {boolean} - Whether profile data is still loading */
  export let loading = false;

  /** @type {string} - Zap message/comment content */
  export let message = "";

  // Format amount for display (no "sats" text ever!)
  function formatAmount(val) {
    if (val >= 1000000)
      return `${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}M`;
    if (val >= 1000)
      return `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}K`;
    return val.toLocaleString();
  }
</script>

<div class="zap-bubble {className}">
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

  <!-- Chat bubble with gold gradient -->
  <div class="bubble">
    <!-- Header row: name + timestamp on left, zap amount on right -->
    <div class="bubble-header">
      <div class="header-left">
        {#if profileUrl}
          <a href={profileUrl} class="author-name">
            {name || "Anonymous"}
          </a>
        {:else}
          <span class="author-name">
            {name || "Anonymous"}
          </span>
        {/if}
        <Timestamp {timestamp} size="xs" />
      </div>

      <div class="zap-amount-row">
        <ZapIcon
          variant="fill"
          size={14}
          color="url(#zap-bubble-gold-gradient)"
        />
        <span class="zap-amount">{formatAmount(amount)}</span>
      </div>
    </div>

    <!-- Content (zap message) -->
    {#if message}
      <div class="bubble-content">
        {message}
      </div>
    {/if}
  </div>
</div>

<!-- SVG gradient definition for zap icon -->
<svg width="0" height="0" style="position: absolute;">
  <defs>
    <linearGradient
      id="zap-bubble-gold-gradient"
      x1="0%"
      y1="0%"
      x2="100%"
      y2="100%"
    >
      <stop offset="0%" stop-color="#FFC736" />
      <stop offset="100%" stop-color="#FFA037" />
    </linearGradient>
  </defs>
</svg>

<style>
  .zap-bubble {
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
    min-width: 200px;
    background: var(--gradient-gold16);
    border-radius: 16px 16px 16px 4px;
    padding: 8px 12px;
  }

  .bubble-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 2px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .zap-amount-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .zap-amount {
    font-weight: 500;
    font-size: 1rem;
    line-height: 1.2;
    color: hsl(var(--foreground));
  }

  .author-name {
    font-weight: 600;
    font-size: 0.875rem;
    line-height: 1.2;
    text-decoration: none;
    transition: opacity 0.15s ease;
    white-space: nowrap;
    background: var(--gradient-gold);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  a.author-name:hover {
    opacity: 0.8;
  }

  .bubble-content {
    font-size: 0.9375rem;
    line-height: 1.5;
    color: hsl(var(--foreground) / 0.85);
    margin-top: 4px;
  }

  /* Handle HTML content from zap messages */
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
