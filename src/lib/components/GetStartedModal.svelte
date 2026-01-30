<script>
  /**
   * GetStartedModal - Initial onboarding modal for Zapstore
   *
   * Allows users to either:
   * 1. Create a new Nostr key (proceeds to SpinKeyModal)
   * 2. Sign in with existing key (uses browser extension)
   */
  import Modal from "./Modal.svelte";
  import InputTextField from "./InputTextField.svelte";
  import { Nostr } from "$lib/components/icons";
  import { connect, authStore } from "$lib/stores/auth.js";
  import { createEventDispatcher } from "svelte";

  /** @type {boolean} */
  export let open = false;

  const dispatch = createEventDispatcher();

  let profileName = "";
  let inputElement;
  let isConnecting = false;
  let error = null;

  // Focus input when modal opens
  $: if (open && inputElement) {
    setTimeout(() => inputElement?.focus(), 150);
  }

  // Clear state when modal closes
  $: if (!open) {
    profileName = "";
    error = null;
  }

  function handleStart() {
    if (profileName.trim()) {
      dispatch("start", { profileName: profileName.trim() });
    }
  }

  function handleKeydown(e) {
    if (e.detail.key === "Enter" && profileName.trim()) {
      handleStart();
    }
  }

  async function handleExistingKey() {
    isConnecting = true;
    error = null;

    try {
      await connect();
      open = false;
      dispatch("connected");
    } catch (err) {
      error = err.message || "Failed to connect to Nostr extension";
    } finally {
      isConnecting = false;
    }
  }
</script>

<Modal bind:open ariaLabel="Get started with Zapstore">
  <div class="modal-content">
    <!-- Logo - uses actual blurple gradient from CSS variables -->
    <div class="logo-container">
      <svg
        width="80"
        height="80"
        viewBox="0 0 19 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="logo"
      >
        <defs>
          <linearGradient
            id="start-logo-gradient"
            x1="100%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stop-color="#5C5FFF" />
            <stop offset="100%" stop-color="#4542FF" />
          </linearGradient>
        </defs>
        <path
          d="M18.8379 13.9711L8.84956 0.356086C8.30464 -0.386684 7.10438 0.128479 7.30103 1.02073L9.04686 8.94232C9.16268 9.46783 8.74887 9.96266 8.19641 9.9593L0.871032 9.91477C0.194934 9.91066 -0.223975 10.6293 0.126748 11.1916L7.69743 23.3297C7.99957 23.8141 7.73264 24.4447 7.16744 24.5816L5.40958 25.0076C4.70199 25.179 4.51727 26.0734 5.10186 26.4974L12.4572 31.8326C12.9554 32.194 13.6711 31.9411 13.8147 31.3529L15.8505 23.0152C16.0137 22.3465 15.3281 21.7801 14.6762 22.0452L13.0661 22.7001C12.5619 22.9052 11.991 22.6092 11.8849 22.0877L10.7521 16.5224C10.6486 16.014 11.038 15.5365 11.5704 15.5188L18.1639 15.2998C18.8529 15.2769 19.2383 14.517 18.8379 13.9711Z"
          fill="url(#start-logo-gradient)"
        />
      </svg>
    </div>

    <!-- Title -->
    <h2 class="text-display text-4xl text-foreground text-center mb-2">
      Welcome
    </h2>
    <p class="description">
      Create or add a <button
        type="button"
        class="link-text"
        on:click={handleExistingKey}>Nostr</button
      > profile to get started
    </p>

    <!-- Profile Name Input -->
    <div class="input-section">
      <InputTextField
        bind:value={profileName}
        bind:inputElement
        title="Choose a Profile Name"
        placeholder="Profile Name"
        singleLine={true}
        id="profile-name"
        on:keydown={handleKeydown}
      />
    </div>

    <!-- Create Profile Button - uses btn-primary-large, no icon -->
    <button
      type="button"
      class="btn-primary-large w-full"
      disabled={!profileName.trim()}
      on:click={handleStart}
    >
      Create profile
    </button>

    <!-- Spacer -->
    <div class="h-4"></div>

    <!-- Existing Key Button - uses btn-secondary-large with light styling and white66 text -->
    <button
      type="button"
      class="btn-secondary-large btn-secondary-light w-full flex items-center justify-center gap-3"
      style="color: hsl(var(--white66));"
      disabled={isConnecting}
      on:click={handleExistingKey}
    >
      <Nostr variant="fill" color="hsl(var(--blurpleColor))" size={16} />
      <span
        >{isConnecting
          ? "Connecting..."
          : "Already have a Nostr profile?"}</span
      >
    </button>

    {#if error}
      <p class="error-message">{error}</p>
    {/if}
  </div>
</Modal>

<style>
  .modal-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 16px 16px;
  }

  @media (min-width: 768px) {
    .modal-content {
      padding: 24px 24px 20px;
    }
  }

  .logo-container {
    margin-bottom: 12px;
  }

  .logo {
    width: 80px;
    height: auto;
  }

  .description {
    font-size: 1rem;
    color: hsl(var(--white66));
    margin: 0 0 24px;
    text-align: center;
    line-height: 1.5;
  }

  .link-text {
    color: hsl(var(--white66));
    text-decoration: underline;
    text-decoration-color: hsl(var(--white33));
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    cursor: pointer;
  }

  .link-text:hover {
    color: hsl(var(--white));
    text-decoration-color: hsl(var(--white66));
  }

  .input-section {
    width: 100%;
    margin-bottom: 12px;
  }

  .error-message {
    margin-top: 12px;
    padding: 12px;
    background-color: hsl(0, 70%, 50%, 0.2);
    border-radius: 8px;
    color: hsl(0, 70%, 70%);
    font-size: 0.875rem;
    text-align: center;
    width: 100%;
  }
</style>
