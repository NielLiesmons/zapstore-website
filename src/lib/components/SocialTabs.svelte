<script>
  import { onMount } from "svelte";
  import { Loader2, AlertCircle, LogIn } from "lucide-svelte";
  import {
    fetchAppComments,
    publishAppComment,
    getCachedComments,
    cacheComments,
    fetchProfilesBatch,
  } from "$lib/nostr.js";
  import { authStore, connect } from "$lib/stores/auth.js";
  import { wheelScroll } from "$lib/actions/wheelScroll.js";
  import ProfilePic from "./ProfilePic.svelte";
  import RootComment from "./RootComment.svelte";

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
    { id: "supporters", label: "Supporters" },
    { id: "details", label: "Details" },
  ];

  let activeTab = "comments";

  // ============================================================================
  // Comments Tab State & Logic
  // ============================================================================

  let comments = [];
  let commentsLoading = true;
  let commentsError = "";
  let commentText = "";
  let submitting = false;
  let profiles = {};
  let profilesLoading = true;
  let commentsInitialized = false;

  const MAX_LENGTH = 1000;

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

  async function handleSignIn() {
    commentsError = "";
    try {
      await connect();
    } catch (err) {
      console.error("Failed to sign in", err);
      commentsError = err?.message || "Failed to sign in. Please try again.";
    }
  }

  $: canSubmit =
    !!commentText.trim() && $authStore.isConnected && !!version && !submitting;

  async function submitComment() {
    if (!canSubmit) return;
    submitting = true;
    commentsError = "";

    try {
      await publishAppComment(
        app,
        commentText.slice(0, MAX_LENGTH),
        window.nostr,
        version,
      );
      commentText = "";
      await loadComments();
    } catch (err) {
      console.error("Failed to publish comment", err);
      commentsError = err?.message || "Failed to publish comment.";
    } finally {
      submitting = false;
    }
  }

  // Get display name for current user
  $: currentUserDisplay =
    $authStore.profile?.displayName ||
    $authStore.profile?.name ||
    ($authStore.npub ? `${$authStore.npub.slice(0, 12)}...` : "");

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
            >
              {@html comment.contentHtml ||
                "<p class='text-muted-foreground italic'>No content</p>"}
            </RootComment>
          {/each}
        </div>
      {/if}

      <div class="mt-6 pt-4 border-t border-border/60">
        {#if $authStore.isConnecting}
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 class="h-4 w-4 animate-spin" />
            <span>Connecting...</span>
          </div>
        {:else if !$authStore.isConnected}
          <div class="flex items-center gap-3">
            <button
              type="button"
              on:click={handleSignIn}
              class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <LogIn class="h-4 w-4" />
              Sign in to comment
            </button>
            <span class="text-sm text-muted-foreground">
              Requires a Nostr extension
            </span>
          </div>
        {:else}
          <!-- Signed in user info -->
          <div class="flex items-center gap-2 mb-3">
            <ProfilePic
              pictureUrl={$authStore.profile?.picture}
              name={$authStore.profile?.displayName || $authStore.profile?.name}
              pubkey={$authStore.pubkey}
              size="sm"
            />
            <span class="text-sm text-muted-foreground">
              Commenting as <span class="font-medium text-foreground"
                >{currentUserDisplay}</span
              >
            </span>
          </div>

          <div class="space-y-3">
            <textarea
              bind:value={commentText}
              maxlength={MAX_LENGTH}
              rows="3"
              placeholder="Share your experience or feedback..."
              class="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            ></textarea>
            <div
              class="flex items-center justify-between text-xs text-muted-foreground"
            >
              <span>{commentText.length}/{MAX_LENGTH} characters</span>
              <button
                type="button"
                on:click={submitComment}
                disabled={!canSubmit}
                class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {#if submitting}
                  <Loader2 class="h-4 w-4 animate-spin" />
                  Posting...
                {:else}
                  Post Comment
                {/if}
              </button>
            </div>
          </div>
        {/if}
      </div>
    {:else if activeTab === "labels"}
      <!-- Labels Tab -->
      <p class="text-sm text-muted-foreground">Labels coming soon...</p>
    {:else if activeTab === "stacks"}
      <!-- Stacks Tab -->
      <p class="text-sm text-muted-foreground">Stacks coming soon...</p>
    {:else if activeTab === "supporters"}
      <!-- Supporters Tab -->
      <p class="text-sm text-muted-foreground">Supporters coming soon...</p>
    {:else if activeTab === "details"}
      <!-- Details Tab -->
      <p class="text-sm text-muted-foreground">Details coming soon...</p>
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
    margin-bottom: 16px;
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
  }
</style>
