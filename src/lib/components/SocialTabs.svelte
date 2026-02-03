<script>
  import { onMount } from "svelte";
  import { Loader2, AlertCircle } from "lucide-svelte";
  import {
    fetchAppComments,
    getCachedComments,
    cacheComments,
    fetchProfile,
    formatSats,
  } from "$lib/nostr.js";
  import { authStore } from "$lib/stores/auth.js";
  import { wheelScroll } from "$lib/actions/wheelScroll.js";
  import RootComment from "./RootComment.svelte";
  import ZapBubble from "./ZapBubble.svelte";
  import DetailsTab from "./DetailsTab.svelte";
  import ZapIcon from "./icons/Zap.svelte";
  import { getAppSlug, pubkeyToNpub } from "$lib/nostr.js";

  /**
   * SocialTabs - Tabbed interface for social content
   *
   * Displays tabs for: Comments, Labels, Stacks, Supporters, Details
   * Only loads content for the currently selected tab.
   */

  /** @type {Object} - The app/content being displayed */
  export let app;

  /** @type {string} - Version string for comments */
  export let version = "";

  /** @type {Object|null} - Pre-loaded publisher profile from parent */
  export let publisherProfile = null;

  /** @type {Array} - Zaps data array */
  export let zaps = [];

  /** @type {Map} - Zapper profiles map (pubkey -> profile) */
  export let zapperProfiles = new Map();

  /** @type {string} - Additional CSS classes */
  export let className = "";

  // Tab definitions (zaps tab is handled separately due to dynamic content)
  const staticTabs = [
    { id: "comments", label: "Comments" },
    { id: "zaps", label: "Zaps" },
    { id: "labels", label: "Labels" },
    { id: "stacks", label: "Stacks" },
    { id: "details", label: "Details" },
  ];

  let activeTab = "comments";

  // Calculate total zap amount
  $: totalZapAmount = zaps.reduce((sum, zap) => sum + (zap.amountSats || 0), 0);

  // ============================================================================
  // Comments Tab State & Logic
  // ============================================================================

  let comments = [];
  let commentsLoading = true;
  let commentsError = "";
  let profiles = {};
  let profilesLoading = true;
  let commentsInitialized = false;

  // Pre-populate profiles with known profiles immediately
  function initializeKnownProfiles() {
    let updated = false;

    // Add publisher profile if provided
    if (publisherProfile && app?.pubkey && !profiles[app.pubkey]) {
      profiles[app.pubkey] = publisherProfile;
      updated = true;
    }

    // Add logged-in user's profile
    if (
      $authStore.pubkey &&
      $authStore.profile &&
      !profiles[$authStore.pubkey]
    ) {
      profiles[$authStore.pubkey] = $authStore.profile;
      updated = true;
    }

    if (updated) {
      profiles = profiles; // trigger reactivity
    }
  }

  // Initialize on mount and when props change
  $: if (publisherProfile || $authStore.profile) {
    initializeKnownProfiles();
  }

  // Load comments when tab is selected (lazy loading)
  $: if (activeTab === "comments" && !commentsInitialized && app?.pubkey) {
    commentsInitialized = true;
    loadComments();
  }

  async function loadComments() {
    if (!app?.pubkey || !app?.dTag) return;
    commentsError = "";

    let cachedComments = null;

    // Try cached comments first for instant UI
    try {
      cachedComments = await getCachedComments(app.pubkey, app.dTag);
      if (cachedComments?.length) {
        comments = cachedComments;
        commentsLoading = false;
        // Start loading profiles immediately for cached comments (don't await)
        loadProfiles();
      }
    } catch (e) {
      // Ignore cache errors
    }

    if (!cachedComments?.length) {
      commentsLoading = true;
    }

    try {
      const freshComments = await fetchAppComments(app.pubkey, app.dTag);
      comments = freshComments;
      cacheComments(app.pubkey, app.dTag, freshComments);
      // Load profiles for any new comment authors (don't await, let it run in background)
      loadProfiles();
    } catch (err) {
      console.error("Failed to load comments", err);
      commentsError = err?.message || "Failed to load comments.";
    } finally {
      commentsLoading = false;
    }
  }

  async function loadProfiles() {
    const uniquePubkeys = [...new Set(comments.map((c) => c.pubkey))];

    // Filter out pubkeys we already have profiles for (undefined means not attempted)
    const pubkeysToFetch = uniquePubkeys.filter(
      (pubkey) => profiles[pubkey] === undefined,
    );

    if (pubkeysToFetch.length === 0) {
      profilesLoading = false;
      return;
    }

    // Fetch profiles in parallel, updating UI progressively as each loads
    // This is much faster than waiting for entire batch to complete
    await Promise.all(
      pubkeysToFetch.map(async (pubkey) => {
        try {
          const profile = await fetchProfile(pubkey);
          // Update immediately as each profile loads (triggers reactivity)
          profiles[pubkey] = profile || null;
          profiles = profiles;
        } catch (e) {
          console.warn("Failed to fetch profile for", pubkey);
          // Mark as attempted so we don't retry
          profiles[pubkey] = null;
          profiles = profiles;
        }
      }),
    );

    profilesLoading = false;
  }

  // Add profile data to a comment
  function enrichComment(comment) {
    const profile = profiles[comment.pubkey];
    const hasProfile = profile !== undefined;
    return {
      ...comment,
      displayName:
        profile?.displayName ||
        profile?.name ||
        (comment.npub ? `${comment.npub.slice(0, 12)}...` : "Anonymous"),
      avatarUrl: profile?.picture || null,
      profileUrl: `/p/${comment.npub}`,
      profileLoading: profilesLoading && !hasProfile,
    };
  }

  // Separate root comments from replies and group replies by parent
  $: rootComments = comments
    .filter((c) => !c.parentId && !c.isReply)
    .map(enrichComment);

  $: repliesByParent = (() => {
    const map = new Map();
    comments
      .filter((c) => c.parentId || c.isReply)
      .forEach((reply) => {
        const parentId = reply.parentId;
        if (parentId) {
          if (!map.has(parentId)) {
            map.set(parentId, []);
          }
          map.get(parentId).push(enrichComment(reply));
        }
      });
    return map;
  })();

  // Root comments with their replies
  $: rootCommentsWithReplies = rootComments.map((comment) => ({
    ...comment,
    replies: repliesByParent.get(comment.id) || [],
  }));

  // Enrich zaps with profile data and sort newest first
  $: enrichedZaps = zaps
    .map((zap) => {
      const profile = zapperProfiles.get(zap.senderPubkey);
      return {
        ...zap,
        type: "zap",
        displayName: profile?.displayName || profile?.name || "Anonymous",
        avatarUrl: profile?.picture || null,
        profileUrl: zap.senderPubkey
          ? `/p/${pubkeyToNpub(zap.senderPubkey)}`
          : "",
        timestamp: zap.createdAt,
      };
    })
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  // Combine comments and zaps (only zaps with a comment) for the Comments tab
  $: combinedFeed = (() => {
    const commentsWithType = rootCommentsWithReplies.map((c) => ({
      ...c,
      type: "comment",
      timestamp: c.createdAt,
    }));

    // Only include zaps that have a comment message
    const zapsWithComments = enrichedZaps.filter((zap) => zap.comment && zap.comment.trim());

    const combined = [...commentsWithType, ...zapsWithComments];

    return combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  })();
