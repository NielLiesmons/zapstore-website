<script>
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import {
    fetchAppStacks,
    fetchApp,
    fetchProfile,
    getAppSlug,
    pubkeyToNpub,
    parseStackSlug,
  } from "$lib/nostr.js";
  import { authStore } from "$lib/stores/auth.js";
  import { createSearchProfilesFunction } from "$lib/services/profile-search.js";
  import { createSearchEmojisFunction } from "$lib/services/emoji-search.js";
  import { wheelScroll } from "$lib/actions/wheelScroll.js";
  import AppSmallCard from "$lib/components/AppSmallCard.svelte";
  import ProfilePic from "$lib/components/ProfilePic.svelte";
  import ProfilePicStack from "$lib/components/ProfilePicStack.svelte";
  import SocialTabs from "$lib/components/SocialTabs.svelte";
  import BottomBar from "$lib/components/BottomBar.svelte";
  import Timestamp from "$lib/components/Timestamp.svelte";
  import SkeletonLoader from "$lib/components/SkeletonLoader.svelte";
  import DetailHeader from "$lib/components/DetailHeader.svelte";

  // Catalog for this stack - currently just Zapstore
  const catalogs = [
    {
      name: "Zapstore",
      pictureUrl: "https://zapstore.dev/zapstore-icon.png",
      pubkey:
        "78ce6faa72264387284e647ba6938995735ec8c7d5c5a65737e55f2fe2202182",
    },
  ];

  let stack = null;
  let apps = [];
  let loading = true;
  let error = null;

  // Search functions (reactive based on logged-in user)
  $: searchProfiles = $authStore.pubkey 
    ? createSearchProfilesFunction($authStore.pubkey) 
    : async () => [];
  
  $: searchEmojis = createSearchEmojisFunction($authStore.pubkey);

  $: stackNaddr = $page.params.naddr;

  onMount(async () => {
    await loadStack();
  });

  async function loadStack() {
    try {
      loading = true;
      error = null;

      // Parse the naddr to get pubkey and identifier
      let stackPubkey, stackIdentifier;
      try {
        const parsed = parseStackSlug(stackNaddr);
        stackPubkey = parsed.pubkey;
        stackIdentifier = parsed.identifier;
      } catch (parseErr) {
        error = "Invalid stack URL";
        loading = false;
        return;
      }

      // Fetch all stacks and find the one matching our pubkey and identifier
      const allStacks = await fetchAppStacks({
        limit: 100,
        authors: [stackPubkey],
      });
      const foundStack = allStacks.find(
        (s) => s.pubkey === stackPubkey && s.identifier === stackIdentifier,
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

  // Helper to capitalize a string (first letter uppercase)
  function capitalize(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  // Helper to get first N words from a string
  function getFirstWords(text, count = 5) {
    if (!text) return "";
    const words = text.trim().split(/\s+/);
    const result = words.slice(0, count).join(" ");
    return words.length > count ? result + "…" : result;
  }

  // Check if description is essentially the same as the name (case-insensitive)
  function isDescriptionSameAsName(name, description) {
    if (!name || !description) return false;
    return name.toLowerCase().trim() === description.toLowerCase().trim();
  }

  // Computed display values for stack
  $: displayTitle = capitalize(stack?.name) || capitalize(getFirstWords(stack?.description, 5)) || "Untitled Stack";
  $: displayDescription = (!stack?.name || !stack?.description || isDescriptionSameAsName(stack?.name, stack?.description))
    ? `A stack of curated ${displayTitle} applications`
    : stack?.description;
</script>

<svelte:head>
  <title>{stack?.name || "Stack"} — Zapstore</title>
  <meta
    name="description"
    content={stack?.description || "A curated collection of apps on Zapstore"}
  />
</svelte:head>

<!-- Contextual header with back button, creator info, and catalog -->
{#if stack?.creator}
  <DetailHeader
    publisherPic={stack.creator.picture}
    publisherName={stack.creator.name}
    publisherPubkey={stack.creator.pubkey}
    publisherUrl="/p/{stack.creator.npub}"
    timestamp={stack.createdAt}
    {catalogs}
    catalogText="In Zapstore"
    showPublisher={true}
  />
{:else if stack}
  <DetailHeader {catalogs} catalogText="In Zapstore" showPublisher={false} />
{/if}

<section class="stack-page">
  <div class="container mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6">
    {#if loading}
      <!-- Loading State -->
      <div class="skeleton-publisher-row">
        <div class="skeleton-publisher">
          <div class="skeleton-avatar"><SkeletonLoader /></div>
          <div class="skeleton-name-small"></div>
        </div>
      </div>
      <div class="stack-header-skeleton">
        <div class="skeleton-title"><SkeletonLoader /></div>
        <div class="skeleton-desc"></div>
      </div>

      <div class="section-container">
        <div class="horizontal-scroll" use:wheelScroll>
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
        <h1 class="stack-title">{displayTitle}</h1>
        <p class="stack-description">{displayDescription}</p>
      </div>

      <!-- Apps Section -->
      <div class="section-container">
        {#if apps.length > 0}
          <div class="horizontal-scroll" use:wheelScroll>
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

      <!-- Social tabs (Comments, Labels, etc.) -->
      <div class="mb-8">
        <SocialTabs
          app={{
            pubkey: stack.pubkey,
            dTag: stack.identifier,
            id: stack.id,
          }}
          publisherProfile={stack.creator
            ? {
                displayName: stack.creator.name,
                name: stack.creator.name,
                picture: stack.creator.picture,
              }
            : null}
        />
      </div>
    {/if}
  </div>
</section>

<!-- Bottom Bar -->
{#if stack}
  {@const zapTarget = {
    name: stack.title || stack.name,
    pubkey: stack.pubkey,
    dTag: stack.identifier,
    id: stack.id,
    pictureUrl: stack.creator?.picture
  }}
  <BottomBar 
    publisherName={stack.creator?.name || ""} 
    contentType="stack"
    {zapTarget}
    {searchProfiles}
    {searchEmojis}
  />
{/if}

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
    margin: 0;
    line-height: 1.5;
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
    margin-bottom: 24px;
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
  .skeleton-publisher-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .skeleton-publisher {
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
