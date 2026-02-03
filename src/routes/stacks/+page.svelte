<script>
  import { onMount } from "svelte";
  import {
    fetchApps,
    fetchApp,
    fetchAppStacks,
    resolveStackApps,
    fetchProfile,
    pubkeyToNpub,
    getStackSlug,
  } from "$lib/nostr.js";
  import AppStackCard from "$lib/components/AppStackCard.svelte";
  import SkeletonLoader from "$lib/components/SkeletonLoader.svelte";

  let stacks = [];
  let loading = true;
  let error = null;

  onMount(async () => {
    await loadStacks();
  });

  async function loadStacks() {
    try {
      loading = true;
      error = null;

      // Fetch apps first for resolving stack references
      const apps = await fetchApps({ limit: 100 });

      // Fetch all stacks
      const rawStacks = await fetchAppStacks({ limit: 100 });

      // Resolve app references and fetch creator profiles
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

      // Sort by createdAt (newest first) - this is the event timestamp, updated on edits
      stacks = resolvedStacks.sort((a, b) => b.createdAt - a.createdAt);
    } catch (err) {
      console.error("Error loading stacks:", err);
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>All Stacks — Zapstore</title>
  <meta name="description" content="Browse all app stacks on Zapstore" />
</svelte:head>

<section class="all-stacks-page">
  <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <h1 class="page-title">Stacks</h1>

    {#if loading}
      <!-- Loading State -->
      <div class="stacks-list">
        {#each Array(6) as _}
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
        {/each}
      </div>
    {:else if error}
      <!-- Error State -->
      <div class="error-container">
        <div class="error-box">
          <h3 class="error-title">Error Loading Stacks</h3>
          <p class="error-message">{error}</p>
          <button on:click={loadStacks} class="btn-primary">Try Again</button>
        </div>
      </div>
    {:else if stacks.length === 0}
      <!-- Empty State -->
      <div class="placeholder-content">
        <p class="text-muted-foreground">
          No app stacks found yet. Create one in the Zapstore app!
        </p>
      </div>
    {:else}
      <!-- Stacks List -->
      <div class="stacks-list">
        {#each stacks as stack}
          <AppStackCard
            {stack}
            href="/stacks/{getStackSlug(stack.pubkey, stack.identifier)}"
            className="full-width-card"
          />
        {/each}
      </div>
    {/if}
  </div>
</section>

<style>
  .all-stacks-page {
    min-height: 100vh;
  }

  .page-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: hsl(var(--foreground));
    margin-bottom: 24px;
  }

  @media (min-width: 768px) {
    .page-title {
      font-size: 1.875rem;
    }
  }

  /* Stacks list - vertical column */
  .stacks-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  @media (min-width: 768px) {
    .stacks-list {
      gap: 20px;
    }
  }

  /* Full width card styling */
  .stacks-list :global(.full-width-card) {
    width: 100%;
  }

  /* Placeholder content */
  .placeholder-content {
    padding: 48px 24px;
    background-color: hsl(var(--gray66));
    border-radius: 16px;
    text-align: center;
  }

  /* Error state */
  .error-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 0;
  }

  .error-box {
    background-color: hsl(var(--destructive) / 0.1);
    border: 1px solid hsl(var(--destructive) / 0.2);
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    text-align: center;
  }

  .error-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: hsl(var(--destructive));
    margin-bottom: 8px;
  }

  .error-message {
    color: hsl(var(--muted-foreground));
    margin-bottom: 16px;
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 20px;
    border-radius: 10px;
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    font-size: 0.875rem;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: opacity 0.15s ease;
  }

  .btn-primary:hover {
    opacity: 0.9;
  }

  /* Skeleton loading styles */
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
    width: 140px;
    max-width: 100%;
    height: 18px;
    border-radius: 6px;
    overflow: hidden;
  }

  .skeleton-stack-desc {
    width: 220px;
    max-width: 100%;
    height: 14px;
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
    width: 80px;
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
      width: 180px;
      height: 20px;
    }

    .skeleton-stack-desc {
      width: 300px;
      height: 16px;
    }
  }
</style>
