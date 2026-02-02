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
    background: hsl(var(--gray66));
    border-radius: var(--radius-32) var(--radius-32) 0 0;
    border: 0.33px solid hsl(var(--white16));
    border-bottom: none;
    padding: 16px;
    pointer-events: auto;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
  }

  /* Match modal-wide breakpoints */
  @media (min-width: 640px) {
    .bottom-bar {
      max-width: calc(640px - 48px);
    }
  }

  @media (min-width: 768px) {
    .bottom-bar {
      max-width: calc(768px - 48px);
    }
  }

  @media (min-width: 900px) {
    .bottom-bar {
      max-width: calc(900px - 64px);
    }
  }

  @media (min-width: 1000px) {
    .bottom-bar {
      max-width: calc(1000px - 64px);
    }
  }

  @media (min-width: 1100px) {
    .bottom-bar {
      max-width: calc(1100px - 64px);
    }
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

  /* Options Button - Square aspect ratio */
  .options-button {
    width: 42px;
    padding: 0;
    flex-shrink: 0;
  }

  @media (max-width: 767px) {
    .options-button {
      width: 38px;
    }

    .zap-button span {
      font-size: 14px;
    }
  }
</style>
