<script>
  import { Monitor, Smartphone, ArrowRight, Copy } from "lucide-svelte";
  import { Download, ChevronRight } from "$lib/components/icons";
  import { assets } from "$app/paths";
  import { browser } from "$app/environment";
  import PlatformSelector from "./PlatformSelector.svelte";
  import Modal from "./Modal.svelte";

  export let open = false;

  const platforms = ["Android", "iOS", "Mac", "Linux"];
  let selectedPlatform = "Android";
  let showVerifyOverlay = false;
  let isAndroid = browser && /android/i.test(navigator.userAgent);
  let verifyTab = isAndroid ? "mobile" : "desktop";
  let downloading = false;
  let linkCopied = false;

  // iOS waitlist
  let iosWaitlistStatus = "idle";
  let iosWaitlistMessage = "";
  let iosSubmitting = false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const npubRegex = /^npub1[ac-hj-np-z0-9]{58}$/i;

  // Image overlap configuration
  const IMAGE_TOP_HEIGHT = 360;

  // Android APK
  const ANDROID_APK_VERSION = "0.2.7";
  const ANDROID_APK_URL = `https://cdn.zapstore.dev/zapstore-${ANDROID_APK_VERSION}.apk`;
  const ANDROID_APK_SHA256 =
    "800b9048974dfcac4e1e1b9afe0812d15e42a08264ba0b8877e22c2e6d2221ae";
  const APK_CERT_HASH =
    "99e33b0c2d07e75fcd9df7e40e886646ff667e3aa6648e1a1160b036cf2b9320";

  async function downloadApk() {
    downloading = true;
    try {
      const response = await fetch(ANDROID_APK_URL);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "zapstore.apk";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      window.location.href = ANDROID_APK_URL;
    } finally {
      downloading = false;
    }
  }

  async function copyDownloadLink() {
    try {
      await navigator.clipboard.writeText(ANDROID_APK_URL);
      linkCopied = true;
      setTimeout(() => (linkCopied = false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  async function handleIosWaitlistSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const contact = formData.get("contact")?.toString().trim();

    if (!contact) {
      iosWaitlistStatus = "error";
      iosWaitlistMessage = "Please enter an email or npub.";
      return;
    }

    if (!emailRegex.test(contact) && !npubRegex.test(contact)) {
      iosWaitlistStatus = "error";
      iosWaitlistMessage =
        "Enter a valid email or Nostr npub (starts with npub1).";
      return;
    }

    iosSubmitting = true;
    iosWaitlistStatus = "idle";
    iosWaitlistMessage = "";

    try {
      const response = await fetch("https://formspree.io/f/mldqprpn", {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      iosWaitlistStatus = "success";
      iosWaitlistMessage = "Thanks! We'll share more as soon as it's ready.";
      form.reset();
    } catch (error) {
      iosWaitlistStatus = "error";
      iosWaitlistMessage = "Something went wrong. Please try again.";
    } finally {
      iosSubmitting = false;
    }
  }
</script>

<Modal
  bind:open
  ariaLabel="Download Zapstore"
  maxWidth="max-w-lg"
  maxHeight={90}
  class="download-modal-bg"
>
  <!-- Download Image -->
  <img
    src={`${assets}/images/download-image.png`}
    alt="Download Zapstore"
    class="w-full h-auto object-cover"
    loading="lazy"
  />
  <!-- Content -->
  <div class="p-6 relative" style="margin-top: -{IMAGE_TOP_HEIGHT}px;">
    <!-- Title -->
    <h2
      id="download-modal-title"
      class="text-display text-4xl text-foreground text-center mb-6"
    >
      Download Zapstore
    </h2>

    <!-- Platform Selector -->
    <div class="mb-6">
      <PlatformSelector
        {platforms}
        {selectedPlatform}
        onSelect={(platform) => (selectedPlatform = platform)}
      />
    </div>

    <!-- Platform-specific content -->
    {#if selectedPlatform === "Android"}
      <!-- Android Download -->
      <div class="space-y-5">
        <!-- QR Code Container -->
        <div
          class="flex items-stretch rounded-xl bg-white/5 border border-border/30 overflow-hidden"
        >
          <!-- QR Code Left -->
          <div class="flex flex-col items-center gap-5 pt-5 pb-4 px-5">
            <img
              src={`${assets}/images/qr.png`}
              alt={`QR code to download Zapstore v${ANDROID_APK_VERSION} APK`}
              class="w-32 h-32 rounded-lg border border-border/40 bg-white p-1"
              loading="lazy"
            />
            <button
              type="button"
              class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              on:click={copyDownloadLink}
            >
              <span>Download Link</span>
              {#if linkCopied}
                <svg
                  class="w-4 h-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              {:else}
                <Copy class="w-4 h-4" />
              {/if}
            </button>
          </div>

          <!-- Vertical Divider -->
          <div
            class="w-[1.4px] flex-shrink-0 self-stretch"
            style="background-color: hsl(var(--white16));"
          ></div>

          <!-- Right Column -->
          <div class="flex-1 flex flex-col">
            <!-- Android 10+ Info -->
            <div
              class="flex-1 flex flex-col justify-center gap-1 text-muted-foreground pl-6 pr-4 py-2"
            >
              <span class="flex items-center gap-2">
                <svg
                  class="w-5 h-5 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.463 11.463 0 00-8.94 0L5.65 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L6.4 9.48A10.78 10.78 0 003 18h18a10.78 10.78 0 00-3.4-8.52zM8.5 14c-.83 0-1.5-.67-1.5-1.5S7.67 11 8.5 11s1.5.67 1.5 1.5S9.33 14 8.5 14zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
                  />
                </svg>
                <span class="text-sm">Android 10+</span>
              </span>
              <span class="text-sm" style="color: hsl(var(--white33));"
                ><strong>arm64-v8a</strong> only</span
              >
            </div>

            <!-- Horizontal Divider -->
            <div
              class="w-full h-[1.4px] flex-shrink-0"
              style="background-color: hsl(var(--white16));"
            ></div>

            <!-- Verify APK -->
            <button
              type="button"
              class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pl-6 pr-4 py-4 cursor-pointer"
              on:click={() => (showVerifyOverlay = true)}
            >
              <span>Verify APK</span>
              <ChevronRight
                variant="outline"
                strokeWidth={1.4}
                color="hsl(var(--white33))"
                size={16}
                className="ml-auto"
              />
            </button>

            <!-- Horizontal Divider -->
            <div
              class="w-full h-[1.4px] flex-shrink-0"
              style="background-color: hsl(var(--white16));"
            ></div>

            <!-- View Source Code -->
            <a
              href="https://github.com/zapstore/zapstore"
              class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pl-6 pr-4 py-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>View Source Code</span>
              <ChevronRight
                variant="outline"
                strokeWidth={1.4}
                color="hsl(var(--white33))"
                size={16}
                className="ml-auto"
              />
            </a>
          </div>
        </div>

        <!-- Download Button -->
        <div>
          <button
            on:click={downloadApk}
            disabled={downloading}
            class="btn-primary md:btn-primary-large w-full disabled:opacity-70 flex items-center justify-center gap-3"
          >
            {#if downloading}
              <div
                class="animate-spin rounded-full h-5 w-5 border-2 border-primary-foreground border-t-transparent"
              ></div>
              Downloading...
            {:else}
              <Download variant="fill" color="hsl(var(--white66))" size={20} />
              Download Android App
            {/if}
          </button>
        </div>
      </div>
    {:else if selectedPlatform === "iOS"}
      <!-- iOS Waitlist -->
      <div class="space-y-5">
        <form
          class="space-y-3"
          on:submit|preventDefault={handleIosWaitlistSubmit}
        >
          <label class="sr-only" for="ios-contact">Email or npub</label>
          <input
            id="ios-contact"
            name="contact"
            type="text"
            inputmode="text"
            autocomplete="off"
            placeholder="you@example.com or npub1..."
            class="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/40 transition-colors"
          />
          <button
            type="submit"
            class="btn-primary group w-full disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={iosSubmitting}
          >
            {#if iosSubmitting}
              Submitting...
            {:else}
              Notify me
            {/if}
            <ArrowRight
              class="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5"
            />
          </button>
          {#if iosWaitlistStatus === "error"}
            <p class="text-sm text-rose-400">{iosWaitlistMessage}</p>
          {:else if iosWaitlistStatus === "success"}
            <p class="text-sm text-emerald-400">{iosWaitlistMessage}</p>
          {/if}
        </form>
        <p class="text-sm text-muted-foreground">
          We're designing Zapstore iOS to bypass the App Store and deliver an
          even better UX. Drop an email or npub and we'll share more as it gets
          ready.
        </p>
      </div>
    {:else}
      <!-- Other platforms - Coming soon -->
      <div class="space-y-5">
        <div class="text-center py-8">
          <p class="text-muted-foreground">
            {selectedPlatform} downloads coming soon!
          </p>
        </div>
      </div>
    {/if}
  </div>
</Modal>

<!-- Verify APK Overlay -->
<Modal
  bind:open={showVerifyOverlay}
  ariaLabel="Verify APK Authenticity"
  maxWidth="max-w-lg"
  zIndex={60}
>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-display text-2xl text-foreground">
        Verify APK Authenticity
      </h3>
      <button
        type="button"
        class="text-muted-foreground hover:text-foreground transition-colors"
        on:click={() => (showVerifyOverlay = false)}
      >
        ✕
      </button>
    </div>

    <div
      class="rounded-xl bg-white/5 border border-border/30 text-sm overflow-hidden"
    >
      <!-- Tabs -->
      <div class="flex border-b border-border/30">
        <button
          type="button"
          class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors {verifyTab ===
          'desktop'
            ? 'text-foreground bg-white/5'
            : 'text-muted-foreground hover:text-foreground'}"
          on:click={() => (verifyTab = "desktop")}
        >
          <Monitor class="w-3.5 h-3.5" />
          Desktop
        </button>
        <button
          type="button"
          class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors {verifyTab ===
          'mobile'
            ? 'text-foreground bg-white/5'
            : 'text-muted-foreground hover:text-foreground'}"
          on:click={() => (verifyTab = "mobile")}
        >
          <Smartphone class="w-3.5 h-3.5" />
          Mobile
        </button>
      </div>

      <!-- Tab content -->
      <div class="p-4">
        {#if verifyTab === "desktop"}
          <p class="text-xs text-muted-foreground mb-2">Run in terminal:</p>
          <div
            class="font-mono text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/30 mb-3"
          >
            shasum -a 256 zapstore-{ANDROID_APK_VERSION}.apk
          </div>
          <p class="text-xs text-muted-foreground mb-1.5">Should equal:</p>
          <div
            class="font-mono text-[11px] text-muted-foreground break-all bg-muted/30 p-2.5 rounded-lg border border-border/30 mb-3"
          >
            {ANDROID_APK_SHA256}
          </div>
          <p class="text-[11px] text-muted-foreground/70">
            Always check the hash in
            <a
              href="https://npub.world/npub10r8xl2njyepcw2zwv3a6dyufj4e4ajx86hz6v4ehu4gnpupxxp7stjt2p8"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary hover:underline">Zapstore's Nostr profile</a
            >
          </p>
        {:else}
          <p class="text-xs text-muted-foreground mb-2">
            Use
            <a
              href="https://github.com/nicman23/appverifier"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary hover:underline">AppVerifier</a
            >
            to verify the APK certificate:
          </p>
          <p class="text-xs text-muted-foreground mb-1.5">Certificate hash:</p>
          <div
            class="font-mono text-[11px] text-muted-foreground break-all bg-muted/30 p-2.5 rounded-lg border border-border/30 mb-3"
          >
            {APK_CERT_HASH}
          </div>
          <p class="text-[11px] text-muted-foreground/70">
            Always check the hash in
            <a
              href="https://npub.world/npub10r8xl2njyepcw2zwv3a6dyufj4e4ajx86hz6v4ehu4gnpupxxp7stjt2p8"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary hover:underline">Zapstore's Nostr profile</a
            >
          </p>
        {/if}
      </div>
    </div>
  </div>
</Modal>

<style>
  /* Gradient background for download modal */
  :global(.download-modal-bg) {
    background: linear-gradient(
      to bottom,
      hsl(var(--black66)),
      hsl(var(--gray66))
    ) !important;
  }
</style>
