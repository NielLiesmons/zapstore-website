<script>
  import { onMount } from "svelte";
  import {
    Package,
    Download,
    ExternalLink,
    User,
    Calendar,
  } from "lucide-svelte";
  import {
    fetchApps,
    formatDate,
    getAppSlug,
    getDiscoverPageState,
    setDiscoverPageState,
    cacheApp,
    fetchAppVersion,
  } from "$lib/nostr.js";
  import ProfileInfo from "$lib/components/ProfileInfo.svelte";
  import AppPic from "$lib/components/AppPic.svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";

  // Receive server-rendered data
  export let data;

  // Check if we have cached state from previous visit
  const cachedState = getDiscoverPageState();
  const hasCachedState = cachedState.apps.length > 0 && !data.initialQuery;

  let apps = hasCachedState ? cachedState.apps : data.apps;
  let loading = data.loading;
  let error = data.error || null;
  let loadingMore = false;
  let hasMore = hasCachedState ? cachedState.hasMore : data.hasMore;
  let query = data.initialQuery || cachedState.query || "";
  let debouncedQuery = data.initialQuery || cachedState.query || "";
  let canSearch = false;
  $: canSearch = query.trim().length > 0;
  const PAGE_SIZE = 12;

  // Store versions fetched from FileMetadata
  let appVersions = new Map();

  // Fetch version for an app from FileMetadata
  async function loadVersionForApp(app) {
    if (!app?.id || appVersions.has(app.id)) return;
    const version = await fetchAppVersion(app);
    if (version) {
      appVersions.set(app.id, version);
      appVersions = appVersions; // Trigger reactivity
    }
  }

  // Cache apps for instant loading in detail page
  $: {
    apps.forEach((app) => {
      cacheApp(app);
      loadVersionForApp(app);
    });
    // Save state for when user navigates back
    setDiscoverPageState({
      apps,
      hasMore,
      query: debouncedQuery,
      expanded: apps.length > PAGE_SIZE,
    });
  }

  async function loadApps(reset = true) {
    try {
      if (reset) {
        loading = true;
        error = null;
        apps = [];
        hasMore = true;
      } else {
        loadingMore = true;
      }

      // For pagination, use the oldest loaded app's created_at as 'until' filter
      const until =
        !reset && apps.length > 0
          ? Math.min(...apps.map((app) => app.createdAt))
          : undefined;
      const options = { limit: PAGE_SIZE + 1 };
      if (until) {
        options.until = until;
      }
      if (debouncedQuery && debouncedQuery.trim().length > 0) {
        options.search = debouncedQuery.trim();
      }

      const newApps = await fetchApps(options);

      if (reset) {
        // Determine if we have more than one page by overfetching by 1
        hasMore = newApps.length > PAGE_SIZE;
        apps = newApps.slice(0, PAGE_SIZE);
        loading = false;
      } else {
        // Filter out any duplicates and add only up to PAGE_SIZE
        const existingIds = new Set(apps.map((app) => app.id));
        const uniqueNewApps = newApps.filter((app) => !existingIds.has(app.id));
        // Determine if there are more results by checking raw fetch size
        hasMore = newApps.length > PAGE_SIZE;
        const toAppend = uniqueNewApps.slice(0, PAGE_SIZE);
        apps = [...apps, ...toAppend];
        loadingMore = false;
      }
    } catch (err) {
      console.error("Error fetching apps:", err);
      error = err.message;
      loading = false;
      loadingMore = false;
    }
  }

  async function loadMoreApps() {
    if (!loadingMore && hasMore) {
      await loadApps(false);
    }
  }

  // No onMount needed - initial data comes from server!

  function onInputQuery(e) {
    query = e.target.value;
    const trimmed = query.trim();
    if (trimmed.length === 0 && debouncedQuery) {
      debouncedQuery = "";
      updateURLAndLoadApps("");
    }
  }

  function onKeyDownQuery(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      executeSearch();
    }
  }

  function executeSearch() {
    const trimmed = query.trim();
    if (!trimmed) {
      debouncedQuery = "";
      updateURLAndLoadApps("");
      return;
    }
    debouncedQuery = trimmed;
    updateURLAndLoadApps(trimmed);
  }

  async function updateURLAndLoadApps(searchQuery) {
    // Update URL with search parameter
    const url = new URL($page.url);
    if (searchQuery) {
      url.searchParams.set("q", searchQuery);
    } else {
      url.searchParams.delete("q");
    }

    // Navigate without reloading the page
    await goto(url.toString(), {
      replaceState: false,
      noScroll: true,
      keepFocus: true,
    });

    // Load apps with the new search query
    await loadApps(true);
  }

  function getAppUrl(app) {
    return `/apps/${getAppSlug(app.pubkey, app.dTag)}`;
  }
