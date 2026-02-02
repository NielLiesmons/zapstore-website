<script>
  import { createEventDispatcher } from "svelte";
  import Modal from "./Modal.svelte";
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

  // Focus input when modal opens
  $: if (isOpen && textInput) {
    setTimeout(() => textInput?.focus(), 100);
  }
</script>

<Modal
  bind:open={isOpen}
  ariaLabel="Write a comment"
  wide={true}
  align="bottom"
  on:close={close}
>
  <div class="comment-modal">
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
</Modal>

<style>
  .comment-modal {
    padding: 16px;
    width: 100%;
  }

  .input-container {
    background: hsl(var(--black33));
    border-radius: var(--radius-16);
    border: 0.33px solid hsl(var(--white33));
    width: 100%;
  }
</style>
