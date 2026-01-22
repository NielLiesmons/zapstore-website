<script>
  import MessageBubble from "./MessageBubble.svelte";
  import ProfilePicStack from "./ProfilePicStack.svelte";
  import { stringToColor } from "$lib/utils/color.js";

  /**
   * RootComment - Wraps a MessageBubble with reply indicator
   *
   * Shows:
   * - The root comment as a MessageBubble
   * - An L-shaped connector line to repliers (if any)
   * - Stacked profile pics of repliers + "Name & X others commented" text
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

  /** @type {boolean} - Whether profile data is still loading */
  export let loading = false;

  /** @type {Array} - Array of reply objects with profile info */
  export let replies = [];

  /** @type {string|null} - Pubkey of the app/publication author to prioritize */
  export let authorPubkey = null;

  /** @type {string} - Additional CSS classes */
  export let className = "";

  // Get unique repliers (by pubkey), prioritizing the app author
  $: uniqueRepliers = (() => {
    const seen = new Set();
    const repliers = replies.filter((reply) => {
      if (seen.has(reply.pubkey)) return false;
      seen.add(reply.pubkey);
      return true;
    });

    // Sort to put app author first if they replied
    if (authorPubkey) {
      repliers.sort((a, b) => {
        if (a.pubkey === authorPubkey) return -1;
        if (b.pubkey === authorPubkey) return 1;
        return 0;
      });
    }

    return repliers;
  })();

  $: hasReplies = uniqueRepliers.length > 0;
  $: featuredReplier = uniqueRepliers[0];
  $: otherRepliersCount = uniqueRepliers.length - 1;

  // Check if featured replier is the app author
  $: isAuthorReplying = featuredReplier?.pubkey === authorPubkey;

  // Only use profile color for the app author, otherwise use white33
  $: featuredReplierColor =
    isAuthorReplying && featuredReplier?.pubkey
      ? stringToColor(featuredReplier.pubkey)
      : null;

  // Show up to 3 stacked avatars
  $: displayedRepliers = uniqueRepliers.slice(0, 3);
</script>

<div class="root-comment {className}">
  <!-- Main message bubble -->
  <MessageBubble
    {pictureUrl}
    {name}
    {pubkey}
    {timestamp}
    {profileUrl}
    {loading}
  >
    <slot />
  </MessageBubble>

  <!-- Reply indicator -->
  {#if hasReplies}
    <div class="reply-indicator">
      <!-- L-shaped connector: vertical line + curved corner -->
      <div class="connector-column">
        <div class="connector-vertical"></div>
        <div class="connector-corner">
          <svg viewBox="0 0 27 16" fill="none">
            <path
              d="M1 0 L1 0 Q1 15 16 15 L27 15"
              stroke="hsl(var(--white16))"
              stroke-width="1.5"
              fill="none"
            />
          </svg>
        </div>
      </div>

      <!-- Repliers row -->
      <div class="repliers-row">
        <ProfilePicStack
          profiles={displayedRepliers.map((r) => ({
            pictureUrl: r.avatarUrl,
            name: r.displayName,
            pubkey: r.pubkey,
          }))}
          text={otherRepliersCount > 0
            ? `${featuredReplier?.displayName || "Someone"} & ${otherRepliersCount} ${otherRepliersCount === 1 ? "other" : "others"}`
            : featuredReplier?.displayName || "Someone"}
          size="sm"
        />
      </div>
    </div>
  {/if}
</div>

<style>
  .root-comment {
    display: flex;
    flex-direction: column;
  }

  .reply-indicator {
    display: flex;
    align-items: flex-end;
    /* 19px = half of 38px (md ProfilePic), aligns with center of profile pic above */
    margin-left: 19px;
    width: calc(100% - 19px);
  }

  .connector-column {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 27px; /* 19px (half profile pic) + 8px */
    flex-shrink: 0;
    /* Offset bottom by half avatar height (14px) to align horizontal line with avatar center */
    padding-bottom: 14px;
  }

  .connector-vertical {
    width: 1.5px;
    height: 12px; /* Vertical space above corner */
    background: hsl(var(--white16));
    margin-left: 0.25px; /* Align with SVG stroke */
  }

  .connector-corner {
    width: 27px;
    height: 16px; /* 16px radius */
  }

  .connector-corner svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .repliers-row {
    display: flex;
    align-items: center;
    padding-top: 4px; /* Space above avatars/text */
    flex: 1;
    min-width: 0;
  }
</style>
