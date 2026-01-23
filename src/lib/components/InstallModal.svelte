<script>
  /**
   * InstallModal - App installation modal
   *
   * Shows platform-specific download options for any app.
   * For Zapstore itself, shows the fancy promotional header.
   * For other apps, shows a similar layout.
   */
  import { assets } from "$app/paths";
  import { Copy, ArrowRight } from "lucide-svelte";
  import { Download, ChevronRight } from "$lib/components/icons";
  import PlatformSelector from "./PlatformSelector.svelte";
  import AppPic from "./AppPic.svelte";
  import Modal from "./Modal.svelte";

  /** @type {boolean} */
  export let open = false;

  /** @type {Object|null} - App data */
  export let app = null;

  /** @type {boolean} - Whether this is the Zapstore app itself */
  export let isZapstore = false;

  // Platform options for Zapstore
  const zapstorePlatforms = ["Android", "iOS", "Mac", "Linux"];

  let selectedPlatform = "Android";
  let downloading = false;
  let linkCopied = false;

  // iOS waitlist state (only for Zapstore)
  let iosWaitlistStatus = "idle";
  let iosWaitlistMessage = "";
  let iosSubmitting = false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const npubRegex = /^npub1[ac-hj-np-z0-9]{58}$/i;

  // Zapstore-specific constants
  const ZAPSTORE_APK_VERSION = "0.2.7";
  const ZAPSTORE_APK_URL = `https://cdn.zapstore.dev/zapstore-${ZAPSTORE_APK_VERSION}.apk`;
  const IMAGE_TOP_HEIGHT = 360;

  // App info helpers
  $: minAndroidVersion = app?.minAndroidVersion || "Android 8.0+";
  $: sourceUrl = app?.repository || app?.sourceUrl || null;
  $: deepLink = app?.dTag ? `zapstore://app/${app.dTag}` : null;

  function handleOpenInZapstore() {
    if (deepLink) {
      window.location.href = deepLink;
    }
  }

  async function handleDownloadZapstore() {
    downloading = true;
    try {
      const response = await fetch(ZAPSTORE_APK_URL);
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
      console.error("Download failed:", err);
      window.location.href = ZAPSTORE_APK_URL;
    } finally {
      downloading = false;
    }
  }

  async function copyDeepLink() {
    if (!deepLink) return;
    try {
      await navigator.clipboard.writeText(deepLink);
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

    try {
      const response = await fetch("https://formspree.io/f/mldqprpn", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });

      if (!response.ok) throw new Error("Request failed");

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
  ariaLabel="Download {isZapstore ? 'Zapstore' : app?.name || 'App'}"
  maxWidth="max-w-lg"
>
  {#if isZapstore}
    <!-- Zapstore: Fancy header image -->
    <img
      src={`${assets}/images/download-image.png`}
      alt="Download Zapstore"
      class="w-full h-auto object-cover"
      loading="lazy"
    />
    <div class="p-6 relative" style="margin-top: -{IMAGE_TOP_HEIGHT}px;">
      <h2 class="text-display text-4xl text-foreground text-center mb-6">
        Download Zapstore
      </h2>

      <!-- Platform Selector -->
      <div class="mb-6">
        <PlatformSelector
          platforms={zapstorePlatforms}
          {selectedPlatform}
          onSelect={(platform) => (selectedPlatform = platform)}
        />
      </div>

      <!-- Platform-specific content for Zapstore -->
      {#if selectedPlatform === "Android"}
        <div class="space-y-5">
          <div
            class="flex items-stretch rounded-xl bg-white/5 border border-border/30 overflow-hidden"
          >
            <div class="flex flex-col items-center gap-5 pt-5 pb-4 px-5">
              <img
                src={`${assets}/images/qr.png`}
                alt="QR code to download Zapstore"
                class="w-32 h-32 rounded-lg border border-border/40 bg-white p-1"
                loading="lazy"
              />
              <button
                type="button"
                class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                on:click={() => navigator.clipboard.writeText(ZAPSTORE_APK_URL)}
              >
                <span>Download Link</span>
                <Copy class="w-4 h-4" />
              </button>
            </div>
            <div
              class="w-[1.4px] flex-shrink-0 self-stretch"
              style="background-color: hsl(var(--white16));"
            ></div>
            <div class="flex-1 flex flex-col justify-center gap-2 px-6 py-4">
              <p class="text-sm text-muted-foreground">
                Scan with your phone or download directly
              </p>
            </div>
          </div>

          <button
            type="button"
            on:click={handleDownloadZapstore}
            disabled={downloading}
            class="btn-primary-large w-full disabled:opacity-70 flex items-center justify-center gap-3"
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
      {:else if selectedPlatform === "iOS"}
        <div class="space-y-5">
          <form
            class="space-y-3"
            on:submit|preventDefault={handleIosWaitlistSubmit}
          >
            <input
              name="contact"
              type="text"
              placeholder="you@example.com or npub1..."
              class="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              class="btn-primary w-full"
              disabled={iosSubmitting}
            >
              {iosSubmitting ? "Submitting..." : "Notify me"}
              <ArrowRight class="ml-2 h-4 w-4" />
            </button>
            {#if iosWaitlistStatus === "error"}
              <p class="text-sm text-rose-400">{iosWaitlistMessage}</p>
            {:else if iosWaitlistStatus === "success"}
              <p class="text-sm text-emerald-400">{iosWaitlistMessage}</p>
            {/if}
          </form>
          <p class="text-sm text-muted-foreground">
            We're designing Zapstore iOS to bypass the App Store. Drop your
            email or npub and we'll notify you.
          </p>
        </div>
      {:else}
        <div class="text-center py-8">
          <p class="text-muted-foreground">
            {selectedPlatform} downloads coming soon!
          </p>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Other apps -->
    <div class="p-6">
      <!-- App icon centered -->
      <div class="flex justify-center mb-4">
        <AppPic
          iconUrl={app?.icon}
          name={app?.name}
          identifier={app?.dTag}
          size="xl"
        />
      </div>

      <!-- Header same size as Zapstore modal -->
      <h2 class="text-display text-4xl text-foreground text-center mb-6">
        Download {app?.name || "App"}
      </h2>

      <!-- Platform Selector -->
      <div class="mb-6">
        <div class="app-platform-selector">
          <button type="button" class="platform-btn selected"> Android </button>
          <button type="button" class="platform-btn disabled" disabled>
            No other platforms
          </button>
        </div>
      </div>

      <!-- QR Code Container - same structure as Zapstore -->
      <div
        class="flex items-stretch rounded-xl bg-white/5 border border-border/30 overflow-hidden mb-5"
      >
        <!-- QR Code Left -->
        <div class="flex flex-col items-center gap-5 pt-5 pb-4 px-5">
          <img
            src={`${assets}/images/qr.png`}
            alt="QR code to open in Zapstore"
            class="w-32 h-32 rounded-lg border border-border/40 bg-white p-1"
            loading="lazy"
          />
          <button
            type="button"
            class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            on:click={copyDeepLink}
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
          <!-- Android Version Info -->
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
              <span class="text-sm">{minAndroidVersion}</span>
            </span>
          </div>

          <!-- Horizontal Divider -->
          <div
            class="w-full h-[1.4px] flex-shrink-0"
            style="background-color: hsl(var(--white16));"
          ></div>

          <!-- Source Code -->
          {#if sourceUrl}
            <a
              href={sourceUrl}
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
          {:else}
            <div
              class="flex items-center gap-2 text-sm text-muted-foreground pl-6 pr-4 py-4"
            >
              <span>Closed Source</span>
            </div>
          {/if}
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex gap-3">
        <a href="/download" class="get-zapstore-btn"> Direct Download </a>
        <button
          type="button"
          on:click={handleOpenInZapstore}
          class="btn-primary-large flex-1"
        >
          Open in Zapstore
        </button>
      </div>
    </div>
  {/if}
</Modal>

<style>
  .get-zapstore-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 12px 20px;
    border-radius: 12px;
    background-color: hsl(var(--black33));
    color: hsl(var(--white66));
    font-size: 1rem;
    font-weight: 500;
    text-decoration: none;
    white-space: nowrap;
    transition: all 0.15s ease;
  }

  .get-zapstore-btn:hover {
    background-color: hsl(var(--black66));
    color: hsl(var(--foreground));
  }

  /* Custom platform selector for non-Zapstore apps */
  .app-platform-selector {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
    background-color: hsl(var(--black16));
    border-radius: 0.5rem;
  }

  .platform-btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    padding: 0 14px;
    font-size: 14px;
    font-weight: 500;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .platform-btn.selected {
    background-color: hsl(var(--white16));
    color: hsl(var(--foreground));
  }

  .platform-btn.disabled {
    background-color: transparent;
    color: hsl(var(--white33));
    cursor: not-allowed;
  }
</style>
