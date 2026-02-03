<script>
  import { createEventDispatcher } from "svelte";
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { browser } from "$app/environment";
  import ShortTextInput from "./ShortTextInput.svelte";

  const dispatch = createEventDispatcher();

  /** @type {boolean} - Whether modal is open */
  export let isOpen = false;

  /** @type {{ name?: string, pubkey?: string, dTag?: string, id?: string } | null} - Target to comment on */
  export let target = null;

  /** @type {string} - Placeholder text */
  export let placeholder = "Write a comment...";

  /** @type {(query: string) => Promise<Array<{ pubkey: string, name?: string, displayName?: string, picture?: string, nip05?: string }>>} */
  export let searchProfiles = async () => [];

  /** @type {(query: string) => Promise<Array<{ shortcode: string, url: string, source: 'unicode' | 'custom' }>>} */
  export let searchEmojis = async () => [];

  // State
  let textInput;
  let submitting = false;

  function close() {
    isOpen = false;
    dispatch("close");
  }

  async function handleSubmit(e) {
    if (submitting) return;
    
    const { text, emojiTags, mentions } = e.detail;
    if (!text.trim()) return;

    submitting = true;

    try {
      dispatch("submit", {
        text,
        emojiTags,
        mentions,
        target,
      });
      
      // Clear and close on success
      textInput?.clear();
      close();
    } catch (err) {
      console.error("Failed to submit comment:", err);
    } finally {
      submitting = false;
    }
  }

  function handleCameraTap() {
    // TODO: Open camera/image picker
    console.log("Camera tap");
  }

  function handleEmojiTap() {
    // TODO: Open emoji picker panel
    console.log("Emoji tap");
  }

  function handleGifTap() {
    // TODO: Open GIF picker
    console.log("GIF tap");
  }

  function handleAddTap() {
    // TODO: Open add menu (attachments, etc.)
    console.log("Add tap");
  }

  function handleChevronTap() {
    // TODO: Open send options
    console.log("Chevron tap");
  }

  function handleKeydown(e) {
    if (e.key === "Escape") {
      close();
    }
  }

  // Focus input when modal opens
  $: if (isOpen && textInput) {
    setTimeout(() => textInput?.focus(), 100);
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- Transparent dismissible overlay -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="overlay" on:click={close}></div>
  
  <div
    class="comment-sheet-wrapper"
    role="dialog"
    aria-modal="true"
    aria-label="Write a comment"
  >
    <div
      class="comment-sheet"
      transition:fly={{ y: 100, duration: 200, easing: cubicOut }}
    >
      <div class="input-container">
        <ShortTextInput
          bind:this={textInput}
          {placeholder}
          size="medium"
          {searchProfiles}
          {searchEmojis}
          autoFocus={true}
          showActionRow={true}
          onCameraTap={handleCameraTap}
          onEmojiTap={handleEmojiTap}
          onGifTap={handleGifTap}
          onAddTap={handleAddTap}
          onChevronTap={handleChevronTap}
          on:submit={handleSubmit}
        />
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 49;
    background: transparent;
  }

  .comment-sheet-wrapper {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 50;
    display: flex;
    justify-content: center;
    pointer-events: none;
  }

  .comment-sheet {
    width: 100%;
    max-width: 100%;
    margin: 0;
    background: hsl(var(--gray66));
    border-radius: var(--radius-32) var(--radius-32) 0 0;
    border: 0.33px solid hsl(var(--white8));
    border-bottom: none;
    padding: 16px;
    pointer-events: auto;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
  }

  /* Desktop: floating sheet with all rounded corners */
  @media (min-width: 768px) {
    .comment-sheet {
      max-width: 560px;
      margin-bottom: 16px;
      border-radius: 24px;
      border-bottom: 0.33px solid hsl(var(--white8));
      padding: 12px;
    }
  }

  .input-container {
    background: hsl(var(--black33));
    border-radius: var(--radius-16);
    border: 0.33px solid hsl(var(--white33));
    width: 100%;
  }
</style>
