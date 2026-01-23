<script>
  import { createEventDispatcher, onDestroy } from "svelte";
  import {
    X,
    Zap,
    Copy,
    Check,
    Loader2,
    AlertCircle,
    CheckCircle,
  } from "lucide-svelte";
  import { createZap, formatSats, subscribeToZapReceipt } from "$lib/nostr.js";
  import { authStore, connect } from "$lib/stores/auth.js";
  import Modal from "./Modal.svelte";

  export let app;
  export let isOpen = false;

  const dispatch = createEventDispatcher();

  // Preset amounts in sats
  const presets = [21, 210, 2100, 21000];

  let selectedAmount = 210;
  let customAmount = "";
  let useCustom = false;
  let message = "";
  let loading = false;
  let error = "";
  let invoice = null;
  let zapRequest = null;
  let copied = false;
  let step = "amount"; // 'amount' | 'invoice' | 'success'
  let unsubscribe = null;
  let waitingForReceipt = false;

  $: currentAmount = useCustom ? parseInt(customAmount) || 0 : selectedAmount;
  $: isValidAmount = currentAmount >= 1;

  // Generate QR code URL for the invoice
  $: qrCodeUrl = invoice
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&bgcolor=ffffff&color=000000&data=${encodeURIComponent("lightning:" + invoice.toUpperCase())}`
    : null;

  // Cleanup subscription on destroy
  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  });

  function close(zapSuccessful = false) {
    // Cleanup subscription
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    // Clear timeout
    if (receiptTimeout) {
      clearTimeout(receiptTimeout);
      receiptTimeout = null;
    }

    // Reset state
    selectedAmount = 210;
    customAmount = "";
    useCustom = false;
    message = "";
    loading = false;
    error = "";
    invoice = null;
    zapRequest = null;
    step = "amount";
    waitingForReceipt = false;
    showManualClose = false;
    isOpen = false;

    // Dispatch close event with success flag
    dispatch("close", { success: zapSuccessful });
  }

  function selectPreset(amount) {
    selectedAmount = amount;
    useCustom = false;
    customAmount = "";
  }

  function enableCustom() {
    useCustom = true;
  }

  async function handleSignIn() {
    try {
      await connect();
    } catch (err) {
      error = err.message || "Failed to sign in";
    }
  }

  async function handleZap() {
    if (!isValidAmount || loading) return;

    loading = true;
    error = "";

    try {
      const result = await createZap(app, currentAmount, message);
      invoice = result.invoice;
      zapRequest = result.zapRequest;
      step = "invoice";
      waitingForReceipt = true;

      // Start listening for zap receipt
      startListeningForReceipt();
    } catch (err) {
      console.error("Zap failed:", err);
      error = err.message || "Failed to create zap";
    } finally {
      loading = false;
    }
  }

  let receiptTimeout = null;
  let showManualClose = false;

  function startListeningForReceipt() {
    if (!zapRequest || !app) return;

    console.log("Starting to listen for zap receipt...");
    console.log("Zap request ID:", zapRequest.id);
    console.log("Recipient pubkey:", app.pubkey);

    const appAddress = `32267:${app.pubkey}:${app.dTag}`;

    unsubscribe = subscribeToZapReceipt(
      app.pubkey,
      zapRequest.id,
      (zapReceipt) => {
        console.log("Zap receipt received!", zapReceipt);
        if (receiptTimeout) {
          clearTimeout(receiptTimeout);
          receiptTimeout = null;
        }
        waitingForReceipt = false;
        step = "success";

        // Dispatch zap received event with the receipt
        dispatch("zapReceived", { zapReceipt });

        // Auto-close after showing success
        setTimeout(() => {
          close(true);
        }, 2000);
      },
      {
        invoice,
        appAddress,
        appEventId: app.id,
      },
    );

    // After 30 seconds, show a manual close option
    receiptTimeout = setTimeout(() => {
      showManualClose = true;
    }, 30000);
  }

  function handleManualDone() {
    // User says they paid - close and let the page refresh zaps
    close(true);
  }

  async function copyInvoice() {
    if (!invoice) return;
    try {
      await navigator.clipboard.writeText(invoice);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  function goBack() {
    // Cleanup subscription when going back
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    step = "amount";
    invoice = null;
    zapRequest = null;
    error = "";
    waitingForReceipt = false;
  }
</script>

<Modal
  bind:open={isOpen}
  ariaLabel="Zap {app?.name || 'App'}"
  maxWidth="max-w-md"
  on:close={() => close(false)}
>
  <!-- Header -->
  <div class="flex items-center justify-between p-4 border-b border-border">
    <div class="flex items-center gap-2">
      <div class="p-1.5 bg-amber-500/20 rounded-lg">
        <Zap class="h-5 w-5 text-amber-500" />
      </div>
      <h2 class="text-lg font-bold">Zap {app?.name || "App"}</h2>
    </div>
    <button
      type="button"
      on:click={() => close(false)}
      class="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
    >
      <X class="h-5 w-5" />
    </button>
  </div>

  <!-- Content -->
  <div class="p-4">
    {#if error}
      <div
        class="mb-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
      >
        <AlertCircle class="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div>{error}</div>
      </div>
    {/if}

    {#if !$authStore.isConnected}
      <!-- Sign in prompt -->
      <div class="text-center py-6">
        <div class="p-3 bg-amber-500/10 rounded-full w-fit mx-auto mb-4">
          <Zap class="h-8 w-8 text-amber-500" />
        </div>
        <p class="text-muted-foreground mb-4">
          Sign in with Nostr to send zaps
        </p>
        <button
          type="button"
          on:click={handleSignIn}
          disabled={$authStore.isConnecting}
          class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {#if $authStore.isConnecting}
            <Loader2 class="h-4 w-4 animate-spin" />
            Connecting...
          {:else}
            Sign in with Nostr
          {/if}
        </button>
      </div>
    {:else if step === "amount"}
      <!-- Amount Selection -->
      <div class="space-y-4">
        <div>
          <span class="block text-sm font-medium text-muted-foreground mb-2">
            Select amount
          </span>
          <div
            class="grid grid-cols-4 gap-2"
            role="group"
            aria-label="Preset amounts"
          >
            {#each presets as amount}
              <button
                type="button"
                on:click={() => selectPreset(amount)}
                class="py-2.5 px-3 rounded-lg border text-sm font-medium transition-all {!useCustom &&
                selectedAmount === amount
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : 'bg-muted/40 border-border hover:border-amber-500/50 hover:bg-amber-500/10'}"
              >
                {formatSats(amount)}
              </button>
            {/each}
          </div>
        </div>

        <!-- Custom Amount -->
        <div>
          <label
            for="custom-amount"
            class="block text-sm font-medium text-muted-foreground mb-2"
          >
            Or enter custom amount
          </label>
          <div class="relative">
            <input
              id="custom-amount"
              type="number"
              bind:value={customAmount}
              on:focus={enableCustom}
              placeholder="Enter sats..."
              min="1"
              class="w-full rounded-lg border bg-muted/40 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent {useCustom
                ? 'border-amber-500'
                : 'border-border'}"
            />
            <span
              class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
            >
              sats
            </span>
          </div>
        </div>

        <!-- Message -->
        <div>
          <label
            for="zap-message"
            class="block text-sm font-medium text-muted-foreground mb-2"
          >
            Message (optional)
          </label>
          <textarea
            id="zap-message"
            bind:value={message}
            placeholder="Add a message..."
            rows="2"
            maxlength="280"
            class="w-full rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
          ></textarea>
        </div>

        <!-- Zap Button -->
        <button
          type="button"
          on:click={handleZap}
          disabled={!isValidAmount || loading}
          class="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 font-medium text-white hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {#if loading}
            <Loader2 class="h-5 w-5 animate-spin" />
            Creating invoice...
          {:else}
            <Zap class="h-5 w-5" />
            Zap {formatSats(currentAmount)}
          {/if}
        </button>
      </div>
    {:else if step === "invoice"}
      <!-- Invoice Display -->
      <div class="space-y-4">
        <div class="text-center">
          <p class="text-lg font-bold text-amber-500">
            {formatSats(currentAmount)}
          </p>
          {#if message}
            <p class="text-sm text-muted-foreground mt-1">"{message}"</p>
          {/if}
        </div>

        <!-- QR Code -->
        <div class="flex justify-center">
          <a
            href="lightning:{invoice}"
            class="block p-3 bg-white rounded-xl hover:shadow-lg transition-shadow"
            title="Click to open in wallet"
          >
            {#if qrCodeUrl}
              <img
                src={qrCodeUrl}
                alt="Lightning Invoice QR Code"
                class="w-48 h-48"
                loading="eager"
              />
            {/if}
          </a>
        </div>

        <p class="text-center text-xs text-muted-foreground">
          {#if waitingForReceipt}
            <span class="inline-flex items-center gap-1.5">
              <Loader2 class="h-3 w-3 animate-spin" />
              Waiting for payment...
            </span>
          {:else}
            Scan with a Lightning wallet or click to open
          {/if}
        </p>

        <!-- Copy Button -->
        <button
          type="button"
          on:click={copyInvoice}
          class="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors"
        >
          {#if copied}
            <Check class="h-4 w-4 text-green-500" />
            Copied to clipboard!
          {:else}
            <Copy class="h-4 w-4" />
            Copy Invoice
          {/if}
        </button>

        <!-- Manual "I've paid" button - shows after timeout or can be used anytime -->
        {#if showManualClose}
          <div class="pt-2 border-t border-border">
            <p class="text-xs text-muted-foreground text-center mb-2">
              Payment not automatically detected. If you've paid:
            </p>
            <button
              type="button"
              on:click={handleManualDone}
              class="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
            >
              <CheckCircle class="h-4 w-4" />
              I've paid, close this
            </button>
          </div>
        {/if}

        <!-- Back Button -->
        <button
          type="button"
          on:click={goBack}
          class="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          ← Change amount
        </button>
      </div>
    {:else if step === "success"}
      <!-- Success State -->
      <div class="text-center py-8">
        <div class="p-4 bg-green-500/10 rounded-full w-fit mx-auto mb-4">
          <CheckCircle class="h-12 w-12 text-green-500" />
        </div>
        <h3 class="text-xl font-bold text-green-500 mb-2">Zap Sent!</h3>
        <p class="text-muted-foreground">
          {formatSats(currentAmount)} zapped successfully
        </p>
      </div>
    {/if}
  </div>
</Modal>