</script>

<div class="social-tabs {className}">
  <!-- Tab buttons -->
  <div class="tab-row" use:wheelScroll>
    {#each staticTabs as tab}
      <button
        type="button"
        class={activeTab === tab.id
          ? "btn-primary-small tab-selected"
          : "btn-secondary-small"}
        on:click={() => (activeTab = tab.id)}
      >
        {#if tab.id === "zaps"}
          <span>Zaps</span>
          {#if totalZapAmount > 0}
            <span class="tab-stats">
              <ZapIcon variant="fill" size={12} color="hsl(0 0% 100% / 0.44)" />
              <span>{formatSats(totalZapAmount).replace(' sats', '')}</span>
            </span>
          {/if}
        {:else if tab.id === "comments"}
          <span>Comments</span>
          {#if rootCommentsWithReplies.length > 0}
            <span class="tab-stats">{rootCommentsWithReplies.length}</span>
          {/if}
        {:else}
          {tab.label}
        {/if}
      </button>
    {/each}
  </div>

  <!-- Tab content -->
  <div class="tab-content">
    {#if activeTab === "comments"}
      <!-- Comments Tab -->
      {#if commentsError}
        <div
          class="mb-4 flex items-start gap-2 rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle class="h-4 w-4 mt-0.5" />
          <div class="flex-1">{commentsError}</div>
        </div>
      {/if}

      {#if commentsLoading}
        <div class="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 class="h-4 w-4 animate-spin" />
          <span>Loading comments...</span>
        </div>
      {:else if combinedFeed.length === 0}
        <p class="text-sm text-muted-foreground">
          No comments yet. Be the first to share feedback.
        </p>
      {:else}
        <div class="space-y-4">
          {#each combinedFeed as item (item.type === "zap" ? `zap-${item.id}` : item.id)}
            {#if item.type === "zap"}
              <ZapBubble
                pictureUrl={item.avatarUrl}
                name={item.displayName}
                pubkey={item.senderPubkey}
                amount={item.amountSats || 0}
                timestamp={item.createdAt}
                profileUrl={item.profileUrl}
                message={item.comment || ""}
              />
            {:else}
              <RootComment
                pictureUrl={item.avatarUrl}
                name={item.displayName}
                pubkey={item.pubkey}
                timestamp={item.createdAt}
                profileUrl={item.profileUrl}
                loading={item.profileLoading}
                replies={item.replies}
                authorPubkey={app?.pubkey}
                contentHtml={item.contentHtml}
                appIconUrl={app?.icon}
                appName={app?.name}
                appIdentifier={app?.dTag}
                {version}
              >
                {@html item.contentHtml ||
                  "<p class='text-muted-foreground italic'>No content</p>"}
              </RootComment>
            {/if}
          {/each}
        </div>
      {/if}
    {:else if activeTab === "zaps"}
      <!-- Zaps Tab -->
      {#if enrichedZaps.length === 0}
        <p class="text-sm text-muted-foreground">
          No zaps yet. Be the first to zap this app.
        </p>
      {:else}
        <div class="space-y-4">
          {#each enrichedZaps as zap (zap.id)}
            <ZapBubble
              pictureUrl={zap.avatarUrl}
              name={zap.displayName}
              pubkey={zap.senderPubkey}
              amount={zap.amountSats || 0}
              timestamp={zap.createdAt}
              profileUrl={zap.profileUrl}
              message={zap.comment || ""}
            />
          {/each}
        </div>
      {/if}
    {:else if activeTab === "labels"}
      <!-- Labels Tab -->
      <p class="text-sm text-muted-foreground">Labels coming soon...</p>
    {:else if activeTab === "stacks"}
      <!-- Stacks Tab -->
      <p class="text-sm text-muted-foreground">Stacks coming soon...</p>
    {:else if activeTab === "details"}
      <!-- Details Tab -->
      <DetailsTab
        shareableId={app?.pubkey && app?.dTag
          ? getAppSlug(app.pubkey, app.dTag)
          : ""}
        publicationLabel="App"
        npub={app?.pubkey ? pubkeyToNpub(app.pubkey) : ""}
        pubkey={app?.pubkey || ""}
        rawData={app?.rawEvent || app}
      />
    {/if}
  </div>
</div>

<style>
  .social-tabs {
    display: flex;
    flex-direction: column;
  }

  .tab-row {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .tab-row::-webkit-scrollbar {
    display: none;
  }

  /* Override for blurple66 gradient on selected tab */
  .tab-row :global(.tab-selected) {
    background-image: var(--gradient-blurple66);
  }

  .tab-content {
    min-height: 100px;
    padding-top: 16px;
  }

  /* Zap tab button styling */
  .tab-row :global(button) {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tab-stats {
    display: flex;
    align-items: center;
    gap: 1px;
    margin-left: 2px;
    color: hsl(0 0% 100% / 0.44);
  }
</style>
