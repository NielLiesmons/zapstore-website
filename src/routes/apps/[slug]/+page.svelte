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
  import Timestamp from "$lib/components/Timestamp.svelte";
  import Prism from "prismjs";
  import "prismjs/components/prism-json";

  // Publisher profile state
  let publisherProfile = null;

  // Screenshot carousel state
  let carouselOpen = false;
  let currentImageIndex = 0;

  // Description expand state
  let descriptionExpanded = false;

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

  // Fetch publisher profile
  async function loadPublisherProfile(pubkey) {
    if (pubkey) {
      try {
        publisherProfile = await fetchProfile(pubkey);
      } catch (err) {
        console.error("Error fetching publisher profile:", err);
      }
    }
  }

  // Load publisher profile when app changes
  $: if (app?.pubkey) {
    loadPublisherProfile(app.pubkey);
  }

  // Get truncated npub for fallback display
  $: truncatedNpub = app?.npub
    ? `${app.npub.slice(0, 12)}...${app.npub.slice(-6)}`
    : "";
  $: publisherName =
    publisherProfile?.displayName || publisherProfile?.name || truncatedNpub;
  $: publisherPictureUrl = publisherProfile?.picture || "";
  $: publisherUrl = app?.npub ? `/p/${app.npub}` : "#";

  // Hide publisher info for Zapstore-signed apps
  $: showPublisher = app?.pubkey !== ZAPSTORE_PUBKEY;

  // Determine app platforms (most apps are Android only for now)
  $: platforms = app?.platform ? [app.platform] : ["Android"];

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

