<script>
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import {
    fetchAppStacks,
    fetchApp,
    fetchProfile,
    getAppSlug,
    pubkeyToNpub,
  } from "$lib/nostr.js";
  import SectionHeader from "$lib/components/SectionHeader.svelte";
  import AppSmallCard from "$lib/components/AppSmallCard.svelte";
  import ProfilePic from "$lib/components/ProfilePic.svelte";
  import SkeletonLoader from "$lib/components/SkeletonLoader.svelte";

  let stack = null;
  let apps = [];
  let loading = true;
  let error = null;

  $: stackId = $page.params.id;

  onMount(async () => {
    await loadStack();
  });

  async function loadStack() {
    try {
      loading = true;
      error = null;

      // Fetch all stacks and find the one matching our ID
      const allStacks = await fetchAppStacks({ limit: 100 });
      const foundStack = allStacks.find(
        (s) => s.identifier === stackId || s.id === stackId,
      );

      if (!foundStack) {
        error = "Stack not found";
        loading = false;
        return;
      }

      // Fetch creator profile
      let creator = null;
      if (foundStack.pubkey) {
        try {
          const profile = await fetchProfile(foundStack.pubkey);
          creator = {
            name: profile?.displayName || profile?.name,
            picture: profile?.picture,
            pubkey: foundStack.pubkey,
            npub: profile?.npub || pubkeyToNpub(foundStack.pubkey),
          };
        } catch (e) {
          creator = {
            name: null,
            picture: null,
            pubkey: foundStack.pubkey,
            npub: pubkeyToNpub(foundStack.pubkey),
          };
        }
      }

      stack = { ...foundStack, creator };

      // Fetch all apps referenced in the stack
      const appPromises = foundStack.appRefs.map(async (ref) => {
        try {
          const app = await fetchApp(ref.pubkey, ref.identifier);
          return app;
        } catch (e) {
          console.error("Failed to fetch app:", ref, e);
          return null;
        }
      });

      apps = (await Promise.all(appPromises)).filter(Boolean);
    } catch (err) {
      console.error("Error loading stack:", err);
      error = err.message;
    } finally {
      loading = false;
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
  <title>{stack?.name || "Stack"} — Zapstore</title>
  <meta
    name="description"
    content={stack?.description || "A curated collection of apps on Zapstore"}
  />
</svelte:head>

<section class="stack-page">
  <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
    {#if loading}
      <!-- Loading State -->
      <div class="stack-header-skeleton">
        <div class="skeleton-title"><SkeletonLoader /></div>
        <div class="skeleton-desc"></div>
        <div class="skeleton-creator">
          <div class="skeleton-avatar"><SkeletonLoader /></div>
          <div class="skeleton-name-small"></div>
        </div>
      </div>

      <div class="section-container">
        <div class="horizontal-scroll">
          <div class="scroll-content">
            {#each Array(3) as _, colIndex}
              <div class="app-column">
                {#each Array(3) as _, cardIndex}
                  <div class="skeleton-card">
                    <div class="skeleton-icon"><SkeletonLoader /></div>
                    <div class="skeleton-info">
                      <div class="skeleton-name"><SkeletonLoader /></div>
                      <div class="skeleton-desc-small"></div>
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
              Error Loading Stack
            </h3>
            <p class="text-muted-foreground mb-4">{error}</p>
            <a href="/discover" class="btn-primary"> Back to Discover </a>
          </div>
        </div>
      </div>
    {:else if stack}
      <!-- Stack Header -->
      <div class="stack-header">
        <h1 class="stack-title">{stack.name}</h1>
        {#if stack.description}
          <p class="stack-description">{stack.description}</p>
        {/if}

        {#if stack.creator}
          <a href="/p/{stack.creator.npub}" class="creator-link">
            <ProfilePic
              pictureUrl={stack.creator.picture}
              name={stack.creator.name}
              pubkey={stack.creator.pubkey}
              size="sm"
            />
            <span class="creator-name"
              >by {stack.creator.name || "Anonymous"}</span
            >
          </a>
        {/if}
      </div>

      <!-- Apps Section -->
      <div class="section-container">
        <SectionHeader title="Apps in this stack" />
        {#if apps.length > 0}
          <div class="horizontal-scroll">
            <div class="scroll-content">
              {#each appColumns as column}
                <div class="app-column">
                  {#each column as app}
                    <AppSmallCard {app} href={getAppUrl(app)} />
                  {/each}
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="placeholder-content">
            <p class="text-muted-foreground text-sm">
              No apps found in this stack.
            </p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</section>

<style>
  .stack-page {
    min-height: 100vh;
  }

  /* Stack Header */
  .stack-header {
    margin-bottom: 32px;
  }

  .stack-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: hsl(var(--foreground));
    margin: 0 0 8px 0;
    line-height: 1.2;
  }

  .stack-description {
    font-size: 1rem;
    color: hsl(var(--white66));
    margin: 0 0 16px 0;
    line-height: 1.5;
  }

  .creator-link {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    transition: opacity 0.15s ease;
  }

  .creator-link:hover {
    opacity: 0.8;
  }

  .creator-name {
    font-size: 0.875rem;
    color: hsl(var(--white33));
  }

  @media (min-width: 768px) {
    .stack-title {
      font-size: 2rem;
    }

    .stack-description {
      font-size: 1.125rem;
    }
  }

  .section-container {
    margin-bottom: 40px;
  }

  /* Horizontal scroll container */
  .horizontal-scroll {
    margin-left: -1rem;
    margin-right: -1rem;
    padding-left: 1rem;
    padding-right: 1rem;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;

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
    padding-bottom: 8px;
  }

  .app-column {
    flex-shrink: 0;
    width: 280px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  @media (min-width: 768px) {
    .app-column {
      width: 320px;
      gap: 16px;
    }
  }

  .placeholder-content {
    padding: 24px;
    background-color: hsl(var(--gray66));
    border-radius: 16px;
    text-align: center;
  }

  /* Skeleton styles */
  .stack-header-skeleton {
    margin-bottom: 32px;
  }

  .skeleton-title {
    width: 200px;
    height: 32px;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 12px;
  }

  .skeleton-desc {
    width: 300px;
    height: 20px;
    border-radius: 6px;
    background-color: hsl(var(--gray33));
    margin-bottom: 16px;
  }

  .skeleton-creator {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .skeleton-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    overflow: hidden;
  }

  .skeleton-name-small {
    width: 100px;
    height: 16px;
    border-radius: 6px;
    background-color: hsl(var(--gray33));
  }

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

  .skeleton-desc-small {
    width: 180px;
    height: 14px;
    border-radius: 6px;
    background-color: hsl(var(--gray33));
  }

  @media (min-width: 768px) {
    .skeleton-card {
      gap: 20px;
    }

    .skeleton-icon {
      width: 72px;
      height: 72px;
      border-radius: 24px;
    }
  }
</style>
