<script>
  import { createEventDispatcher } from "svelte";
  import ZapIcon from "./icons/Zap.svelte";
  import ReplyIcon from "./icons/Reply.svelte";
  import OptionsIcon from "./icons/Options.svelte";
  import InputButton from "./InputButton.svelte";
  import ZapSliderModal from "./ZapSliderModal.svelte";
  import CommentModal from "./CommentModal.svelte";

  const dispatch = createEventDispatcher();

  /** @type {string} - App name (for apps) */
  export let appName = "";

  /** @type {string} - Publisher/creator name (for stacks) */
  export let publisherName = "";

  /** @type {"app" | "stack"} - Content type */
  export let contentType = "app";

  /** @type {string} - Additional CSS classes */
  export let className = "";

  /** @type {{ name?: string, pubkey?: string, dTag?: string, id?: string, pictureUrl?: string } | null} - Target for zapping/commenting */
  export let zapTarget = null;

  /** @type {Array<{ amount: number, profile: { pictureUrl?: string, name?: string, pubkey?: string } }>} - Other zaps on this content */
  export let otherZaps = [];

  /** @type {(query: string) => Promise<Array<{ pubkey: string, name?: string, displayName?: string, picture?: string, nip05?: string }>>} */
  export let searchProfiles = async () => [];

  /** @type {(query: string) => Promise<Array<{ shortcode: string, url: string, source: 'unicode' | 'custom' }>>} */
  export let searchEmojis = async () => [];

  // Modal state
  let zapModalOpen = false;
  let commentModalOpen = false;

  function handleZap() {
    zapModalOpen = true;
  }

  function handleZapClose(e) {
    zapModalOpen = false;
    if (e.detail?.success) {
      dispatch("zapReceived");
    }
  }

  function handleZapReceived(e) {
    dispatch("zapReceived", e.detail);
  }

  function handleComment() {
    commentModalOpen = true;
  }

  function handleCommentClose() {
    commentModalOpen = false;
  }

  function handleCommentSubmit(e) {
    dispatch("commentSubmit", e.detail);
  }

  function handleOptions() {
    dispatch("options");
  }
</script>

<div class="bottom-bar-wrapper {className}">
  <div class="bottom-bar">
    <div class="bottom-bar-content">
      <!-- Zap CTA Button -->
      <button
        type="button"
        class="btn-primary-large zap-button"
        on:click={handleZap}
      >
        <ZapIcon variant="fill" size={18} color="hsl(var(--whiteEnforced))" />
        <span>Zap</span>
      </button>

      <!-- Comment Input Button -->
      <InputButton placeholder="Comment" onClick={handleComment}>
        <ReplyIcon
          slot="icon"
          variant="outline"
          size={18}
          strokeWidth={1.4}
          color="hsl(var(--white33))"
        />
      </InputButton>

      <!-- Options Button -->
      <button
        type="button"
        class="btn-secondary-large btn-secondary-dark options-button"
        on:click={handleOptions}
      >
        <OptionsIcon variant="fill" size={20} color="hsl(var(--white33))" />
      </button>
    </div>
  </div>
</div>

<!-- Zap Slider Modal -->
<ZapSliderModal
  bind:isOpen={zapModalOpen}
  target={zapTarget}
  {publisherName}
  {otherZaps}
  {searchProfiles}
  {searchEmojis}
  on:close={handleZapClose}
  on:zapReceived={handleZapReceived}
/>

<!-- Comment Modal -->
<CommentModal
  bind:isOpen={commentModalOpen}
  target={zapTarget}
  placeholder="Comment on {zapTarget?.name || 'this'}"
  {searchProfiles}
  {searchEmojis}
  on:close={handleCommentClose}
  on:submit={handleCommentSubmit}
/>

<style>
  .bottom-bar-wrapper {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 40;
    display: flex;
    justify-content: center;
    pointer-events: none;
  }

  .bottom-bar {
    width: 100%;
    max-width: 100%;
    margin: 0;
    background: hsl(var(--gray66));
    border-radius: var(--radius-32) var(--radius-32) 0 0;
    border: 0.33px solid hsl(var(--white8));
    border-bottom: none;
    padding: 16px 6px 16px 16px;
    pointer-events: auto;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
  }

  .bottom-bar-content {
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

  /* Desktop-only styles */
  @media (min-width: 768px) {
    /* Desktop: floating bar with all rounded corners and shadow */
    .bottom-bar {
      max-width: 560px;
      margin-bottom: 16px;
      border-radius: 24px;
      border-bottom: 0.33px solid hsl(var(--white8));
      padding: 12px 2px 12px 12px;
      box-shadow: 0 8px 64px hsl(var(--black));
    }
  }
</style>
