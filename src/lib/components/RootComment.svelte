<script>
  import MessageBubble from "./MessageBubble.svelte";
  import ThreadComment from "./ThreadComment.svelte";
  import ProfilePicStack from "./ProfilePicStack.svelte";
  import Modal from "./Modal.svelte";
  import InputButton from "./InputButton.svelte";
  import ZapIcon from "./icons/Zap.svelte";
  import ReplyIcon from "./icons/Reply.svelte";
  import OptionsIcon from "./icons/Options.svelte";
  import { stringToColor } from "$lib/utils/color.js";

  /**
   * RootComment - Wraps a MessageBubble with reply indicator
   *
   * Shows:
   * - The root comment as a MessageBubble
   * - An L-shaped connector line to repliers (if any)
   * - Stacked profile pics of repliers + "Name & X others commented" text
   * - Modal with thread view when clicking on repliers
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

  /** @type {string} - HTML content of the root comment (passed via slot, captured here for modal) */
  export let contentHtml = "";

  // App info for thread display in modal
  /** @type {string|null} - App icon URL */
  export let appIconUrl = null;

  /** @type {string} - App name */
  export let appName = "";

  /** @type {string|null} - App identifier */
  export let appIdentifier = null;

  /** @type {string} - Version string the comment is about */
  export let version = "";

  // Modal state
  let modalOpen = false;

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

  // Sort all replies chronologically for the modal
  $: sortedReplies = [...replies].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });

  function openThread() {
    modalOpen = true;
  }

  // Placeholder handlers for bottom bar (to be implemented)
  function handleZap() {
    // TODO: Implement zap functionality for comment
  }

  function handleReply() {
    // TODO: Open reply input
  }

  function handleOptions() {
    // TODO: Show options menu
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="root-comment {className}" on:click={openThread}>
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
    <div class="reply-indicator" on:click|stopPropagation>
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
          on:click={openThread}
        />
      </div>
    </div>
  {/if}
</div>

<!-- Thread Modal -->
<Modal
  bind:open={modalOpen}
  ariaLabel="Comment thread"
  align="bottom"
  fillHeight={true}
  wide={true}
  class="thread-modal"
>
  <div class="thread-content">
    <!-- Root comment in thread style (app + author + content) -->
    <div class="thread-root">
      <ThreadComment
        {appIconUrl}
        {appName}
        {appIdentifier}
        {version}
        {pictureUrl}
        {name}
        {pubkey}
        {timestamp}
        {profileUrl}
        {loading}
      >
        {@html contentHtml ||
          "<p class='text-muted-foreground italic'>No content</p>"}
      </ThreadComment>
    </div>

    <!-- Full-width divider -->
    <div class="thread-divider"></div>

    <!-- Replies in chronological order -->
    <div class="thread-replies">
      {#if sortedReplies.length > 0}
        {#each sortedReplies as reply (reply.id)}
          <MessageBubble
            pictureUrl={reply.avatarUrl}
            name={reply.displayName}
            pubkey={reply.pubkey}
            timestamp={reply.createdAt}
            profileUrl={reply.profileUrl}
            loading={reply.profileLoading}
            light={true}
          >
            {@html reply.contentHtml ||
              "<p class='text-muted-foreground italic'>No content</p>"}
          </MessageBubble>
        {/each}
      {:else}
        <div class="no-comments-text">No comments yet</div>
      {/if}
    </div>
  </div>

  <!-- Bottom bar for thread actions -->
  <div class="thread-bottom-bar" slot="footer">
    <div class="thread-bottom-bar-content">
      <!-- Zap CTA Button -->
      <button type="button" class="btn-primary-large zap-button" on:click={handleZap}>
        <ZapIcon variant="fill" size={18} color="hsl(var(--whiteEnforced))" />
        <span>Zap</span>
      </button>

      <!-- Comment Input Button -->
      <InputButton placeholder="Comment" onClick={handleReply}>
        <ReplyIcon slot="icon" variant="outline" size={18} strokeWidth={1.4} color="hsl(var(--white33))" />
      </InputButton>

      <!-- Options Button -->
      <button type="button" class="btn-secondary-large btn-secondary-dark options-button" on:click={handleOptions}>
        <OptionsIcon variant="fill" size={20} color="hsl(var(--white33))" />
      </button>
    </div>
  </div>
</Modal>

<style>
  .root-comment {
    display: flex;
    flex-direction: column;
    cursor: pointer;
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

  /* Thread Modal Styles */
  .thread-content {
    display: flex;
    flex-direction: column;
  }

  .thread-root {
    padding: 16px;
    padding-bottom: 12px;
  }

  .thread-divider {
    height: 1.4px;
    background-color: hsl(var(--white11));
    margin: 0;
  }

  .thread-replies {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 12px 16px 16px;
  }

  .no-comments-text {
    font-size: 1.5rem;
    font-weight: 600;
    color: hsl(var(--white16));
    text-align: center;
    padding: 48px 0;
    margin: 0;
  }

  /* Thread Bottom Bar Styles - matches BottomBar.svelte */
  .thread-bottom-bar {
    background: hsl(var(--gray66));
    border-top: 0.33px solid hsl(var(--white16));
    padding: 16px 6px 16px 16px;
  }

  .thread-bottom-bar-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* Zap CTA Button - Override padding for icon alignment */
  .zap-button {
    gap: 8px;
    padding: 0 20px 0 14px;
    flex-shrink: 0;
  }

  /* Options Button - transparent, no gap before it */
  .options-button {
    width: 42px;
    padding: 0;
    flex-shrink: 0;
    background: transparent !important;
    border: none !important;
    margin-left: -12px;
  }

  .options-button :global(svg) {
    width: 24px;
    height: 24px;
  }

  @media (max-width: 767px) {
    .options-button {
      width: 38px;
    }

    .zap-button span {
      font-size: 14px;
    }
  }

  @media (min-width: 768px) {
    .thread-bottom-bar {
      padding: 12px 2px 12px 12px;
    }
  }
</style>
