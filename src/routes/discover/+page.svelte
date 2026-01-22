<script>
  import { onMount } from "svelte";
  import {
    fetchApps,
    fetchApp,
    getAppSlug,
    cacheApp,
    fetchAppStacks,
    resolveStackApps,
    fetchProfile,
    pubkeyToNpub,
  } from "$lib/nostr.js";
  import SectionHeader from "$lib/components/SectionHeader.svelte";
  import AppSmallCard from "$lib/components/AppSmallCard.svelte";
  import AppStackCard from "$lib/components/AppStackCard.svelte";
  import SkeletonLoader from "$lib/components/SkeletonLoader.svelte";

  // Receive server-rendered data
  export let data;

  let apps = data.apps || [];
  let loading = data.loading;
  let error = data.error || null;
  let loadingMore = false;
  let hasMore = data.hasMore;

  // App Stacks state
  let stacks = [];
  let stacksLoading = true;

  // Cache apps for instant loading in detail page
  $: {
    apps.forEach((app) => {
      cacheApp(app);
    });
  }

  // Load app stacks when apps are available
  onMount(async () => {
    if (apps.length > 0) {
      await loadStacks();
    }
  });

  // Also load stacks when apps change (in case they load after mount)
  $: if (apps.length > 0 && stacks.length === 0 && stacksLoading) {
    loadStacks();
  }

  async function loadStacks() {
    try {
      stacksLoading = true;
      const rawStacks = await fetchAppStacks({ limit: 30 });

      // Resolve app references and fetch creator profiles
      // Also fetch apps that aren't in our current list
      const resolvedStacks = await Promise.all(
        rawStacks.map(async (stack) => {
          // First try to resolve from already loaded apps
          let resolved = resolveStackApps(stack, apps);

          // If we didn't get all apps, try fetching the missing ones
          if (
            resolved.apps.length < stack.appRefs.length &&
            stack.appRefs.length > 0
          ) {
            const missingRefs = stack.appRefs.filter(
              (ref) =>
                !resolved.apps.find(
                  (a) => a.pubkey === ref.pubkey && a.dTag === ref.identifier,
                ),
            );

            // Fetch missing apps individually (limit to first 4 for display)
            const fetchPromises = missingRefs
              .slice(0, 4 - resolved.apps.length)
              .map(async (ref) => {
                try {
                  const app = await fetchApp(ref.pubkey, ref.identifier);
                  return app;
                } catch (e) {
                  return null;
                }
              });

            const fetchedApps = (await Promise.all(fetchPromises)).filter(
              Boolean,
            );
            resolved.apps = [...resolved.apps, ...fetchedApps].slice(0, 4);
          }

          // Fetch creator profile
          let creator = null;
          if (stack.pubkey) {
            try {
              const profile = await fetchProfile(stack.pubkey);
              creator = {
                name: profile?.displayName || profile?.name,
                picture: profile?.picture,
                pubkey: stack.pubkey,
                npub: profile?.npub || pubkeyToNpub(stack.pubkey),
              };
            } catch (e) {
              creator = {
                name: null,
                picture: null,
                pubkey: stack.pubkey,
                npub: pubkeyToNpub(stack.pubkey),
              };
            }
          }

          return { ...resolved, creator };
        }),
      );

      // Keep all stacks, even those with no resolved apps (they might have apps we couldn't fetch)
      stacks = resolvedStacks.filter((s) => s.name); // Just filter out ones without names
    } catch (err) {
      console.error("Error loading stacks:", err);
    } finally {
      stacksLoading = false;
    }
  }

  async function loadMoreApps() {
    if (loadingMore || !hasMore) return;

    try {
      loadingMore = true;
      const PAGE_SIZE = 30;

      // For pagination, use the oldest loaded app's created_at as 'until' filter
      const until =
        apps.length > 0
          ? Math.min(...apps.map((app) => app.createdAt))
          : undefined;

      const options = { limit: PAGE_SIZE + 1 };
      if (until) {
        options.until = until;
      }

      const newApps = await fetchApps(options);

      // Filter out any duplicates and add only up to PAGE_SIZE
      const existingIds = new Set(apps.map((app) => app.id));
      const uniqueNewApps = newApps.filter((app) => !existingIds.has(app.id));

      // Determine if there are more results
      hasMore = newApps.length > PAGE_SIZE;
      const toAppend = uniqueNewApps.slice(0, PAGE_SIZE);
      apps = [...apps, ...toAppend];
    } catch (err) {
      console.error("Error fetching more apps:", err);
    } finally {
      loadingMore = false;
    }
  }

  function getAppUrl(app) {
    return `/apps/${getAppSlug(app.pubkey, app.dTag)}`;
  }

  // Group apps into columns of 3 for horizontal scroll
  function getAppColumns(appList, itemsPerColumn = 3) {
    const columns = [];
    for (let i = 0; i < appList.length; i += itemsPerColumn) {
      columns.push(appList.slice(i, i + itemsPerColumn));
    }
    return columns;
  }

  $: appColumns = getAppColumns(apps, 3);
