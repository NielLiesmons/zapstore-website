<script>
  import { hexToColor } from "$lib/utils/color.js";

  /**
   * NpubDisplay - Displays an npub with a colored profile circle
   *
   * The colored circle is derived from the hex pubkey using the
   * same color generation algorithm as the Flutter app.
   *
   * @example
   * <NpubDisplay npub="npub1abc..." pubkey="abc123..." />
   */

  /** @type {string} - The npub to display */
  export let npub = "";

  /** @type {string} - Hex pubkey for color generation */
  export let pubkey = "";

  /** @type {'sm'|'md'|'lg'} - Size variant */
  export let size = "md";

  /** @type {boolean} - Whether to truncate the npub */
  export let truncate = true;

  /** @type {string} - Additional CSS classes */
  export let className = "";

  // Size mappings for the colored dot
  const dotSizes = {
    sm: 6,
    md: 8,
    lg: 10,
  };

  // Font size mappings
  const fontSizes = {
    sm: "0.75rem",
    md: "0.875rem",
    lg: "1rem",
  };

  // Generate profile color from pubkey
  $: profileColor = pubkey ? hexToColor(pubkey) : { r: 128, g: 128, b: 128 };
  $: profileColorStyle = `rgb(${profileColor.r}, ${profileColor.g}, ${profileColor.b})`;

  // Format npub for display
  function formatNpub(npub, shouldTruncate) {
    if (!npub) return "";
    if (!shouldTruncate) return npub;
    if (npub.length < 20) return npub;
    return `${npub.slice(0, 12)}...${npub.slice(-4)}`;
  }

  $: displayNpub = formatNpub(npub, truncate);
  $: dotSize = dotSizes[size] || dotSizes.md;
  $: fontSize = fontSizes[size] || fontSizes.md;
</script>

<span
  class="npub-display {className}"
  style="--dot-size: {dotSize}px; --font-size: {fontSize};"
>
  <span class="profile-dot" style="background-color: {profileColorStyle};"
  ></span>
  <span class="npub-text">{displayNpub}</span>
</span>

<style>
  .npub-display {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .profile-dot {
    width: var(--dot-size);
    height: var(--dot-size);
    border-radius: 50%;
    border: 0.33px solid hsl(var(--white16));
    flex-shrink: 0;
  }

  .npub-text {
    font-size: var(--font-size);
    color: hsl(var(--white66));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
