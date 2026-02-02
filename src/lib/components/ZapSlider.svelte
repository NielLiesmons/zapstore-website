<script>
  import { onMount, createEventDispatcher, tick } from "svelte";
  import ZapIcon from "./icons/Zap.svelte";
  import ProfilePic from "./ProfilePic.svelte";
  import ShortTextInput from "./ShortTextInput.svelte";

  const dispatch = createEventDispatcher();

  /** @type {{ pictureUrl?: string, name?: string, pubkey?: string } | null} - Profile to display in center */
  export let profile = null;

  /** @type {number} - Initial value in sats */
  export let initialValue = 100;

  /** @type {Array<{ amount: number, profile: { pictureUrl?: string, name?: string, pubkey?: string } }>} - Other users' zaps */
  export let otherZaps = [];

  /** @type {string} - Message to include with zap */
  export let message = "";

  /** @type {(query: string) => Promise<Array<{ pubkey: string, name?: string, displayName?: string, picture?: string }>>} */
  export let searchProfiles = async () => [];

  /** @type {(query: string) => Promise<Array<{ shortcode: string, url: string, source: 'unicode' | 'custom' }>>} */
  export let searchEmojis = async () => [];

  /** @type {string} - Placeholder for comment input */
  export let placeholder = "Add a comment...";

  let shortTextInput;
  let amountInputElement;

  // Constants for the slider
  const START_ANGLE = (Math.PI * 3) / 4; // Start at 135 degrees (bottom-left)
  const TOTAL_ANGLE = (Math.PI * 3) / 2; // Sweep 270 degrees (3/4 circle)
  const MIN_VALUE = 0;
  const MAX_VALUE = 1000001;

  // Slider dimensions
  const SIZE = 320;
  const RADIUS = 100;
  const BACKGROUND_THICKNESS = 48;
  const VALUE_THICKNESS = 32;
  const HANDLE_SIZE = 24;
  const MARKER_LENGTH = 8;

  // State
  let value = initialValue;
  let canvasElement;
  let isDragging = false;
  let isEditingAmount = false;
  let amountInputValue = "";

  // Marker values for the scale
  const markerValues = [0, 10, 100, 1000, 10000, 100000, 1000000];

  // Update value when initialValue changes
  $: value = Math.max(MIN_VALUE, Math.min(MAX_VALUE, initialValue));

  // Keep amountInputValue synced with value when NOT editing
  $: if (!isEditingAmount) {
    amountInputValue = formatWithCommas(Math.round(value));
  }

  // Check if current value is top zap
  $: isTopZap =
    otherZaps.length > 0 && value > Math.max(...otherZaps.map((z) => z.amount));

  // Format number with commas (e.g., 1,000,000)
  function formatWithCommas(val) {
    return Math.round(val).toLocaleString("en-US");
  }

  // Format marker label (K/M for scale markers only)
  function formatMarkerLabel(val) {
    if (val >= 1000000) return `${Math.round(val / 1000000)}M`;
    if (val >= 1000) return `${Math.round(val / 1000)}K`;
    return val.toString();
  }

  // Convert value to angle using logarithmic scale
  function valueToAngle(val) {
    if (val <= 0) return START_ANGLE;
    const percentage = Math.log(val + 1) / Math.log(MAX_VALUE + 1);
    return START_ANGLE + percentage * TOTAL_ANGLE;
  }

  // Convert angle to value using logarithmic scale
  function angleToValue(angle) {
    let adjustedAngle = angle - START_ANGLE;
    if (adjustedAngle < 0) adjustedAngle += 2 * Math.PI;
    adjustedAngle = Math.max(0, Math.min(TOTAL_ANGLE, adjustedAngle));
    const percentage = adjustedAngle / TOTAL_ANGLE;
    const logValue = percentage * Math.log(MAX_VALUE + 1);
    return Math.exp(logValue) - 1;
  }

  // Get position on arc for a given angle
  function getPositionOnArc(angle, radius) {
    return {
      x: SIZE / 2 + radius * Math.cos(angle),
      y: SIZE / 2 + radius * Math.sin(angle),
    };
  }

  // Handle touch/mouse interaction on slider
  function handleInteraction(clientX, clientY) {
    if (!canvasElement) return;

    const rect = canvasElement.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Scale for actual canvas size
    const scaleX = SIZE / rect.width;
    const scaleY = SIZE / rect.height;
    const scaledX = x * scaleX;
    const scaledY = y * scaleY;

    const centerX = SIZE / 2;
    const centerY = SIZE / 2;

    let angle = Math.atan2(scaledY - centerY, scaledX - centerX);

    // Handle the forbidden zone (bottom gap)
    if (angle > Math.PI / 2.75 && angle < (Math.PI * 3) / 4) {
      // In the gap - clamp to minimum
      angle = START_ANGLE;
    }

    const newValue = angleToValue(angle);
    value = Math.round(Math.max(MIN_VALUE, Math.min(MAX_VALUE, newValue)));
    dispatch("valueChanged", { value });
    // Immediately redraw with new value
    drawSlider();
  }

  function handlePointerDown(e) {
    isDragging = true;
    handleInteraction(e.clientX, e.clientY);
  }

  function handlePointerMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    handleInteraction(e.clientX, e.clientY);
  }

  function handlePointerUp() {
    isDragging = false;
  }

  // Touch handlers
  function handleTouchStart(e) {
    if (e.touches.length > 0) {
      isDragging = true;
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  function handleTouchMove(e) {
    if (!isDragging || e.touches.length === 0) return;
    e.preventDefault();
    handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
  }

  function handleTouchEnd() {
    isDragging = false;
  }

  // Draw the slider on canvas
  function drawSlider() {
    if (!canvasElement) return;

    const ctx = canvasElement.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    // Set up high-DPI canvas
    canvasElement.width = SIZE * dpr;
    canvasElement.height = SIZE * dpr;
    ctx.scale(dpr, dpr);

    const centerX = SIZE / 2;
    const centerY = SIZE / 2;

    // Clear canvas
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Draw other zap markers (behind everything)
    otherZaps.forEach((zapData) => {
      const percentage =
        zapData.amount <= 0
          ? 0
          : Math.log(zapData.amount + 1) / Math.log(MAX_VALUE + 1);
      const angle = START_ANGLE + percentage * TOTAL_ANGLE;

      const innerRadius = RADIUS - BACKGROUND_THICKNESS / 2;
      const outerRadius =
        RADIUS + BACKGROUND_THICKNESS / 2 + MARKER_LENGTH + 6 + 9 - 10;

      // Gold gradient for zap markers
      const gradient = ctx.createLinearGradient(
        centerX + innerRadius * Math.cos(angle),
        centerY + innerRadius * Math.sin(angle),
        centerX + outerRadius * Math.cos(angle),
        centerY + outerRadius * Math.sin(angle),
      );
      gradient.addColorStop(0, "#FFC736");
      gradient.addColorStop(1, "#FFA037");

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 0.33;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(
        centerX + innerRadius * Math.cos(angle),
        centerY + innerRadius * Math.sin(angle),
      );
      ctx.lineTo(
        centerX + outerRadius * Math.cos(angle),
        centerY + outerRadius * Math.sin(angle),
      );
      ctx.stroke();
    });

    // Draw background arc (black33 = rgba(0, 0, 0, 0.33))
    ctx.strokeStyle = "rgba(0, 0, 0, 0.33)";
    ctx.lineWidth = BACKGROUND_THICKNESS;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(centerX, centerY, RADIUS, START_ANGLE, START_ANGLE + TOTAL_ANGLE);
    ctx.stroke();

    // Draw scale markers and labels
    markerValues.forEach((markerValue) => {
      const percentage =
        markerValue <= 0
          ? 0
          : Math.log(markerValue + 1) / Math.log(MAX_VALUE + 1);
      const angle = START_ANGLE + percentage * TOTAL_ANGLE;

      const innerRadius = RADIUS - BACKGROUND_THICKNESS / 2;
      const outerRadius = RADIUS + BACKGROUND_THICKNESS / 2 + MARKER_LENGTH;

      // Marker line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.33)";
      ctx.lineWidth = 0.33;
      ctx.beginPath();
      ctx.moveTo(
        centerX + innerRadius * Math.cos(angle),
        centerY + innerRadius * Math.sin(angle),
      );
      ctx.lineTo(
        centerX + outerRadius * Math.cos(angle),
        centerY + outerRadius * Math.sin(angle),
      );
      ctx.stroke();

      // Marker label
      const labelRadius = outerRadius + 14;
      const labelX = centerX + labelRadius * Math.cos(angle);
      const labelY = centerY + labelRadius * Math.sin(angle);

      ctx.fillStyle = "rgba(255, 255, 255, 0.33)";
      ctx.font = "500 12px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(formatMarkerLabel(markerValue), labelX, labelY);
    });

    // Draw value arc with gold gradient
    const percentage =
      value <= 0 ? 0 : Math.log(value + 1) / Math.log(MAX_VALUE + 1);
    const sweepAngle = percentage * TOTAL_ANGLE;

    if (sweepAngle > 0) {
      // Create sweep gradient for the value arc
      const gradient = ctx.createConicGradient(
        START_ANGLE - Math.PI / 2,
        centerX,
        centerY,
      );
      gradient.addColorStop(0, "#FFC736");
      gradient.addColorStop(0.5, "#FFA037");
      gradient.addColorStop(1, "#FFC736");

      ctx.strokeStyle = gradient;
      ctx.lineWidth = VALUE_THICKNESS;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(centerX, centerY, RADIUS, START_ANGLE, START_ANGLE + sweepAngle);
      ctx.stroke();
    }

    // Draw handle
    const handleAngle = START_ANGLE + sweepAngle;
    const handleX = centerX + RADIUS * Math.cos(handleAngle);
    const handleY = centerY + RADIUS * Math.sin(handleAngle);

    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(handleX, handleY, HANDLE_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Redraw when value or otherZaps change
  $: if (canvasElement && (value !== undefined || otherZaps)) {
    drawSlider();
  }

  onMount(() => {
    drawSlider();

    // Add global pointer/touch listeners for dragging
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  });

  // Handle clicking anywhere in amount row to start editing
  async function handleAmountRowClick() {
    isEditingAmount = true;
    amountInputValue = Math.round(value).toString();
    await tick();
    amountInputElement?.focus();
    amountInputElement?.select();
  }

  function handleAmountInput(e) {
    // Remove non-digits and format
    const cleaned = e.target.value.replace(/[^0-9]/g, "");
    const numValue = parseInt(cleaned, 10);

    if (cleaned === "" || isNaN(numValue)) {
      amountInputValue = "";
      value = 0;
    } else {
      value = Math.max(MIN_VALUE, Math.min(MAX_VALUE, numValue));
      // Format with commas for display while editing
      amountInputValue = formatWithCommas(value);
    }

    dispatch("valueChanged", { value });
    drawSlider();
  }

  function handleAmountBlur() {
    isEditingAmount = false;
    if (amountInputValue === "" || value === 0) {
      value = 0;
    }
    amountInputValue = formatWithCommas(Math.round(value));
  }

  function handleAmountKeydown(e) {
    if (e.key === "Enter") {
      e.target.blur();
    }
  }

  // Handle comment input submit
  function handleCommentSubmit(event) {
    const { text, emojiTags, mentions } = event.detail;
    message = text;
    dispatch("sendZap", {
      amount: Math.round(value),
      message: text,
      emojiTags,
      mentions,
    });
  }

  // Handle comment content change
  function handleCommentChange(event) {
    message = event.detail.content;
    dispatch("messageChanged", { message });
  }

  // Export the current value
  export function getValue() {
    return Math.round(value);
  }

  // Export the message
  export function getMessage() {
    return message;
  }
</script>

<div class="zap-slider">
  <!-- Slider Area -->
  <div class="slider-container">
    <div class="slider-canvas-wrapper">
      <!-- Canvas for arc drawing -->
      <canvas
        bind:this={canvasElement}
        class="slider-canvas"
        style="width: {SIZE}px; height: {SIZE}px;"
        on:pointerdown={handlePointerDown}
        on:touchstart={handleTouchStart}
      ></canvas>

      <!-- Other users' profile pics positioned on arc -->
      {#each otherZaps as zapData}
        {@const percentage =
          zapData.amount <= 0
            ? 0
            : Math.log(zapData.amount + 1) / Math.log(MAX_VALUE + 1)}
        {@const angle = START_ANGLE + percentage * TOTAL_ANGLE}
        {@const outerRadius =
          RADIUS + BACKGROUND_THICKNESS / 2 + MARKER_LENGTH + 6}
        {@const pos = getPositionOnArc(angle, outerRadius + 9)}
        <div
          class="zap-profile-marker"
          style="left: {pos.x - 9}px; top: {pos.y - 9}px;"
        >
          <ProfilePic
            pictureUrl={zapData.profile?.pictureUrl}
            name={zapData.profile?.name}
            pubkey={zapData.profile?.pubkey}
            size="xs"
          />
        </div>
      {/each}

      <!-- Center profile picture (104px like Flutter) -->
      <div class="center-profile">
        <ProfilePic
          pictureUrl={profile?.pictureUrl}
          name={profile?.name}
          pubkey={profile?.pubkey}
          size="2xl"
          className="profile-pic-large"
        />
      </div>
    </div>
  </div>

  <!-- Unified Container: Amount + Divider + Comment -->
  <div class="input-container">
    <!-- Amount Row - entire row is clickable -->
    <button type="button" class="amount-row" on:click={handleAmountRowClick}>
      <div class="row-left">
        <ZapIcon variant="fill" size={16} color="url(#gold-gradient)" />
        <input
          bind:this={amountInputElement}
          type="text"
          inputmode="numeric"
          class="amount-input"
          bind:value={amountInputValue}
          on:input={handleAmountInput}
          on:blur={handleAmountBlur}
          on:keydown={handleAmountKeydown}
          on:click|stopPropagation
        />
      </div>
      {#if isTopZap}
        <div class="top-zap-badge">
          <span>Top Zap</span>
        </div>
      {/if}
    </button>

    <!-- Divider -->
    <div class="divider"></div>

    <!-- Comment Input -->
    <ShortTextInput
      bind:this={shortTextInput}
      {placeholder}
      {searchProfiles}
      {searchEmojis}
      size="small"
      showActionRow={true}
      on:submit={handleCommentSubmit}
      on:change={handleCommentChange}
    />
  </div>

  <!-- Hidden SVG for gradient definition -->
  <svg width="0" height="0" style="position: absolute;">
    <defs>
      <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#FFC736" />
        <stop offset="100%" style="stop-color:#FFA037" />
      </linearGradient>
    </defs>
  </svg>
</div>

<style>
  .zap-slider {
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 100%;
  }

  .slider-container {
    height: 296px;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }

  .slider-canvas-wrapper {
    position: relative;
    width: 320px;
    height: 320px;
    overflow: visible;
  }

  .slider-canvas {
    cursor: pointer;
    touch-action: none;
  }

  .center-profile {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  /* Override profile pic size to 104px (matching Flutter's s104) */
  .center-profile :global(.profile-pic-large) {
    width: 104px !important;
    height: 104px !important;
    min-width: 104px !important;
    min-height: 104px !important;
  }

  .zap-profile-marker {
    position: absolute;
    pointer-events: none;
  }

  /* Unified input container */
  .input-container {
    background: hsl(var(--black33));
    border-radius: var(--radius-16);
    border: 0.33px solid hsl(var(--white33));
    width: 100%;
  }

  /* Amount Row - clickable button that contains the input */
  .amount-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 12px 16px;
    background: transparent;
    border: none;
    text-align: left;
    cursor: text;
  }

  .row-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .amount-input {
    font-size: 18px;
    font-weight: 700;
    color: hsl(var(--white));
    font-family: var(--font-sans);
    background: transparent;
    border: none;
    outline: none;
    padding: 0;
    flex: 1;
    min-width: 0;
    cursor: text;
  }

  .amount-input::placeholder {
    color: hsl(var(--white33));
  }

  .top-zap-badge {
    display: flex;
    align-items: center;
    height: 22px;
    background: linear-gradient(
      135deg,
      rgba(255, 199, 54, 0.16) 0%,
      rgba(255, 160, 55, 0.16) 100%
    );
    border-radius: 11px;
    padding: 0 10px;
    flex-shrink: 0;
  }

  .top-zap-badge span {
    font-size: 11px;
    font-weight: 500;
    line-height: 1;
    background: linear-gradient(135deg, #ffc736 0%, #ffa037 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .divider {
    height: 1.4px;
    background: hsl(var(--white8));
    margin: 0;
  }
</style>
