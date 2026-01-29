<script>
  /**
   * SpinKeyModal - Slot machine style nsec key generator
   * 
   * Features:
   * - 12 spinning slots showing nsec characters (3 rows of 4)
   * - Draggable handle to trigger spin
   * - Staggered animation with custom easing
   * - Auto-proceeds after spin completes
   * 
   * @see zaplab_design/lib/src/widgets/keys/slot_machine.dart
   */
  import Modal from "./Modal.svelte";
  import { Download } from "$lib/components/icons";
  import { createEventDispatcher, onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import * as nip19 from "nostr-tools/nip19";
  import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
  import { bytesToHex } from "@noble/hashes/utils";

  /** @type {boolean} */
  export let open = false;

  /** @type {string} */
  export let profileName = "";

  /** @type {number} - Delay in ms after spin completes before proceeding */
  export let spinCompleteDelay = 1200;

  const dispatch = createEventDispatcher();

  // Bech32 characters used in nsec encoding (32 chars)
  const BECH32_CHARS = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

  // Layout constants
  const TOTAL_HEIGHT = 296;
  const DISK_WIDTH = 64; // Wider disks for larger text
  const DISK_HEIGHT = 88;
  const SLOT_TOP = (TOTAL_HEIGHT - DISK_HEIGHT) / 2; // 104 - centered vertically
  const CENTER_Y = SLOT_TOP + DISK_HEIGHT / 2; // 148 - center of slot
  // Handle range centered around slit (148px). Original range was 18-234 (center 126), shift +22
  const HANDLE_MIN_OFFSET = 40;
  const HANDLE_MAX_OFFSET = 256;

  // State
  let nsec = "";
  let secretKeyHex = "";
  let pubkey = "";
  // Placeholder pattern: first 9 slots = 5 chars, last 3 = 6 chars
  let slotParts = Array(12).fill("").map((_, i) => i < 9 ? "-----" : "------");
  let currentDisplayParts = Array(12).fill("").map((_, i) => i < 9 ? "-----" : "------");
  let isSpinning = false;
  let hasSpun = false;

  // Handle state
  let handleOffset = HANDLE_MIN_OFFSET;
  let isDragging = false;
  let handleContainerEl;

  // Animation
  let slotIntervals = [];

  // Generate initial key on mount
  onMount(() => {
    generateNewKey();
  });

  onDestroy(() => {
    slotIntervals.forEach(id => clearInterval(id));
    cleanupGlobalListeners();
  });

  // Reset when modal closes
  $: if (!open && hasSpun) {
    setTimeout(() => {
      hasSpun = false;
      isSpinning = false;
      handleOffset = HANDLE_MIN_OFFSET;
      currentDisplayParts = Array(12).fill("").map((_, i) => i < 9 ? "-----" : "------");
    }, 300);
  }

  function generateNewKey() {
    // Generate 32 random bytes for full entropy
    const secretKey = generateSecretKey();
    secretKeyHex = bytesToHex(secretKey);
    pubkey = getPublicKey(secretKey);
    nsec = nip19.nsecEncode(secretKey);
    slotParts = splitNsecIntoParts(nsec);
  }

  function splitNsecIntoParts(nsecStr) {
    // nsec format: 63 total characters
    // Split evenly across 12 slots: first 9 slots get 5 chars, last 3 get 6 chars
    // This ensures all 12 slots are filled with content
    const parts = [];
    let pos = 0;
    
    for (let i = 0; i < 12; i++) {
      // First 9 slots: 5 chars each (45 total)
      // Last 3 slots: 6 chars each (18 total) = 63 chars
      const chunkSize = i < 9 ? 5 : 6;
      parts.push(nsecStr.substring(pos, pos + chunkSize).toUpperCase());
      pos += chunkSize;
    }

    return parts;
  }

  function getRandomBech32String(length) {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += BECH32_CHARS[Math.floor(Math.random() * BECH32_CHARS.length)];
    }
    return result.toUpperCase();
  }

  function spin() {
    if (isSpinning) return;

    isSpinning = true;
    generateNewKey();

    // Clear any existing animations
    slotIntervals.forEach(id => clearInterval(id));
    slotIntervals = [];

    // Spin each slot with staggered timing (100ms apart like Flutter)
    slotParts.forEach((targetValue, index) => {
      const startDelay = index * 100;
      const spinDuration = 2000; // Match Flutter's 2000ms
      // First 9 slots = 5 chars, last 3 = 6 chars
      const charLength = index < 9 ? 5 : 6;

      setTimeout(() => {
        // Start spinning this slot
        const intervalId = setInterval(() => {
          currentDisplayParts[index] = getRandomBech32String(charLength);
          currentDisplayParts = [...currentDisplayParts];
        }, 50);
        slotIntervals[index] = intervalId;

        // Stop spinning and settle
        setTimeout(() => {
          clearInterval(slotIntervals[index]);
          settleSlot(index, targetValue, charLength);
        }, spinDuration);
      }, startDelay);
    });

    // Complete after all slots finish
    const totalDuration = 2000 + (11 * 100) + 300;
    setTimeout(() => {
      isSpinning = false;
      hasSpun = true;

      setTimeout(() => {
        dispatch("spinComplete", {
          nsec,
          secretKeyHex,
          pubkey,
          profileName
        });
      }, spinCompleteDelay);
    }, totalDuration);
  }

  function settleSlot(index, targetValue, charLength) {
    let count = 0;
    const settleInterval = setInterval(() => {
      count++;
      if (count >= 4) {
        clearInterval(settleInterval);
        currentDisplayParts[index] = targetValue;
        currentDisplayParts = [...currentDisplayParts];
      } else {
        currentDisplayParts[index] = getRandomBech32String(charLength);
        currentDisplayParts = [...currentDisplayParts];
      }
    }, 60);
  }

  // Handle bar calculations - bar connects ball to center of slot
  $: isBottomHalf = handleOffset > CENTER_Y;
  $: barHeight = Math.abs(handleOffset - CENTER_Y);
  // Bar always positioned between ball and center
  $: barTop = isBottomHalf ? CENTER_Y : handleOffset;

  // Handle ball size animation (grows when centered)
  $: distanceFromCenter = Math.abs(handleOffset - CENTER_Y);
  $: maxDistanceFromCenter = CENTER_Y - HANDLE_MIN_OFFSET;
  $: circleProgress = 1.0 - (distanceFromCenter / maxDistanceFromCenter);
  $: circleSize = 44 + (6 * Math.max(0, circleProgress));

  // Handle drag
  function handleDragStart(e) {
    if (isSpinning) return;
    isDragging = true;
    e.preventDefault();
    setupGlobalListeners();
  }

  function handleDragMove(e) {
    if (!isDragging || isSpinning || !handleContainerEl) return;

    const clientY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY;
    const rect = handleContainerEl.getBoundingClientRect();
    const relativeY = clientY - rect.top;

    handleOffset = Math.max(HANDLE_MIN_OFFSET, Math.min(HANDLE_MAX_OFFSET, relativeY));
  }

  function handleDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    cleanupGlobalListeners();

    // Trigger spin if dragged past center
    if (handleOffset > CENTER_Y + 30) {
      spin();
    }

    // Animate handle back
    animateHandleBack();
  }

  function animateHandleBack() {
    const startOffset = handleOffset;
    const startTime = performance.now();
    const duration = 200;

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOut
      handleOffset = startOffset + (HANDLE_MIN_OFFSET - startOffset) * eased;

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }

  function setupGlobalListeners() {
    if (browser) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchmove", handleDragMove, { passive: false });
      window.addEventListener("touchend", handleDragEnd);
    }
  }

  function cleanupGlobalListeners() {
    if (browser) {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("touchend", handleDragEnd);
    }
  }

  function handleExistingKey() {
    dispatch("useExistingKey");
  }
