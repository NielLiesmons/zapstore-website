<script>
  import { onMount } from "svelte";
  import { Loader2, AlertCircle } from "lucide-svelte";
  import {
    fetchAppComments,
    getCachedComments,
    cacheComments,
    fetchProfilesBatch,
  } from "$lib/nostr.js";
  import { authStore } from "$lib/stores/auth.js";
  import { wheelScroll } from "$lib/actions/wheelScroll.js";
  import RootComment from "./RootComment.svelte";
  import DetailsTab from "./DetailsTab.svelte";
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

  /** @type {string} - Additional CSS classes */
  export let className = "";

  // Tab definitions
  const tabs = [
    { id: "comments", label: "Comments" },
    { id: "labels", label: "Labels" },
    { id: "stacks", label: "Stacks" },
    { id: "details", label: "Details" },
  ];

  let activeTab = "comments";

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
    profilesLoading = true;
    const uniquePubkeys = [...new Set(comments.map((c) => c.pubkey))];

    // Filter out pubkeys we already have profiles for
    const pubkeysToFetch = uniquePubkeys.filter((pubkey) => !profiles[pubkey]);

    if (pubkeysToFetch.length === 0) {
      profilesLoading = false;
      return;
    }

    try {
      // Batch fetch all profiles in a single request
      const fetchedProfiles = await fetchProfilesBatch(pubkeysToFetch);

      // Update profiles object with all fetched profiles
      for (const [pubkey, profile] of Object.entries(fetchedProfiles)) {
        profiles[pubkey] = profile;
      }

      // Mark unfound profiles as null so we don't keep trying
      for (const pubkey of pubkeysToFetch) {
        if (!profiles[pubkey]) {
          profiles[pubkey] = null;
        }
      }

      profiles = profiles; // trigger reactivity
    } catch (e) {
      console.error("Failed to batch fetch profiles:", e);
      // Mark all as attempted
      for (const pubkey of pubkeysToFetch) {
        if (!profiles[pubkey]) {
          profiles[pubkey] = null;
        }
      }
      profiles = profiles;
    }

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
</script>

<div class="social-tabs {className}">
  <!-- Top divider -->
  <div class="tab-divider"></div>

  <!-- Tab buttons -->
  <div class="tab-row" use:wheelScroll>
    {#each tabs as tab}
      <button
        type="button"
        class={activeTab === tab.id
          ? "btn-primary-small tab-selected"
          : "btn-secondary-small"}
        on:click={() => (activeTab = tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <!-- Bottom divider -->
  <div class="tab-divider"></div>

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
      {:else if rootCommentsWithReplies.length === 0}
        <p class="text-sm text-muted-foreground">
          No comments yet. Be the first to share feedback.
        </p>
      {:else}
        <div class="space-y-4">
          {#each rootCommentsWithReplies as comment (comment.id)}
            <RootComment
              pictureUrl={comment.avatarUrl}
              name={comment.displayName}
              pubkey={comment.pubkey}
              timestamp={comment.createdAt}
              profileUrl={comment.profileUrl}
              loading={comment.profileLoading}
              replies={comment.replies}
              authorPubkey={app?.pubkey}
              contentHtml={comment.contentHtml}
              appIconUrl={app?.icon}
              appName={app?.name}
              appIdentifier={app?.dTag}
              {version}
            >
              {@html comment.contentHtml ||
                "<p class='text-muted-foreground italic'>No content</p>"}
            </RootComment>
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

  .tab-divider {
    width: 100%;
    height: 1.4px;
    background-color: hsl(var(--white11));
  }

  .tab-row {
    display: flex;
    gap: 8px;
    padding: 12px 0;
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
</style>
