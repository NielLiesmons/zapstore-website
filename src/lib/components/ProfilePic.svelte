<script>
  import { hexToColor, stringToColor } from "$lib/utils/color.js";
  import SkeletonLoader from "./SkeletonLoader.svelte";

  /**
   * ProfilePic - A profile picture component with fallback states
   *
   * Displays a profile image with:
   * - Circular shape with thin outline
   * - Loading skeleton while image loads
   * - Colored initial letter fallback when no image
   * - Icon fallback when no name/pubkey available
   *
   * @example
   * <ProfilePic pictureUrl="https://..." name="Alice" size="md" />
   * <ProfilePic pubkey="abc123..." size="lg" />
   * <ProfilePic name="Bob" size="sm" />
   */

  /** @type {string|null|undefined} - Profile picture URL */
  export let pictureUrl = null;

  /** @type {string|null|undefined} - Display name for initial fallback */
  export let name = null;

  /** @type {string|null|undefined} - Hex pubkey for color generation */
  export let pubkey = null;

  /** @type {'xs'|'sm'|'md'|'lg'|'xl'|'2xl'} - Size preset */
  export let size = "md";

  /** @type {() => void} - Click handler */
  export let onClick = () => {};

  /** @type {string} - Additional CSS classes */
  export let className = "";

  /** @type {boolean} - External loading state (e.g., profile data still being fetched) */
  export let loading = false;

  // Size mappings (in pixels)
  const sizeMap = {
    xs: 20,
    sm: 28,
    md: 38,
    lg: 48,
    xl: 64,
    "2xl": 96,
  };

  // Font size ratio relative to container (matching Flutter's 0.56)
  const fontSizeRatio = 0.56;

  // Image loading state
  let imageLoaded = false;
  let imageError = false;

  // Reactive computations
  $: resolvedSize = sizeMap[size] || sizeMap.md;
  $: fontSize = Math.round(resolvedSize * fontSizeRatio);
  $: hasValidUrl = pictureUrl && pictureUrl.trim().length > 0;
  $: showImage = hasValidUrl && !imageError;

  // Generate profile color from pubkey or name
  $: profileColor = getProfileColor(pubkey, name);

  /**
   * Get profile color based on pubkey or name
   * @param {string|null|undefined} pubkey
   * @param {string|null|undefined} name
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

  // Get initial letter from name
  $: initial = name && name.trim() ? name.trim()[0].toUpperCase() : "";
  $: hasInitial = initial.length > 0;

  // Color styles
  $: bgColorStyle = `rgba(${profileColor.r}, ${profileColor.g}, ${profileColor.b}, 0.24)`;
  $: textColorStyle = `rgb(${profileColor.r}, ${profileColor.g}, ${profileColor.b})`;

  // Handle image load
  function handleImageLoad() {
    imageLoaded = true;
  }

  // Handle image error
  function handleImageError() {
    imageError = true;
  }

  // Reset states when URL changes
  $: if (pictureUrl) {
    imageLoaded = false;
    imageError = false;
  }
</script>

<button
  type="button"
  class="profile-pic {className}"
  style="--size: {resolvedSize}px; --font-size: {fontSize}px; --bg-color: {bgColorStyle}; --text-color: {textColorStyle};"
  on:click={onClick}
  aria-label={name ? `${name}'s profile picture` : "Profile picture"}
>
  <div class="profile-pic-inner">
    {#if showImage}
      <!-- Image with loading state -->
      {#if !imageLoaded}
        <!-- Show skeleton behind initial/icon while loading -->
        <div class="skeleton-container">
          <SkeletonLoader />
        </div>
        <div class="loading-initial-container">
          {#if hasInitial}
            <span class="initial">{initial}</span>
          {:else}
            <svg
              class="user-icon-colored"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          {/if}
        </div>
      {/if}
      <img
        src={pictureUrl}
        alt={name ? `${name}'s avatar` : "Profile avatar"}
        class="profile-image"
        class:loaded={imageLoaded}
        loading="lazy"
        on:load={handleImageLoad}
        on:error={handleImageError}
      />
    {:else if loading}
      <!-- External loading state (profile data being fetched) -->
      <div class="skeleton-container">
        <SkeletonLoader />
      </div>
      <div class="loading-initial-container">
        {#if hasInitial}
          <span class="initial">{initial}</span>
        {:else}
          <svg
            class="user-icon-colored"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        {/if}
      </div>
    {:else if hasInitial}
      <!-- Initial letter fallback (no image URL, has name) -->
      <div class="fallback-container">
        <span class="initial">{initial}</span>
      </div>
    {:else}
      <!-- User icon fallback (no image URL, no name) -->
      <div class="fallback-container">
        <svg
          class="user-icon-colored"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
    {/if}
  </div>
</button>

<style>
  .profile-pic {
    /* Reset button styles */
    padding: 0;
    margin: 0;
    border: none;
    background: transparent;
    cursor: pointer;

    /* Display */
    display: block;

    /* Size */
    width: var(--size);
    height: var(--size);
    min-width: var(--size);
    min-height: var(--size);

    /* Shape */
    border-radius: 50%;

    /* Interaction */
    transition: transform 0.15s ease;

    /* Performance */
    contain: layout style;
  }

  .profile-pic:hover {
    transform: scale(1.02);
  }

  .profile-pic:active {
    transform: scale(0.98);
  }

  .profile-pic-inner {
    /* Fill parent */
    width: 100%;
    height: 100%;

    /* Shape with thin outline */
    border-radius: 50%;
    border: 0.33px solid hsl(var(--white16));

    /* Background */
    background-color: hsl(var(--gray66));

    /* Clip content to circle */
    overflow: hidden;

    /* Layout */
    position: relative;
  }

  /* Skeleton loading state */
  .skeleton-container {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    overflow: hidden;
  }

  /* Initial letter shown on top of skeleton while image loads */
  .loading-initial-container {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
    /* Same colored background as fallback - skeleton shimmer shows around edges */
    background-color: var(--bg-color);
  }

  /* Profile image */
  .profile-image {
    width: 100%;
    height: 100%;
    object-fit: cover;

    /* Hidden until loaded */
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .profile-image.loaded {
    opacity: 1;
  }

  /* Fallback container */
  .fallback-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-color);
    position: relative;
  }

  /* Initial letter */
  .initial {
    font-size: var(--font-size);
    font-weight: 700;
    color: var(--text-color);
    line-height: 1;
    user-select: none;
    /* Slightly brighten for better readability on colored backgrounds */
    filter: brightness(1.08);
  }

  /* Light mode: slightly darken instead */
  @media (prefers-color-scheme: light) {
    .initial {
      filter: brightness(0.95);
    }
  }

  /* User icon in profile color */
  .user-icon-colored {
    width: 60%;
    height: 60%;
    color: var(--text-color);
    /* Same brightness adjustment as initial letter */
    filter: brightness(1.08);
  }

  /* Light mode: slightly darken instead */
  @media (prefers-color-scheme: light) {
    .user-icon-colored {
      filter: brightness(0.95);
    }
  }
</style>
