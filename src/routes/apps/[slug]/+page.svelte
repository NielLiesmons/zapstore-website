<script>
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import {
    Package,
    Download,
    ExternalLink,
    User,
    Calendar,
    Globe,
    Star,
    Tag,
    Github,
    Code,
    PackagePlus,
    Zap,
    X,
    ChevronLeft,
    ChevronRight,
  } from "lucide-svelte";
  import {
    formatDate,
    formatSats,
    fetchLatestReleaseForApp,
    fetchFileMetadata,
    fetchAppAndFileZaps,
    fetchProfile,
    getCachedZaps,
    getCachedApp,
    getCachedRelease,
    cacheApp,
    parseAppSlug,
  } from "$lib/nostr.js";
  import ProfileInfo from "$lib/components/ProfileInfo.svelte";
  import ProfilePic from "$lib/components/ProfilePic.svelte";
  import AppPic from "$lib/components/AppPic.svelte";
  import AppComments from "$lib/components/AppComments.svelte";
  import ZapButton from "$lib/components/ZapButton.svelte";
  import Prism from "prismjs";
  import "prismjs/components/prism-json";

  // Screenshot carousel state
  let carouselOpen = false;
  let currentImageIndex = 0;

  // Detect if on Android device
  let isAndroid = false;

  $: if (browser) {
    isAndroid = /Android/i.test(navigator.userAgent);
  }

  function openCarousel(index) {
    currentImageIndex = index;
    carouselOpen = true;
    document.body.style.overflow = "hidden";
  }

  function closeCarousel() {
    carouselOpen = false;
    document.body.style.overflow = "";
  }

  function nextImage() {
    if (app?.images) {
      currentImageIndex = (currentImageIndex + 1) % app.images.length;
    }
  }

  function prevImage() {
    if (app?.images) {
      currentImageIndex =
        (currentImageIndex - 1 + app.images.length) % app.images.length;
    }
  }

  function handleKeydown(event) {
    if (!carouselOpen) return;

    if (event.key === "Escape") {
      closeCarousel();
    } else if (event.key === "ArrowRight") {
      nextImage();
    } else if (event.key === "ArrowLeft") {
      prevImage();
    }
  }

  // Receive server-rendered data
  export let data;

  let app = data.app;
  // Update app when data changes (server data arrives)
  $: if (data.app) {
    app = data.app;
    cacheApp(app);
  }

  let loading = data.loading;
  let error = data.error;
  let latestRelease = null;
  let loadingRelease = true;
  let fileMetadata = [];
  let loadingFileMetadata = false;
  let zapsData = { zaps: [], totalSats: 0, count: 0 };
  let loadingZaps = true;
  let zapperProfiles = new Map();

  // Zapstore's own pubkey - don't show zap button for apps signed by Zapstore
  const ZAPSTORE_PUBKEY =
    "78ce6faa72264387284e647ba6938995735ec8c7d5c5a65737e55130f026307d";

  // Show zap button only if: not signed by Zapstore, OR has existing zaps
  $: showZapButton = app?.pubkey !== ZAPSTORE_PUBKEY || zapsData.count > 0;
  // Derived version shown on page and passed to comments
  // Use FileMetadata version (from 1063 event) only
  // Extract from parsed version field, or fallback to fullEvent tags if cache is stale
  $: fileVersion = (() => {
    for (const f of fileMetadata) {
      // Try parsed version first
      if (f?.version && String(f.version).trim().length > 0) {
        return f.version;
      }
      // Fallback: extract from fullEvent tags if available
      if (f?.fullEvent?.tags) {
        const versionTag = f.fullEvent.tags.find((t) => t[0] === "version");
        if (
          versionTag &&
          versionTag[1] &&
          String(versionTag[1]).trim().length > 0
        ) {
          return versionTag[1];
        }
      }
    }
    return null;
  })();

  // Get unique zappers by pubkey (deduplication)
  $: uniqueZappers = (() => {
    const seen = new Set();
    return zapsData.zaps.filter((zap) => {
      if (!zap.senderPubkey || seen.has(zap.senderPubkey)) return false;
      seen.add(zap.senderPubkey);
      return true;
    });
  })();

  // Load cached data and fetch fresh data client-side
  onMount(async () => {
    // Try to load cached app first for instant display
    if (data.slug && !app) {
      try {
        const parsed = parseAppSlug(data.slug);
        const cachedApp = await getCachedApp(parsed.pubkey, parsed.dTag);
        if (cachedApp && !app) {
          app = cachedApp;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Try to load cached release for instant display
    if (app) {
      const cachedRelease = await getCachedRelease(app.pubkey, app.dTag);
      if (cachedRelease) {
        latestRelease = cachedRelease;
        loadingRelease = false;
      }

      // Also try cached zaps for instant UI
      const cachedZaps = await getCachedZaps(app.id, app.pubkey, app.dTag);
      if (cachedZaps) {
        zapsData = cachedZaps;
        loadingZaps = false;
      }
    }

    // Now fetch fresh data (will use cache if available, or fetch from relay)
    if (app) {
      try {
        // Fetch release (uses IndexedDB cache internally)
        const freshRelease = await fetchLatestReleaseForApp(app);
        if (freshRelease) {
          latestRelease = freshRelease;
        }
        loadingRelease = false;

        // Extract file metadata event IDs from release
        const fileEventIds = latestRelease?.eTags || [];

        // Fetch file metadata if we have IDs (uses IndexedDB cache internally)
        if (fileEventIds.length > 0) {
          loadingFileMetadata = true;
          try {
            fileMetadata = await fetchFileMetadata(fileEventIds);
          } catch (e) {
            console.warn("Failed to load file metadata:", e);
            fileMetadata = [];
          } finally {
            loadingFileMetadata = false;
          }
        }

        // Fetch zaps for both app and file events
        try {
          zapsData = await fetchAppAndFileZaps(
            app.id,
            app.pubkey,
            app.dTag,
            fileEventIds,
          );

          // Fetch profiles for unique zappers
          const uniqueSenders = [
            ...new Set(
              zapsData.zaps.map((z) => z.senderPubkey).filter(Boolean),
            ),
          ];
          await Promise.all(
            uniqueSenders.slice(0, 20).map(async (pubkey) => {
              try {
                const profile = await fetchProfile(pubkey);
                if (profile) {
                  zapperProfiles.set(pubkey, profile);
                  zapperProfiles = zapperProfiles; // Trigger reactivity
                }
              } catch (e) {
                console.warn("Failed to fetch zapper profile:", e);
              }
            }),
          );
        } catch (e) {
          console.warn("Failed to load zaps:", e);
          zapsData = { zaps: [], totalSats: 0, count: 0 };
        }
      } catch (e) {
        console.warn("Failed to load latest release:", e);
        latestRelease = null;
      } finally {
        loadingRelease = false;
        loadingZaps = false;
      }
    } else {
      loadingRelease = false;
      loadingZaps = false;
    }
  });

  // Keep the retry function for the error state
  async function retryLoad() {
    // Reload the page to trigger server fetch again
    window.location.reload();
  }

  // Build Android Intent URL for opening in app with fallback
  function getIntentUrl(slug) {
    // Android Intent URL format
    // If app is installed: opens the app
    // If not installed: uses browser_fallback_url to redirect to download
    return `intent://zapstore.dev/apps/${slug}#Intent;scheme=https;package=dev.zapstore.app;S.browser_fallback_url=https%3A%2F%2Fzapstore.dev%2Fdownload;end`;
  }

  // Highlight JSON using Prism
  function highlightJson(data) {
    if (!data) return "";
    const jsonString = JSON.stringify(data, null, 2);
    return Prism.highlight(jsonString, Prism.languages.json, "json");
  }

  // Handle zap received event from ZapButton
  function handleZapReceived(event) {
    const { zapReceipt } = event.detail;
    console.log("Zap received in app page:", zapReceipt);

    // Add the new zap to the list immediately
    if (zapReceipt) {
      zapsData = {
        zaps: [zapReceipt, ...zapsData.zaps],
        totalSats: zapsData.totalSats + zapReceipt.amountSats,
        count: zapsData.count + 1,
      };

      // Fetch the zapper's profile if not already loaded
      if (
        zapReceipt.senderPubkey &&
        !zapperProfiles.has(zapReceipt.senderPubkey)
      ) {
        fetchProfile(zapReceipt.senderPubkey).then((profile) => {
          if (profile) {
            zapperProfiles.set(zapReceipt.senderPubkey, profile);
            zapperProfiles = zapperProfiles; // Trigger reactivity
          }
        });
      }
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
  {#if app}
    <title>{app.name} - Zapstore</title>
    <meta name="description" content={app.description} />
    {#if app.icon}
      <meta property="og:image" content={app.icon} />
    {/if}
  {:else}
    <title>App Details - Zapstore</title>
  {/if}
</svelte:head>

{#if loading}
  <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <div class="flex items-center justify-center py-24">
      <div class="text-center">
        <div
          class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"
        ></div>
        <p class="text-muted-foreground">Loading app details...</p>
      </div>
    </div>
  </div>
{:else if error}
  <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <div class="flex items-center justify-center py-24">
      <div class="text-center">
        <div
          class="rounded-lg bg-destructive/10 border border-destructive/20 p-6 max-w-md"
        >
          <Package class="h-16 w-16 text-destructive mx-auto mb-4" />
          <h3 class="text-lg font-semibold text-destructive mb-2">
            App Not Found
          </h3>
          <p class="text-muted-foreground mb-4">{error}</p>
          <button
            on:click={retryLoad}
            class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 w-full"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  </div>
{:else if app}
  <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- App Header -->
    <div class="bg-card border border-border rounded-lg p-8 mb-8">
      <!-- App Icon and Name -->
      <div class="flex items-center gap-6 mb-6">
        <AppPic
          iconUrl={app.icon}
          name={app.name}
          identifier={app.dTag}
          size="xl"
          className="flex-shrink-0"
        />
        <div class="min-w-0 flex-1">
          <!-- App Name + Version Pill -->
          <div class="flex items-center gap-3 flex-wrap">
            <h1 class="text-3xl lg:text-4xl font-black">{app.name}</h1>
            {#if fileVersion}
              <span
                class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-primary text-white"
              >
                {fileVersion}
              </span>
            {/if}
          </div>
          <!-- Published by -->
          <div class="mt-1">
            <ProfileInfo pubkey={app.pubkey} npub={app.npub} size="xs" />
          </div>
        </div>
      </div>

      <!-- Zaps Section -->
      <div
        class="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg"
      >
        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <!-- Zap Stats -->
          <div class="flex items-center gap-3">
            <div class="p-2 bg-amber-500/20 rounded-lg">
              <Zap class="h-6 w-6 text-amber-500" />
            </div>
            {#if !loadingZaps && zapsData.count > 0}
              <div>
                <div class="text-lg font-bold text-amber-500">
                  {formatSats(zapsData.totalSats)}
                </div>
                <div class="text-xs text-muted-foreground">
                  {zapsData.count} zap{zapsData.count !== 1 ? "s" : ""}
                </div>
              </div>
            {:else if loadingZaps}
              <div class="text-sm text-muted-foreground">Loading zaps...</div>
            {:else}
              <div class="text-sm text-muted-foreground">No zaps yet</div>
            {/if}
          </div>

          <!-- Zapper Avatars (deduplicated) -->
          {#if !loadingZaps && uniqueZappers.length > 0}
            <div class="flex items-center gap-2 flex-1">
              <div class="text-xs text-muted-foreground">from</div>
              <div class="flex -space-x-2 overflow-hidden">
                {#each uniqueZappers.slice(0, 8) as zap}
                  {@const profile = zapperProfiles.get(zap.senderPubkey)}
                  <div
                    class="zapper-avatar"
                    title={profile?.displayName || profile?.name || "Anonymous"}
                  >
                    <ProfilePic
                      pictureUrl={profile?.picture}
                      name={profile?.displayName || profile?.name}
                      pubkey={zap.senderPubkey}
                      size="sm"
                    />
                  </div>
                {/each}
                {#if uniqueZappers.length > 8}
                  <div
                    class="w-7 h-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground"
                  >
                    +{uniqueZappers.length - 8}
                  </div>
                {/if}
              </div>
            </div>
          {/if}

          <!-- Zap Button (hidden for Zapstore-signed apps unless they have existing zaps) -->
          {#if showZapButton}
            <div class="sm:ml-auto">
              <ZapButton {app} size="md" on:zapReceived={handleZapReceived} />
            </div>
          {/if}
        </div>
      </div>

      <!-- Description -->
      <div
        class="text-muted-foreground mb-6 leading-relaxed prose prose-invert max-w-none"
      >
        {@html app.descriptionHtml}
      </div>

      <!-- App Meta -->
      <div class="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
        {#if app.category}
          <div class="flex items-center gap-1">
            <Tag class="h-4 w-4" />
            <span>{app.category}</span>
          </div>
        {/if}
        <div class="flex items-center gap-1">
          <Calendar class="h-4 w-4" />
          <span>Updated {formatDate(app.createdAt)}</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row gap-3">
        {#if isAndroid}
          <a
            href={getIntentUrl(data.slug)}
            class="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground shadow transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25"
          >
            <PackagePlus class="h-4 w-4 mr-2" />
            Open in Zapstore
          </a>
        {/if}
      </div>

      <!-- Screenshots -->
      {#if app.images && app.images.length > 0}
        <div class="mt-6 flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {#each app.images as image, index}
            <button
              type="button"
              on:click={() => openCarousel(index)}
              class="relative flex-shrink-0 overflow-hidden rounded-lg bg-muted cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              <img
                src={image}
                alt="Screenshot {index + 1}"
                class="h-40 w-auto object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
              <div
                class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200"
              ></div>
            </button>
          {/each}
        </div>
      {/if}
      <!-- Comments (kind 1111 replaceable) -->
      <div class="mt-6">
        <AppComments {app} version={fileVersion} />
      </div>
    </div>

    <!-- Screenshot Carousel Modal -->
    {#if carouselOpen && app.images && app.images.length > 0}
      <div
        class="fixed inset-0 z-50 flex items-center justify-center"
        on:click={closeCarousel}
        on:keydown={handleKeydown}
        role="dialog"
        aria-modal="true"
        aria-label="Screenshot carousel"
        tabindex="-1"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/90 backdrop-blur-sm"></div>

        <!-- Close button -->
        <button
          type="button"
          on:click={closeCarousel}
          class="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Close carousel"
        >
          <X class="h-6 w-6" />
        </button>

        <!-- Navigation buttons -->
        {#if app.images.length > 1}
          <button
            type="button"
            on:click|stopPropagation={prevImage}
            class="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft class="h-8 w-8" />
          </button>

          <button
            type="button"
            on:click|stopPropagation={nextImage}
            class="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Next image"
          >
            <ChevronRight class="h-8 w-8" />
          </button>
        {/if}

        <!-- Main image -->
        <div
          class="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
          on:click|stopPropagation
          on:keydown|stopPropagation
          role="presentation"
        >
          <img
            src={app.images[currentImageIndex]}
            alt="Screenshot {currentImageIndex + 1}"
            class="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />
        </div>

        <!-- Image counter & dots -->
        {#if app.images.length > 1}
          <div
            class="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
          >
            <!-- Dot indicators -->
            <div class="flex gap-2">
              {#each app.images as _, index}
                <button
                  type="button"
                  on:click|stopPropagation={() => (currentImageIndex = index)}
                  class="w-2.5 h-2.5 rounded-full transition-all {index ===
                  currentImageIndex
                    ? 'bg-white scale-110'
                    : 'bg-white/40 hover:bg-white/60'}"
                  aria-label="Go to screenshot {index + 1}"
                ></button>
              {/each}
            </div>
            <!-- Counter text -->
            <span class="text-white/70 text-sm font-medium">
              {currentImageIndex + 1} / {app.images.length}
            </span>
          </div>
        {/if}
      </div>
    {/if}

    <!-- App Details Sections -->
    <div class="space-y-8">
      <!-- Latest Release Notes -->
      {#if loadingRelease}
        <div class="bg-card border border-border rounded-lg p-6">
          <p class="text-muted-foreground">Loading release notes...</p>
        </div>
      {:else if latestRelease?.notesHtml}
        <div class="bg-card border border-border rounded-lg p-6">
          <div class="text-muted-foreground prose prose-invert max-w-none">
            {@html latestRelease.notesHtml}
          </div>
          {#if latestRelease.url}
            <div class="mt-4">
              <a
                href={latestRelease.url}
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80"
              >
                Release Link
                <ExternalLink class="h-3 w-3" />
              </a>
            </div>
          {/if}
        </div>
      {/if}

      {#if app.changelog}
        <div class="bg-card border border-border rounded-lg p-6">
          <h2 class="text-xl font-bold mb-4">What's New</h2>
          <div class="text-muted-foreground prose prose-invert max-w-none">
            {@html app.changelog}
          </div>
        </div>
      {/if}

      {#if app.requirements}
        <div class="bg-card border border-border rounded-lg p-6">
          <h2 class="text-xl font-bold mb-4">Requirements</h2>
          <div class="text-muted-foreground prose prose-invert max-w-none">
            {@html app.requirements}
          </div>
        </div>
      {/if}

      <!-- Technical Details -->
      <div class="bg-card border border-border rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-4">Technical Details</h3>
        <dl class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <dt class="text-sm font-medium text-muted-foreground">Publisher</dt>
            <dd class="mt-1">
              <ProfileInfo
                pubkey={app.pubkey}
                npub={app.npub}
                size="sm"
                showLabel={false}
              />
            </dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-muted-foreground">App ID</dt>
            <dd class="mt-1 text-sm font-mono">{app.dTag}</dd>
          </div>
          {#if app.category}
            <div>
              <dt class="text-sm font-medium text-muted-foreground">
                Category
              </dt>
              <dd class="mt-1 text-sm">{app.category}</dd>
            </div>
          {/if}
          {#if app.license}
            <div>
              <dt class="text-sm font-medium text-muted-foreground">License</dt>
              <dd class="mt-1 text-sm">
                <a
                  href={`https://spdx.org/licenses/${encodeURIComponent(app.license)}.html`}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm text-primary hover:text-primary/80 inline-flex items-center gap-1"
                >
                  {app.license}
                  <ExternalLink class="h-3 w-3" />
                </a>
              </dd>
            </div>
          {/if}
          {#if app.platform}
            <div>
              <dt class="text-sm font-medium text-muted-foreground">
                Platform
              </dt>
              <dd class="mt-1 text-sm">{app.platform}</dd>
            </div>
          {/if}
          {#if app.developer}
            <div>
              <dt class="text-sm font-medium text-muted-foreground">
                Developer
              </dt>
              <dd class="mt-1 text-sm">{app.developer}</dd>
            </div>
          {/if}
          {#if app.url}
            <div>
              <dt class="text-sm font-medium text-muted-foreground">Website</dt>
              <dd class="mt-1">
                <a
                  href={app.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm text-primary hover:text-primary/80 inline-flex items-center gap-1 break-words"
                >
                  {app.url}
                  <ExternalLink class="h-3 w-3" />
                </a>
              </dd>
            </div>
          {/if}
          {#if app.repository}
            <div>
              <dt class="text-sm font-medium text-muted-foreground">
                Source Code
              </dt>
              <dd class="mt-1">
                <a
                  href={app.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm text-primary hover:text-primary/80 inline-flex items-center gap-1"
                >
                  {#if app.repository.includes("github.com")}
                    <Github class="h-3 w-3" />
                  {:else}
                    <Code class="h-3 w-3" />
                  {/if}
                  View Repository
                  <ExternalLink class="h-3 w-3" />
                </a>
              </dd>
            </div>
          {/if}
        </dl>
      </div>

      <!-- Raw Data -->
      <details class="bg-card border border-border rounded-lg p-6">
        <summary
          class="text-lg font-semibold cursor-pointer hover:text-primary transition-colors"
          >Raw Event Data</summary
        >
        <div class="mt-4 space-y-6">
          <!-- Kind 32267 - App Event -->
          <div>
            <h4 class="text-md font-semibold mb-2">App (32267)</h4>
            <div
              class="bg-muted rounded p-4 overflow-auto max-h-96 custom-scrollbar"
            >
              <pre class="text-xs leading-relaxed"><code class="language-json"
                  >{@html highlightJson(app.fullEvent)}</code
                ></pre>
            </div>
          </div>

          <!-- Kind 30063 - Release Event -->
          {#if latestRelease}
            <div>
              <h4 class="text-md font-semibold mb-2">Release (30063)</h4>
              <div
                class="bg-muted rounded p-4 overflow-auto max-h-96 custom-scrollbar"
              >
                <pre class="text-xs leading-relaxed"><code class="language-json"
                    >{@html highlightJson(latestRelease.fullEvent)}</code
                  ></pre>
              </div>
            </div>
          {/if}

          <!-- Kind 1063 - File Metadata Events -->
          {#if fileMetadata.length > 0}
            {#each fileMetadata as fileMeta, index}
              <div>
                <h4 class="text-md font-semibold mb-2">
                  File Metadata (1063){#if fileMetadata.length > 1}
                    #{index + 1}{/if}
                </h4>
                <div
                  class="bg-muted rounded p-4 overflow-auto max-h-96 custom-scrollbar"
                >
                  <pre class="text-xs leading-relaxed"><code
                      class="language-json"
                      >{@html highlightJson(fileMeta.fullEvent)}</code
                    ></pre>
                </div>
              </div>
            {/each}
          {:else if loadingFileMetadata}
            <div>
              <h4 class="text-md font-semibold mb-2">File Metadata (1063)</h4>
              <p class="text-sm text-muted-foreground">
                Loading file metadata...
              </p>
            </div>
          {/if}
        </div>
      </details>
    </div>
  </div>
{/if}

<style>
  /* Zapper avatar styling for overlapping effect */
  .zapper-avatar {
    border-radius: 9999px;
    border: 2px solid hsl(var(--background));
  }

  /* Screenshot scrollbar styling */
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
  }

  .scrollbar-thin::-webkit-scrollbar {
    height: 6px;
  }

  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb {
    background-color: hsl(var(--muted-foreground) / 0.3);
    border-radius: 3px;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background-color: hsl(var(--muted-foreground) / 0.5);
  }

  /* Prism JSON syntax highlighting for dark theme */
  :global(pre code.language-json) {
    font-family: "Geist Mono", monospace;
    color: hsl(var(--foreground));
    background: transparent;
  }

  :global(pre code.language-json .token.property) {
    color: hsl(var(--primary));
    font-weight: 500;
  }

  :global(pre code.language-json .token.string) {
    color: hsl(var(--accent));
  }

  :global(pre code.language-json .token.number) {
    color: hsl(142 71% 45%);
  }

  :global(pre code.language-json .token.boolean) {
    color: hsl(217 91% 60%);
  }

  :global(pre code.language-json .token.null) {
    color: hsl(var(--muted-foreground));
    font-style: italic;
  }

  :global(pre code.language-json .token.punctuation) {
    color: hsl(var(--muted-foreground));
  }

  :global(pre code.language-json .token.operator) {
    color: hsl(var(--muted-foreground));
  }

  :global(pre code.language-json .token.keyword) {
    color: hsl(var(--primary));
  }

  /* Style markdown content */
  :global(.prose) {
    color: hsl(var(--muted-foreground));
  }

  :global(.prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6) {
    color: hsl(var(--foreground));
  }

  :global(.prose a) {
    color: hsl(var(--muted-foreground));
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  :global(.prose a:hover) {
    color: hsl(var(--foreground));
  }

  :global(.prose code) {
    background-color: hsl(var(--muted));
    padding: 0.2rem 0.4rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
  }

  :global(.prose pre) {
    background-color: hsl(var(--muted));
    border-radius: 0.5rem;
    padding: 1rem;
    overflow-x: auto;
  }

  :global(.prose blockquote) {
    border-left: 4px solid hsl(var(--primary));
    padding-left: 1rem;
    color: hsl(var(--muted-foreground));
    font-style: italic;
  }
</style>