</script>

<svelte:head>
  <title>Apps — Zapstore</title>
  <meta name="description" content="Browse apps on Zapstore" />
</svelte:head>

<!-- Hero Section --

<!-- Search + Apps Grid -->
<section class="pt-2 pb-4">
  <div class="container mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Search bar -->
    <div class="mb-6 py-4">
      <div class="max-w-2xl mx-auto flex items-stretch gap-2">
        <input
          type="search"
          placeholder="Search apps by name, description, or tags..."
          class="flex-1 rounded-md border border-border bg-background px-6 py-3 text-[1rem] shadow-sm focus:outline-none focus:ring-1 focus:ring-border focus:border-muted-foreground/40 placeholder:text-gray-500 dark:placeholder:text-gray-400"
          on:input={onInputQuery}
          on:keydown={onKeyDownQuery}
          value={query}
        />
        <button
          on:click={executeSearch}
          disabled={!canSearch}
          class="inline-flex items-center justify-center rounded-md bg-card px-4 py-2 text-sm font-medium shadow-sm transition-all hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Search"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg
          >
        </button>
      </div>
    </div>

    {#if loading}
      <div class="flex items-center justify-center py-24">
        <div class="text-center">
          <div
            class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"
          ></div>
          <p class="text-muted-foreground">
            Loading apps from the nostr network...
          </p>
        </div>
      </div>
    {:else if error}
      <div class="flex items-center justify-center py-24">
        <div class="text-center">
          <div
            class="rounded-lg bg-destructive/10 border border-destructive/20 p-6 max-w-md"
          >
            <h3 class="text-lg font-semibold text-destructive mb-2">
              Error Loading Apps
            </h3>
            <p class="text-muted-foreground mb-4">{error}</p>
            <button
              on:click={loadApps}
              class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    {:else}
      <p class="text-sm text-muted-foreground mb-4">
        Current catalog relays: <code
          class="font-mono bg-muted px-1.5 py-0.5 rounded"
          >relay.zapstore.dev</code
        >
      </p>
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {#each apps as app}
          <div
            class="group relative overflow-hidden rounded-lg border border-border bg-card hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5"
          >
            <a href={getAppUrl(app)} class="block p-6">
              <!-- App Icon and Name -->
              <div class="flex items-start gap-4 mb-4">
                <AppPic
                  iconUrl={app.icon}
                  name={app.name}
                  identifier={app.dTag}
                  size="lg"
                />
                <div class="min-w-0 flex-1">
                  <h3
                    class="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight"
                  >
                    {app.name}
                  </h3>
                  {#if appVersions.get(app.id)}
                    <div class="mt-0.5">
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary text-white max-w-[140px]"
                      >
                        <span class="truncate"
                          >{appVersions.get(app.id).length > 20
                            ? appVersions.get(app.id).slice(0, 20) + "…"
                            : appVersions.get(app.id)}</span
                        >
                      </span>
                    </div>
                  {/if}
                </div>
              </div>

              <!-- Description -->
              <div class="text-sm text-muted-foreground mb-4 line-clamp-3">
                {@html app.descriptionHtml}
              </div>

              <!-- App Images Preview -->
              <!-- Publisher and Date -->
              <div class="space-y-3">
                <!-- Publisher Profile -->
                <ProfileInfo
                  pubkey={app.pubkey}
                  npub={app.npub}
                  size="xs"
                  showLabel={true}
                  disableLink={true}
                />

                <!-- Date -->
                <div
                  class="flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <Calendar class="h-3 w-3" />
                  <span>{formatDate(app.createdAt, { month: "short" })}</span>
                </div>
              </div>
            </a>
          </div>
        {/each}
      </div>

      <!-- See More Button -->
      {#if hasMore}
        <div class="text-center mt-12">
          <button
            on:click={loadMoreApps}
            disabled={loadingMore}
            class="inline-flex items-center justify-center rounded-md border border-input bg-background px-8 py-3 text-sm font-medium shadow-sm transition-all hover:bg-accent hover:text-accent-foreground hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if loadingMore}
              <div
                class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"
              ></div>
              Loading more...
            {:else}
              See More Apps
            {/if}
          </button>
        </div>
      {/if}
    {/if}
  </div>
</section>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