</script>

<svelte:head>
  <title>Discover — Zapstore</title>
  <meta
    name="description"
    content="Discover apps, stacks, communities and more on Zapstore"
  />
</svelte:head>

<section class="discover-page">
  <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
    {#if loading}
      <!-- Loading State -->
      <div class="section-container">
        <SectionHeader title="Apps" linkText="See all" href="/apps" />
        <div class="horizontal-scroll">
          <div class="scroll-content">
            {#each Array(4) as _, colIndex}
              <div class="app-column">
                {#each Array(3) as _, cardIndex}
                  <div class="skeleton-card">
                    <div class="skeleton-icon">
                      <SkeletonLoader />
                    </div>
                    <div class="skeleton-info">
                      <div class="skeleton-name">
                        <SkeletonLoader />
                      </div>
                      <div class="skeleton-desc"></div>
                    </div>
                  </div>
                {/each}
              </div>
            {/each}
          </div>
        </div>
      </div>
    {:else if error}
      <!-- Error State -->
      <div class="flex items-center justify-center py-24">
        <div class="text-center">
          <div
            class="rounded-lg bg-destructive/10 border border-destructive/20 p-6 max-w-md"
          >
            <h3 class="text-lg font-semibold text-destructive mb-2">
              Error Loading Content
            </h3>
            <p class="text-muted-foreground mb-4">{error}</p>
            <button
              on:click={() => window.location.reload()}
              class="btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    {:else}
      <!-- Apps Section -->
      <div class="section-container">
        <SectionHeader title="Apps" linkText="See all" href="/apps" />
        {#if apps.length === 0}
          <!-- Apps loading skeleton -->
          <div class="horizontal-scroll">
            <div class="scroll-content">
              {#each Array(4) as _}
                <div class="app-column">
                  {#each Array(3) as _}
                    <div class="skeleton-card">
                      <div class="skeleton-icon">
                        <SkeletonLoader />
                      </div>
                      <div class="skeleton-info">
                        <div class="skeleton-name">
                          <SkeletonLoader />
                        </div>
                        <div class="skeleton-desc"></div>
                      </div>
                    </div>
                  {/each}
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="horizontal-scroll">
            <div class="scroll-content">
              {#each appColumns as column, colIndex}
                <div class="app-column">
                  {#each column as app, cardIndex}
                    <AppSmallCard {app} href={getAppUrl(app)} />
                  {/each}
                </div>
              {/each}

              {#if hasMore}
                <div class="load-more-column">
                  <button
                    class="load-more-btn"
                    on:click={loadMoreApps}
                    disabled={loadingMore}
                  >
                    {#if loadingMore}
                      <div class="spinner"></div>
                    {:else}
                      <span>Load more</span>
                    {/if}
                  </button>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <!-- Stacks Section -->
      <div class="section-container">
        <SectionHeader title="Stacks" linkText="See all" href="/stacks" />
        {#if stacksLoading}
          <div class="horizontal-scroll">
            <div class="scroll-content">
              {#each Array(4) as _}
                <div class="stack-item">
                  <div class="skeleton-stack">
                    <div class="skeleton-stack-grid">
                      <SkeletonLoader />
                    </div>
                    <div class="skeleton-stack-info">
                      <div class="skeleton-stack-name"><SkeletonLoader /></div>
                      <div class="skeleton-stack-desc"></div>
                      <div class="skeleton-stack-creator">
                        <div class="skeleton-stack-avatar">
                          <SkeletonLoader />
                        </div>
                        <div class="skeleton-stack-creator-name"></div>
                      </div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {:else if stacks.length > 0}
          <div class="horizontal-scroll">
            <div class="scroll-content">
              {#each stacks as stack}
                <div class="stack-item">
                  <AppStackCard
                    {stack}
                    href="/stacks/{stack.identifier ||
                      stack.name?.toLowerCase().replace(/\s+/g, '-')}"
                  />
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="placeholder-content">
            <p class="text-muted-foreground text-sm">
              No app stacks found yet. Create one in the Zapstore app!
            </p>
          </div>
        {/if}
      </div>

      <!-- Catalogs Section (placeholder) -->
      <div class="section-container">
        <SectionHeader title="Catalogs" linkText="See all" href="/catalogs" />
        <div class="placeholder-content">
          <p class="text-muted-foreground text-sm">Catalogs coming soon...</p>
        </div>
      </div>

      <!-- Labels Section (placeholder) -->
      <div class="section-container">
        <SectionHeader title="Labels" linkText="See all" href="/labels" />
        <div class="placeholder-content">
          <p class="text-muted-foreground text-sm">
            App labels and categories coming soon...
          </p>
        </div>
      </div>
    {/if}
  </div>
</section>

<style>
  .discover-page {
    min-height: 100vh;
  }

  .section-container {
    margin-bottom: 40px;
  }

  /* Horizontal scroll container */
  .horizontal-scroll {
    /* Allow scroll to extend to edges */
    margin-left: -1rem;
    margin-right: -1rem;
    padding-left: 1rem;
    padding-right: 1rem;
    overflow-x: auto;
    overflow-y: hidden;

    /* Hide scrollbar but keep functionality */
    scrollbar-width: none;
    -ms-overflow-style: none;

    /* Fade mask: opaque in center, transparent at edges */
    mask-image: linear-gradient(
      to right,
      transparent 0%,
      black 1rem,
      black calc(100% - 1rem),
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to right,
      transparent 0%,
      black 1rem,
      black calc(100% - 1rem),
      transparent 100%
    );
  }

  .horizontal-scroll::-webkit-scrollbar {
    display: none;
  }

  @media (min-width: 640px) {
    .horizontal-scroll {
      margin-left: -1.5rem;
      margin-right: -1.5rem;
      padding-left: 1.5rem;
      padding-right: 1.5rem;

      mask-image: linear-gradient(
        to right,
        transparent 0%,
        black 1.5rem,
        black calc(100% - 1.5rem),
        transparent 100%
      );
      -webkit-mask-image: linear-gradient(
        to right,
        transparent 0%,
        black 1.5rem,
        black calc(100% - 1.5rem),
        transparent 100%
      );
    }
  }

  @media (min-width: 1024px) {
    .horizontal-scroll {
      margin-left: -2rem;
      margin-right: -2rem;
      padding-left: 2rem;
      padding-right: 2rem;

      mask-image: linear-gradient(
        to right,
        transparent 0%,
        black 2rem,
        black calc(100% - 2rem),
        transparent 100%
      );
      -webkit-mask-image: linear-gradient(
        to right,
        transparent 0%,
        black 2rem,
        black calc(100% - 2rem),
        transparent 100%
      );
    }
  }

  .scroll-content {
    display: flex;
    gap: 16px;
    padding-bottom: 8px; /* Space for any overflow */
  }

  /* App column (vertical stack of 3 apps) */
  .app-column {
    flex-shrink: 0;
    width: 280px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* Desktop: wider columns for larger cards */
  @media (min-width: 768px) {
    .app-column {
      width: 320px;
      gap: 16px;
    }
  }

  /* Stack item (single row horizontal scroll) */
  .stack-item {
    flex-shrink: 0;
    width: 280px;
  }

  @media (min-width: 768px) {
    .stack-item {
      width: 320px;
    }
  }

  /* Load more button column */
  .load-more-column {
    flex-shrink: 0;
    width: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .load-more-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 20px;
    border-radius: 12px;
    background-color: hsl(var(--gray66));
    color: hsl(var(--white66));
    font-size: 0.875rem;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .load-more-btn:hover:not(:disabled) {
    background-color: hsl(var(--gray44));
    color: hsl(var(--foreground));
  }

  .load-more-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid hsl(var(--white33));
    border-top-color: hsl(var(--foreground));
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Placeholder content for upcoming sections */
  .placeholder-content {
    padding: 24px;
    background-color: hsl(var(--gray66));
    border-radius: 16px;
    text-align: center;
  }

  /* Skeleton loading styles */
  .skeleton-card {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .skeleton-icon {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .skeleton-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .skeleton-name {
    width: 120px;
    height: 18px;
    border-radius: 8px;
    overflow: hidden;
  }

  .skeleton-desc {
    width: 180px;
    height: 14px;
    border-radius: 6px;
    background-color: hsl(var(--gray33));
  }

  /* Desktop: larger skeletons */
  @media (min-width: 768px) {
    .skeleton-card {
      gap: 20px;
    }

    .skeleton-icon {
      width: 72px;
      height: 72px;
      border-radius: 24px;
    }

    .skeleton-name {
      width: 140px;
      height: 20px;
    }

    .skeleton-desc {
      width: 220px;
      height: 16px;
    }
  }

  /* Skeleton for stack cards */
  .skeleton-stack {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
  }

  .skeleton-stack-grid {
    width: 84px;
    height: 84px;
    border-radius: 16px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .skeleton-stack-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .skeleton-stack-name {
    width: 100px;
    max-width: 100%;
    height: 16px;
    border-radius: 6px;
    overflow: hidden;
  }

  .skeleton-stack-desc {
    width: 140px;
    max-width: 100%;
    height: 12px;
    border-radius: 4px;
    background-color: hsl(var(--gray33));
  }

  .skeleton-stack-creator {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }

  .skeleton-stack-avatar {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
  }

  .skeleton-stack-creator-name {
    width: 60px;
    height: 12px;
    border-radius: 4px;
    background-color: hsl(var(--gray33));
  }

  @media (min-width: 768px) {
    .skeleton-stack {
      gap: 20px;
    }

    .skeleton-stack-grid {
      width: 104px;
      height: 104px;
      border-radius: 20px;
    }

    .skeleton-stack-name {
      width: 120px;
      height: 18px;
    }

    .skeleton-stack-desc {
      width: 180px;
      height: 14px;
    }
  }
</style>
