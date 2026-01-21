<script>
  import { onMount } from "svelte";
  import { MessageSquare, Loader2, AlertCircle, LogIn } from "lucide-svelte";
  import {
    fetchAppComments,
    publishAppComment,
    fetchProfile,
    getCachedComments,
    cacheComments,
  } from "$lib/nostr.js";
  import { authStore, connect } from "$lib/stores/auth.js";
  import ProfilePic from "./ProfilePic.svelte";
  import MessageBubble from "./MessageBubble.svelte";

  export let app;
  export let version = "";

  let comments = [];
  let loading = true;
  let error = "";
  let commentText = "";
  let submitting = false;
  let profiles = {};

  const MAX_LENGTH = 1000;

  onMount(() => {
    loadComments();
  });

  async function loadComments() {
    if (!app?.pubkey || !app?.dTag) return;
    error = "";

    let cachedComments = null;
    let shouldLoadProfiles = false;

    // Try cached comments first for instant UI
    try {
      cachedComments = await getCachedComments(app.pubkey, app.dTag);
      if (cachedComments?.length) {
        comments = cachedComments;
        loading = false;
        shouldLoadProfiles = true;
      }
    } catch (e) {
      // Ignore cache errors
    }

    if (!cachedComments?.length) {
      loading = true;
    }

    try {
      const freshComments = await fetchAppComments(app.pubkey, app.dTag);
      comments = freshComments;
      cacheComments(app.pubkey, app.dTag, freshComments);
      shouldLoadProfiles = true;
    } catch (err) {
      console.error("Failed to load comments", err);
      error = err?.message || "Failed to load comments.";
    } finally {
      if (shouldLoadProfiles && comments.length > 0) {
        // Fetch profiles for all comment authors
        await loadProfiles();
      }
      loading = false;
    }
  }

  async function loadProfiles() {
    profilesLoading = true;
    const uniquePubkeys = [...new Set(comments.map((c) => c.pubkey))];
    const fetchPromises = uniquePubkeys.map(async (pubkey) => {
      if (!profiles[pubkey]) {
        try {
          const profile = await fetchProfile(pubkey);
          if (profile) {
            profiles[pubkey] = profile;
            profiles = profiles; // trigger reactivity
          }
        } catch (e) {
          // Silently fail for individual profile fetches
          // Mark as "attempted" so we don't keep trying
          profiles[pubkey] = null;
          profiles = profiles;
        }
      }
    });
    await Promise.allSettled(fetchPromises);
    profilesLoading = false;
  }

  async function handleSignIn() {
    error = "";
    try {
      await connect();
    } catch (err) {
      console.error("Failed to sign in", err);
      error = err?.message || "Failed to sign in. Please try again.";
    }
  }

  $: canSubmit =
    !!commentText.trim() && $authStore.isConnected && !!version && !submitting;

  async function submitComment() {
    if (!canSubmit) return;
    submitting = true;
    error = "";

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
      error = err?.message || "Failed to publish comment.";
    } finally {
      submitting = false;
    }
  }

  // Get display name for current user
  $: currentUserDisplay =
    $authStore.profile?.displayName ||
    $authStore.profile?.name ||
    ($authStore.npub ? `${$authStore.npub.slice(0, 12)}...` : "");

  // Track if we're still loading profiles
  let profilesLoading = true;

  // Create a reactive version of comments with profile data
  // This ensures re-render when profiles update
  $: commentsWithProfiles = comments.map((comment) => {
    const profile = profiles[comment.pubkey];
    const hasProfile = profile !== undefined;
    return {
      ...comment,
      displayName:
        profile?.displayName ||
        profile?.name ||
        (comment.npub ? `${comment.npub.slice(0, 12)}...` : "Anonymous"),
      avatarUrl: profile?.picture || null,
      // Profile is loading if we haven't fetched profiles yet, or this specific profile hasn't loaded
      profileLoading: profilesLoading && !hasProfile,
    };
  });
</script>

<div class="flex items-center gap-2 mb-4">
  <MessageSquare class="h-5 w-5 text-primary" />
  <h2 class="text-xl font-bold">Comments</h2>
</div>

{#if error}
  <div
    class="mb-4 flex items-start gap-2 rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
  >
    <AlertCircle class="h-4 w-4 mt-0.5" />
    <div class="flex-1">{error}</div>
  </div>
{/if}

{#if loading}
  <div class="flex items-center gap-3 text-sm text-muted-foreground">
    <Loader2 class="h-4 w-4 animate-spin" />
    <span>Loading comments...</span>
  </div>
{:else if comments.length === 0}
  <p class="text-sm text-muted-foreground">
    No comments yet. Be the first to share feedback.
  </p>
{:else}
  <div class="space-y-4">
    {#each commentsWithProfiles as comment (comment.id)}
      <MessageBubble
        pictureUrl={comment.avatarUrl}
        name={comment.displayName}
        pubkey={comment.pubkey}
        timestamp={comment.createdAt}
        profileUrl="/p/{comment.npub}"
        loading={comment.profileLoading}
      >
        {@html comment.contentHtml ||
          "<p class='text-muted-foreground italic'>No content</p>"}
      </MessageBubble>
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
            <MessageSquare class="h-4 w-4" />
            Post Comment
          {/if}
        </button>
      </div>
    </div>
  {/if}
</div>
