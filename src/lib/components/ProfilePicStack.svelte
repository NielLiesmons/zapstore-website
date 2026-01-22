<script>
  /**
   * ProfilePicStack - Overlapping profile pics with optional text pill
   *
   * Shows stacked profile pictures with:
   * - Black66 shadow on right side of each pic
   * - Slight overlap between pics
   * - First pic on top (highest z-index)
   * - Optional text pill on the right with white8 background
   *
   * @example
   * <ProfilePicStack
   *   profiles={[{ pictureUrl, name, pubkey }, ...]}
   *   text="& 3 others"
   *   size="sm"
   *   on:click={() => console.log('clicked')}
   * />
   */

  import { createEventDispatcher } from "svelte";
  import ProfilePic from "./ProfilePic.svelte";

  const dispatch = createEventDispatcher();

  /** @type {Array<{pictureUrl?: string, name?: string, pubkey?: string}>} */
  export let profiles = [];

  /** @type {string} - Optional text to show in pill */
  export let text = "";

  /** @type {"xs" | "sm" | "md" | "lg"} - Size of profile pics */
  export let size = "sm";

  /** @type {string} - Additional CSS classes */
  export let className = "";

  /** @type {number} - Maximum number of pics to display */
  export let maxDisplay = 3;

  // Size mappings for overlap and pill height
  const sizeMap = {
    xs: { overlap: 6, height: 20 },
    sm: { overlap: 8, height: 28 },
    md: { overlap: 10, height: 38 },
    lg: { overlap: 12, height: 48 },
  };

  $: displayedProfiles = profiles.slice(0, maxDisplay);
  $: overlapPx = sizeMap[size]?.overlap || 8;
  $: pillHeight = sizeMap[size]?.height || 28;

  function handleClick() {
    dispatch("click");
  }
</script>

<button
  type="button"
  class="profile-pic-stack {className}"
  on:click={handleClick}
>
  {#if displayedProfiles.length > 0}
    <div class="stacked-pics" style="--overlap: -{overlapPx}px;">
      {#each displayedProfiles as profile, i}
        <div
          class="stacked-pic"
          style="z-index: {displayedProfiles.length - i};"
        >
          <ProfilePic
            pictureUrl={profile.pictureUrl}
            name={profile.name}
            pubkey={profile.pubkey}
            {size}
          />
        </div>
      {/each}
    </div>
  {/if}

  {#if text}
    <div class="text-pill" style="height: {pillHeight}px;">
      <span class="text-content">{text}</span>
    </div>
  {/if}
</button>

<style>
  .profile-pic-stack {
    display: flex;
    align-items: center;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    font: inherit;
  }

  .stacked-pics {
    display: flex;
    flex-direction: row;
  }

  .stacked-pic {
    margin-left: var(--overlap);
    position: relative;
  }

  .stacked-pic:first-child {
    margin-left: 0;
  }

  /* Shadow on the right side of each pic using box-shadow */
  .stacked-pic:not(:last-child) :global(.profile-pic) {
    box-shadow: 4px 0 8px -2px hsl(var(--black66));
  }

  .text-pill {
    display: flex;
    align-items: center;
    padding: 0 12px 0 16px;
    margin-left: var(--overlap, -8px);
    background-color: hsl(var(--white8));
    border-radius: 9999px;
  }

  .text-content {
    font-size: 0.8125rem;
    font-weight: 500;
    color: hsl(var(--white66));
    white-space: nowrap;
  }
</style>