</script>

<Modal bind:open ariaLabel="Generate your Nostr key">
  <div class="modal-wrapper">
    <!-- Main content with padding -->
    <div class="modal-content">
      <!-- Title -->
      <h1 class="title">Hey {profileName}!</h1>
      <p class="description">
        Spin up a <button type="button" class="link-text" on:click={handleExistingKey}>secret key</button> to secure your profile and publications
      </p>

      <!-- Slot Machine -->
      <div class="slot-machine">
        <!-- Slots Container (3 rows) -->
        <div class="slots-container">
          {#each [0, 1, 2] as rowIndex}
            <div class="slot-row">
              {#each [0, 1, 2, 3] as colIndex}
                {@const slotIndex = rowIndex * 4 + colIndex}
                <div class="slot">
                  <div class="slot-content">
                    {#if currentDisplayParts[slotIndex].startsWith("---")}
                      <div class="slot-placeholder"></div>
                    {:else}
                      <span class="slot-text">{currentDisplayParts[slotIndex]}</span>
                    {/if}
                  </div>
                </div>
              {/each}
              <!-- Top/bottom gradient overlays -->
              <div class="row-gradient-top"></div>
              <div class="row-gradient-bottom"></div>
            </div>
          {/each}
        </div>

        <!-- Handle - 48px wide, 296px tall -->
        <div class="handle-container" bind:this={handleContainerEl}>
          <!-- Handle slot/opening - centered vertically at (296-88)/2 = 104px -->
          <div class="handle-slot"></div>

          <!-- Handle bar (connects ball to slot center) -->
          {#if barHeight > 2}
            <div 
              class="handle-bar"
              class:bar-top={!isBottomHalf}
              class:bar-bottom={isBottomHalf}
              style="height: {barHeight}px; top: {barTop}px;"
            ></div>
          {/if}

          <!-- Draggable ball - size animates with position -->
          <div
            class="handle-ball"
            class:dragging={isDragging}
            style="top: {handleOffset - circleSize / 2}px; width: {circleSize}px; height: {circleSize}px; left: {2 - (circleSize - 44) / 2}px;"
            on:mousedown={handleDragStart}
            on:touchstart|preventDefault={handleDragStart}
            role="button"
            tabindex="0"
            aria-label="Drag down to spin"
          >
            <div class="handle-ball-shine"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Full-width divider -->
    <div class="divider"></div>

    <!-- Bottom section with padding -->
    <div class="app-section">
      <p class="app-description">
        For the most secure key generation, use the native app
      </p>
      <button
        type="button"
        class="btn-secondary-large btn-secondary-light w-full flex items-center justify-center gap-3"
        style="color: hsl(var(--white66));"
        on:click={() => window.open('https://zapstore.dev', '_blank')}
      >
        <Download variant="fill" color="hsl(var(--white33))" size={20} />
        Download Zapstore
      </button>
    </div>
  </div>
</Modal>

<style>
  .modal-wrapper {
    display: flex;
    flex-direction: column;
  }

  .modal-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px 24px 24px;
  }

  .divider {
    height: 1.4px;
    background-color: hsl(var(--white11));
    width: 100%;
  }

  .app-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 24px 20px;
  }

  .app-description {
    font-size: 1rem;
    color: hsl(var(--white33));
    text-align: center;
    margin: 0 0 12px;
  }

  .title {
    font-size: 2.25rem; /* text-4xl - matches GetStartedModal */
    font-weight: 650;
    color: hsl(var(--white));
    margin: 0 0 8px;
    text-align: center;
  }

  .description {
    font-size: 1rem;
    color: hsl(var(--white66));
    margin: 0 0 24px;
    text-align: center;
    line-height: 1.5;
    max-width: 344px;
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

  /* Slot Machine Layout */
  .slot-machine {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
  }

  .slots-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* Slot Row - matches Flutter's _buildDiskRow */
  .slot-row {
    display: flex;
    gap: 4px;
    padding: 0 8px;
    height: 88px;
    background-color: hsl(var(--black66));
    border-radius: 16px;
    border: 0.33px solid hsl(var(--white16));
    position: relative;
    overflow: hidden;
    align-items: center;
  }

  /* Individual Slot - 64px width */
  .slot {
    width: 64px;
    height: 88px;
    background-color: hsl(var(--white16));
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .slot-content {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 56px;
    border-bottom: 0.33px solid hsl(var(--black33));
  }

  .slot-placeholder {
    width: 24px;
    height: 8px;
    background-color: hsl(var(--white33));
    border-radius: 2px;
  }

  /* Nsec text - Geist Mono code font, uppercase, semi-bold */
  .slot-text {
    font-family: "Geist Mono", monospace;
    font-size: 13px;
    font-weight: 600;
    color: hsl(var(--white));
    letter-spacing: -0.3px;
    text-transform: uppercase;
  }

  /* Gradient overlays for disk shading (more intense) */
  .row-gradient-top,
  .row-gradient-bottom {
    position: absolute;
    left: 0;
    right: 0;
    height: 32px;
    pointer-events: none;
    z-index: 1;
  }

  .row-gradient-top {
    top: 0;
    background: linear-gradient(
      to bottom,
      rgba(20, 20, 24, 1) 0%,
      rgba(20, 20, 24, 0.7) 40%,
      rgba(20, 20, 24, 0) 100%
    );
  }

  .row-gradient-bottom {
    bottom: 0;
    background: linear-gradient(
      to top,
      rgba(24, 24, 28, 1) 0%,
      rgba(24, 24, 28, 0.7) 40%,
      rgba(24, 24, 28, 0) 100%
    );
  }

  /* Handle Container - 48px wide, 296px tall */
  .handle-container {
    width: 48px;
    height: 296px;
    position: relative;
  }

  /* Handle Slot (the opening) - 32x88, CENTERED vertically at (296-88)/2 = 104px */
  .handle-slot {
    position: absolute;
    left: 8px;
    top: 104px;
    width: 32px;
    height: 88px;
    background-color: rgba(0, 0, 0, 0.53);
    border-radius: 16px;
    border: 0.33px solid hsl(var(--white16));
  }

  /* Handle Bar - connects slot to ball */
  .handle-bar {
    position: absolute;
    left: 16px;
    width: 16px;
    background: linear-gradient(
      to right,
      #9696a3,
      #6a6a75
    );
    border-radius: 8px;
  }

  /* Bar when ball is above center - fade toward bottom (center) */
  .handle-bar.bar-top {
    mask-image: linear-gradient(
      to bottom,
      white 50%,
      rgba(255,255,255,0.4) 75%,
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to bottom,
      white 50%,
      rgba(255,255,255,0.4) 75%,
      transparent 100%
    );
  }

  /* Bar when ball is below center - fade toward top (center) */
  .handle-bar.bar-bottom {
    mask-image: linear-gradient(
      to top,
      white 50%,
      rgba(255,255,255,0.4) 75%,
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to top,
      white 50%,
      rgba(255,255,255,0.4) 75%,
      transparent 100%
    );
  }

  /* Handle Ball - uses the actual blurple gradient from CSS variables */
  .handle-ball {
    position: absolute;
    border-radius: 50%;
    background: var(--gradient-blurple);
    cursor: grab;
    box-shadow: 0 4px 8px hsl(var(--black33));
    touch-action: none;
    user-select: none;
    transition: transform 0.1s ease;
  }

  .handle-ball:hover {
    transform: scale(1.05);
  }

  .handle-ball.dragging {
    cursor: grabbing;
    transform: scale(1.1);
  }

  .handle-ball-shine {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(
      circle at 30% 30%,
      transparent 0%,
      hsl(var(--black33)) 100%
    );
  }

</style>