<!-- Platform icon components -->
{#snippet AppleIcon()}
  <svg
    class="platform-icon"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
    />
  </svg>
{/snippet}

{#snippet AndroidIcon()}
  <svg
    class="platform-icon"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.463 11.463 0 00-8.94 0L5.65 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L6.4 9.48A10.78 10.78 0 003 18h18a10.78 10.78 0 00-3.4-8.52zM8.5 14c-.83 0-1.5-.67-1.5-1.5S7.67 11 8.5 11s1.5.67 1.5 1.5S9.33 14 8.5 14zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
    />
  </svg>
{/snippet}

{#snippet WindowsIcon()}
  <svg
    class="platform-icon"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-10 .15V5.21L20 3zM3 13l6 .09v6.81l-6-1.15V13zm17 .25V22l-10-1.91V13.1l10 .15z"
    />
  </svg>
{/snippet}

{#snippet LinuxIcon()}
  <svg
    class="platform-icon"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587.006 1.22-.057 1.79-.179.57-.13 1.106-.345 1.542-.665a.45.45 0 00.13-.118c.053.088.12.166.2.235.44.396.936.585 1.456.678.52.094 1.063.088 1.574.043.5-.058 1.006-.13 1.379-.352.19-.11.363-.272.482-.486a1.23 1.23 0 00.148-.582c.002-.27-.073-.524-.19-.748-.058-.106-.12-.207-.179-.294l-.019-.028a4.474 4.474 0 01-.198-.32c-.142-.265-.238-.565-.268-.865-.036-.358.01-.74.138-1.107.134-.373.354-.725.652-1.027.065-.07.133-.136.204-.2a1.55 1.55 0 00-.167-.083c-.12-.057-.266-.108-.388-.19a2.233 2.233 0 01-.313-.265 3.86 3.86 0 01-.372-.408c-.096-.12-.19-.25-.278-.375a15.21 15.21 0 01-.225-.342c-.16-.266-.326-.502-.498-.705a4.06 4.06 0 00-.532-.512 2.76 2.76 0 00-.503-.307c.03-.28.04-.573.035-.87-.01-.7-.11-1.44-.333-2.088-.224-.647-.559-1.207-1.018-1.598-.456-.395-1.046-.63-1.757-.678-.707-.055-1.44.064-2.136.35-.694.288-1.352.75-1.863 1.404-.51.65-.855 1.474-.987 2.453-.13.985-.036 2.117.302 3.31.03.13.07.256.11.382-.23.135-.445.295-.644.475a5.61 5.61 0 00-.5.515c-.15.183-.28.38-.39.586a2.1 2.1 0 00-.192.655 1.86 1.86 0 00.046.702c.062.218.16.421.29.605l.016.022c-.076.12-.14.25-.19.39-.107.282-.157.585-.147.885.01.3.08.598.203.873.123.277.297.53.52.75l.032.032c.094.085.2.16.31.23a.424.424 0 00-.013.089c-.002.257.097.522.26.756.163.233.39.436.66.593l.023.013c-.142.143-.255.315-.332.51a1.67 1.67 0 00-.117.602c0 .257.063.5.17.722.106.224.258.42.444.58.189.16.408.284.65.37.24.087.505.135.784.135.273 0 .535-.046.773-.13.237-.09.454-.22.635-.4.183-.17.327-.39.42-.63.096-.24.143-.51.143-.79 0-.18-.023-.36-.073-.53a1.79 1.79 0 00-.193-.44.424.424 0 00.037-.026c.2-.154.342-.352.417-.577.075-.226.08-.474.027-.708a1.86 1.86 0 00-.198-.479z"
    />
  </svg>
{/snippet}

{#snippet WebIcon()}
  <svg
    class="platform-icon"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm7.931 9h-2.764a14.67 14.67 0 0 0-1.792-6.243A8.013 8.013 0 0 1 19.931 11zM12.53 4.027c1.035 1.364 2.427 3.78 2.627 6.973H9.03c.139-2.596.994-5.028 2.451-6.974.172-.01.344-.026.519-.026.179 0 .354.016.53.027zm-3.842.511C7.704 6.618 7.136 8.762 7.03 11H4.069a8.013 8.013 0 0 1 4.619-6.462zM4.069 13h2.974c.136 2.379.665 4.478 1.556 6.23A8.01 8.01 0 0 1 4.069 13zm7.381 6.973C10.049 18.275 9.222 15.896 9.041 13h6.113c-.208 2.773-1.117 5.196-2.603 6.972-.182.012-.364.028-.551.028-.186 0-.367-.016-.55-.027zm4.011-.772c.955-1.794 1.538-3.901 1.691-6.201h2.778a8.005 8.005 0 0 1-4.469 6.201z"
    />
  </svg>
{/snippet}

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
    <!-- Publisher Row -->
    {#if showPublisher}
      <div class="publisher-row flex items-center justify-between mb-6">
        <a
          href={publisherUrl}
          class="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <ProfilePic
            pictureUrl={publisherPictureUrl}
            name={publisherName}
            pubkey={app.pubkey}
            size="lg"
          />
          <span
            class="publisher-name text-base font-medium"
            style="color: hsl(var(--white66));"
          >
            {publisherName}
          </span>
        </a>
        <Timestamp timestamp={app.createdAt} size="sm" />
      </div>
    {/if}

    <!-- App Header Row -->
    <div class="app-header flex items-center gap-4 sm:gap-6 mb-6">
      <!-- App Icon -->
      <AppPic
        iconUrl={app.icon}
        name={app.name}
        identifier={app.dTag}
        size="2xl"
        className="app-icon-responsive flex-shrink-0"
      />

      <!-- App Info -->
      <div class="app-info flex-1 min-w-0">
        <!-- App Name -->
        <h1
          class="app-name text-[1.625rem] sm:text-4xl font-black mb-2 sm:mb-3"
          style="color: hsl(var(--white));"
        >
          {app.name}
        </h1>

        <!-- Platform Pills + Install Button Row -->
        <div class="platforms-row flex items-center gap-3">
          <!-- Scrollable Platform Pills -->
          <div class="platforms-scroll flex-1 overflow-x-auto scrollbar-hide">
            <div class="flex gap-2">
              {#each platforms as platform}
                <div
                  class="platform-pill flex items-center gap-2 flex-shrink-0"
                >
                  {#if platform === "iOS" || platform === "macOS" || platform === "Mac" || platform === "apple"}
                    {@render AppleIcon()}
                  {:else if platform === "Android" || platform === "android"}
                    {@render AndroidIcon()}
                  {:else if platform === "Windows" || platform === "windows"}
                    {@render WindowsIcon()}
                  {:else if platform === "Linux" || platform === "linux"}
                    {@render LinuxIcon()}
                  {:else}
                    {@render WebIcon()}
                  {/if}
                  <span
                    class="platform-text text-sm whitespace-nowrap"
                    style="color: hsl(var(--white66));"
                  >
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </span>
                </div>
              {/each}
            </div>
          </div>

          <!-- Install Button -->
          {#if isAndroid}
            <a href={getIntentUrl(data.slug)} class="install-btn flex-shrink-0">
              Install
            </a>
          {:else}
            <button type="button" class="install-btn flex-shrink-0" disabled>
              Install
            </button>
          {/if}
        </div>
      </div>
    </div>

    <!-- Screenshots -->
    {#if app.images && app.images.length > 0}
      <div
        class="screenshots-row flex gap-3 overflow-x-auto pb-2 scrollbar-thin mb-6"
      >
        {#each app.images as image, index}
          <button
            type="button"
            on:click={() => openCarousel(index)}
            class="screenshot-thumb relative flex-shrink-0 overflow-hidden rounded-2xl bg-muted cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          >
            <img
              src={image}
              alt="Screenshot {index + 1}"
              class="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
            <div
              class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200"
            ></div>
          </button>
        {/each}
      </div>
    {/if}

    <!-- Description -->
    <div class="description-container mb-6">
      <div
        class="app-description prose prose-invert max-w-none"
        class:clamped={!descriptionExpanded}
      >
        {@html app.descriptionHtml}
      </div>
      {#if !descriptionExpanded}
        <button
          type="button"
          class="read-more-btn"
          on:click={() => (descriptionExpanded = true)}
        >
          Read more
        </button>
      {/if}
    </div>

    <!-- Comments (kind 1111 replaceable) -->
    <div class="mb-8">
      <AppComments {app} version={fileVersion} />
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

    <!-- COMMENTED OUT: Zaps, Technical Details, Raw Event Data - will revisit later -->
    <!--
    <div class="space-y-8">
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

      <details class="bg-card border border-border rounded-lg p-6">
        <summary
          class="text-lg font-semibold cursor-pointer hover:text-primary transition-colors"
          >Raw Event Data</summary
        >
        <div class="mt-4 space-y-6">
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
    -->
  </div>
{/if}

<style>
  /* Responsive app icon - override component size */
  :global(.app-icon-responsive) {
    width: 80px !important;
    height: 80px !important;
    min-width: 80px !important;
    min-height: 80px !important;
  }

  /* Screenshot thumbnail - matches app icon width */
  .screenshot-thumb {
    width: 80px;
  }

  /* Larger screens: bigger app icon and screenshots */
  @media (min-width: 640px) {
    :global(.app-icon-responsive) {
      width: 96px !important;
      height: 96px !important;
      min-width: 96px !important;
      min-height: 96px !important;
    }

    .screenshot-thumb {
      width: 96px;
    }
  }

  /* Description styling - matches comment bubble content size */
  .app-description {
    font-size: 0.9375rem; /* 15px - same as MessageBubble content */
    line-height: 1.5;
    color: hsl(var(--foreground) / 0.85);
  }

  /* Slightly larger description on desktop */
  @media (min-width: 640px) {
    .app-description {
      font-size: 1rem; /* 16px */
    }
  }

  /* Line clamp for description */
  .app-description.clamped {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Read more button */
  .read-more-btn {
    display: inline-block;
    margin-top: 0.5rem;
    padding: 0;
    background: none;
    border: none;
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(var(--blurpleColor));
    cursor: pointer;
    transition: opacity 0.15s ease;
  }

  .read-more-btn:hover {
    opacity: 0.8;
  }

  /* Platform pills styling */
  .platform-pill {
    height: 32px;
    padding: 0 0.875rem 0 0.5rem;
    border-radius: 9999px;
    background-color: hsl(var(--white8));
  }

  .platform-icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    color: hsl(var(--white33));
  }

  /* Install button styling */
  .install-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 1rem;
    height: 32px;
    border-radius: 9999px;
    background-color: hsl(var(--blurpleColor));
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    white-space: nowrap;
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .install-btn:hover:not(:disabled) {
    background-color: hsl(var(--blurpleColor66));
    transform: scale(1.02);
  }

  .install-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Scrollbar hide utility */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
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
